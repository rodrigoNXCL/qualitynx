'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInspections,
  listLots,
  listInspectionPoints,
  listMasterData,
  listLatestQualityClassifications,
} from '@qualitynx/database';
import {
  InspectionStatus,
  type Inspection,
  type Lot,
  type InspectionPoint,
  type QualityClassification,
} from '@qualitynx/shared';
import { EmptyState, LoadingBlock, StatusChip, inputClass } from '@/components/ui';

const SEMAPHORE_DOT: Record<string, string> = {
  VERDE: 'bg-[#4A5D23]',
  AMARILLO: 'bg-[#d97706]',
  ROJO: 'bg-[#dc2626]',
};

/**
 * Módulo INFORMES — punto central de consulta histórica.
 * Dos capacidades visibles: informe histórico de lote y calidad de embarque.
 * Buscador ampliado sobre datos reales (folio, productor, fechas, clase, semáforo).
 */
export default function ReportsHubPage() {
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [points, setPoints] = useState<InspectionPoint[]>([]);
  const [producers, setProducers] = useState<{ id: string; name: string }[]>([]);
  const [speciesList, setSpeciesList] = useState<{ id: string; name: string }[]>([]);
  const [varietiesList, setVarietiesList] = useState<{ id: string; name: string }[]>([]);
  const [classByLot, setClassByLot] = useState<Map<string, QualityClassification>>(new Map());
  const [query, setQuery] = useState('');
  const [producerId, setProducerId] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [guideQuery, setGuideQuery] = useState('');
  const [blockQuery, setBlockQuery] = useState('');
  const [folioInternoQuery, setFolioInternoQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [semaphoreFilter, setSemaphoreFilter] = useState('');
  const [pointFilter, setPointFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [inspRes, lotsRes, pointsRes, prodRes, spRes, varRes, classRes] =
        await Promise.all([
          listInspections(),
          listLots(),
          listInspectionPoints(),
          listMasterData('producers'),
          listMasterData('species'),
          listMasterData('varieties'),
          listLatestQualityClassifications().catch(() => ({
            data: [] as QualityClassification[],
            error: null,
          })),
        ]);
      setInspections((inspRes.data as Inspection[]) ?? []);
      setLots((lotsRes.data as Lot[]) ?? []);
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
      const map = new Map<string, QualityClassification>();
      if (!classRes.error && Array.isArray(classRes.data)) {
        for (const row of classRes.data as QualityClassification[]) {
          if (row?.lot_id && !map.has(row.lot_id)) map.set(row.lot_id, row);
        }
      }
      setClassByLot(map);
      setLoading(false);
    };
    load();
  }, []);

  const nameOf = (list: { id: string; name: string }[], id?: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? '—') : '—';

  const lotById = useMemo(() => {
    const m = new Map<string, Lot>();
    for (const lot of lots) m.set(lot.id, lot);
    return m;
  }, [lots]);

  const pointById = useMemo(() => {
    const m = new Map<string, InspectionPoint>();
    for (const p of points) m.set(p.id, p);
    return m;
  }, [points]);

  const hasFilters =
    Boolean(query.trim()) ||
    Boolean(producerId) ||
    Boolean(speciesId) ||
    Boolean(varietyId) ||
    Boolean(guideQuery.trim()) ||
    Boolean(blockQuery.trim()) ||
    Boolean(folioInternoQuery.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(classFilter) ||
    Boolean(semaphoreFilter) ||
    Boolean(pointFilter) ||
    Boolean(statusFilter);

  const clearFilters = () => {
    setQuery('');
    setProducerId('');
    setSpeciesId('');
    setVarietyId('');
    setGuideQuery('');
    setBlockQuery('');
    setFolioInternoQuery('');
    setDateFrom('');
    setDateTo('');
    setClassFilter('');
    setSemaphoreFilter('');
    setPointFilter('');
    setStatusFilter('');
  };

  const lotMatchesFilters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (lot: Lot): boolean => {
      const cls = classByLot.get(lot.id);
      if (producerId && lot.producer_id !== producerId) return false;
      if (speciesId && lot.species_id !== speciesId) return false;
      if (varietyId && lot.variety_id !== varietyId) return false;
      if (guideQuery.trim() && !(lot.producer_guide_number ?? '').toLowerCase().includes(guideQuery.trim().toLowerCase()))
        return false;
      if (blockQuery.trim() && !(lot.harvest_block ?? '').toLowerCase().includes(blockQuery.trim().toLowerCase()))
        return false;
      if (
        folioInternoQuery.trim() &&
        !(lot.folio_interno ?? '').toLowerCase().includes(folioInternoQuery.trim().toLowerCase())
      )
        return false;
      if (classFilter && cls?.commercial_class !== classFilter) return false;
      if (semaphoreFilter && cls?.semaphore !== semaphoreFilter) return false;
      if (dateFrom || dateTo) {
        const d = lot.fruit_date;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      if (pointFilter) {
        const hasPoint = inspections.some(
          (i) => i.lot_id === lot.id && i.inspection_point_id === pointFilter
        );
        if (!hasPoint) return false;
      }
      if (statusFilter) {
        const hasStatus = inspections.some(
          (i) => i.lot_id === lot.id && i.status === statusFilter
        );
        if (!hasStatus) return false;
      }
      if (!q) return true;
      const hay = [
        lot.folio ?? '',
        lot.folio_interno ?? '',
        lot.lot_type ?? '',
        lot.harvest_block ?? '',
        lot.producer_guide_number ?? '',
        lot.fruit_date ?? '',
        lot.status ?? '',
        nameOf(producers, lot.producer_id),
        nameOf(speciesList, lot.species_id),
        nameOf(varietiesList, lot.variety_id),
        cls?.commercial_class ?? '',
        cls?.semaphore ?? '',
        ...inspections
          .filter((i) => i.lot_id === lot.id)
          .map(
            (i) =>
              `${pointById.get(i.inspection_point_id)?.name ?? ''} ${i.status} ${i.result ?? ''} ${i.decision ?? ''}`
          ),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    };
  }, [
    query,
    producerId,
    speciesId,
    varietyId,
    guideQuery,
    blockQuery,
    folioInternoQuery,
    classFilter,
    semaphoreFilter,
    dateFrom,
    dateTo,
    pointFilter,
    statusFilter,
    producers,
    speciesList,
    varietiesList,
    classByLot,
    inspections,
    pointById,
  ]);

  const completed = useMemo(
    () =>
      inspections
        .filter((i) => i.status === InspectionStatus.COMPLETADA)
        .filter((i) => {
          const lot = lotById.get(i.lot_id);
          if (!lot) return false;
          if (pointFilter && i.inspection_point_id !== pointFilter) return false;
          if (statusFilter && i.status !== statusFilter) return false;
          if (producerId && lot.producer_id !== producerId) return false;
          if (classFilter && classByLot.get(lot.id)?.commercial_class !== classFilter)
            return false;
          if (semaphoreFilter && classByLot.get(lot.id)?.semaphore !== semaphoreFilter)
            return false;
          if (dateFrom || dateTo) {
            const d = lot.fruit_date;
            if (dateFrom && d < dateFrom) return false;
            if (dateTo && d > dateTo) return false;
          }
          if (pointFilter) return true;
          return true;
        })
        .slice()
        .sort((a, b) =>
          (b.completed_at ?? b.inspected_at).localeCompare(a.completed_at ?? a.inspected_at)
        ),
    [inspections, lotById, pointFilter, statusFilter, producerId, classFilter, semaphoreFilter, dateFrom, dateTo, classByLot]
  );

  const q = query.trim().toLowerCase();
  const filteredInspections = useMemo(() => {
    if (!q && !pointFilter && !statusFilter) return completed.slice(0, 30);
    return completed
      .filter((insp) => {
        const lot = lotById.get(insp.lot_id);
        const point = pointById.get(insp.inspection_point_id);
        if (pointFilter && insp.inspection_point_id !== pointFilter) return false;
        if (statusFilter && insp.status !== statusFilter) return false;
        if (!q) return true;
        const hay = [
          lot?.folio ?? '',
          lot?.harvest_block ?? '',
          lot?.id ?? '',
          lot?.producer_guide_number ?? '',
          point?.name ?? '',
          insp.result ?? '',
          insp.decision ?? '',
          nameOf(producers, lot?.producer_id),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [completed, q, lotById, pointById, pointFilter, statusFilter, producers]);

  const commercialClasses = useMemo(() => {
    const set = new Set<string>();
    for (const c of classByLot.values()) {
      if (c?.commercial_class) set.add(c.commercial_class);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [classByLot]);

  const filteredLots = useMemo(() => {
    const sorted = lots.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted.filter(lotMatchesFilters).slice(0, 40);
  }, [lots, lotMatchesFilters]);

  if (loading) return <LoadingBlock label="Cargando informes…" />;

  return (
    <div className="flex flex-col gap-6">
      <header className="qx-card p-4 sm:p-6">
        <p className="qx-eyebrow">INFORMES</p>
        <h1 className="qx-h1 !mt-1">Consulta histórica</h1>
        <p className="mt-2 text-[13px] text-[#666]">
          Punto central para consultar y abrir informes generados desde la trazabilidad real del
          sistema. No reemplaza las pantallas operacionales de Lotes e Inspecciones.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="report-capabilities">
          <a
            href="#reports-search"
            className="qx-card block border border-[#4A5D23]/25 bg-[#4A5D23]/[0.05] p-4 transition hover:border-[#4A5D23]/45"
            data-testid="report-historical-lot"
          >
            <p className="qx-eyebrow">CAPACIDAD 1</p>
            <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">
              Informe histórico de lote
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#6b7065]">
              Busca el lote (folio QualityNX o interno, guía, productor…), selecciónalo y elige
              el informe histórico o un informe por inspección.
            </p>
            <span className="mt-3 inline-block qx-btn-brand-solid !py-2">
              Buscar lote →
            </span>
          </a>
          <Link
            href="/dashboard/reports/shipment"
            className="qx-card block border border-[#4A5D23]/25 bg-[#4A5D23]/[0.05] p-4 transition hover:border-[#4A5D23]/45"
            data-testid="report-shipment-quality"
          >
            <p className="qx-eyebrow">CAPACIDAD 2</p>
            <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">
              Informe de calidad de embarque
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#6b7065]">
              Consolida 1..N lotes con última inspección, clase, semáforo y decisión. No es
              packing list.
            </p>
            <span className="mt-3 inline-block qx-btn-brand-solid !py-2">
              Crear informe →
            </span>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/lots" className="qx-btn-ghost">
            Lotes y trazabilidad
          </Link>
          <Link href="/dashboard/inspections" className="qx-btn-ghost">
            Inspecciones
          </Link>
        </div>
      </header>

      <section className="qx-card p-4 sm:p-6" data-testid="reports-search" id="reports-search">
        <h2 className="qx-h2">Buscar lote</h2>
        <p className="mt-1 text-[12px] text-[#888]">
          Folio QualityNX (principal), folio interno, guía, productor, especie, variedad, bloque,
          fechas, punto, estado, clase comercial o semáforo. Selecciona un lote para elegir su
          informe.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="qx-field-label">Texto libre (folio QualityNX, interno, productor…)</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputClass}
              placeholder="2026-000032, PL-45872, productor…"
              aria-label="Buscar informes"
              data-testid="reports-search-input"
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Folio interno / planta</span>
            <input
              type="search"
              value={folioInternoQuery}
              onChange={(e) => setFolioInternoQuery(e.target.value)}
              className={inputClass}
              placeholder="Ej: PL-45872"
              data-testid="reports-folio-interno-input"
            />
          </label>
          <label className="block">
            <span className="qx-field-label">N° guía</span>
            <input
              type="search"
              value={guideQuery}
              onChange={(e) => setGuideQuery(e.target.value)}
              className={inputClass}
              placeholder="Ej: G-778"
              data-testid="reports-guide-input"
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Bloque</span>
            <input
              type="search"
              value={blockQuery}
              onChange={(e) => setBlockQuery(e.target.value)}
              className={inputClass}
              placeholder="Ej: BLOQUE-01"
              data-testid="reports-block-input"
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Productor</span>
            <input
              type="search"
              list="reports-producer-options"
              value={producers.find((p) => p.id === producerId)?.name ?? ''}
              onChange={(e) => {
                const name = e.target.value.trim().toLowerCase();
                if (!name) {
                  setProducerId('');
                  return;
                }
                const match = producers.find(
                  (p) => p.name.trim().toLowerCase() === name
                );
                setProducerId(match?.id ?? '');
              }}
              className={inputClass}
              placeholder="Escribe o selecciona…"
              autoComplete="off"
            />
            <datalist id="reports-producer-options">
              {producers.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="qx-field-label">Especie</span>
            <select
              value={speciesId}
              onChange={(e) => setSpeciesId(e.target.value)}
              className={inputClass}
              data-testid="reports-species-filter"
            >
              <option value="">Todas</option>
              {speciesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="qx-field-label">Variedad</span>
            <select
              value={varietyId}
              onChange={(e) => setVarietyId(e.target.value)}
              className={inputClass}
              data-testid="reports-variety-filter"
            >
              <option value="">Todas</option>
              {varietiesList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="qx-field-label">Punto de inspección</span>
            <select
              value={pointFilter}
              onChange={(e) => setPointFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">Todos</option>
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="qx-field-label">Fecha de fruta desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Fecha de fruta hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="qx-field-label">Clase comercial</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">Toda clase</option>
              {commercialClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="qx-field-label">Semáforo QualityNX</span>
            <select
              value={semaphoreFilter}
              onChange={(e) => setSemaphoreFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">Todo semáforo</option>
              <option value="VERDE">Verde</option>
              <option value="AMARILLO">Amarillo</option>
              <option value="ROJO">Rojo</option>
            </select>
          </label>
          <label className="block">
            <span className="qx-field-label">Estado de inspección</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value={InspectionStatus.EN_CURSO}>En curso</option>
              <option value={InspectionStatus.COMPLETADA}>Completada</option>
            </select>
          </label>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-[12px] font-medium text-[#4A5D23] underline"
          >
            Limpiar filtros
          </button>
        )}
      </section>

      <section className="qx-card p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="qx-h2">1. Buscar y seleccionar lote</h2>
            <p className="mt-1 text-[12px] text-[#888]">
              {filteredLots.length} lote(s) coinciden · selecciona uno para elegir su informe
            </p>
          </div>
        </div>

        {filteredLots.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Sin lotes"
              description={
                hasFilters
                  ? 'No hay lotes que coincidan con la búsqueda ampliada.'
                  : 'Crea un lote para generar su informe histórico.'
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#1a1a1a]/[0.06]">
            {filteredLots.map((lot) => {
              const cls = classByLot.get(lot.id) ?? null;
              const lotCompletadas = inspections.filter(
                (i) => i.lot_id === lot.id && i.status === InspectionStatus.COMPLETADA
              );
              return (
                <li
                  key={lot.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                  data-selected={selectedLotId === lot.id ? 'true' : 'false'}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1a1a1a]">
                      {lot.folio || lot.harvest_block}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#6b7065]">
                      {nameOf(producers, lot.producer_id)} ·{' '}
                      {nameOf(speciesList, lot.species_id)} ·{' '}
                      {nameOf(varietiesList, lot.variety_id)} · {lot.status} ·{' '}
                      {lotCompletadas.length} completada(s)
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#9aa090]">
                      {lot.producer_guide_number ? `Guía ${lot.producer_guide_number} · ` : ''}
                      {lot.folio_interno ? `Interno ${lot.folio_interno} · ` : ''}
                      {lot.lot_type ?? 'ORIGEN'} · {lot.quantity ?? 0} envases
                      {lot.kg_declarados != null ? ` · ${lot.kg_declarados} kg declarados` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {cls ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#444]">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${SEMAPHORE_DOT[cls.semaphore] ?? 'bg-[#9ca3af]'}`}
                              aria-hidden
                            />
                            {cls.semaphore}
                          </span>
                          <span className="qx-chip border border-[#1a1a1a]/15 bg-[#f3f4f1] text-[#444]">
                            {cls.commercial_class}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#888]">Sin clasificación</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/lots/${lot.id}/report`}
                      className="qx-btn-ghost !py-1.5 !text-[12px]"
                      data-testid={`report-historical-${lot.id}`}
                    >
                      Informe histórico
                    </Link>
                    <button
                      type="button"
                      className="qx-btn-brand-solid !py-1.5 !text-[12px]"
                      onClick={() => setSelectedLotId((prev) => (prev === lot.id ? null : lot.id))}
                      data-testid={`report-select-lot-${lot.id}`}
                    >
                      {selectedLotId === lot.id ? 'Seleccionado' : 'Elegir informe'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {filteredLots.length >= 40 && (
          <p className="mt-3 text-[12px] text-[#888]">
            Mostrando los primeros 40 lotes que coinciden. Afina la búsqueda para ver más.
          </p>
        )}
      </section>

      {selectedLotId && lotById.get(selectedLotId) && (
        <section className="qx-card border border-[#4A5D23]/35 p-4 sm:p-6" data-testid="report-chooser">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="qx-eyebrow">2. Elegir informe</p>
              <h2 className="qx-h2 !mt-1">
                {lotById.get(selectedLotId)!.folio || lotById.get(selectedLotId)!.harvest_block}
              </h2>
              <p className="mt-1 text-[12px] text-[#6b7065]">
                {nameOf(producers, lotById.get(selectedLotId)!.producer_id)} ·{' '}
                {nameOf(speciesList, lotById.get(selectedLotId)!.species_id)} ·{' '}
                {nameOf(varietiesList, lotById.get(selectedLotId)!.variety_id)}
              </p>
              <p className="mt-0.5 text-[12px] text-[#9aa090]">
                {lotById.get(selectedLotId)!.producer_guide_number
                  ? `Guía ${lotById.get(selectedLotId)!.producer_guide_number} · `
                  : ''}
                {lotById.get(selectedLotId)!.folio_interno
                  ? `Interno ${lotById.get(selectedLotId)!.folio_interno} · `
                  : ''}
                {lotById.get(selectedLotId)!.lot_type ?? 'ORIGEN'}
                {lotById.get(selectedLotId)!.kg_declarados != null
                  ? ` · ${lotById.get(selectedLotId)!.kg_declarados} kg declarados`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className="qx-btn-ghost !py-1.5 !text-[12px]"
              onClick={() => setSelectedLotId(null)}
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={`/dashboard/lots/${selectedLotId}/report`}
              className="qx-card block border border-[#4A5D23]/30 bg-[#4A5D23]/[0.05] p-4 transition hover:border-[#4A5D23]/50"
              data-testid="report-choose-historical"
            >
              <p className="text-[14px] font-semibold text-[#1a1a1a]">Informe histórico de lote</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6b7065]">
                Identidad, inspecciones, QE, decisiones, clasificaciones, semáforos y análisis
                histórico QualityNX IA.
              </p>
            </Link>
            <div className="qx-card border border-[#1a1a1a]/10 p-4">
              <p className="text-[14px] font-semibold text-[#1a1a1a]">Informes por inspección</p>
              {(() => {
                const lotInspec = inspections
                  .filter(
                    (i) =>
                      i.lot_id === selectedLotId &&
                      i.status === InspectionStatus.COMPLETADA
                  )
                  .slice()
                  .sort((a, b) =>
                    (b.completed_at ?? b.inspected_at).localeCompare(
                      a.completed_at ?? a.inspected_at
                    )
                  );
                if (lotInspec.length === 0) {
                  return (
                    <p className="mt-1 text-[12px] text-[#888]">
                      Sin inspecciones completadas para este lote todavía.
                    </p>
                  );
                }
                return (
                  <ul className="mt-2 space-y-1.5">
                    {lotInspec.map((i) => (
                      <li key={i.id} data-testid="report-choose-inspection">
                        <Link
                          href={`/dashboard/inspections/${i.id}/report`}
                          className="text-[13px] font-medium text-[#4A5D23] underline"
                        >
                          Informe — {pointById.get(i.inspection_point_id)?.name ?? 'Punto —'} —{' '}
                          {i.completed_at
                            ? new Date(i.completed_at).toLocaleDateString('es-CL')
                            : new Date(i.inspected_at).toLocaleDateString('es-CL')}
                        </Link>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      <section className="qx-card p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="qx-h2">3. Informes de inspección</h2>
            <p className="mt-1 text-[12px] text-[#888]">
              Inspecciones completadas · búsqueda por folio, productor, fechas, punto, clase o
              semáforo
            </p>
          </div>
        </div>

        {filteredInspections.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Sin informes de inspección"
              description={
                hasFilters
                  ? 'No hay inspecciones completadas que coincidan con la búsqueda.'
                  : 'Completa una inspección para generar su informe individual.'
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#1a1a1a]/[0.06]">
            {filteredInspections.map((insp) => {
              const lot = lotById.get(insp.lot_id);
              const point = pointById.get(insp.inspection_point_id);
              const cls = lot ? classByLot.get(lot.id) ?? null : null;
              return (
                <li
                  key={insp.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1a1a1a]">
                      {lot?.folio ?? lot?.harvest_block ?? insp.lot_id.slice(0, 8)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#6b7065]">
                      {point?.name ?? 'Punto —'} · completada{' '}
                      {insp.completed_at
                        ? new Date(insp.completed_at).toLocaleDateString('es-CL')
                        : '—'}
                      {insp.result ? ` · ${insp.result}` : ''}
                      {cls ? ` · ${cls.semaphore} · ${cls.commercial_class}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip label={insp.status} />
                    <Link
                      href={`/dashboard/inspections/${insp.id}/report`}
                      className="qx-btn-ghost !py-1.5 !text-[12px]"
                    >
                      Ver informe
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="qx-card p-4 sm:p-6">
        <h2 className="qx-h2">Áreas previstas</h2>
        <p className="mt-1 text-[12px] text-[#888]">
          Definidas en el flujo operacional; la estructura se habilita en fases posteriores sin
          duplicar datos.
        </p>
        <ul className="mt-3 space-y-2 text-[13px] text-[#555]">
          <li>
            <strong>Genealogía de lotes derivados:</strong> disponible para lotes de proceso y
            repalletizaje (tabla <code>lot_genealogy</code>, D-029). La guía multilote no crea
            genealogía: son lotes independientes con la misma guía.
          </li>
          <li>
            <strong>Transformaciones avanzadas:</strong> catálogo de transformaciones de la etapa
            08 — TRANSFORMATIONS sigue pendiente; D-029 no lo anticipa.
          </li>
          <li>
            <strong>Envío automático de informes:</strong> configuración administrativa de evento,
            destinatario y canal — fase posterior (sin proveedor de correo/WhatsApp en esta etapa).
          </li>
        </ul>
      </section>
    </div>
  );
}
