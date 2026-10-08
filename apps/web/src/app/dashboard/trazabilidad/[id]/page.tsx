'use client';

/**
 * QualityNX — D-033 · TRAZABILIDAD OPERACIONAL
 *
 * Vista navegable de un lote: identidad, estado, disponibilidad, origen,
 * transformaciones, descendencia, inspecciones, decisiones, disposiciones e
 * historial cronológico.
 *
 * No inventa datos. Deriva de lots, lot_genealogy, lot_transformations,
 * lot_stock_movements, lot_availability, inspections, decisions,
 * lot_dispositions y lot_stage_events. Una transformación ANULADA se muestra
 * como antecedente histórico, nunca como flujo vigente.
 */

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getCurrentSession, getUserProfile, getLotTraceGraph, availabilityLabel } from '@qualitynx/database';
import type { LotTraceGraph, TraceLink } from '@qualitynx/database';
import type { UserRole } from '@qualitynx/shared';
import { Banner, EmptyState, LoadingBlock } from '@/components/ui';

const panel = 'rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-3.5';
const th = 'px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const td = 'px-2.5 py-2 text-[12px] text-[#1a1a1a]';

function qty(n: number | null | undefined, unit: string | null | undefined): string {
  if (n == null) return 'Cantidad no declarada';
  return unit ? `${n} ${unit}` : `${n} · unidad no declarada`;
}

function EstadoTr({ estado }: { estado: string }) {
  const tone =
    estado === 'CONFIRMADA'
      ? 'bg-[#e4efd4] text-[#3a4d1b]'
      : estado === 'ANULADA'
        ? 'bg-[#f3e2e2] text-[#7a3030]'
        : 'bg-[#eef1e6] text-[#5c6b45]';
  const label = estado === 'BORRADOR' ? 'Borrador' : estado === 'CONFIRMADA' ? 'Confirmada' : 'Anulada';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span>;
}

function LinkLote({ link, sufijo }: { link: TraceLink; sufijo: string }) {
  const t = link.transformation;
  return (
    <tr>
      <td className={td}>
        <Link
          href={`/dashboard/trazabilidad/${link.lot.id}`}
          className="font-semibold text-[#1a1a1a] underline decoration-[#1a1a1a]/25 underline-offset-2"
        >
          {link.lot.folio ?? link.lot.harvest_block ?? link.lot.id.slice(0, 8)}
        </Link>
        <span className="ml-1 text-[10px] text-[#999]">{sufijo}</span>
      </td>
      <td className={td}>{link.lot.lot_type ?? '—'}</td>
      <td className={td}>{link.lot.status ?? '—'}</td>
      <td className={td}>{qty(link.quantity, link.unit)}</td>
      <td className={td}>
        {t ? (
          <span className="flex flex-wrap items-center gap-1">
            <EstadoTr estado={t.status} />
            <span className="text-[11px] text-[#5c6b45]">
              {t.transformation_type} · {t.unit}
            </span>
            {t.confirmed_at ? (
              <span className="text-[10px] text-[#999]">
                confirmada {new Date(t.confirmed_at).toLocaleDateString('es-CL')}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[11px] text-[#999]">sin transformación registrada</span>
        )}
        {link.historical ? (
          <p className="mt-0.5 text-[10px] text-[#7a3030]">
            Antecedente histórico: la transformación está anulada, no es flujo vigente.
          </p>
        ) : null}
        {t?.status === 'ANULADA' && t.annul_reason ? (
          <p className="mt-0.5 text-[10px] text-[#7a3030]">Motivo de anulación: {t.annul_reason}</p>
        ) : null}
      </td>
    </tr>
  );
}

export default function TrazabilidadPage({ params }: { params: Promise<{ id: string }> }) {
  // En esta versión de Next los params de ruta llegan como Promise.
  const lotId = use(params).id;
  const [role, setRole] = useState<UserRole | null>(null);
  const [graph, setGraph] = useState<LotTraceGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await getLotTraceGraph(lotId);
    if (!r.ok) {
      setError(r.error);
      setGraph(null);
    } else {
      setGraph(r.data);
    }
    setLoading(false);
  }, [lotId]);

  useEffect(() => {
    (async () => {
      const { session } = await getCurrentSession();
      if (!session) return;
      const { data } = await getUserProfile(session.user.id);
      if (data) setRole((data as { role: UserRole }).role);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  /** Historial cronológico: solo eventos respaldados por datos reales. */
  const timeline = useMemo(() => {
    if (!graph) return [] as Array<{ at: string; tipo: string; texto: string; href?: string }>;
    const ev: Array<{ at: string; tipo: string; texto: string; href?: string }> = [];
    ev.push({
      at: graph.lot.created_at ?? '',
      tipo: 'origen',
      texto: `Lote creado: ${graph.lot.folio ?? graph.lot.id.slice(0, 8)} · ${
        graph.lot.lot_type ?? 'ORIGEN'
      } · ${graph.lot.producer_name ?? 'productor sin dato'}`,
    });
    for (const s of graph.stage_events) {
      ev.push({
        at: s.occurred_at,
        tipo: 'etapa',
        texto: `Etapa ${s.event_type}: ${s.stage_name ?? '—'}${s.notes ? ' · ' + s.notes : ''}`,
      });
    }
    for (const u of graph.upstream) {
      if (!u.transformation) continue;
      ev.push({
        at: u.transformation.confirmed_at ?? u.transformation.annulled_at ?? '',
        tipo: 'origen',
        texto: `Lote derivado de ${u.lot.folio ?? u.lot.id.slice(0, 8)} · ${
          u.transformation.transformation_type
        } ${u.transformation.status} · ${qty(u.quantity, u.unit)}`,
        href: `/dashboard/trazabilidad/${u.lot.id}`,
      });
    }
    for (const d of graph.downstream) {
      if (!d.transformation) continue;
      ev.push({
        at: d.transformation.confirmed_at ?? d.transformation.annulled_at ?? '',
        tipo: 'descendencia',
        texto: `Origina ${d.lot.folio ?? d.lot.id.slice(0, 8)} · ${
          d.transformation.transformation_type
        } ${d.transformation.status} · ${qty(d.quantity, d.unit)}`,
        href: `/dashboard/trazabilidad/${d.lot.id}`,
      });
    }
    for (const m of graph.movements) {
      ev.push({
        at: m.created_at,
        tipo: 'movimiento',
        texto: `${m.movement_type} ${m.direction} ${m.quantity} ${m.unit} · ${m.reason}`,
      });
    }
    for (const i of graph.inspections) {
      ev.push({
        at: i.completed_at ?? i.inspected_at ?? '',
        tipo: 'inspección',
        texto: `Inspección ${i.status ?? ''} · ${i.point_name ?? 'punto sin dato'}${
          i.stage_name ? ' · ' + i.stage_name : ''
        }${i.result ? ' · ' + i.result : ''}${i.lot_folio ? ` (lote ${i.lot_folio})` : ''}`,
      });
    }
    for (const d of graph.decisions) {
      ev.push({
        at: d.decided_at ?? '',
        tipo: 'decisión',
        texto: `Decisión ${d.decision_label} (${d.decision_code}) · ${d.status}${
          d.fundamento ? ' · ' + d.fundamento : ''
        }${d.lot_folio ? ` (lote ${d.lot_folio})` : ''}`,
      });
    }
    for (const d of graph.dispositions) {
      ev.push({
        at: d.occurred_at,
        tipo: 'disposición',
        texto: `Disposición ${d.disposition_type} · ${qty(d.quantity, d.unit)} · ${d.reason}`,
      });
    }
    return ev.sort((a, b) => (a.at || '9999').localeCompare(b.at || '9999'));
  }, [graph]);

  if (loading) return <LoadingBlock />;

  if (error || !graph) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/lots" className="text-[12px] text-[#5c6b45] underline">
          ← Volver a Lotes
        </Link>
        <Banner type="error">{error ?? 'No se pudo construir la trazabilidad.'}</Banner>
      </div>
    );
  }

  const av = graph.availability;
  // Sin unidad declarada no hay saldo verificable: no se muestra un 0 que sugiere una medicion real.
  const sinSaldo =
    av?.availability_status === 'CANTIDAD_NO_DECLARADA' || av?.availability_status === 'SIN_APERTURA';
  const identidad = graph.lot.folio ?? graph.lot.harvest_block ?? graph.lot.id.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">
            Trazabilidad operacional · {role ?? ''}
          </p>
          <h1 className="text-[22px] font-semibold text-[#1a1a1a]">{identidad}</h1>
        </div>
        <Link href="/dashboard/lots" className="text-[12px] text-[#5c6b45] underline">
          ← Volver a Lotes
        </Link>
      </div>

      {/* 1-3. Identidad, estado y disponibilidad */}
      <section className={panel}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888]">Folio QualityNX</p>
            <p className="text-[15px] font-semibold text-[#1a1a1a]">{graph.lot.folio ?? 'sin folio'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888]">Estado</p>
            <p className="text-[15px] font-semibold text-[#1a1a1a]">{graph.lot.status ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888]">Disponibilidad</p>
            <p className="text-[15px] font-semibold text-[#1a1a1a]">
              {sinSaldo ? (
                'Cantidad no declarada'
              ) : av?.available_quantity == null ? (
                'Sin saldo registrado'
              ) : (
                `${av.available_quantity} ${av.unit ?? ''}`
              )}
            </p>
            <p className="text-[10px] text-[#5c6b45]">
              {sinSaldo
                ? 'Sin unidad declarada no hay saldo verificable. No se infiere ninguna.'
                : availabilityLabel(av?.availability_status ?? null)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#888]">Etapa</p>
            <p className="text-[15px] font-semibold text-[#1a1a1a]">{graph.lot.current_stage_name ?? 'sin etapa'}</p>
            {graph.lot.entry_stage_name && graph.lot.entry_stage_name !== graph.lot.current_stage_name ? (
              <p className="text-[10px] text-[#5c6b45]">ingresó en {graph.lot.entry_stage_name}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[#1a1a1a]/8 pt-3 text-[12px] sm:grid-cols-4">
          <span>Productor: <strong>{graph.lot.producer_name ?? '—'}</strong></span>
          <span>Especie: <strong>{graph.lot.species_name ?? '—'}</strong></span>
          <span>Variedad: <strong>{graph.lot.variety_name ?? '—'}</strong></span>
          <span>Fecha de fruta: <strong>{graph.lot.fruit_date ?? '—'}</strong></span>
          <span>Tipo de lote: <strong>{graph.lot.lot_type ?? '—'}</strong></span>
          <span>Embalaje: <strong>{graph.lot.packaging_type ?? '—'}</strong></span>
          <span>Bloque de cosecha: <strong>{graph.lot.harvest_block ?? '—'}</strong></span>
          <span>Temporada: <strong>{graph.lot.season_name ?? '—'}</strong></span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#5c6b45]">
          <span>
            Cantidad declarada:{' '}
            <strong>
              {graph.lot.quantity == null ? 'no declarada' : qty(graph.lot.quantity, graph.lot.quantity_unit)}
            </strong>
          </span>
          <span>
            Movimientos del libro: entradas <strong>{av?.total_in ?? 0}</strong> · salidas{' '}
            <strong>{av?.total_out ?? 0}</strong>
          </span>
          {graph.lot.kg_declarados != null ? (
            <span>
              Kg declarados (guía): <strong>{graph.lot.kg_declarados}</strong>
            </span>
          ) : null}
        </div>
      </section>

      {/* 4. Origen */}
      <section className={panel}>
        <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Origen</h2>
        <p className="text-[11px] text-[#5c6b45]">
          Lotes de origen y transformación que los relaciona. Sin unidad declarada no se inventa
          ninguna.
        </p>
        {graph.upstream.length === 0 ? (
          <p className="mt-2 text-[12px] text-[#888]">
            Es un lote de origen: no tiene lotes fuente.
          </p>
        ) : (
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Lote origen</th>
                <th className={th}>Tipo</th>
                <th className={th}>Estado</th>
                <th className={th}>Cantidad</th>
                <th className={th}>Transformación</th>
              </tr>
            </thead>
            <tbody>
              {graph.upstream.map((l) => (
                <LinkLote key={`${l.lot.id}-${l.relation_type}`} link={l} sufijo="origen" />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 5-6. Descendencia */}
      <section className={panel}>
        <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Descendencia</h2>
        <p className="text-[11px] text-[#5c6b45]">
          Lotes derivados, remanentes y mermasproducedas por transformaciones posteriores.
        </p>
        {graph.downstream.length === 0 ? (
          <p className="mt-2 text-[12px] text-[#888]">
            Este lote no origina transformaciones registradas.
          </p>
        ) : (
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Lote resultante</th>
                <th className={th}>Tipo</th>
                <th className={th}>Estado</th>
                <th className={th}>Cantidad</th>
                <th className={th}>Transformación</th>
              </tr>
            </thead>
            <tbody>
              {graph.downstream.map((l) => (
                <LinkLote key={`${l.lot.id}-${l.relation_type}`} link={l} sufijo={l.depth === 0 ? 'resultante' : 'resultante ( indirecto )'} />
              ))}
            </tbody>
          </table>
        )}
        {(() => {
          const perdidas = graph.downstream.filter((d) => !d.lot);
          return perdidas.length === 0 ? null : (
            <p className="mt-1 text-[11px] text-[#7a3030]">
              {perdidas.length} salida(s) sin lote (merma o descarte).
            </p>
          );
        })()}
      </section>

      {/* 7-9. Inspecciones, decisiones y disposiciones */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={panel}>
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Inspecciones</h2>
          {graph.inspections.length === 0 ? (
            <p className="mt-1 text-[12px] text-[#888]">Sin inspecciones registradas.</p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {graph.inspections.map((i) => (
                <li key={i.id} className="text-[12px] text-[#444]">
                  <strong>{i.point_name ?? 'Punto sin dato'}</strong>
                  {i.stage_name ? <span className="text-[#5c6b45]"> · {i.stage_name}</span> : null}
                  <span className="text-[#5c6b45]"> · {i.status}</span>
                  {i.lot_folio ? (
                    <Link
                      href={`/dashboard/trazabilidad/${i.lot_id}`}
                      className="ml-1 text-[11px] underline"
                    >
                      (lote {i.lot_folio})
                    </Link>
                  ) : null}
                  {i.result ? <span className="block text-[11px] text-[#5c6b45]">{i.result}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={panel}>
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Decisiones</h2>
          {graph.decisions.length === 0 ? (
            <p className="mt-1 text-[12px] text-[#888]">Sin decisiones registradas.</p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {graph.decisions.map((d) => (
                <li key={d.id} className="text-[12px] text-[#444]">
                  <strong>{d.decision_label}</strong> <span className="text-[#5c6b45]">({d.decision_code})</span>
                  <span className="text-[#5c6b45]"> · {d.status}</span>
                  {d.lot_folio ? (
                    <Link
                      href={`/dashboard/trazabilidad/${d.lot_id}`}
                      className="ml-1 text-[11px] underline"
                    >
                      (lote {d.lot_folio})
                    </Link>
                  ) : null}
                  {d.fundamento ? <span className="block text-[11px] text-[#5c6b45]">{d.fundamento}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={panel}>
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Disposiciones</h2>
          {graph.dispositions.length === 0 ? (
            <EmptyState
              title="Sin disposiciones"
              description="No hay despacho, rechazo, segregación, retención ni devolución registrados para este lote."
            />
          ) : (
            <ul className="mt-1 space-y-1.5">
              {graph.dispositions.map((d) => (
                <li key={d.id} className="text-[12px] text-[#444]">
                  <strong>{d.disposition_type}</strong> · {qty(d.quantity, d.unit)}
                  <span className="block text-[11px] text-[#5c6b45]">{d.reason}</span>
                  {d.destination_reference ? (
                    <span className="block text-[11px] text-[#5c6b45]">
                      Destino referencial: {d.destination_reference}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 10. Historial cronológico */}
      <section className={panel}>
        <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Historial</h2>
        <p className="text-[11px] text-[#5c6b45]">
          Solo eventos respaldados por datos reales. Si no hay información registrada, no se muestra.
        </p>
        {timeline.length === 0 ? (
          <p className="mt-2 text-[12px] text-[#888]">Sin eventos registrados.</p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {timeline.map((e, i) => (
              <li key={i} className="flex gap-2 text-[12px]">
                <span className="w-[150px] shrink-0 text-[10px] uppercase tracking-[0.06em] text-[#888]">
                  {e.tipo}
                </span>
                <span className="text-[#444]">
                  {e.at ? (
                    <span className="mr-1 text-[10px] text-[#999]">
                      {new Date(e.at).toLocaleString('es-CL')}
                    </span>
                  ) : null}
                  {e.texto}
                  {e.href ? (
                    <Link href={e.href} className="ml-1 underline">
                      abrir
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}