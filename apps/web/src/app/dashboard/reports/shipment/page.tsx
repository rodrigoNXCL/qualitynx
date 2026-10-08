'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInspections,
  listLots,
  listQualityClassificationsByLot,
  listInspectionPoints,
  listMasterData,
  listDecisionsByLot,
} from '@qualitynx/database';
import {
  InspectionStatus,
  LotType,
  LOT_TYPE_LABELS,
  type DecisionRecord,
  type Inspection,
  type InspectionPoint,
  type Lot,
  type QualityClassification,
} from '@qualitynx/shared';
import { EmptyState, LoadingBlock, inputClass } from '@/components/ui';

/**
 * Informe de calidad de embarque (1..N lotes).
 * Contexto de embarque = campos de referencia del informe (no crea entidad Despacho).
 * No es packing list. No asume relaciones lote↔despacho inexistentes (D-026).
 */
type LotQualityRow = {
  lot: Lot;
  classification: QualityClassification | null;
  inspections: Inspection[];
  completed: number;
  lastPreDespacho: Inspection | null;
  lastDecision: DecisionRecord | null;
  qualitySummary: string;
};

const SEMAPHORE_STYLES: Record<string, string> = {
  VERDE: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  AMARILLO: 'bg-[#fef3c7] text-[#92400e] border-amber-300/70',
  ROJO: 'bg-[#fee2e2] text-[#991b1b] border-red-300/70',
};

