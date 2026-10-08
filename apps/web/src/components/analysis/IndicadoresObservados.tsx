'use client';


/**
 * QualityNX V2 — Indicadores OBSERVADOS (solo lectura).
 * Componente reutilizable: se muestra como pestaña «Observados» del
 * Análisis gerencial y en su ruta propia.
 *
 * Dos indicadores DESCRIPTIVOS, sin umbral, sin color, sin
 * semáforo y sin decisión:
 *   1. Promedio de Brix observado por día.
 *   2. Promedio de temperatura observada por semana ISO.
 *
 * No consolidan múltiples muestras por inspección (N>1 sigue
 * PENDIENTE DE ESPECIFICACIÓN). Cada fila es una MEDICIÓN.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentSession,
  getObservedIndicator,
  getUserProfile,
  listOperationalStages,
} from '@qualitynx/database';
import type {
  ObservedIndicatorBucket,
  ObservedIndicatorResult,
  ObservedMeasurementRow,
  OperationalStage,
  UserRole,
} from '@qualitynx/shared';
import { observedWeekKey } from '@qualitynx/shared';
import { EmptyState, LoadingBlock, inputClass } from '@/components/ui';

const BRIX_CRITERION = 'Sólidos solubles (°Brix)';
const BRIX_UNIT = '°Bx';
const TEMPERATURE_CRITERIA = [
  'Temperatura de fruta',
  'Temperatura de producto',
  'Temperatura de cámara',
  'Temperatura',
];
const TEMPERATURE_UNIT = '°C';

const REASON_LABEL: Record<string, string> = {
  EMPTY: 'Valor vacío',
  NON_NUMERIC: 'No numérico',
  AMBIGUOUS: 'Formato ambiguo',
  UNIT_MISSING: 'Unidad ausente',
  UNIT_INCOMPATIBLE: 'Unidad incompatible',
  NO_DATE: 'Sin fecha operativa',
};

const panel = 'rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-3.5';
const th = 'px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const td = 'px-2.5 py-2 text-[12px] text-[#1a1a1a]';

function Exclusions({ bucket }: { bucket: ObservedIndicatorBucket }) {
  const entries = Object.entries(bucket.excluded_by_reason ?? {});
  if (entries.length === 0) {
    return <span className="text-[#9aa090]">0</span>;
  }
  return (
    <span className="text-[#5c6b45]">
      {entries.map(([reason, n]) => `${REASON_LABEL[reason] ?? reason}: ${n}`).join(' · ')}
    </span>
  );
}

function MethodNote({
  title,
  criterion,
  unit,
  grouping,
  stages,
  extra,
}: {
  title: string;
  criterion: string;
  unit: string;
  grouping: string;
  stages: string;
  extra?: string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-[#1a1a1a]/10 bg-[#f7f7f4] px-3 py-2.5 text-[11px] leading-snug text-[#5c6b45]">
      <p className="font-semibold text-[#1a1a1a]">Regla de cálculo — {title}</p>
      <p>
        <span className="font-medium">Fórmula:</span> promedio = Σ valores numéricos
        evaluables / nº de mediciones evaluables del bucket. Cada medición es una
        observación; no se consolida por inspección.
      </p>
      <p>
        <span className="font-medium">Criterio:</span> {criterion} ·{' '}
        <span className="font-medium">Unidad esperada:</span> {unit} (no se
        convierten unidades) · <span className="font-medium">Etapas:</span> {stages}
      </p>
      <p>
        <span className="font-medium">Agrupación:</span> {grouping} ·{' '}
        <span className="font-medium">Campo de fecha:</span>{' '}
        <code className="text-[10px]">inspections.inspected_at</code> (UTC) ·{' '}
        <span className="font-medium">Conversión numérica:</span> solo se acepta{' '}
        <code className="text-[10px]">^[+-]?(\d+(\.\d+)?|\.\d+)$</code>; se excluyen y
        se cuentan vacío, no numérico, formato ambiguo, unidad ausente y unidad
        incompatible.
      </p>
      {extra ? <p>{extra}</p> : null}
    </div>
  );
}

function TraceTable({ rows }: { rows: ObservedMeasurementRow[] }) {
  if (rows.length === 0) {
    return <p className="px-3 py-4 text-[12px] text-[#888]">Sin registros.</p>;
  }
  return (
    <div className="mt-2 max-h-[26rem] overflow-auto rounded-lg border border-[#1a1a1a]/10">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-[#1a1a1a]/10">
            <th className={th}>Fecha operativa</th>
            <th className={th}>Valor original</th>
            <th className={th}>Unidad</th>
            <th className={th}>Criterio</th>
            <th className={th}>Etapa</th>
            <th className={th}>Lote</th>
            <th className={th}>Inspección</th>
            <th className={th}>Evidencia</th>
            <th className={th}>Cálculo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.measurement_id} className="border-b border-[#1a1a1a]/5">
              <td className={td}>{r.observed_at?.slice(0, 10) ?? '—'}</td>
              <td className={`${td} font-medium`}>
                {r.value_original === null ? (
                  <span className="text-[#9aa090]">(vacío)</span>
                ) : (
                  r.value_original
                )}
              </td>
              <td className={td}>{r.unit ?? '—'}</td>
              <td className={td}>{r.criterion_name}</td>
              <td className={td}>{r.operational_stage_name ?? '—'}</td>
              <td className={td}>
                {r.lot_id ? (
                  <Link
                    className="underline"
                    href={`/dashboard/lots/${r.lot_id}/report`}
                  >
                    {r.lot_folio ?? r.lot_harvest_block ?? r.lot_id.slice(0, 8)}
                  </Link>
                ) : (
                  '—'
                )}
              </td>
              <td className={td}>
                <Link className="underline" href={`/dashboard/inspections/${r.inspection_id}/report`}>
                  {r.inspection_id.slice(0, 8)}
                </Link>
              </td>
              <td className={td}>
                {r.evidence_count > 0 ? (
                  `${r.evidence_count}`
                ) : (
                  <span className="text-[#9aa090]">sin evidencia</span>
                )}
              </td>
              <td className={td}>
                {r.included ? (
                  <span>incluido</span>
                ) : (
                  <span className="text-[#8a6d1f]">
                    excluido · {REASON_LABEL[r.exclusion_reason ?? ''] ?? r.exclusion_reason}
                  </span>
                )}
                {r.sample_id ? (
                  <span className="block text-[10px] text-[#9aa090]">
                    muestra {r.sample_id.slice(0, 8)}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IndicadoresObservados() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [stages, setStages] = useState<OperationalStage[]>([]);

  const [brixStage, setBrixStage] = useState('');
  const [tempStage, setTempStage] = useState('');

  const [brix, setBrix] = useState<ObservedIndicatorResult | null>(null);
  const [temp, setTemp] = useState<ObservedIndicatorResult | null>(null);
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const [loadingBrix, setLoadingBrix] = useState(false);
  const [loadingTemp, setLoadingTemp] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { session: sessionData } = await getCurrentSession();
      if (!sessionData) {
        router.replace('/login');
        return;
      }
      const { data } = await getUserProfile(sessionData.user.id);
      if (data) {
        setCompanyId((data as { company_id: string | null }).company_id);
        setRole((data as { role: UserRole }).role);
      }
      const st = await listOperationalStages();
      setStages(st.data ?? []);
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBrix = useCallback(async () => {
    if (!companyId) return;
    setLoadingBrix(true);
    const res = await getObservedIndicator({
      companyId,
      criterionNames: [BRIX_CRITERION],
      operationalStageId: brixStage || null,
      expectedUnit: BRIX_UNIT,
      grouping: 'DAY',
    });
    setBrix(res.data ?? null);
    setLoadingBrix(false);
  }, [companyId, brixStage]);

  const loadTemp = useCallback(async () => {
    if (!companyId) return;
    if (!tempStage) {
      setTemp(null);
      return;
    }
    setLoadingTemp(true);
    const res = await getObservedIndicator({
      companyId,
      criterionNames: TEMPERATURE_CRITERIA,
      operationalStageId: tempStage,
      expectedUnit: TEMPERATURE_UNIT,
      grouping: 'ISO_WEEK',
    });
    setTemp(res.data ?? null);
    setLoadingTemp(false);
  }, [companyId, tempStage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBrix();
  }, [loadBrix]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemp();
  }, [loadTemp]);

  const tempRows = useMemo(
    () => (temp?.rows ?? []).filter((r) => r.observed_at),
    [temp]
  );

  const stageName = (id: string) =>
    stages.find((s) => s.id === id)?.name ?? '(etapa no resuelta)';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">
          Indicadores observados
        </h1>
        <p className="mt-1 max-w-4xl text-[12px] leading-relaxed text-[#5c6b45]">
          Valores descriptivos calculados desde mediciones persistidas. No son
          cumplimiento de una especificación, no asignan clasificación ni semáforo,
          no generan decisión y no consolidan múltiples muestras por inspección.
          Cada fila es una medición individual, con su valor original intacto.
        </p>
        <p className="mt-1 text-[11px] text-[#9aa090]">
          Sesión: {role ?? '—'} · acceso de consulta. Aislamiento por empresa
          heredado de las políticas RLS existentes (sin políticas nuevas).
        </p>
      </header>

      {/* ---------------- BRIX POR DÍA ---------------- */}
      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1a1a]">
              Promedio de Brix observado por día
            </h2>
            <p className="text-[11px] text-[#5c6b45]">
              Criterio <code className="text-[10px]">{BRIX_CRITERION}</code> ·{' '}
              {brix?.totals.included_count ?? 0} mediciones incluidas ·{' '}
              {brix?.totals.excluded_count ?? 0} excluidas
            </p>
          </div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
            Etapa (opcional)
            <select
              className={`${inputClass} mt-1 block w-72`}
              value={brixStage}
              onChange={(e) => setBrixStage(e.target.value)}
            >
              <option value="">Todas las etapas</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <MethodNote
          title="Brix por día"
          criterion={brix?.totals.criterion_names.join(', ') || BRIX_CRITERION}
          unit={brix?.totals.units_expected.join(', ') ?? BRIX_UNIT}
          grouping="día (YYYY-MM-DD, UTC)"
          stages={
            brixStage
              ? stageName(brixStage)
              : brix?.totals.operational_stages.join(' · ') || '(sin criterios)'
          }
          extra={
            brixStage
              ? 'Etapa única: el promedio no mezcla contextos operacionales.'
              : 'Sin filtro de etapa: cada fila indica las etapas que aportan registros evaluables.'
          }
        />

        {loadingBrix ? (
          <LoadingBlock />
        ) : !brix || brix.buckets.length === 0 ? (
          <EmptyState title="Sin mediciones para este filtro" description="No hay mediciones del criterio dentro de los filtros aplicados." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#1a1a1a]/10">
                  <th className={th}>Fecha</th>
                  <th className={th}>Promedio Brix</th>
                  <th className={th}>Incluidas</th>
                  <th className={th}>Excluidas</th>
                  <th className={th}>Etapas que aportan</th>
                  <th className={th}>Unidades</th>
                  <th className={th}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {brix.buckets.map((bk) => (
                  <tr key={bk.bucket} className="border-b border-[#1a1a1a]/5">
                    <td className={`${td} font-medium`}>{bk.bucket}</td>
                    <td className={td}>
                      {bk.average === null ? '—' : `${bk.average} ${BRIX_UNIT}`}
                    </td>
                    <td className={td}>{bk.included_count}</td>
                    <td className={td}>
                      <Exclusions bucket={bk} />
                      <span className="block text-[10px] text-[#9aa090]">
                        total {bk.excluded_count}
                      </span>
                    </td>
                    <td className={td}>{bk.contributing_stages.join(' · ') || '—'}</td>
                    <td className={td}>{bk.units.join(' · ') || '—'}</td>
                    <td className={td}>
                      <button
                        type="button"
                        className="underline"
                        onClick={() =>
                          setOpenBucket(openBucket === bk.bucket ? null : bk.bucket)
                        }
                      >
                        {openBucket === bk.bucket ? 'ocultar' : 'ver mediciones'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {openBucket ? (
              <TraceTable
                rows={brix.rows.filter((r) => r.observed_at?.slice(0, 10) === openBucket)}
              />
            ) : null}
          </div>
        )}
      </section>

      {/* ---------------- TEMPERATURA POR SEMANA ---------------- */}
      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1a1a]">
              Promedio de temperatura observada por semana ISO
            </h2>
            <p className="text-[11px] text-[#5c6b45]">
              {temp?.totals.included_count ?? 0} mediciones incluidas ·{' '}
              {temp?.totals.excluded_count ?? 0} excluidas
            </p>
          </div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
            Etapa (obligatoria)
            <select
              className={`${inputClass} mt-1 block w-72`}
              value={tempStage}
              onChange={(e) => setTempStage(e.target.value)}
            >
              <option value="">— Seleccionar etapa —</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-2 rounded-lg border border-[#4A5D23]/25 bg-[#f4f6ee] px-3 py-2 text-[11px] leading-snug text-[#5c6b45]">
          La temperatura existe en QualityNX en contextos operacionales distintos
          (cosecha, recepción, frío y despacho). Este indicador exige una etapa
          explícita y <strong>no mezcla</strong> temperaturas de contextos
          diferentes. No representa condición de despacho, pallet ni embarque: esas
          dimensiones no existen en el modelo actual.
        </p>

        <MethodNote
          title="Temperatura por semana"
          criterion={temp?.totals.criterion_names.join(', ') || 'criterios de temperatura'}
          unit={temp?.totals.units_expected.join(', ') ?? TEMPERATURE_UNIT}
          grouping="semana ISO-8601 (lunes inicio; semana 1 = primer jueves del año)"
          stages={tempStage ? stageName(tempStage) : '(sin etapa seleccionada)'}
          extra="No se aplica ningún límite de temperatura: el promedio no cumple ni incumple."
        />

        {!tempStage ? (
          <p className="mt-3 text-[12px] text-[#888]">
            Selecciona una etapa para consultar. Sin etapa no se muestran datos, para
            no presentar un promedio que mezcle contextos operacionales.
          </p>
        ) : loadingTemp ? (
          <LoadingBlock />
        ) : !temp || temp.buckets.length === 0 ? (
          <EmptyState title="Sin mediciones de temperatura para esta etapa" description="No hay mediciones del criterio de temperatura en la etapa seleccionada." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#1a1a1a]/10">
                  <th className={th}>Semana ISO</th>
                  <th className={th}>Año</th>
                  <th className={th}>Promedio</th>
                  <th className={th}>Incluidas</th>
                  <th className={th}>Excluidas</th>
                  <th className={th}>Unidades</th>
                  <th className={th}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {temp.buckets.map((bk) => (
                  <tr key={bk.bucket} className="border-b border-[#1a1a1a]/5">
                    <td className={`${td} font-medium`}>{bk.bucket}</td>
                    <td className={td}>{bk.iso_year ?? '—'}</td>
                    <td className={td}>
                      {bk.average === null ? '—' : `${bk.average} ${TEMPERATURE_UNIT}`}
                    </td>
                    <td className={td}>{bk.included_count}</td>
                    <td className={td}>
                      <Exclusions bucket={bk} />
                      <span className="block text-[10px] text-[#9aa090]">
                        total {bk.excluded_count}
                      </span>
                    </td>
                    <td className={td}>{bk.units.join(' · ') || '—'}</td>
                    <td className={td}>
                      <button
                        type="button"
                        className="underline"
                        onClick={() =>
                          setOpenBucket(openBucket === bk.bucket ? null : bk.bucket)
                        }
                      >
                        {openBucket === bk.bucket ? 'ocultar' : 'ver mediciones'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {openBucket ? (
              <TraceTable
                rows={temp.rows.filter((r) => r.observed_at && observedWeekKey(new Date(r.observed_at)) === openBucket)}
              />
            ) : null}
          </div>
        )}

        {tempStage && temp && tempRows.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] font-semibold text-[#4A5D23]">
              Trazabilidad completa ({tempRows.length} mediciones)
            </summary>
            <TraceTable rows={tempRows} />
          </details>
        ) : null}
      </section>
    </div>
  );
}
