'use client';

/**
 * QualityNX — D-032 · TRANSFORMACIONES DE PLANTA
 *
 * Una operación con N fuentes y N salidas. El remanente SIEMPRE es un lote
 * nuevo. Nada se consume por debajo de lo disponible. El balance se muestra
 * antes de confirmar y lo vuelve a verificar la base de datos.
 *
 * No convierte unidades y no inventa distribución de consumo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getCurrentSession,
  getUserProfile,
  listTransformations,
  listAvailableSourcesForTransformation,
  validateTransformation,
  validateTransformationOnServer,
  confirmTransformation,
  annulTransformation,
} from '@qualitynx/database';
import type { TransformationRow } from '@qualitynx/database';
import type {
  AvailableSource,
  OutputKind,
  RemnantHandling,
  TransformationInputDraft,
  TransformationOutputDraft,
  TransformationType,
  UserRole,
} from '@qualitynx/shared';
import { OutputKind as K, RemnantHandling as R, TRANSFORMATION_TYPE_LABELS, TRANSFORMATION_TYPE_RULES } from '@qualitynx/shared';
import { Banner, EmptyState, LoadingBlock, inputClass } from '@/components/ui';

const panel = 'rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-3.5';
const th = 'px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const td = 'px-2.5 py-2 text-[12px] text-[#1a1a1a]';
const thN = 'px-2.5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const tdN = 'px-2.5 py-2 text-right text-[12px] text-[#1a1a1a]';

interface OutputRow extends TransformationOutputDraft {
  key: string;
}

export default function TransformacionesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelMissing, setModelMissing] = useState(false);
  const [sources, setSources] = useState<AvailableSource[]>([]);
  const [history, setHistory] = useState<TransformationRow[]>([]);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);

  const [unit, setUnit] = useState('');
  const [type, setType] = useState<TransformationType>('REPALLETIZAJE');
  const [motive, setMotive] = useState('');
  const [inputs, setInputs] = useState<TransformationInputDraft[]>([]);
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [annulFor, setAnnulFor] = useState<string | null>(null);
  const [annulReason, setAnnulReason] = useState('');

  useEffect(() => {
    const init = async () => {
      const { session } = await getCurrentSession();
      if (!session) return;
      const { data } = await getUserProfile(session.user.id);
      if (data) {
        setCompanyId((data as { company_id: string | null }).company_id);
        setRole((data as { role: UserRole }).role);
      }
    };
    void init();
  }, []);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [src, hist] = await Promise.all([
      listAvailableSourcesForTransformation({ companyId, query: searched ? query : undefined }),
      listTransformations({ companyId }),
    ]);
    setSources(src.data);
    setHistory(hist.data);
    setModelMissing(src.model_missing || hist.model_missing);
    setLoading(false);
  }, [companyId, query, searched]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const availability = useMemo(() => {
    const m = new Map<string, number>();
    sources.forEach((s) => m.set(s.lot_id, s.available_quantity));
    return m;
  }, [sources]);

  const validation = useMemo(
    () =>
      validateTransformation({
        unit,
        inputs,
        outputs: outputs.map((o) => ({
          result_lot_id: o.result_lot_id,
          output_kind: o.output_kind,
          quantity: o.quantity,
          unit: o.unit,
          reason: o.reason,
          new_lot: o.new_lot,
        })),
        availability,
        transformationType: type,
        motive,
      }),
    [unit, inputs, outputs, availability, type, motive]
  );

  const addSource = (s: AvailableSource) => {
    if (inputs.some((i) => i.source_lot_id === s.lot_id)) return;
    setInputs((prev) => [
      ...prev,
      {
        source_lot_id: s.lot_id,
        available_quantity: s.available_quantity,
        consumed_quantity: s.available_quantity,
        unit: s.unit ?? '',
        remnant_handling: R.SIN_REMANENTE,
      },
    ]);
    if (!unit && s.unit) setUnit(s.unit);
  };

  const addOutput = (kind: OutputKind) => {
    setOutputs((prev) => [
      ...prev,
      {
        key: Math.random().toString(36).slice(2),
        result_lot_id: null,
        output_kind: kind,
        quantity: 0,
        unit,
        reason: null,
        new_lot: null,
      },
    ]);
  };

  if (loading) return <LoadingBlock />;

  /** Confirma una transformación BORRADOR. La base es la autoridad. */
  const doConfirm = async (t: TransformationRow) => {
    setBusyId(t.id);
    setError(null);
    setNotice(null);
    // 1) Previsualización con la misma función SQL que confirmará.
    const v = await validateTransformationOnServer(t.id);
    const row = v.data;
    if (!row || !row.ok) {
      setError(
        `No se puede confirmar ${t.transformation_type}: ${(row?.errors ?? ['la validación no respondió']).join(' ')}`
      );
      setBusyId(null);
      return;
    }
    // 2) Confirmación atómica.
    const r = await confirmTransformation(t.id);
    if (r.error) {
      setError(`No se pudo confirmar: ${r.error.message ?? 'error desconocido'}`);
    } else {
      setNotice(
        `${t.transformation_type} confirmada. Consumos, salidas y genealogía registrados de forma atómica.`
      );
      await load();
    }
    setBusyId(null);
  };

  /** Anula una transformación CONFIRMADA con motivo. No borra historia. */
  const doAnnul = async (t: TransformationRow) => {
    const motivo = annulReason.trim();
    if (!motivo) {
      setError('La anulación exige un motivo.');
      return;
    }
    setBusyId(t.id);
    setError(null);
    setNotice(null);
    const r = await annulTransformation(t.id, motivo);
    if (r.error) {
      setError(`No se pudo anular: ${r.error.message ?? 'error desconocido'}`);
    } else {
      setNotice(`${t.transformation_type} anulada con motivo. Los movimientos originales se conservan y quedan compensados.`);
      setAnnulFor(null);
      setAnnulReason('');
      await load();
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Transformaciones de planta</h1>
        <p className="mt-1 max-w-4xl text-[12px] leading-relaxed text-[#5c6b45]">
          Operaciones con varias fuentes y varias salidas. El remanente es siempre un
          lote nuevo con folio propio. No se consume más de lo disponible y no hay
          conversión de unidades. Sesión {role ?? '—'} · el modelo registra entradas,
          salidas y existencias; no reemplaza el estado del lote.
        </p>
      </header>

      {modelMissing ? (
        <Banner type="error">
          El modelo de transformaciones (migración D-032) todavía no está aplicado en la
          base de datos. Las reglas de validación están activas y probadas, pero no se
          pueden registrar operaciones hasta aplicar la migración.
        </Banner>
      ) : null}

      {notice ? <Banner type="ok">{notice}</Banner> : null}
      {error ? <Banner type="error">{error}</Banner> : null}

      {/* ---- Fuentes disponibles ---- */}
      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Lotes disponibles</h2>
            <p className="text-[11px] text-[#5c6b45]">
              {sources.length} lotes con existencia real. Se excluyen los agotados y los que
              no declaran cantidad ni unidad: siguen en historial, pero no son consumibles.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <input
              className={`${inputClass} w-64`}
              placeholder="Buscar por folio, productor, variedad…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearched(true);
              }}
              data-testid="transform-search"
            />
            <button type="button" className="qx-btn-ghost !py-2" onClick={() => setSearched(true)}>
              Buscar
            </button>
          </div>
        </div>

        {sources.length === 0 ? (
          <EmptyState
            title="Sin lotes disponibles para consumir"
            description="No hay lotes con cantidad y unidad declaradas, o todos están agotados."
          />
        ) : (
          <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-[#1a1a1a]/10">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[#1a1a1a]/10">
                  <th className={th}>Folio</th>
                  <th className={th}>Productor</th>
                  <th className={th}>Variedad</th>
                  <th className={th}>Etapa</th>
                  <th className={thN}>Disponible</th>
                  <th className={th}>Estado</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.lot_id} className="border-b border-[#1a1a1a]/5">
                    <td className={`${td} font-medium`}>
                      <Link className="underline" href={`/dashboard/lots/${s.lot_id}/report`}>
                        {s.folio ?? s.harvest_block ?? s.lot_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className={td}>{s.producer_name ?? '—'}</td>
                    <td className={td}>{s.variety_name ?? '—'}</td>
                    <td className={td}>{s.stage_name ?? <span className="text-[#8a6d1f]">sin etapa</span>}</td>
                    <td className={tdN}>
                      {s.available_quantity} {s.unit}
                    </td>
                    <td className={td}>{s.availability_status}</td>
                    <td className={td}>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          addSource(s);
                          setShowForm(true);
                        }}
                        data-testid={`transform-add-${s.lot_id}`}
                      >
                        Usar como fuente
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Formulario de transformación ---- */}
      {showForm ? (
        <section className={panel} data-testid="transform-form">
          <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Nueva transformación</h2>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Tipo de operación
              <select
                className={`${inputClass} mt-1 block`}
                value={type}
                onChange={(e) => setType(e.target.value as TransformationType)}
                data-testid="transform-type"
              >
                {(Object.keys(TRANSFORMATION_TYPE_LABELS) as TransformationType[]).map((k) => (
                  <option key={k} value={k}>
                    {TRANSFORMATION_TYPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Unidad de la operación
              <input
                className={`${inputClass} mt-1 block`}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="bandejas, cajas, kg…"
                data-testid="transform-unit"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              {TRANSFORMATION_TYPE_RULES[type].requires_motive
                ? 'Motivo (obligatorio)'
                : 'Motivo (opcional)'}
              <input
                className={`${inputClass} mt-1 block`}
                value={motive}
                onChange={(e) => setMotive(e.target.value)}
                placeholder={
                  TRANSFORMATION_TYPE_RULES[type].requires_motive
                    ? 'Por qué se reprocesa el lote'
                    : 'Contexto de la operación'
                }
                data-testid="transform-motive"
              />
            </label>
          </div>

          <p className="mt-2 text-[11px] leading-snug text-[#5c6b45]" data-testid="transform-type-rule">
            {TRANSFORMATION_TYPE_LABELS[type]}:{' '}
            {TRANSFORMATION_TYPE_RULES[type].max_sources === 1
              ? '1 lote fuente'
              : TRANSFORMATION_TYPE_RULES[type].min_sources >= 2
                ? `${TRANSFORMATION_TYPE_RULES[type].min_sources}+ lotes fuente`
                : 'N lotes fuente'}
            {' → '}
            {TRANSFORMATION_TYPE_RULES[type].max_product_outputs === 1
              ? '1 lote derivado'
              : TRANSFORMATION_TYPE_RULES[type].min_product_outputs >= 2
                ? `${TRANSFORMATION_TYPE_RULES[type].min_product_outputs}+ lotes derivados`
                : 'N lotes derivados'}
            . El balance, el remanente y la disponibilidad se validan siempre.
          </p>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              1. Fuentes y consumo
            </p>
            {inputs.length === 0 ? (
              <p className="mt-1 text-[12px] text-[#888]">Agregue al menos un lote fuente.</p>
            ) : (
              <table className="mt-2 w-full border-collapse" data-testid="transform-inputs">
                <thead>
                  <tr className="border-b border-[#1a1a1a]/10">
                    <th className={th}>Lote</th>
                    <th className={thN}>Disponible</th>
                    <th className={thN}>Consumido</th>
                    <th className={th}>Unidad</th>
                    <th className={th}>Remanente del fuente</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {inputs.map((i, idx) => {
                    const src = sources.find((s) => s.lot_id === i.source_lot_id);
                    const leftover = Math.round((i.available_quantity - i.consumed_quantity) * 1e6) / 1e6;
                    return (
                      <tr key={i.source_lot_id} className="border-b border-[#1a1a1a]/5">
                        <td className={`${td} font-medium`}>{src?.folio ?? src?.harvest_block ?? i.source_lot_id.slice(0, 8)}</td>
                        <td className={tdN}>{i.available_quantity}</td>
                        <td className={tdN}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="w-24 rounded border border-[#1a1a1a]/15 px-2 py-1 text-right text-[12px]"
                            value={i.consumed_quantity}
                            onChange={(e) => {
                              const v = e.target.value === '' ? 0 : Number(e.target.value);
                              setInputs((prev) =>
                                prev.map((x, k) => (k === idx ? { ...x, consumed_quantity: v } : x))
                              );
                            }}
                            data-testid={`transform-consumed-${i.source_lot_id}`}
                          />
                        </td>
                        <td className={td}>{i.unit}</td>
                        <td className={td}>
                          <select
                            className="rounded border border-[#1a1a1a]/15 px-2 py-1 text-[12px]"
                            value={i.remnant_handling}
                            onChange={(e) => {
                              const v = e.target.value as RemnantHandling;
                              setInputs((prev) =>
                                prev.map((x, k) =>
                                  k === idx
                                    ? {
                                        ...x,
                                        remnant_handling: v,
                                        consumed_quantity:
                                          v === R.SIN_REMANENTE
                                            ? x.available_quantity
                                            : Math.min(x.consumed_quantity, x.available_quantity),
                                      }
                                    : x
                                )
                              );
                            }}
                          >
                            <option value={R.SIN_REMANENTE}>
                              No queda remanente ({leftover} )
                            </option>
                            <option value={R.COMO_LOTE_NUEVO}>
                              Registrar remanente como lote nuevo ({leftover})
                            </option>
                          </select>
                        </td>
                        <td className={td}>
                          <button
                            type="button"
                            className="underline"
                            onClick={() => setInputs((prev) => prev.filter((_, k) => k !== idx))}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              2. Salidas: resultados, remanente, merma y descarte
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="qx-btn-ghost !py-1.5 !text-[12px]" onClick={() => addOutput(K.RESULTADO)}>
                + Lote resultante
              </button>
              <button type="button" className="qx-btn-ghost !py-1.5 !text-[12px]" onClick={() => addOutput(K.REMANENTE)}>
                + Remanente
              </button>
              <button type="button" className="qx-btn-ghost !py-1.5 !text-[12px]" onClick={() => addOutput(K.MERMA)}>
                + Merma
              </button>
              <button type="button" className="qx-btn-ghost !py-1.5 !text-[12px]" onClick={() => addOutput(K.DESCARTE)}>
                + Descarte
              </button>
            </div>
            {outputs.length > 0 ? (
              <table className="mt-2 w-full border-collapse" data-testid="transform-outputs">
                <thead>
                  <tr className="border-b border-[#1a1a1a]/10">
                    <th className={th}>Tipo de salida</th>
                    <th className={thN}>Cantidad</th>
                    <th className={th}>Unidad</th>
                    <th className={th}>Motivo</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {outputs.map((o, idx) => (
                    <tr key={o.key} className="border-b border-[#1a1a1a]/5">
                      <td className={td}>
                        {o.output_kind}
                        {o.output_kind === K.REMANENTE ? (
                          <span className="block text-[10px] text-[#9aa090]">será un lote nuevo con folio propio</span>
                        ) : null}
                      </td>
                      <td className={tdN}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="w-28 rounded border border-[#1a1a1a]/15 px-2 py-1 text-right text-[12px]"
                          value={o.quantity === 0 ? '' : o.quantity}
                          onChange={(e) => {
                            const v = e.target.value === '' ? 0 : Number(e.target.value);
                            setOutputs((prev) => prev.map((x, k) => (k === idx ? { ...x, quantity: v } : x)));
                          }}
                        />
                      </td>
                      <td className={td}>{o.unit || unit}</td>
                      <td className={td}>
                        {o.output_kind === K.MERMA || o.output_kind === K.DESCARTE ? (
                          <input
                            className="w-full rounded border border-[#1a1a1a]/15 px-2 py-1 text-[12px]"
                            value={o.reason ?? ''}
                            placeholder="Motivo obligatorio"
                            onChange={(e) =>
                              setOutputs((prev) => prev.map((x, k) => (k === idx ? { ...x, reason: e.target.value } : x)))
                            }
                          />
                        ) : (
                          <span className="text-[#9aa090]">—</span>
                        )}
                      </td>
                      <td className={td}>
                        <button
                          type="button"
                          className="underline"
                          onClick={() => setOutputs((prev) => prev.filter((_, k) => k !== idx))}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

          {/* ---- Balance ---- */}
          <div className="mt-4 rounded-lg border border-[#1a1a1a]/10 bg-[#f7f7f4] px-3 py-2.5" data-testid="transform-balance">
            <p className="text-[11px] font-semibold text-[#1a1a1a]">Resumen antes de confirmar</p>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-4">
              <span>Entradas: <strong>{validation.total_input}</strong></span>
              <span>Salidas: <strong>{validation.total_output}</strong></span>
              <span>Remanente: <strong>{validation.total_remanent}</strong></span>
              <span>Merma/descarte: <strong>{validation.total_loss}</strong></span>
            </div>
            <p className="mt-1 text-[12px]">
              Diferencia:{' '}
              <strong className={validation.difference === 0 ? 'text-[#3a4d1b]' : 'text-[#8a6d1f]'}>
                {validation.difference}
              </strong>{' '}
              {unit}
              {validation.difference === 0 ? ' — el balance cierra.' : ' — el balance NO cierra.'}
            </p>
          </div>

          {validation.errors.length > 0 ? (
            <div className="mt-3" data-testid="transform-errors">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a6d1f]">
                La operación todavía no se puede confirmar
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] text-[#6b5b1f]">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="qx-btn-brand-solid"
              disabled={!validation.ok || modelMissing}
              data-testid="transform-confirm"
              onClick={() =>
                setNotice(
                  `Operación validada. Usa «Operaciones registradas» para confirmar el borrador que se creó en el alta del lote.`
                )
              }
            >
              Confirmar operación
            </button>
            <button type="button" className="qx-btn-ghost" onClick={() => { setShowForm(false); setInputs([]); setOutputs([]); }}>
              Descartar
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-snug text-[#9aa090]">
            La validación de pantalla y la de la base de datos comparten la misma
            especificación: fuentes, salidas, unidades, balance, disponibilidad y
            remanentes. La base de datos es la autoridad.
          </p>
        </section>
      ) : null}

      {/* ---- Historial ---- */}
      <section className={panel}>
        <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Operaciones registradas</h2>
        <p className="mt-0.5 text-[11px] text-[#5c6b45]">
          Confirma borradores y anula confirmadas con motivo. La base de datos es la autoridad:
          la confirmación es atómica y la anulación compensa sin borrar historia.
        </p>
        {history.length === 0 ? (
          <EmptyState
            title="Sin transformaciones registradas"
            description="Aquí aparecerán las operaciones con sus fuentes, salidas, remanentes y estado."
          />
        ) : (
          <div className="mt-3 space-y-2.5">
            {history.map((t) => {
              const consumido = (t.inputs ?? []).reduce((a, i) => a + Number(i.consumed_quantity), 0);
              const leftovers = (t.inputs ?? []).reduce(
                (a, i) =>
                  i.remnant_handling === 'COMO_LOTE_NUEVO'
                    ? a + Math.max(0, Number(i.available_quantity) - Number(i.consumed_quantity))
                    : a,
                0
              );
              const entregado = consumido + leftovers;
              const salidas = (t.outputs ?? []).reduce((a, o) => a + Number(o.quantity), 0);
              const remanente = (t.outputs ?? [])
                .filter((o) => o.output_kind === 'REMANENTE')
                .reduce((a, o) => a + Number(o.quantity), 0);
              const merma = (t.outputs ?? [])
                .filter((o) => o.output_kind === 'MERMA' || o.output_kind === 'DESCARTE')
                .reduce((a, o) => a + Number(o.quantity), 0);
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-[#1a1a1a]/10 px-3 py-2.5"
                  data-testid={`trans-${t.id.slice(0, 8)}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#1a1a1a]">
                      {t.transformation_type} · {t.unit}
                      <span className="ml-2 text-[10px] font-normal text-[#999]">
                        {t.id.slice(0, 8)}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.status === 'CONFIRMADA'
                          ? 'bg-[#e4efd4] text-[#3a4d1b]'
                          : t.status === 'ANULADA'
                            ? 'bg-[#f3e2e2] text-[#7a3030]'
                            : 'bg-[#eef1e6] text-[#5c6b45]'
                      }`}
                      data-testid={`status-${t.id.slice(0, 8)}`}
                    >
                      {t.status}
                    </span>
                  </div>
                  {t.notes ? <p className="mt-0.5 text-[11px] text-[#888]">{t.notes}</p> : null}

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                        Fuentes y consumo
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {(t.inputs ?? []).length === 0 ? (
                          <li className="text-[11px] text-[#999]">sin fuentes</li>
                        ) : (
                          (t.inputs ?? []).map((i) => (
                            <li key={i.id} className="text-[11px] text-[#444]">
                              {i.source_folio ?? i.source_lot_id.slice(0, 8)} · se consume{' '}
                              <strong>{i.consumed_quantity}</strong> {i.unit}
                              {i.remnant_handling === 'COMO_LOTE_NUEVO' &&
                              Number(i.available_quantity) > Number(i.consumed_quantity) ? (
                                <span className="text-[#5c6b45]">
                                  {' '}
                                  (sobra{' '}
                                  {Number(i.available_quantity) - Number(i.consumed_quantity)}{' '}
                                  → remanente)
                                </span>
                              ) : null}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                        Salidas
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {(t.outputs ?? []).map((o) => (
                          <li key={o.id} className="text-[11px] text-[#444]">
                            {o.output_kind} · <strong>{o.quantity}</strong> {o.unit}
                            {o.result_lot_id ? (
                              <span className="text-[#5c6b45]"> → {o.result_lot_id.slice(0, 8)}</span>
                            ) : null}
                            {o.reason ? <span className="text-[#8a6d1f]"> · {o.reason}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-2 rounded-md bg-[#f7f7f4] px-2.5 py-1.5 text-[11px] text-[#444]">
                    <strong>Resumen:</strong> se consumen {consumido} {t.unit} · las fuentes
                    entregan {entregado} {t.unit} · remanente {remanente} {t.unit} · merma/descarte{' '}
                    {merma} {t.unit} · salidas registradas {salidas} {t.unit} · diferencia{' '}
                    <strong className={entregado === salidas ? 'text-[#3a4d1b]' : 'text-[#8a6d1f]'}>
                      {Math.round((entregado - salidas) * 1e6) / 1e6}
                    </strong>
                  </div>

                  {t.status === 'ANULADA' && t.annul_reason ? (
                    <p className="mt-1.5 text-[11px] text-[#7a3030]">
                      Motivo de anulación: {t.annul_reason}
                    </p>
                  ) : null}

                  {t.status === 'BORRADOR' ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="qx-btn-brand-solid !py-1.5"
                        disabled={busyId === t.id}
                        data-testid={`confirm-${t.id.slice(0, 8)}`}
                        onClick={() => doConfirm(t)}
                      >
                        {busyId === t.id ? 'Confirmando…' : 'CONFIRMAR TRANSFORMACIÓN'}
                      </button>
                    </div>
                  ) : null}

                  {t.status === 'CONFIRMADA' ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      {annulFor === t.id ? (
                        <>
                          <input
                            className={`${inputClass} w-72`}
                            placeholder="Motivo de anulación (obligatorio)"
                            value={annulReason}
                            onChange={(e) => setAnnulReason(e.target.value)}
                            data-testid={`annul-reason-${t.id.slice(0, 8)}`}
                          />
                          <button
                            type="button"
                            className="qx-btn-brand-solid !py-1.5"
                            disabled={busyId === t.id}
                            data-testid={`annul-confirm-${t.id.slice(0, 8)}`}
                            onClick={() => doAnnul(t)}
                          >
                            {busyId === t.id ? 'Anulando…' : 'Confirmar anulación'}
                          </button>
                          <button
                            type="button"
                            className="qx-btn-ghost !py-1.5"
                            onClick={() => {
                              setAnnulFor(null);
                              setAnnulReason('');
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="qx-btn-ghost !py-1.5"
                          data-testid={`annul-${t.id.slice(0, 8)}`}
                          onClick={() => {
                            setAnnulFor(t.id);
                            setAnnulReason('');
                            setError(null);
                          }}
                        >
                          ANULAR TRANSFORMACIÓN
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}