export default function ShipmentQualityReportPage() {
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState<Lot[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [points, setPoints] = useState<InspectionPoint[]>([]);
  const [producers, setProducers] = useState<{ id: string; name: string }[]>([]);
  const [speciesList, setSpeciesList] = useState<{ id: string; name: string }[]>([]);
  const [varietiesList, setVarietiesList] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [building, setBuilding] = useState(false);
  const [classByLot, setClassByLot] = useState<Map<string, QualityClassification>>(new Map());
  const [decisionsByLot, setDecisionsByLot] = useState<Map<string, DecisionRecord[]>>(new Map());

  // Contexto de embarque (referencia del informe; no persiste entidad Despacho)
  const [contextNumber, setContextNumber] = useState('');
  const [contextDate, setContextDate] = useState('');
  const [contextOriginPlant, setContextOriginPlant] = useState('');
  const [contextOriginCountry, setContextOriginCountry] = useState('');
  const [contextGuide, setContextGuide] = useState('');
  const [contextDestination, setContextDestination] = useState('');
  const [contextRecipient, setContextRecipient] = useState('');
  const [contextNotes, setContextNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [lotsRes, inspRes, pointsRes, prodRes, spRes, varRes] = await Promise.all([
      listLots(),
      listInspections(),
      listInspectionPoints(),
      listMasterData('producers'),
      listMasterData('species'),
      listMasterData('varieties'),
    ]);
    setLots((lotsRes.data as Lot[]) ?? []);
    setInspections((inspRes.data as Inspection[]) ?? []);
    setPoints((pointsRes.data as InspectionPoint[]) ?? []);
    setProducers(
      ((prodRes.data as { id: string; name: string }[]) ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      }))
    );
    setSpeciesList(
      ((spRes.data as { id: string; name: string; is_active?: boolean }[]) ?? []).filter(
        (s) => s.is_active !== false
      )
    );
    setVarietiesList(
      ((varRes.data as { id: string; name: string; is_active?: boolean }[]) ?? []).filter(
        (v) => v.is_active !== false
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pointById = useMemo(() => {
    const m = new Map<string, InspectionPoint>();
    for (const p of points) m.set(p.id, p);
    return m;
  }, [points]);

  const nameOf = (list: { id: string; name: string }[], id?: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? '—') : '—';

  const filteredLots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lots;
    return lots.filter((lot) =>
      [
        lot.folio,
        lot.folio_interno,
        lot.lot_type,
        lot.harvest_block,
        lot.producer_guide_number,
        lot.kg_declarados != null ? String(lot.kg_declarados) : '',
        lot.status,
        nameOf(producers, lot.producer_id),
        nameOf(speciesList, lot.species_id),
        nameOf(varietiesList, lot.variety_id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [lots, query, producers, speciesList, varietiesList]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowReport(false);
  };

  const rows: LotQualityRow[] = useMemo(() => {
    const result: LotQualityRow[] = [];
    for (const lotId of selected) {
      const lot = lots.find((l) => l.id === lotId);
      if (!lot) continue;
      const insp = inspections
        .filter((i) => i.lot_id === lotId)
        .slice()
        .sort((a, b) => b.inspected_at.localeCompare(a.inspected_at));
      const completedList = insp.filter((i) => i.status === InspectionStatus.COMPLETADA);
      const lastPre =
        completedList.find((i) => {
          const pname = (pointById.get(i.inspection_point_id)?.name ?? '').toLowerCase();
          return pname.includes('pre') && pname.includes('despacho');
        }) ??
        completedList[0] ??
        null;
      const cls = classByLot.get(lotId) ?? null;
      const decisions = decisionsByLot.get(lotId) ?? [];
      const lastDecision =
        decisions
          .filter((d) => d.status !== 'ANULADA')
          .slice()
          .sort((a, b) => b.decided_at.localeCompare(a.decided_at))[0] ?? null;
      const qualityParts: string[] = [];
      if (cls) qualityParts.push(`${cls.commercial_class} · semáforo ${cls.semaphore}`);
      else qualityParts.push('Sin clasificación');
      if (lastDecision) qualityParts.push(`decisión: ${lastDecision.decision_label}`);
      else if (lastPre?.decision) qualityParts.push(`decisión inspección: ${lastPre.decision}`);
      if (lastPre?.result) qualityParts.push(`último resultado: ${lastPre.result}`);
      result.push({
        lot,
        classification: cls,
        inspections: insp,
        completed: completedList.length,
        lastPreDespacho: lastPre,
        lastDecision,
        qualitySummary: qualityParts.join(' · '),
      });
    }
    return result;
  }, [selected, lots, inspections, classByLot, decisionsByLot, pointById]);

  const build = async () => {
    if (selected.size === 0) return;
    setBuilding(true);
    try {
      const map = new Map<string, QualityClassification>();
      const decMap = new Map<string, DecisionRecord[]>();
      await Promise.all(
        [...selected].map(async (lotId) => {
          const [classRes, decRes] = await Promise.all([
            listQualityClassificationsByLot(lotId),
            listDecisionsByLot(lotId).catch(() => ({ data: [] as DecisionRecord[], error: null })),
          ]);
          if (!classRes.error && Array.isArray(classRes.data) && classRes.data[0]) {
            map.set(lotId, classRes.data[0] as QualityClassification);
          }
          if (!decRes.error && Array.isArray(decRes.data)) {
            decMap.set(lotId, decRes.data as DecisionRecord[]);
          }
        })
      );
      setClassByLot(map);
      setDecisionsByLot(decMap);
      setShowReport(true);
    } finally {
      setBuilding(false);
    }
  };

  if (loading) return <LoadingBlock label="Cargando calidad de embarque…" />;

  if (showReport) {
    const reportDate = new Date().toLocaleString('es-CL');
    return (
      <div className="report-document" data-testid="shipment-quality-report" id="shipment-quality-report">
        <div className="report-screen-controls report-screen-only">
          <Link href="/dashboard/reports" className="qx-btn-ghost">
            Volver a informes
          </Link>
          <div className="report-actions">
            <button type="button" className="qx-btn-brand-solid" onClick={() => window.print()}>
              GENERAR PDF
            </button>
            <button type="button" className="qx-btn-ghost" onClick={() => window.print()}>
              IMPRIMIR
            </button>
          </div>
        </div>

        <header className="report-company-header">
          <div className="report-brand-lockup">
            <div className="report-company-mark">QX</div>
            <div>
              <p className="report-company-name">QualityNX</p>
              <p className="report-company-subtitle">Informe de calidad de embarque</p>
            </div>
          </div>
          <div className="report-company-details">
            <span>Emisión: {reportDate}</span>
            <span>Lotes: {selected.size}</span>
          </div>
        </header>

        <main className="report-content">
          <section className="report-title-section report-section">
            <p className="report-kicker">INFORME DE CALIDAD DE EMBARQUE</p>
            <h1 className="report-title">
              {contextNumber || 'Sin número de embarque'}
            </h1>
            <p className="report-subtitle">
              {contextRecipient || 'Receptor —'} · {contextDestination || 'Destino —'}
            </p>
            <div className="report-title-meta">
              <span>Lotes seleccionados: {selected.size}</span>
              <span>Emisión: {reportDate}</span>
              {contextDate ? <span>Fecha: {contextDate}</span> : null}
            </div>
          </section>

          <section className="report-panel report-section">
            <div className="report-section-heading">
              <h2>1. Contexto del embarque</h2>
              <span className="report-section-note">
                Referencia del informe · no crea entidad Despacho
              </span>
            </div>
            <dl className="report-fields report-fields-four">
              <div>
                <dt>Número de embarque</dt>
                <dd>{contextNumber || '—'}</dd>
              </div>
              <div>
                <dt>Fecha de embarque</dt>
                <dd>{contextDate || '—'}</dd>
              </div>
              <div>
                <dt>Planta de origen</dt>
                <dd>{contextOriginPlant || '—'}</dd>
              </div>
              <div>
                <dt>País de origen</dt>
                <dd>{contextOriginCountry || '—'}</dd>
              </div>
              <div>
                <dt>Guía</dt>
                <dd>{contextGuide || '—'}</dd>
              </div>
              <div>
                <dt>Destino</dt>
                <dd>{contextDestination || '—'}</dd>
              </div>
              <div>
                <dt>Receptor / cliente</dt>
                <dd>{contextRecipient || '—'}</dd>
              </div>
              <div>
                <dt>Lotes</dt>
                <dd>{selected.size}</dd>
              </div>
            </dl>
            {contextNotes.trim() && (
              <>
                <p className="report-section-note">Notas</p>
                <p className="report-empty" style={{ whiteSpace: 'pre-wrap' }}>
                  {contextNotes}
                </p>
              </>
            )}
          </section>

          <section className="report-panel report-section">
            <div className="report-section-heading">
              <h2>2. Resumen de calidad por lote</h2>
              <span className="report-section-note">
                Semáforo QualityNX (no SAG) · sin packing list
              </span>
            </div>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Folio QualityNX</th>
                    <th>Folio interno / bloque / guía</th>
                    <th>Producto / tipo</th>
                    <th>Productor</th>
                    <th>Cantidad / kg declarados</th>
                    <th>Última insp. (Pre-Despacho)</th>
                    <th>Clase</th>
                    <th>Semáforo</th>
                    <th>Decisión</th>
                    <th>Resumen de calidad</th>
                    <th>Informes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const cls = row.classification;
                    return (
                      <tr key={row.lot.id}>
                        <td>{row.lot.folio || '—'}</td>
                        <td>
                          {row.lot.folio_interno || '—'}
                          <br />
                          {row.lot.harvest_block}
                          {row.lot.producer_guide_number
                            ? ` · guía ${row.lot.producer_guide_number}`
                            : ''}
                        </td>
                        <td>
                          {nameOf(speciesList, row.lot.species_id)} ·{' '}
                          {nameOf(varietiesList, row.lot.variety_id)}
                          <br />
                          <span style={{ fontSize: '0.85em', opacity: 0.75 }}>
                            {LOT_TYPE_LABELS[row.lot.lot_type ?? LotType.ORIGEN]}
                          </span>
                        </td>
                        <td>{nameOf(producers, row.lot.producer_id)}</td>
                        <td>
                          {row.lot.quantity != null ? `${row.lot.quantity} envases` : '—'}
                          {row.lot.kg_declarados != null ? (
                            <>
                              <br />
                              {row.lot.kg_declarados} kg declarados
                            </>
                          ) : null}
                        </td>
                        <td>
                          {row.lastPreDespacho
                            ? `${pointById.get(row.lastPreDespacho.inspection_point_id)?.name ?? '—'} · ${new Date(row.lastPreDespacho.completed_at ?? row.lastPreDespacho.inspected_at).toLocaleDateString('es-CL')}`
                            : row.completed > 0
                              ? `Última completada (${row.completed})`
                              : 'Sin inspección completada'}
                        </td>
                        <td>{cls?.commercial_class ?? 'Sin clasificar'}</td>
                        <td>
                          {cls ? (
                            <span
                              className={`qx-chip ${SEMAPHORE_STYLES[cls.semaphore] ?? SEMAPHORE_STYLES.AMARILLO}`}
                            >
                              {cls.semaphore}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {row.lastDecision?.decision_label ??
                            row.lastPreDespacho?.decision ??
                            '—'}
                        </td>
                        <td style={{ minWidth: 220 }}>{row.qualitySummary}</td>
                        <td>
                          {row.inspections
                            .filter((i) => i.status === InspectionStatus.COMPLETADA)
                            .map((i) => (
                              <span key={i.id} style={{ marginRight: 8 }}>
                                <Link href={`/dashboard/inspections/${i.id}/report`}>
                                  {pointById.get(i.inspection_point_id)?.name ?? i.id.slice(0, 8)}
                                </Link>
                              </span>
                            ))}
                          {row.completed === 0 ? '—' : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="report-section-note">
              Inspecciones totales en la selección:{' '}
              {rows.reduce((acc, r) => acc + r.inspections.length, 0)} · completadas:{' '}
              {rows.reduce((acc, r) => acc + r.completed, 0)}
            </p>
          </section>

          <section className="report-panel report-section">
            <h2>Alcance</h2>
            <p className="report-empty">
              Este informe consolida estado de calidad de los lotes seleccionados al momento de la
              emisión. No crea una entidad Despacho ni un packing list (pendiente D-026 / fase
              posterior). La decisión formal de cada lote permanece en su historia. La clasificación
              comercial y el semáforo QualityNX no equivalen a aprobado/retenido/rechazado.
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="qx-card p-4 sm:p-6">
        <p className="qx-eyebrow">INFORMES</p>
        <h1 className="qx-h1 !mt-1">Calidad de embarque</h1>
        <p className="mt-2 text-[13px] text-[#666]">
          Crea el contexto de embarque, busca y agrega 1..N lotes, revisa y genera. El informe
          resume última inspección, clase, semáforo y decisión por lote. No es un packing list ni
          crea entidad Despacho.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/reports" className="qx-btn-ghost">
            Volver al hub
          </Link>
        </div>
      </header>

      <section className="qx-card p-4 sm:p-6 space-y-4" data-testid="shipment-context">
        <h2 className="qx-h2">1. Contexto de embarque (referencia del informe)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="qx-field-label">Número de embarque</span>
            <input
              type="text"
              className={inputClass}
              value={contextNumber}
              onChange={(e) => setContextNumber(e.target.value)}
              placeholder="Ej: EMB-2026-001"
              data-testid="shipment-number"
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Fecha de embarque</span>
            <input
              type="date"
              className={inputClass}
              value={contextDate}
              onChange={(e) => setContextDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Guía</span>
            <input
              type="text"
              className={inputClass}
              value={contextGuide}
              onChange={(e) => setContextGuide(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Planta de origen</span>
            <input
              type="text"
              className={inputClass}
              value={contextOriginPlant}
              onChange={(e) => setContextOriginPlant(e.target.value)}
              placeholder="Ej: Planta Empaque Curicó"
            />
          </label>
          <label className="block">
            <span className="qx-field-label">País de origen</span>
            <input
              type="text"
              className={inputClass}
              value={contextOriginCountry}
              onChange={(e) => setContextOriginCountry(e.target.value)}
              placeholder="Ej: Chile"
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Destino</span>
            <input
              type="text"
              className={inputClass}
              value={contextDestination}
              onChange={(e) => setContextDestination(e.target.value)}
            />
          </label>
          <label className="block sm:col-span-3">
            <span className="qx-field-label">Receptor / cliente</span>
            <input
              type="text"
              className={inputClass}
              value={contextRecipient}
              onChange={(e) => setContextRecipient(e.target.value)}
            />
          </label>
          <label className="block sm:col-span-3">
            <span className="qx-field-label">Notas</span>
            <textarea
              className={inputClass}
              rows={3}
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
            />
          </label>
        </div>
        <p className="text-[11px] text-[#888]">
          Los campos secundarios no bloquean la generación del informe.
        </p>
      </section>

      <section className="qx-card p-4 sm:p-6" data-testid="shipment-lots">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="qx-h2">2. Lotes ({selected.size} seleccionados)</h2>
            <p className="mt-1 text-[12px] text-[#888]">Marca al menos un lote</p>
          </div>
          <label className="block min-w-[220px] flex-1 sm:max-w-sm">
            <span className="qx-field-label">Buscar</span>
            <input
              type="search"
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Folio QualityNX, interno, guía, productor, especie, variedad…"
            />
          </label>
        </div>

        {filteredLots.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Sin lotes" description="No hay lotes que coincidan." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#1a1a1a]/[0.06]">
            {filteredLots.map((lot) => (
              <li key={lot.id} className="flex items-center justify-between gap-3 py-3">
                <label className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(lot.id)}
                    onChange={() => toggle(lot.id)}
                    className="mt-1"
                    aria-label={`Seleccionar lote ${lot.folio || lot.harvest_block}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-[#1a1a1a]">
                      {lot.folio || lot.harvest_block}
                    </span>
                    <span className="block text-[12px] text-[#6b7065]">
                      {nameOf(producers, lot.producer_id)} · {lot.harvest_block} · {lot.status}
                      {lot.producer_guide_number ? ` · guía ${lot.producer_guide_number}` : ''}
                      {lot.folio_interno ? ` · interno ${lot.folio_interno}` : ''}
                    </span>
                    <span className="block text-[12px] text-[#9aa090]">
                      {LOT_TYPE_LABELS[lot.lot_type ?? LotType.ORIGEN]} · {lot.quantity ?? 0} envases
                      {lot.kg_declarados != null ? ` · ${lot.kg_declarados} kg declarados` : ''}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="qx-btn-brand-solid"
            disabled={selected.size === 0 || building}
            onClick={() => void build()}
            data-testid="build-shipment"
          >
            {building ? 'Generando…' : '3. Revisar y generar informe'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[#888]" data-testid="generate-shipment">
          Tras generar, el navegador abre el diálogo de impresión para PDF.
        </p>
      </section>
    </div>
  );
}
