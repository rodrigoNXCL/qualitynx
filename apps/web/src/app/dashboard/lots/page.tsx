'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getCurrentSession,
  getUserProfile,
  listMasterData,
  listPackagingTypes,
  listLots,
  createLot,
  updateLot,
  listOperationalStages,
  listAiAnalysesByLot,
  listLatestQualityClassifications,
  listLotGenealogy,
  insertLotGenealogy,
  listLotAvailability,
  createTransformationDraft,
  addTransformationInput,
  addTransformationOutput,
  createDisposition,
  DISPOSITION_TYPES,
  DISPOSITION_TYPE_LABELS,
  type DispositionType,
} from '@qualitynx/database';
import {
  UserRole,
  LotStatus,
  LotType,
  LOT_TYPES,
  LOT_TYPE_LABELS,
  type MasterDataRecord,
  type PackagingType,
  type OperationalStage,
  type AiInspectionAnalysis,
  type TraceabilityEvent,
  type QualityClassification,
  QualitySemaphore,
  validateTransformation,
  OutputKind,
  TRANSFORMATION_TYPE_LABELS,
  TRANSFORMATION_TYPE_RULES,
  type TransformationType,
} from '@qualitynx/shared';

interface LotRow {
  id: string;
  company_id: string;
  producer_id: string;
  variety_id: string;
  fruit_date: string;
  harvest_block: string;
  folio?: string | null;
  lot_type?: LotType | null;
  folio_interno?: string | null;
  kg_declarados?: number | null;
  producer_guide_number?: string | null;
  packaging_type?: string | null;
  packaging_type_id?: string | null;
  theoretical_weight_kg?: number | null;
  quantity?: number | null;
  quantity_unit?: string | null;
  weight?: number | null;
  weight_unit?: string | null;
  status: LotStatus;
  species_id: string | null;
  field_id: string | null;
  block_id: string | null;
  season_id: string | null;
  entry_operational_stage_id: string | null;
  current_operational_stage_id: string | null;
  created_at: string;
  updated_at: string;
}

type Message = { type: 'ok' | 'error'; text: string } | null;

const STATUS_STYLES: Record<LotStatus, string> = {
  CREADO: 'bg-[#eef0ea] text-[#4b5245] border-[#1a1a1a]/10',
  'EN PROCESO': 'bg-[#e7edd9] text-[#3a4d1b] border-[#4A5D23]/25',
  'EN INSPECCIÓN': 'bg-[#e7edd9] text-[#3a4d1b] border-[#4A5D23]/30',
  RETENIDO: 'bg-[#fef3c7] text-[#92400e] border-amber-300/70',
  APROBADO: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  RECHAZADO: 'bg-[#fee2e2] text-[#991b1b] border-red-300/70',
  SEGREGADO: 'bg-[#ffedd5] text-[#9a3412] border-orange-300/70',
  'EN REPROCESO': 'bg-[#eef0ea] text-[#4b5245] border-[#1a1a1a]/10',
  LIBERADO: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  CERRADO: 'bg-[#e5e7eb] text-[#374151] border-[#1a1a1a]/15',
};

const ATTENTION_STATUSES: LotStatus[] = [
  LotStatus.RETENIDO,
  LotStatus.RECHAZADO,
  LotStatus.SEGREGADO,
  LotStatus.EN_INSPECCION,
];

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || (error.message ?? '').includes('duplicate key');
}

function isMissingSchema(error: { code?: string; message?: string }): boolean {
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    error.code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('lot_genealogy')
  );
}

function validateSourceQuantities(
  sourceLotIds: string[],
  sourceQuantities: Record<string, { quantity: string; unit: string }>
): string | null {
  for (const id of sourceLotIds) {
    const entry = sourceQuantities[id];
    if (!entry) continue;
    const raw = entry.quantity.trim();
    if (raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return 'La cantidad de cada lote fuente debe ser un número mayor que cero.';
    }
    if (!entry.unit.trim()) {
      return 'Si informas cantidad, la unidad es obligatoria.';
    }
  }
  return null;
}

export default function LotsPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [rows, setRows] = useState<LotRow[]>([]);
  const [producers, setProducers] = useState<MasterDataRecord[]>([]);
  const [varieties, setVarieties] = useState<(MasterDataRecord & { species_id: string })[]>([]);
  const [species, setSpecies] = useState<MasterDataRecord[]>([]);
  const [fields, setFields] = useState<(MasterDataRecord & { producer_id: string })[]>([]);
  const [blocks, setBlocks] = useState<(MasterDataRecord & { field_id: string })[]>([]);
  const [seasons, setSeasons] = useState<MasterDataRecord[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<PackagingType[]>([]);
  const [stages, setStages] = useState<OperationalStage[]>([]);
  const [historyLot, setHistoryLot] = useState<LotRow | null>(null);
  const [historyAi, setHistoryAi] = useState<
    (AiInspectionAnalysis & {
      inspections?: {
        decision?: string | null;
        result?: string | null;
        status?: string | null;
        inspection_point_id?: string;
      } | null;
    })[]
  >([]);
  const [historyAiLoading, setHistoryAiLoading] = useState(false);
  const [traceEvents, setTraceEvents] = useState<TraceabilityEvent[]>([]);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [labelLot, setLabelLot] = useState<LotRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | LotStatus>('');
  const [classFilter, setClassFilter] = useState('');
  const [semaphoreFilter, setSemaphoreFilter] = useState<'' | QualitySemaphore | 'NONE'>('');
  const [latestClassByLot, setLatestClassByLot] = useState<
    Map<string, QualityClassification>
  >(new Map());
  const [showCreate, setShowCreate] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Disposición final del lote (D-032 §12). Modelo mínimo: tipo, cantidad,
  // unidad, referencia de destino, resultado y motivo obligatorio.
  const [dispositionLotId, setDispositionLotId] = useState<string | null>(null);
  const [dispositionLotFolio, setDispositionLotFolio] = useState('');
  const [dispositionType, setDispositionType] = useState<DispositionType>('DESPACHO');
  const [dispositionQty, setDispositionQty] = useState('');
  const [dispositionUnit, setDispositionUnit] = useState('');
  const [dispositionRef, setDispositionRef] = useState('');
  const [dispositionResult, setDispositionResult] = useState('');
  const [dispositionReason, setDispositionReason] = useState('');
  const [producerId, setProducerId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [fruitDate, setFruitDate] = useState('');
  const [harvestBlock, setHarvestBlock] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [producerGuideNumber, setProducerGuideNumber] = useState('');
  const [packagingTypeId, setPackagingTypeId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [lotType, setLotType] = useState<LotType>(LotType.ORIGEN);
  /**
   * Tipo de OPERACIÓN (08 §5/§6/§8). Es distinto de `lotType`: el tipo de
   * lote describe la naturaleza del lote derivado; el tipo de operación
   * describe QUÉ se hizo con las fuentes. PROCESO y REPALLETIZAJE coinciden
   * en ambos; MEZCLA, DIVISIÓN y REPROCESO son operaciones cuyo resultado es
   * un lote de proceso.
   */
  const [opType, setOpType] = useState<TransformationType>('PROCESO');
  /** Motivo de la operación. Obligatorio para REPROCESO (08 §8). */
  const [opMotive, setOpMotive] = useState('');
  const [folioInterno, setFolioInterno] = useState('');
  const [kgDeclarados, setKgDeclarados] = useState('');
  const [sourceLotIds, setSourceLotIds] = useState<string[]>([]);
  const [sourceQuantities, setSourceQuantities] = useState<Record<string, { quantity: string; unit: string }>>({});
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceQuery, setSourceQuery] = useState('');
  const [availability, setAvailability] = useState<Record<string, { available: number; unit: string | null; status: string }>>({});
  const [sourceRemnant, setSourceRemnant] = useState<Record<string, boolean>>({});
  const [thisLotKind, setThisLotKind] = useState<'RESULTADO' | 'REMANENTE'>('RESULTADO');
  const [extraOutputs, setExtraOutputs] = useState<
    Array<{ key: string; kind: 'RESULTADO' | 'REMANENTE' | 'MERMA' | 'DESCARTE'; quantity: string; reason: string }>
  >([]);

  const refreshAvailability = useCallback(async () => {
    if (!companyId) return;
    const res = await listLotAvailability({ companyId });
    if (!res.data) return;
    const map: Record<string, { available: number; unit: string | null; status: string }> = {};
    for (const r of res.data) {
      map[r.lot_id] = {
        available: Number(r.available_quantity ?? 0),
        unit: r.unit ?? null,
        status: r.availability_status,
      };
    }
    setAvailability(map);
  }, [companyId]);

  const canManage =
    role === UserRole.COMPANY_ADMIN || role === UserRole.SUPER_ADMIN;

  const nameOf = useCallback(
    (list: MasterDataRecord[], id: string) => list.find((r) => r.id === id)?.name ?? '—',
    []
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    // Ola 1: solo datos que necesitan pintar la lista (folio, tipo, especie,
    // productor, etapa, clasificación y semáforo). Desbloquea NUEVO LOTE y el
    // listado en cuanto llegan.
    const [lotsRes, prodRes, varRes, spRes, stagesRes, classRes] =
      await Promise.all([
        listLots(),
        listMasterData('producers'),
        listMasterData('varieties'),
        listMasterData('species'),
        listOperationalStages(),
        listLatestQualityClassifications().catch(() => ({
          data: [] as QualityClassification[],
          error: null,
        })),
      ]);
    if (lotsRes.error) {
      setMessage({
        type: 'error',
        text: 'No pudimos cargar los lotes. Revisa tu conexión e intenta de nuevo.',
      });
      setRows([]);
    } else {
      setRows(lotsRes.data as LotRow[]);
    }
    setProducers(prodRes.data as MasterDataRecord[]);
    setVarieties(varRes.data as (MasterDataRecord & { species_id: string })[]);
    setSpecies(spRes.data as MasterDataRecord[]);
    setStages((stagesRes.data as OperationalStage[]).filter((s) => s.is_active));
    const latest = new Map<string, QualityClassification>();
    if (!classRes.error && Array.isArray(classRes.data)) {
      for (const row of classRes.data as QualityClassification[]) {
        if (row?.lot_id && !latest.has(row.lot_id)) latest.set(row.lot_id, row);
      }
    }
    setLatestClassByLot(latest);
    setLoading(false);

    // Ola 2: datos solo del formulario (campo, bloque, temporada, embalaje).
    // No bloquea la lista ni la apertura de NUEVO LOTE.
    void Promise.all([
      listMasterData('fields'),
      listMasterData('blocks'),
      listMasterData('seasons'),
      listPackagingTypes(),
    ])
      .then(([fldRes, blkRes, seaRes, packagingRes]) => {
        setFields(fldRes.data as (MasterDataRecord & { producer_id: string })[]);
        setBlocks(blkRes.data as (MasterDataRecord & { field_id: string })[]);
        setSeasons(seaRes.data as MasterDataRecord[]);
        setPackagingTypes(
          (packagingRes.data as PackagingType[]).filter((p) => p.is_active)
        );
      })
      .catch(() => {});
  }, []);

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
    init();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  // La disponibilidad real viene del ledger y gobierna qué lotes pueden ser fuente.
  useEffect(() => {
    if (!companyId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAvailability();
  }, [companyId, refreshAvailability]);

  const activeProducers = useMemo(
    () => producers.filter((p) => p.is_active),
    [producers]
  );
  const activeVarieties = useMemo(
    () => varieties.filter((v) => v.is_active),
    [varieties]
  );

  const producerFields = useMemo(
    () => fields.filter((f) => f.is_active && f.producer_id === producerId),
    [fields, producerId]
  );

  const fieldBlocks = useMemo(
    () => blocks.filter((b) => b.is_active && b.field_id === blockId),
    [blocks, blockId]
  );

  const activeSeasons = useMemo(() => seasons.filter((s) => s.is_active), [seasons]);
  const selectedPackaging = useMemo(
    () => packagingTypes.find((p) => p.id === packagingTypeId) ?? null,
    [packagingTypeId, packagingTypes]
  );
  const theoreticalWeight =
    selectedPackaging?.theoretical_weight_kg != null && quantity.trim()
      ? Number((Number(quantity) * selectedPackaging.theoretical_weight_kg).toFixed(3))
      : null;

  const currentVigenteSeason = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const fromDates = activeSeasons.filter((s) => {
      const start = (s as { start_date?: string | null }).start_date;
      const end = (s as { end_date?: string | null }).end_date;
      if (!start && !end) return true;
      if (start && end) return start <= today && today <= end;
      if (start) return start <= today;
      if (end) return today <= end;
      return false;
    });
    if (fromDates.length === 1) return fromDates[0];
    return fromDates[0] ?? null;
  }, [activeSeasons]);

  const seasonWarn =
    showCreate && !editingId && activeSeasons.length === 0
      ? 'No hay temporada activa. Crea o activa una temporada en Datos maestros antes de asociar lotes.'
      : showCreate && !editingId && !currentVigenteSeason
        ? 'Ninguna temporada activa cubre la fecha actual. Puedes asociar una manualmente o revisar fechas en Datos maestros.'
        : null;

  const resetForm = () => {
    setEditingId(null);
    setShowCreate(false);
    setProducerId('');
    setVarietyId('');
    setFruitDate('');
    setHarvestBlock('');
    setFieldId('');
    setBlockId('');
    setSeasonId('');
    setProducerGuideNumber('');
    setPackagingTypeId('');
    setQuantity('');
    setQuantityUnit('');
    setLotType(LotType.ORIGEN);
    setFolioInterno('');
    setKgDeclarados('');
    setSourceLotIds([]);
    setSourceQuantities({});
    setSourceRemnant({});
    setThisLotKind('RESULTADO');
    setExtraOutputs([]);
    setSourceQuery('');
    setSourceLoading(false);
    setMessage(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
    if (currentVigenteSeason) setSeasonId(currentVigenteSeason.id);
  };

  const startEdit = async (row: LotRow) => {
    setEditingId(row.id);
    setProducerId(row.producer_id);
    setVarietyId(row.variety_id);
    setFruitDate(row.fruit_date);
    setHarvestBlock(row.harvest_block);
    setFieldId(row.field_id ?? '');
    setBlockId(row.block_id ?? '');
    setSeasonId(row.season_id ?? '');
    setProducerGuideNumber(row.producer_guide_number ?? '');
    setPackagingTypeId(row.packaging_type_id ?? '');
    setQuantity(row.quantity != null ? String(row.quantity) : '');
      setQuantityUnit(row.quantity_unit != null ? String(row.quantity_unit) : '');
    setLotType(row.lot_type ?? LotType.ORIGEN);
    setFolioInterno(row.folio_interno ?? '');
    setKgDeclarados(row.kg_declarados != null ? String(row.kg_declarados) : '');
    setSourceLotIds([]);
    setSourceQuantities({});
    setSourceQuery('');
    setShowCreate(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Genealogía bajo demanda: solo al editar un lote PROCESO/REPALLETIZAJE.
    if ((row.lot_type ?? LotType.ORIGEN) !== LotType.ORIGEN) {
      setSourceLoading(true);
      try {
        const res = await listLotGenealogy({ derived_lot_id: row.id });
        if (res.error) {
          setMessage({
            type: 'error',
            text: isMissingSchema(res.error as { code?: string; message?: string })
              ? 'Falta la migración D-029 (20260924000004_lot_type_genealogy.sql). Aplica la migración en Supabase e intenta de nuevo.'
              : 'No pudimos cargar la genealogía del lote. Revisa tu conexión e intenta de nuevo.',
          });
        } else if (Array.isArray(res.data)) {
          setSourceLotIds(res.data.map((r) => r.source_lot_id));
          const qtyMap: Record<string, { quantity: string; unit: string }> = {};
          res.data.forEach((r) => {
            qtyMap[r.source_lot_id] = {
              quantity: r.quantity != null ? String(r.quantity) : '',
              unit: r.unit ?? '',
            };
          });
          setSourceQuantities(qtyMap);
        }
      } finally {
        setSourceLoading(false);
      }
    }
  };

  const isClosed = (row: LotRow) => row.status === LotStatus.CERRADO;

  const stageLabel = useCallback(
    (id: string | null) =>
      id ? (stages.find((s) => s.id === id)?.name ?? '—') : 'Sin etapa',
    [stages]
  );

  const hasStage = (row: LotRow) =>
    Boolean(row.current_operational_stage_id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHistoryLot(null);
        setOpenMenuId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (statusFilter && row.status !== statusFilter) return false;
        const cls = latestClassByLot.get(row.id);
        if (classFilter && cls?.commercial_class !== classFilter) return false;
        if (semaphoreFilter === 'NONE') {
          if (cls) return false;
        } else if (semaphoreFilter && cls?.semaphore !== semaphoreFilter) {
          return false;
        }
        if (!q) return true;
        const hay = [
          row.folio,
          row.folio_interno,
          row.lot_type ? (LOT_TYPE_LABELS[row.lot_type] ?? row.lot_type) : '',
          row.kg_declarados != null ? String(row.kg_declarados) : '',
          row.harvest_block,
          row.producer_guide_number,
          nameOf(producers, row.producer_id),
          nameOf(varieties, row.variety_id),
          row.fruit_date,
          row.status,
          stageLabel(row.current_operational_stage_id),
          cls?.commercial_class ?? '',
          cls?.semaphore ?? '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [
    rows,
    query,
    statusFilter,
    classFilter,
    semaphoreFilter,
    latestClassByLot,
    producers,
    varieties,
    nameOf,
    stageLabel,
  ]);

  // Lotes fuente: búsqueda bajo demanda (solo memoria local, sin consultas).
  // Con vacío se muestran únicamente los ya seleccionados; al escribir se
  // agregan las coincidencias. Máximo 40 visibles.
  const sourceResults = useMemo(() => {
    if (lotType === LotType.ORIGEN) return [];
    const q = sourceQuery.trim().toLowerCase();
    // Un lote sin existencias reales no puede ser fuente: se muestra, pero no se
    // puede seleccionar (D-032: la disponibilidad viene del ledger, no del estado).
    const eligible = rows.filter(
      (r) => r.id !== editingId && (availability[r.id]?.available ?? 0) > 0
    );
    const matches = eligible.filter((r) => {
      if (sourceLotIds.includes(r.id)) return true;
      if (!q) return false;
      const variety = varieties.find((v) => v.id === r.variety_id);
      const hay = [
        r.folio,
        r.folio_interno,
        r.harvest_block,
        r.producer_guide_number,
        r.fruit_date,
        nameOf(producers, r.producer_id),
        variety?.name,
        variety ? nameOf(species, variety.species_id) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    return matches.slice(0, 40);
  }, [rows, editingId, sourceQuery, sourceLotIds, lotType, producers, varieties, species, availability, nameOf]);

  /** Consumo declarado por fuente, con su disponibilidad real del ledger. */
  const sourceDrafts = useMemo(() => {
    return sourceLotIds.map((id) => {
      const avail = availability[id];
      const q = sourceQuantities[id];
      const consumed = q?.quantity && Number(q.quantity) > 0 ? Number(q.quantity) : 0;
      const available = avail?.available ?? 0;
      return {
        source_lot_id: id,
        available_quantity: available,
        consumed_quantity: consumed,
        unit: (q?.unit ?? avail?.unit ?? '').trim(),
        remnant_handling:
          sourceRemnant[id] === false ? ('SIN_REMANENTE' as const) : ('COMO_LOTE_NUEVO' as const),
      };
    });
  }, [sourceLotIds, sourceQuantities, sourceRemnant, availability]);

  /** Sobras de las fuentes que deben salir como remanente. */
  const sourceRemnantDefault = useCallback(() => {
    return sourceDrafts
      .filter((d) => d.remnant_handling === 'COMO_LOTE_NUEVO')
      .reduce((a, d) => a + Math.max(0, d.available_quantity - d.consumed_quantity), 0);
  }, [sourceDrafts]);

  /**
   * Validación con la MISMA especificación que la función SQL
   * (D-032 §13). Un resumen propio de balance no alcanza: la base exige
   * además que el remanente declarado cubra la sobra de las fuentes.
   */
  const transformValidation = useMemo(() => {
    if (lotType === LotType.ORIGEN) return null;
    const unit = quantityUnit.trim();
    const ownQty = quantity.trim() && Number(quantity) > 0 ? Number(quantity) : 0;
    const outputs = [
      ...(ownQty > 0
        ? [
            {
              result_lot_id: 'pendiente',
              output_kind: thisLotKind as OutputKind,
              quantity: ownQty,
              unit,
              new_lot: { harvest_block: 'en creacion' } as never,
            },
          ]
        : []),
      ...extraOutputs
        .filter((o) => o.quantity && Number(o.quantity) > 0)
        .map((o) => {
          const n = Number(o.quantity);
          const producto = o.kind === 'RESULTADO' || o.kind === 'REMANENTE';
          return {
            result_lot_id: producto ? 'pendiente' : null,
            output_kind: o.kind as OutputKind,
            quantity: n,
            unit,
            reason: o.reason.trim() || null,
            new_lot: producto ? ({ harvest_block: 'en creacion' } as never) : null,
          };
        }),
    ];
    const avail = new Map<string, number>();
    for (const d of sourceDrafts) avail.set(d.source_lot_id, d.available_quantity);
    return validateTransformation({
      unit,
      inputs: sourceDrafts,
      outputs,
      availability: avail,
      transformationType: opType,
      motive: opMotive,
    });
  }, [lotType, quantity, quantityUnit, thisLotKind, extraOutputs, sourceDrafts, opType, opMotive]);

  /** Ecuación de balance: lo que sale de las fuentes = lo que se registra. */
  const balanceSummary = useCallback(() => {
    const delivered = sourceDrafts.reduce(
      (a, d) => a + d.consumed_quantity + Math.max(0, d.available_quantity - d.consumed_quantity),
      0
    );
    const own = quantity.trim() && Number(quantity) > 0 ? Number(quantity) : 0;
    const extras = extraOutputs.reduce((a, o) => {
      const n = o.quantity && Number(o.quantity) > 0 ? Number(o.quantity) : 0;
      return a + n;
    }, 0);
    const declared = own + extras;
    return { delivered, declared, difference: Math.round((delivered - declared) * 1e6) / 1e6 };
  }, [sourceDrafts, quantity, extraOutputs]);

  const openHistory = async (row: LotRow) => {
    setHistoryLot(row);
    setHistoryAi([]);
    setHistoryAiLoading(true);
    setTraceEvents([]);
    setTraceError(null);
    setTraceLoading(true);
    try {
      const [aiRes, sessionRes] = await Promise.all([
        listAiAnalysesByLot(row.id),
        getCurrentSession(),
      ]);
      if (!aiRes.error) setHistoryAi((aiRes.data ?? []) as typeof historyAi);

      const session = sessionRes.session;
      if (!session?.access_token) {
        setTraceError('Sesión expirada.');
      } else {
        const res = await fetch(`/api/traceability?lot_id=${encodeURIComponent(row.id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = (await res.json().catch(() => ({}))) as {
          events?: TraceabilityEvent[];
          error?: string;
        };
        if (!res.ok) {
          setTraceError(j.error ?? 'No se pudo cargar la historia.');
        } else {
          setTraceEvents(j.events ?? []);
        }
      }
    } catch {
      setTraceError('No se pudo cargar la historia.');
    } finally {
      setHistoryAiLoading(false);
      setTraceLoading(false);
    }
  };

  const traceLabel = (ev: TraceabilityEvent): string => {
    switch (ev.event_type) {
      case 'LOT_CREATED':
        return 'Lote creado';
      case 'LOT_STATUS_CHANGED':
        return 'Cambio de estado';
      case 'LOT_UPDATED':
        return 'Lote modificado';
      case 'STAGE_EVENT':
        return ev.operation === 'INGRESO' ? 'Recepción' : 'Transición';
      case 'INSPECTION_CREATED':
        return 'Inspección iniciada';
      case 'INSPECTION_COMPLETED':
        return 'Inspección completada';
      case 'INSPECTION_UPDATED':
        return 'Inspección actualizada';
      case 'QUALITY_EVALUATION':
        return 'Evaluación de calidad';
      case 'DECISION_REGISTERED':
        return 'Decisión registrada';
      case 'DECISION_ANNULLED':
        return 'Decisión anulada';
      default:
        return String(ev.event_type);
    }
  };

  const traceSummary = (ev: TraceabilityEvent): string => {
    const ctx = ev.context ?? {};
    const ns = ev.new_state ?? {};
    if (ev.event_type === 'STAGE_EVENT') {
      const sid = String(ns['operational_stage_id'] ?? ctx['operational_stage_id'] ?? '');
      return stageLabel(sid);
    }
    if (ev.event_type === 'LOT_STATUS_CHANGED') {
      const prev = String(ev.previous_state?.['status'] ?? ctx['previous_status'] ?? '—');
      const next = String(ns['status'] ?? ctx['new_status'] ?? '—');
      return `${prev} → ${next}`;
    }
    if (ev.event_type === 'LOT_CREATED') {
      return String(ctx['harvest_block'] ?? ns['harvest_block'] ?? 'LOTE');
    }
    if (ev.event_type === 'DECISION_REGISTERED' || ev.event_type === 'DECISION_ANNULLED') {
      return String(ctx['decision_label'] ?? ctx['decision_code'] ?? ns['decision_code'] ?? '');
    }
    if (ev.event_type === 'QUALITY_EVALUATION') {
      return String(ns['result'] ?? ctx['result'] ?? '');
    }
    if (
      ev.event_type === 'INSPECTION_CREATED' ||
      ev.event_type === 'INSPECTION_COMPLETED' ||
      ev.event_type === 'INSPECTION_UPDATED'
    ) {
      return String(ns['status'] ?? ctx['status'] ?? '');
    }
    return '';
  };

  const traceDetail = (ev: TraceabilityEvent): string | null => {
    const ctx = ev.context ?? {};
    const ns = ev.new_state ?? {};
    if (ev.event_type === 'STAGE_EVENT') {
      const notes = ctx['notes'];
      return typeof notes === 'string' && notes ? notes : null;
    }
    if (ev.event_type === 'DECISION_ANNULLED') {
      const reason = ctx['annul_reason'] ?? ns['annul_reason'];
      return typeof reason === 'string' && reason ? `Motivo: ${reason}` : null;
    }
    if (ev.event_type === 'QUALITY_EVALUATION') {
      const observed = ns['observed_value'] ?? ctx['observed_value'];
      if (observed === null || observed === undefined || observed === '') return null;
      const unit = ns['unit'];
      return `Valor: ${String(observed)}${unit ? ` ${unit}` : ''}`;
    }
    return null;
  };

  const statusChip = (status: LotStatus) => (
    <span
      className={`qx-chip ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );

  const stageChip = (row: LotRow) =>
    hasStage(row) ? (
      <span className="qx-chip bg-[#e7edd9] text-[#3a4d1b] border border-[#4A5D23]/25">
        {stageLabel(row.current_operational_stage_id)}
      </span>
    ) : (
      <span className="qx-chip border border-dashed border-[#1a1a1a]/25 bg-[#f3f4f1] text-[#6b7264]">
        Sin etapa
      </span>
    );

  const semaphoreDotColor = (semaphore: string): string => {
    if (semaphore === 'VERDE') return 'bg-[#4A5D23]';
    if (semaphore === 'ROJO') return 'bg-[#dc2626]';
    if (semaphore === 'AMARILLO') return 'bg-[#d97706]';
    return 'bg-[#9ca3af]';
  };

  const classificationChips = (row: LotRow) => {
    const cls = latestClassByLot.get(row.id);
    if (!cls) {
      return (
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6b7065]"
          title="Sin clasificación registrada"
          data-testid={`lot-classification-${row.id}`}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#1a1a1a]/25 bg-[#e5e7eb]"
            aria-hidden
          />
          Sin clasificación
        </span>
      );
    }
    return (
      <div
        className="flex flex-wrap items-center gap-1.5"
        data-testid={`lot-classification-${row.id}`}
      >
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#444]"
          title={`Semáforo operacional QualityNX (no SAG): ${cls.semaphore}`}
        >
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${semaphoreDotColor(cls.semaphore)}`}
            aria-hidden
          />
          <span>{cls.semaphore}</span>
        </span>
        <span className="qx-chip border border-[#1a1a1a]/15 bg-[#f3f4f1] text-[#444]">
          {cls.commercial_class}
        </span>
      </div>
    );
  };

  const commercialClasses = useMemo(() => {
    const set = new Set<string>();
    for (const c of latestClassByLot.values()) {
      if (c?.commercial_class) set.add(c.commercial_class);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [latestClassByLot]);

  const needsAttention = (row: LotRow) =>
    !isClosed(row) && ATTENTION_STATUSES.includes(row.status);

  const rowActions = (row: LotRow) => {
    const manage = canManage && !isClosed(row);
    const menuOpen = openMenuId === row.id;
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!isClosed(row) && (
          <Link
            href={`/dashboard/inspections?lot=${row.id}`}
            className="qx-btn-brand-solid"
            onClick={() => setOpenMenuId(null)}
          >
            Inspeccionar
          </Link>
        )}
        <div className="qx-menu" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="qx-btn-ghost"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Más acciones para lote ${row.harvest_block}`}
            onClick={() => setOpenMenuId(menuOpen ? null : row.id)}
          >
            Más acciones
            <span aria-hidden className="text-[10px] opacity-70">▾</span>
          </button>
          {menuOpen && (
            <div className="qx-menu-panel" role="menu" onClick={(e) => e.stopPropagation()}>
              <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); openHistory(row); }}>
                Ver historia
              </button>
              <Link
                href={`/dashboard/trazabilidad/${row.id}`}
                role="menuitem"
                className="qx-menu-item"
                onClick={() => setOpenMenuId(null)}
              >
                Trazabilidad completa
              </Link>
              <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); setLabelLot(row); }}>
                Etiqueta
              </button>
              {manage && (
                <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); void startEdit(row); }}>
                  Editar
                </button>
              )}
              {!canManage && (
                <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); void startEdit(row); }}>
                  Ver
                </button>
              )}
              {manage && (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="menu-disposition"
                  onClick={() => {
                    setOpenMenuId(null);
                    setDispositionLotId(row.id);
                    setDispositionLotFolio(row.folio ?? row.harvest_block ?? '');
                  }}
                >
                  Registrar disposición
                </button>
              )}
              {manage && (
                <button
                  type="button"
                  role="menuitem"
                  data-danger="true"
                  disabled={busy}
                  title="Cerrar lote (terminal)"
                  onClick={() => { setOpenMenuId(null); close(row); }}
                >
                  Cerrar lote
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!producerId || !varietyId || !fruitDate || !harvestBlock.trim()) {
      setMessage({
        type: 'error',
        text: 'Productor, variedad, fecha de fruta y bloque de cosecha son obligatorios.',
      });
      return;
    }
    if (!packagingTypeId) {
      setMessage({
        type: 'error',
        text: 'Selecciona un embalaje existente.',
      });
      return;
    }
    const qtyInformada = quantity.trim() !== '';
    if (qtyInformada && Number(quantity) <= 0) {
      setMessage({
        type: 'error',
        text: 'La cantidad debe ser mayor que cero.',
      });
      return;
    }
    if (qtyInformada && !quantityUnit.trim()) {
      setMessage({
        type: 'error',
        text: 'Si informas cantidad, la unidad es obligatoria.',
      });
      return;
    }
    if (kgDeclarados.trim() && Number(kgDeclarados) < 0) {
      setMessage({ type: 'error', text: 'Los kg declarados no pueden ser negativos.' });
      return;
    }
    if (!editingId && lotType !== LotType.ORIGEN && sourceLotIds.length === 0) {
      setMessage({
        type: 'error',
        text: 'Selecciona al menos un lote fuente para un lote de proceso o repalletizaje.',
      });
      return;
    }
    // La transformación se valida ANTES de crear el lote. Sin esta puerta, una
    // operación inválida (tipo mal formado, balance descuadrado, reproceso sin
    // motivo) dejaba el lote ya creado y huérfano, sin transformación.
    if (!editingId && transformValidation && !transformValidation.ok) {
      setMessage({
        type: 'error',
        text: `La transformación no está completa: ${transformValidation.errors.join(' ')}`,
      });
      return;
    }
    const sourceQuantityError = validateSourceQuantities(sourceLotIds, sourceQuantities);
    if (sourceQuantityError) {
      setMessage({ type: 'error', text: sourceQuantityError });
      return;
    }

    const payload: Record<string, unknown> = {
      producer_id: producerId,
      variety_id: varietyId,
      fruit_date: fruitDate,
      harvest_block: harvestBlock.trim(),
      field_id: fieldId || null,
      block_id: blockId || null,
      season_id: seasonId || null,
      producer_guide_number: producerGuideNumber.trim() || null,
      packaging_type_id: packagingTypeId,
      quantity: quantity.trim() ? Number(quantity) : null,
      quantity_unit: quantity.trim() ? quantityUnit.trim() : null,
      lot_type: lotType,
      folio_interno: folioInterno.trim() || null,
      kg_declarados: kgDeclarados.trim() ? Number(kgDeclarados) : null,
    };

    let transformacionesCreadas: { id: string; extras: number } | null = null;
    setBusy(true);
    try {
      if (editingId) {
        const row = rows.find((r) => r.id === editingId);
        if (row && isClosed(row)) {
          setMessage({ type: 'error', text: 'Un lote CERRADO no puede modificarse.' });
          return;
        }
        const { error } = await updateLot(editingId, payload);
        if (error) {
          if (isUniqueViolation(error)) {
            setMessage({
              type: 'error',
              text: 'Ya existe un lote con este productor, variedad, fecha y bloque de cosecha.',
            });
          } else {
            setMessage({
              type: 'error',
              text: isMissingSchema(error)
                ? 'Falta la migración D-029 (20260924000004_lot_type_genealogy.sql). Aplica la migración en Supabase e intenta de nuevo.'
                : 'No pudimos actualizar el lote. Revisa los datos e intenta de nuevo.',
            });
          }
          return;
        }
        if (lotType !== LotType.ORIGEN && companyId && sourceLotIds.length > 0) {
          // Genealogía bajo demanda al guardar: consulta solo este lote.
          const existingRes = await listLotGenealogy({ derived_lot_id: editingId });
          const existingRows = !existingRes.error && Array.isArray(existingRes.data)
            ? existingRes.data
            : [];
          const existing = new Set(existingRows.map((r) => r.source_lot_id));
          const missing = sourceLotIds.filter((s) => !existing.has(s));
          if (missing.length > 0) {
            const relationType = opType;
            const genealogyError = await Promise.all(
              missing.map((sourceId) => {
                const qty = sourceQuantities[sourceId];
                const quantity = qty?.quantity && Number(qty.quantity) > 0 ? Number(qty.quantity) : null;
                const unit = qty?.unit?.trim() || null;
                if (quantity != null && !unit) {
                  return Promise.resolve({ data: null, error: { message: 'unit_required' } });
                }
                return insertLotGenealogy({
                  company_id: companyId,
                  source_lot_id: sourceId,
                  derived_lot_id: editingId,
                  relation_type: relationType,
                  quantity,
                  unit,
                });
              })
            ).then((results) => results.find((r) => r.error)?.error ?? null);
            if (genealogyError) {
              setMessage({
                type: 'error',
                text: genealogyError.message === 'unit_required'
                  ? 'Si informas cantidad, la unidad es obligatoria.'
                  : 'Lote actualizado, pero no pudimos registrar la genealogía con los lotes fuente. Intenta de nuevo.',
              });
              return;
            }
          }
        }
      } else {
        if (!companyId) {
          setMessage({ type: 'error', text: 'El usuario no tiene empresa asignada.' });
          return;
        }
        const { data: createdLot, error } = await createLot({ ...payload, company_id: companyId });
        if (error) {
          if (isUniqueViolation(error)) {
            setMessage({
              type: 'error',
              text: 'Ya existe un lote con este productor, variedad, fecha y bloque de cosecha.',
            });
          } else {
            setMessage({
              type: 'error',
              text: isMissingSchema(error)
                ? 'Falta la migración D-029 (20260924000004_lot_type_genealogy.sql). Aplica la migración en Supabase e intenta de nuevo.'
                : 'No pudimos crear el lote. Revisa los datos e intenta de nuevo.',
            });
          }
          return;
        }
        if (lotType !== LotType.ORIGEN) {
          const newLotId = (createdLot as { id?: string } | null)?.id;
          if (!newLotId) {
            setMessage({ type: 'error', text: 'Lote creado, pero no pudimos identificarlo.' });
            return;
          }
          const unidad = quantityUnit.trim();
          const v = transformValidation;
          if (!v || !v.ok) {
            setMessage({
              type: 'error',
              text: `La transformación no está completa: ${(v?.errors ?? ['falta definir la transformación']).join(' ')}`,
            });
            return;
          }
          const relationType = opType;
          const t = await createTransformationDraft({
            companyId,
            transformationType: relationType,
            unit: unidad,
            // El motivo es el campo `notes`. REPROCESO lo exige; para el resto
            // se guarda si el inspector lo escribe y si no se deja la traza del alta.
            notes: opMotive.trim() || `Alta de lote ${lotType}`,
          });
          if (t.error || !t.data) {
            setMessage({
              type: 'error',
              text: 'Lote creado, pero no pudimos registrar la transformación. Intenta de nuevo desde la edición.',
            });
            return;
          }
          const tid = (t.data as { id: string }).id;
          for (const d of sourceDrafts) {
            if (d.consumed_quantity <= 0) continue;
            const r = await addTransformationInput({
              transformationId: tid,
              companyId,
              sourceLotId: d.source_lot_id,
              availableQuantity: d.available_quantity,
              consumedQuantity: d.consumed_quantity,
              unit: d.unit,
              remnantHandling: d.remnant_handling,
            });
            if (r.error) {
              setMessage({ type: 'error', text: 'No pudimos registrar el consumo de un lote fuente.' });
              return;
            }
          }
          const ownQty = quantity.trim() && Number(quantity) > 0 ? Number(quantity) : 0;
          if (ownQty > 0) {
            const r = await addTransformationOutput({
              transformationId: tid,
              companyId,
              outputKind: thisLotKind,
              quantity: ownQty,
              unit: unidad,
              resultLotId: newLotId,
            });
            if (r.error) {
              setMessage({ type: 'error', text: 'No pudimos registrar la salida principal.' });
              return;
            }
          }
          let extraLots = 0;
          for (const o of extraOutputs) {
            const n = o.quantity && Number(o.quantity) > 0 ? Number(o.quantity) : 0;
            if (n <= 0) continue;
            if (o.kind === 'MERMA' || o.kind === 'DESCARTE') {
              const r = await addTransformationOutput({
                transformationId: tid,
                companyId,
                outputKind: o.kind,
                quantity: n,
                unit: unidad,
                reason: o.reason.trim(),
              });
              if (r.error) {
                setMessage({ type: 'error', text: 'No pudimos registrar merma o descarte.' });
                return;
              }
              continue;
            }
            const nl = await createLot({
              ...payload,
              company_id: companyId,
              // El lote extra es siempre de la naturaleza del lote creado
              // (PROCESO o REPALLETIZAJE). El TIPO DE OPERACIÓN va en
              // lot_transformations y lot_genealogy, no en lots.lot_type,
              // cuyo CHECK solo admite ORIGEN/PROCESO/REPALLETIZAJE.
              lot_type: lotType,
              quantity: n,
              quantity_unit: unidad,
              harvest_block: `${harvestBlock.trim()} · ${o.kind}`,
              folio_interno: null,
              kg_declarados: null,
            });
            if (nl.error || !(nl.data as { id?: string } | null)?.id) {
              setMessage({ type: 'error', text: `No pudimos crear el lote de ${o.kind.toLowerCase()}.` });
              return;
            }
            extraLots += 1;
            const r = await addTransformationOutput({
              transformationId: tid,
              companyId,
              outputKind: o.kind,
              quantity: n,
              unit: unidad,
              resultLotId: (nl.data as { id: string }).id,
            });
            if (r.error) {
              setMessage({ type: 'error', text: 'No pudimos registrar la salida adicional.' });
              return;
            }
          }
          transformacionesCreadas = { id: tid, extras: extraLots };
        }
      }
      const okText = editingId ? 'Lote actualizado.' : 'Lote creado.';
      resetForm();
      setMessage({
        type: 'ok',
        text: transformacionesCreadas
          ? `${okText} Transformación ${transformacionesCreadas.id.slice(0, 8)} creada en BORRADOR${transformacionesCreadas.extras ? ' con ' + transformacionesCreadas.extras + ' lote(s) adicional(es)' : ''}. La existencia de las fuentes NO se mueve hasta que se confirme la transformación.`
          : okText,
      });
      await loadAll();
      await refreshAvailability();
    } finally {
      setBusy(false);
    }
  };

  /**
   * Registra la disposición final del lote (D-032 §12).
   * No inventa categorías ni destinos: usa los cinco tipos del modelo,
   * exige motivo y, si se informa cantidad, exige unidad.
   */
  const saveDisposition = async () => {
    if (!companyId || !dispositionLotId) return;
    if (!dispositionReason.trim()) {
      setMessage({ type: 'error', text: 'La disposición exige motivo.' });
      return;
    }
    const qty = dispositionQty.trim() && Number(dispositionQty) > 0 ? Number(dispositionQty) : null;
    if (qty != null && !dispositionUnit.trim()) {
      setMessage({ type: 'error', text: 'Si informas cantidad, la unidad es obligatoria.' });
      return;
    }
    setBusy(true);
    try {
      const { error } = await createDisposition({
        companyId,
        lotId: dispositionLotId,
        dispositionType,
        reason: dispositionReason,
        quantity: qty,
        unit: dispositionUnit.trim() || null,
        destinationReference: dispositionRef.trim() || null,
        dispositionResult: dispositionResult.trim() || null,
      });
      if (error) {
        setMessage({ type: 'error', text: error.message ?? 'No pudimos registrar la disposición.' });
        return;
      }
      setMessage({ type: 'ok', text: `Disposición registrada para el lote ${dispositionLotFolio}.` });
      setDispositionLotId(null);
      setDispositionLotFolio('');
      setDispositionType('DESPACHO');
      setDispositionQty('');
      setDispositionUnit('');
      setDispositionRef('');
      setDispositionResult('');
      setDispositionReason('');
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const close = async (row: LotRow) => {
    setMessage(null);
    if (isClosed(row)) return;
    const ok = window.confirm(
      'Cerrar este lote? CERRADO es un estado terminal: no se podrá reabrir. El lote permanece disponible para consulta.'
    );
    if (!ok) return;
    setBusy(true);
    try {
      const { error } = await updateLot(row.id, { status: LotStatus.CERRADO });
      if (error) {
        setMessage({
          type: 'error',
          text: 'No pudimos cerrar el lote. Intenta de nuevo.',
        });
        return;
      }
      setMessage({ type: 'ok', text: 'Lote cerrado. Permanece disponible para consulta.' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'qx-input';

  const activeCount = rows.filter((r) => !isClosed(r)).length;
  const attentionCount = rows.filter(needsAttention).length;
  const filterOptions = Object.values(LotStatus);

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Disposición final del lote (D-032 §12) */}
      {dispositionLotId ? (
        <section
          className="rounded-xl border border-[#1a1a1a]/10 bg-white p-4 sm:p-5"
          data-testid="disposition-panel"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="qx-eyebrow">Disposición final</p>
              <h2 className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">
                Lote {dispositionLotFolio}
              </h2>
              <p className="mt-1 max-w-2xl text-[12px] text-[#5c6b45]">
                Registra el destino final del lote. La razón es obligatoria. Si
                informas cantidad, la unidad también lo es: no hay conversión
                automática. La referencia de destino es texto libre; dejarla
                vacía significa &quot;no registrado&quot;, nunca
                &quot;no hubo despacho&quot;.
              </p>
            </div>
            <button
              type="button"
              className="qx-btn-ghost"
              onClick={() => setDispositionLotId(null)}
              disabled={busy}
            >
              Cerrar panel
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Tipo de disposición
              <select
                className={`${inputClass} mt-1 block`}
                value={dispositionType}
                onChange={(e) => setDispositionType(e.target.value as DispositionType)}
                data-testid="disposition-type"
              >
                {DISPOSITION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DISPOSITION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Cantidad (opcional)
              <input
                className={`${inputClass} mt-1 block`}
                type="number"
                step="any"
                value={dispositionQty}
                onChange={(e) => setDispositionQty(e.target.value)}
                placeholder="Sin cantidad registrada"
                data-testid="disposition-qty"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Unidad
              <input
                className={`${inputClass} mt-1 block`}
                value={dispositionUnit}
                onChange={(e) => setDispositionUnit(e.target.value)}
                placeholder="cajas, kg…"
                data-testid="disposition-unit"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Referencia de destino (opcional)
              <input
                className={`${inputClass} mt-1 block`}
                value={dispositionRef}
                onChange={(e) => setDispositionRef(e.target.value)}
                placeholder="Documento, cliente, planta…"
                data-testid="disposition-ref"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Resultado (opcional)
              <input
                className={`${inputClass} mt-1 block`}
                value={dispositionResult}
                onChange={(e) => setDispositionResult(e.target.value)}
                placeholder="Estado observado de la entrega"
                data-testid="disposition-result"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
              Motivo (obligatorio)
              <input
                className={`${inputClass} mt-1 block`}
                value={dispositionReason}
                onChange={(e) => setDispositionReason(e.target.value)}
                placeholder="Por qué se registra esta disposición"
                data-testid="disposition-reason"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="qx-btn-brand-solid"
              disabled={busy || !dispositionReason.trim()}
              onClick={() => void saveDisposition()}
              data-testid="disposition-save"
            >
              Registrar disposición
            </button>
          </div>
        </section>
      ) : null}

      {/* Cabecera de operación */}
      <header className="qx-opheader">
        <div className="min-w-0 flex-1">
          <p className="qx-eyebrow">Operación</p>
          <h1 className="qx-h1">Lotes</h1>
          <p className="qx-sub max-w-2xl">
            Identidad, estado y etapa de cada lote. La etapa se registra al abrir una
            inspección; el estado refleja la situación operacional actual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="qx-metric">
            <strong>{rows.length}</strong>
            <span>Total</span>
          </div>
          <div className="qx-metric">
            <strong>{activeCount}</strong>
            <span>Activos</span>
          </div>
          <div className="qx-metric" style={attentionCount > 0 ? { borderColor: 'var(--attention-line)', background: 'var(--attention-bg)' } : undefined}>
            <strong style={attentionCount > 0 ? { color: 'var(--attention)' } : undefined}>{attentionCount}</strong>
            <span>Atención</span>
          </div>
          {canManage && (
            <button
              type="button"
              className="qx-btn-brand-solid"
              onClick={() => {
                if (showCreate) {
                  resetForm();
                  setShowCreate(false);
                } else {
                  openCreate();
                }
              }}
            >
              {showCreate ? 'Ocultar formulario' : editingId ? 'Editar lote' : 'Nuevo lote'}
            </button>
          )}
        </div>
      </header>

      <div className="qx-toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="qx-search"
          placeholder="Buscar por folio QualityNX, folio interno, guía, productor, variedad o etapa…"
          aria-label="Buscar lotes"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | LotStatus)}
          className="qx-select-pill"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {filterOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="qx-select-pill"
          aria-label="Filtrar por clasificación comercial"
          data-testid="filter-commercial-class"
        >
          <option value="">Toda clasificación</option>
          {commercialClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={semaphoreFilter}
          onChange={(e) =>
            setSemaphoreFilter(e.target.value as '' | QualitySemaphore | 'NONE')
          }
          className="qx-select-pill"
          aria-label="Filtrar por semáforo QualityNX"
          data-testid="filter-semaphore"
        >
          <option value="">Todo semáforo</option>
          <option value={QualitySemaphore.VERDE}>Verde</option>
          <option value={QualitySemaphore.AMARILLO}>Amarillo</option>
          <option value={QualitySemaphore.ROJO}>Rojo</option>
          <option value="NONE">Sin clasificación</option>
        </select>
        {(query || statusFilter || classFilter || semaphoreFilter) && (
          <button
            type="button"
            className="qx-btn-ghost"
            onClick={() => {
              setQuery('');
              setStatusFilter('');
              setClassFilter('');
              setSemaphoreFilter('');
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`qx-banner ${message.type === 'ok' ? 'qx-banner-ok' : 'qx-banner-error'}`}
        >
          {message.text}
        </div>
      )}

      {canManage && (showCreate || editingId) && (
        <form
          onSubmit={handleSubmit}
          className="qx-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
                {editingId ? 'Editar lote' : 'Nuevo lote'}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#888]">
                {editingId
                  ? 'Actualiza los datos de identificación. Un lote CERRADO no se modifica.'
                  : 'Registra la identidad del lote para poder inspeccionarlo.'}
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="qx-btn-ghost"
            >
              {editingId ? 'Cancelar' : 'Ocultar'}
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-[#1a1a1a]/12 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              1 · Tipo de lote
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#5c6b45]">
              El tipo define el contexto que se solicita. Un lote de origen se captura en campo;
              un lote de proceso o repalletizado nace de lotes fuente con existencias, y su
              contenido no existe hasta que la transformación se confirme.
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de lote">
              {LOT_TYPES.map((t) => {
                const active = lotType === t;
                const desc =
                  t === LotType.ORIGEN
                    ? 'Fruta que entra a QualityNX desde el campo.'
                    : t === LotType.PROCESO
                      ? 'Resultado de una operación de planta sobre lotes fuente.'
                      : 'Reempaque o repalletizado de lotes fuente.';
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLotType(t)}
                    data-testid={`lot-type-${t}`}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-[#1a1a1a] bg-[#f4f6ee]'
                        : 'border-[#1a1a1a]/12 bg-white hover:bg-[#fafbf7]'
                    }`}
                  >
                    <span className="block text-[13px] font-semibold text-[#1a1a1a]">
                      {LOT_TYPE_LABELS[t]}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-[#5c6b45]">
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {lotType !== LotType.ORIGEN ? (
              <div className="mt-4 rounded-xl border border-[#1a1a1a]/10 bg-[#fafbf7] p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
                  Tipo de operación
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[#5c6b45]">
                  Describe qué se hizo con los lotes fuente. Es distinto del tipo de
                  lote: un resultado de mezcla es igualmente un lote de proceso.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {(Object.keys(TRANSFORMATION_TYPE_LABELS) as TransformationType[]).map((op) => {
                    const active = opType === op;
                    const rule = TRANSFORMATION_TYPE_RULES[op];
                    const shape =
                      rule.max_sources === 1
                        ? '1 lote fuente'
                        : rule.min_sources >= 2
                          ? `${rule.min_sources}+ lotes fuente`
                          : 'N lotes fuente';
                    const out =
                      rule.max_product_outputs === 1
                        ? '1 lote derivado'
                        : rule.min_product_outputs >= 2
                          ? `${rule.min_product_outputs}+ lotes derivados`
                          : 'N lotes derivados';
                    return (
                      <button
                        key={op}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setOpType(op)}
                        data-testid={`op-type-${op}`}
                        className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-[#1a1a1a] bg-white'
                            : 'border-[#1a1a1a]/12 bg-white/60 hover:bg-white'
                        }`}
                      >
                        <span className="block text-[13px] font-semibold text-[#1a1a1a]">
                          {TRANSFORMATION_TYPE_LABELS[op]}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-[#7a8168]">
                          {shape} → {out}
                          {rule.requires_motive ? ' · con motivo' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
                  {TRANSFORMATION_TYPE_RULES[opType].requires_motive
                    ? 'Motivo del reproceso (obligatorio)'
                    : 'Motivo de la operación (opcional)'}
                  <input
                    className="mt-1 block w-full rounded-lg border border-[#1a1a1a]/12 bg-white px-3 py-2 text-[13px] text-[#1a1a1a]"
                    value={opMotive}
                    onChange={(e) => setOpMotive(e.target.value)}
                    placeholder={
                      TRANSFORMATION_TYPE_RULES[opType].requires_motive
                        ? 'Por qué se reprocesa el lote'
                        : 'Contexto de la operación'
                    }
                    data-testid="op-motive"
                  />
                </label>
              </div>
            ) : null}
          </div>

          {lotType === LotType.ORIGEN && (
            <p className="mt-3 rounded-lg bg-[#eef1e6] px-3 py-2 text-[11px] leading-snug text-[#4A5D23]">
              Lote de origen: no tiene lotes fuente. Se captura su identidad y su contenido
              declarado.
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Productor *
              </label>
              <select
                value={producerId}
                onChange={(e) => {
                  setProducerId(e.target.value);
                  setFieldId('');
                  setBlockId('');
                }}
                required
                className={inputClass}
              >
                <option value="">Seleccionar…</option>
                {activeProducers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Variedad *
              </label>
              <select
                value={varietyId}
                onChange={(e) => setVarietyId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">Seleccionar…</option>
                {activeVarieties.map((v) => {
                  const sp = nameOf(species, v.species_id);
                  return (
                    <option key={v.id} value={v.id}>
                      {sp !== '—' ? `${v.name} (${sp})` : v.name}
                    </option>
                  );
                })}
              </select>
              {(() => {
                const sel = activeVarieties.find((v) => v.id === varietyId);
                const sp = sel ? nameOf(species, sel.species_id) : '—';
                return (
                  <p className="mt-1 text-[11px] text-[#5c6b45]">
                    Especie: {sp !== '—' ? sp : 'selecciona una variedad'}
                  </p>
                );
              })()}
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Fecha de fruta *
              </label>
              <input
                type="date"
                value={fruitDate}
                onChange={(e) => setFruitDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Bloque de cosecha *
              </label>
              <input
                type="text"
                value={harvestBlock}
                onChange={(e) => setHarvestBlock(e.target.value)}
                required
                maxLength={255}
                className={inputClass}
                placeholder="Ej: BLOQUE-01"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Campo
              </label>
              <select
                value={fieldId}
                onChange={(e) => {
                  setFieldId(e.target.value);
                  setBlockId('');
                }}
                className={inputClass}
                disabled={!producerId}
              >
                <option value="">Sin asociar</option>
                {producerFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Cuartel
              </label>
              <select
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                className={inputClass}
                disabled={!fieldId}
              >
                <option value="">Sin asociar</option>
                {fieldBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Temporada
              </label>
              <select
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
                className={inputClass}
                aria-describedby="season-hint"
              >
                <option value="">Sin asociar</option>
                {activeSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {currentVigenteSeason?.id === s.id ? ' (vigente)' : ''}
                  </option>
                ))}
              </select>
              {seasonWarn && (
                <p
                  id="season-hint"
                  className="mt-1.5 rounded-lg border border-amber-200/70 bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-900"
                  role="status"
                >
                  {seasonWarn}
                </p>
              )}
              {!seasonWarn && currentVigenteSeason && !editingId && (
                <p id="season-hint" className="mt-1 text-[11px] text-[#8fa868]">
                  Temporada vigente preseleccionada.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                N° Guía productor
              </label>
              <input
                type="text"
                value={producerGuideNumber}
                onChange={(e) => setProducerGuideNumber(e.target.value)}
                maxLength={100}
                className={inputClass}
                placeholder="Opcional — editable después"
              />
              <p className="mt-1 text-[11px] leading-snug text-[#9aa090]">
                Varias guías: una guía puede originar varios lotes; la misma guía se repite en
                cada lote (sin transformación).
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Folio interno / planta
              </label>
              <input
                type="text"
                value={folioInterno}
                onChange={(e) => setFolioInterno(e.target.value)}
                maxLength={100}
                className={inputClass}
                placeholder="Ej: PL-45872"
                data-testid="folio-interno-input"
              />
              <p className="mt-1 text-[11px] leading-snug text-[#9aa090]">
                Identificador de la planta/productor. Se guarda aparte del folio QualityNX.
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Kg declarados (según guía)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={kgDeclarados}
                onChange={(e) => setKgDeclarados(e.target.value)}
                className={inputClass}
                placeholder="Ej: 12500"
                data-testid="kg-declarados-input"
              />
              <p className="mt-1 text-[11px] leading-snug text-[#9aa090]">
                Dato declarado en la guía; no se sobrescribe con los kilos calculados por el
                sistema.
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Embalaje
              </label>
              <select
                value={packagingTypeId}
                onChange={(e) => setPackagingTypeId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Seleccionar embalaje…</option>
                {packagingTypes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.theoretical_weight_kg != null ? ` · ${p.theoretical_weight_kg} kg` : ' · peso por definir'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Cantidad
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
                placeholder="Ej: 120"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Unidad de cantidad {quantity.trim() ? '*' : ''}
              </label>
              <input
                type="text"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                className={inputClass}
                placeholder="Ej: cajas"
                required={quantity.trim() !== ''}
                list="quantity-unit-options"
              />
              <datalist id="quantity-unit-options">
                <option value="cajas" />
                <option value="bandejas" />
                <option value="envases" />
                <option value="pallet" />
              </datalist>
              {quantity.trim() && (
                <p className="mt-0.5 text-[11px] leading-snug text-[#5c6b45]">
                  Sin cantidad no se registra existencia. Si informas cantidad, la unidad es obligatoria.
                </p>
              )}
            </div>

            {lotType !== LotType.ORIGEN && (
              <>
              <div className="sm:col-span-2 rounded-xl border border-[#4A5D23]/25 bg-[#f4f6ee] px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A5D23]">
                  Lotes fuente *
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#5c6b45]">
                  Selecciona los lotes de origen de este {lotType === LotType.REPALLETIZAJE ? 'repalletizaje' : 'proceso'}. Solo se ofrecen lotes con existencias reales, y declaras cuanto se consume de cada uno.
                </p>
                <input
                  type="search"
                  value={sourceQuery}
                  onChange={(e) => setSourceQuery(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[#1a1a1a]/15 bg-white px-3 py-2 text-[12px] text-[#1a1a1a] placeholder:text-[#999]"
                  placeholder="Buscar por folio, productor, fecha, variedad, especie, guía o bloque…"
                  data-testid="source-lots-search"
                  aria-label="Buscar lotes fuente"
                />
                <div
                  className="mt-2 max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-[#1a1a1a]/10 bg-white px-3 py-2.5"
                  data-testid="source-lots-select"
                >
                  {sourceLoading ? (
                    <p className="text-[12px] text-[#888]">Cargando genealogía…</p>
                  ) : sourceResults.length === 0 ? (
                    <p className="text-[12px] text-[#888]">
                      {rows.filter((r) => r.id !== editingId).length === 0
                        ? 'Crea el lote fuente primero.'
                        : sourceQuery.trim()
                          ? 'Ningún lote coincide con la búsqueda.'
                          : 'Escribe para buscar los lotes fuente.'}
                    </p>
                  ) : (
                    sourceResults.map((r) => {
                      const checked = sourceLotIds.includes(r.id);
                      const qty = sourceQuantities[r.id]?.quantity ?? '';
                      const unit = sourceQuantities[r.id]?.unit ?? '';
                      const avail = availability[r.id];
                      return (
                        <div key={r.id} className="rounded-lg border border-[#1a1a1a]/10 bg-white p-2">
                          <label className="flex items-start gap-2 text-[12px] text-[#444]">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              onChange={(e) => {
                                setSourceLotIds((prev) =>
                                  e.target.checked
                                    ? [...prev, r.id]
                                    : prev.filter((id) => id !== r.id)
                                );
                                if (e.target.checked) {
                                  // El consumo se declara explícitamente, pero se
                                  // propone el total disponible del ledger.
                                  const disponible = avail?.available ?? 0;
                                  const unidad = avail?.unit ?? '';
                                  setSourceQuantities((prev) => ({
                                    ...prev,
                                    [r.id]: {
                                      quantity: prev[r.id]?.quantity || (disponible > 0 ? String(disponible) : ''),
                                      unit: prev[r.id]?.unit || unidad,
                                    },
                                  }));
                                  setSourceRemnant((prev) =>
                                    prev[r.id] === undefined ? { ...prev, [r.id]: true } : prev
                                  );
                                }
                              }}
                            />
                            <span className="min-w-0">
                              <span className="font-semibold text-[#1a1a1a]">
                                {r.folio || r.harvest_block}
                              </span>{' '}
                              · {nameOf(producers, r.producer_id)} · {r.fruit_date} ·{' '}
                              {nameOf(varieties, r.variety_id)} · {r.status}
                              {r.folio_interno ? ` · interno ${r.folio_interno}` : ''}
                            </span>
                            <span className="ml-auto shrink-0 rounded-full bg-[#eef1e6] px-2 py-0.5 text-[11px] font-semibold text-[#4A5D23]">
                              {avail?.available ?? 0} {avail?.unit ?? 'sin unidad'}
                            </span>
                          </label>
                          {checked && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-5">
                              <span className="text-[11px] text-[#5c6b45]">Consumo</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={qty}
                                onChange={(e) =>
                                  setSourceQuantities((prev) => ({
                                    ...prev,
                                    [r.id]: { quantity: e.target.value, unit },
                                  }))
                                }
                                className="w-24 rounded border border-[#1a1a1a]/15 bg-white px-2 py-1 text-[12px]"
                                placeholder="Cantidad"
                                aria-label={`Cantidad consumida de ${r.folio || r.harvest_block}`}
                              />
                              <input
                                type="text"
                                value={unit}
                                onChange={(e) =>
                                  setSourceQuantities((prev) => ({
                                    ...prev,
                                    [r.id]: { quantity: qty, unit: e.target.value },
                                  }))
                                }
                                className="w-24 rounded border border-[#1a1a1a]/15 bg-white px-2 py-1 text-[12px]"
                                placeholder="Unidad"
                                aria-label={`Unidad de consumo de ${r.folio || r.harvest_block}`}
                              />
                              <label className="flex items-center gap-1 text-[11px] text-[#5c6b45]">
                                <input
                                  type="checkbox"
                                  checked={sourceRemnant[r.id] !== false}
                                  onChange={(e) =>
                                    setSourceRemnant((prev) => ({ ...prev, [r.id]: e.target.checked }))
                                  }
                                />
                                Lo que sobra se separa como lote nuevo (remanente)
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-[#5c6b45]">
                  Seleccionados: {sourceLotIds.length}
                </p>
                {(() => {
                  const agotados = rows.filter(
                    (r) => r.id !== editingId && (availability[r.id]?.available ?? 0) <= 0
                  ).length;
                  return agotados > 0 ? (
                    <p className="mt-1 text-[11px] text-[#9aa090]">
                      {agotados} lote(s) sin existencias no se ofrecen como fuente: un lote
                      agotado o sin unidad declarada no puede consumirse.
                    </p>
                  ) : null;
                })()}
              </div>

              <div className="mt-3 rounded-xl border border-[#1a1a1a]/12 bg-white px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                  Salidas de la transformación
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#5c6b45]">
                  Este lote es una de las salidas. Lo que las fuentes entregan debe quedar
                  registrado: resultados, remanente y merma. El remanente es un lote nuevo con
                  folio propio.
                </p>

                <div className="mt-2.5 rounded-lg border border-[#1a1a1a]/10 bg-[#fafbf7] px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#1a1a1a]">
                    Lote en creación ({thisLotKind === 'RESULTADO' ? 'Resultado' : 'Remanente'})
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <select
                      value={thisLotKind}
                      onChange={(e) => setThisLotKind(e.target.value as 'RESULTADO' | 'REMANENTE')}
                      className="rounded border border-[#1a1a1a]/15 bg-white px-2 py-1 text-[12px]"
                      aria-label="Rol de este lote en la transformación"
                      data-testid="this-lot-kind"
                    >
                      <option value="RESULTADO">Resultado</option>
                      <option value="REMANENTE">Remanente</option>
                    </select>
                    <span className="text-[12px] text-[#444]">
                      {quantity.trim() ? `${quantity} ${quantityUnit.trim() || '—'}` : 'sin cantidad declarada'}
                    </span>
                  </div>
                  {thisLotKind === 'REMANENTE' && sourceRemnantDefault() > 0 && (
                    <p className="mt-1 text-[11px] text-[#5c6b45]">
                      Sobra {sourceRemnantDefault()} de las fuentes como remanente.
                    </p>
                  )}
                </div>

                {extraOutputs.map((o, idx) => (
                  <div key={o.key} className="mt-2 rounded-lg border border-[#1a1a1a]/10 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={o.kind}
                        onChange={(e) =>
                          setExtraOutputs((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, kind: e.target.value as typeof x.kind } : x
                            )
                          )
                        }
                        className="rounded border border-[#1a1a1a]/15 bg-white px-2 py-1 text-[12px]"
                        aria-label={`Tipo de salida ${idx + 1}`}
                      >
                        <option value="RESULTADO">Resultado (lote nuevo)</option>
                        <option value="REMANENTE">Remanente (lote nuevo)</option>
                        <option value="MERMA">Merma (no produce lote)</option>
                        <option value="DESCARTE">Descarte (no produce lote)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={o.quantity}
                        onChange={(e) =>
                          setExtraOutputs((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x))
                          )
                        }
                        className="w-24 rounded border border-[#1a1a1a]/15 bg-white px-2 py-1 text-[12px]"
                        placeholder="Cantidad"
                        aria-label={`Cantidad de salida ${idx + 1}`}
                      />
                      <span className="text-[12px] text-[#444]">{quantityUnit.trim() || '—'}</span>
                      {o.kind === 'MERMA' || o.kind === 'DESCARTE' ? (
                        <input
                          type="text"
                          value={o.reason}
                          onChange={(e) =>
                            setExtraOutputs((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, reason: e.target.value } : x))
                            )
                          }
                          className="min-w-[180px] flex-1 rounded border border-[#1a1a1a]/15 bg-white px-2 py-1 text-[12px]"
                          placeholder="Motivo obligatorio"
                          aria-label={`Motivo de salida ${idx + 1}`}
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setExtraOutputs((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-[11px] text-[#8a5a5a] underline"
                      >
                        quitar
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setExtraOutputs((prev) => [
                      ...prev,
                      {
                        key: `${Date.now()}-${prev.length}`,
                        kind: 'REMANENTE',
                        quantity: '',
                        reason: '',
                      },
                    ])
                  }
                  className="mt-2 rounded-full border border-[#1a1a1a]/20 px-3 py-1 text-[12px] text-[#1a1a1a]"
                  data-testid="add-output"
                >
                  + Agregar salida
                </button>

                <div className="mt-3 rounded-lg bg-[#eef1e6] px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A5D23]">
                      Balance
                    </p>
                    <p className="mt-1 text-[12px] text-[#2f4016]">
                      Las fuentes entregan {balanceSummary().delivered} · se registra{' '}
                      {balanceSummary().declared} ({quantityUnit.trim() || 'unidad por definir'})
                    </p>
                    {transformValidation && transformValidation.ok ? (
                      <p className="mt-0.5 text-[11px] font-medium text-[#2f4016]">
                        Balance cerrado y reglas de D-032 cumplidas.
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-0.5">
                        {(transformValidation?.errors ?? []).map((e, i) => (
                          <li key={i} className="text-[11px] font-medium text-[#8a3a3a]">
                            · {e}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-1 text-[11px] text-[#5c6b45]">
                      Este lote se creará con apertura propia y la transformación quedará{' '}
                      <strong>BORRADOR</strong>: la existencia de las fuentes no se mueve hasta
                      confirmar la transformación.
                    </p>
                  </div>
              </div>
              </>
            )}

            <div className="sm:col-span-2 rounded-xl border border-[#4A5D23]/20 bg-[#eef1e6] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A5D23]">
                Kilos teóricos calculados
              </p>
              <p className="mt-1 text-[18px] font-semibold text-[#2f4016]">
                {theoreticalWeight != null ? `${theoreticalWeight} kg` : 'Peso por definir'}
              </p>
              <p className="mt-0.5 text-[11px] text-[#5c6b45]">
                Se calcula automáticamente como cantidad × peso teórico del embalaje.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 w-full rounded-full bg-[#1a1a1a] px-6 py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40 sm:w-auto"
            >
              {busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear lote'}
            </button>
          </div>
        </form>
      )}

      <section aria-labelledby="lots-list-title">
        <div className="qx-section-title">
          <h2 id="lots-list-title">Listado operacional</h2>
          <span className="qx-count">
            {loading
              ? 'Cargando…'
              : visibleRows.length === rows.length
                ? `${rows.length} lotes`
                : `${visibleRows.length} de ${rows.length} lotes`}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="qx-card flex flex-col items-center gap-3 py-14">
              <div className="h-7 w-7 rounded-full border-2 border-[#4A5D23]/20 border-t-[#4A5D23] animate-spin" />
              <p className="text-[13px] text-[#888]">Cargando lotes…</p>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="qx-card">
              <div className="qx-empty">
                <h3>
                  {rows.length === 0
                    ? 'Aún no hay lotes registrados.'
                    : 'Ningún lote coincide con la búsqueda.'}
                </h3>
                <p>
                  {rows.length === 0
                    ? 'El lote es la unidad central de QualityNX: sin lote no hay inspección, resultado ni decisión. Crea el primero para comenzar la operación.'
                    : 'Ajusta la búsqueda o los filtros de estado, clasificación o semáforo (incluido Sin clasificación) para ver más lotes.'}
                </p>
                <div className="qx-action">
                  {rows.length === 0 && canManage ? (
                    <button type="button" className="qx-btn-brand-solid" onClick={() => openCreate()}>
                      Crear el primer lote
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="qx-btn-ghost"
                      onClick={() => {
                        setQuery('');
                        setStatusFilter('');
                        setClassFilter('');
                        setSemaphoreFilter('');
                      }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleRows.map((row) => (
                <li
                  key={row.id}
                  className="qx-ops-row p-4 sm:p-5"
                  data-attention={needsAttention(row) ? 'true' : 'false'}
                >
                  {/* Fila 1: FOLIO + estado */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="qx-label">FOLIO</p>
                      <p className="qx-ops-id mt-0.5">{row.folio || '—'}</p>
                      <p className="mt-1 text-[13px] text-[#5c6355]">
                        <span className="font-medium text-[#444]">Referencia:</span>{' '}
                        {row.harvest_block}
                        <span className="text-[#b0b5a8]"> · </span>
                        {nameOf(producers, row.producer_id)}
                        <span className="text-[#b0b5a8]"> · </span>
                        {row.species_id ? `${nameOf(species, row.species_id)} · ` : ''}
                        {nameOf(varieties, row.variety_id)}
                        <span className="text-[#b0b5a8]"> · </span>
                        <span className="tabular-nums">{row.fruit_date}</span>
                      </p>
                       {row.producer_guide_number && (
                         <p className="mt-0.5 text-[12px] text-[#9aa090]">
                           Guía productor: {row.producer_guide_number}
                           {row.folio_interno ? ` · Interno: ${row.folio_interno}` : ''}
                         </p>
                       )}
                       {!row.producer_guide_number && row.folio_interno && (
                         <p className="mt-0.5 text-[12px] text-[#9aa090]">
                           Interno: {row.folio_interno}
                         </p>
                       )}
                       <p className="mt-0.5 text-[12px] text-[#5c6355]">
                         {LOT_TYPE_LABELS[row.lot_type ?? LotType.ORIGEN]} ·{' '}
                         {row.packaging_type || 'Embalaje por definir'} ·{' '}
                          {row.quantity != null
                            ? `${row.quantity} ${row.quantity_unit ?? 'sin unidad declarada'}`
                            : 'sin cantidad declarada'}{' '}
                         {row.kg_declarados != null ? `${row.kg_declarados} kg declarados · ` : ''}
                         {row.theoretical_weight_kg != null ? `${row.theoretical_weight_kg} kg calculados` : 'kg calculados por definir'}
                       </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {statusChip(row.status)}
                        {classificationChips(row)}
                      </div>
                      {needsAttention(row) && (
                        <span className="text-[11px] font-semibold text-[#b45309]">
                          Requiere atención
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: etapa actual */}
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="qx-stage-block">
                      <p className="qx-field-label">Etapa actual</p>
                      <p className="qx-field-value">
                        {hasStage(row)
                          ? stageLabel(row.current_operational_stage_id)
                          : 'Sin etapa · se registra al abrir la primera inspección'}
                      </p>
                    </div>
                    <div className="sm:justify-self-end">{rowActions(row)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {historyLot && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryLot(null);
          }}
        >
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#1a1a1a]/10 bg-white shadow-2xl sm:max-h-[80vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#1a1a1a]/[0.06] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8fa868]">
                  Historial del lote
                </p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888]">
                  FOLIO
                </p>
                <h3 id="history-title" className="mt-0.5 truncate text-[15px] font-semibold text-[#1a1a1a]">
                  {historyLot.folio || '—'} · {historyLot.harvest_block}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {statusChip(historyLot.status)}
                  {stageChip(historyLot)}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-[#888]">
                  💡 Identifique físicamente el lote en terreno con el código del lote.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryLot(null)}
                aria-label="Cerrar historial"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a]/10 text-[16px] text-[#666] transition-colors hover:bg-black/[0.04] hover:text-[#1a1a1a]"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <section>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#888]">
                    Historia del lote
                  </h4>
                  {traceLoading ? (
                    <span className="text-[11px] text-[#bbb]">Cargando…</span>
                  ) : null}
                </div>
                {traceError ? (
                  <p className="mt-2 text-[13px] text-[#b45309]">{traceError}</p>
                ) : traceLoading ? null : traceEvents.length === 0 ? (
                  <p className="mt-2 text-[13px] text-[#888]">
                    Aún no hay eventos. La etapa se registra al abrir la primera inspección.
                  </p>
                ) : (
                  <ol className="qx-timeline mt-2">
                    {traceEvents.map((ev) => (
                      <li key={ev.id} className="qx-timeline-item">
                        <div className="rounded-xl border border-[#1a1a1a]/[0.06] bg-white px-3.5 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#4A5D23]/15 px-2 py-0.5 text-[11px] font-semibold text-[#3a4d1b]">
                              {traceLabel(ev)}
                            </span>
                            {traceSummary(ev) ? (
                              <span className="text-[13px] font-medium text-[#1a1a1a]">
                                {traceSummary(ev)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-[12px] text-[#888]">
                            {new Date(ev.occurred_at).toLocaleString('es-CL')}
                            {ev.actor_name ? ` · ${ev.actor_name}` : ''}
                          </p>
                          {traceDetail(ev) ? (
                            <p className="mt-1 text-[12px] leading-snug text-[#666]">
                              {traceDetail(ev)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="mt-5 border-t border-[#1a1a1a]/[0.06] pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#888]">
                    Análisis IA
                  </h4>
                  {historyAiLoading ? (
                    <span className="text-[11px] text-[#bbb]">Cargando…</span>
                  ) : null}
                </div>
                {historyAiLoading ? null : historyAi.length === 0 ? (
                  <p className="mt-2 text-[13px] text-[#888]">
                    Sin análisis de IA para este lote.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {historyAi.map((an) => {
                      const inspection = an.inspections;
                      return (
                        <li
                          key={an.id}
                          className="rounded-xl border border-[#4A5D23]/20 bg-[#4A5D23]/[0.04] px-3.5 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#4A5D23]/15 px-2 py-0.5 text-[11px] font-semibold text-[#3a4d1b]">
                              IA: {an.recommendation}
                            </span>
                            {inspection?.decision ? (
                              <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold text-[#444]">
                                Inspector: {inspection.decision}
                              </span>
                            ) : null}
                            {typeof an.confidence === 'number' ? (
                              <span className="text-[11px] text-[#888]">
                                conf. {Math.round(an.confidence * 100)}%
                              </span>
                            ) : null}
                          </div>
                          {an.reasoning_summary ? (
                            <p className="mt-1.5 text-[12px] leading-snug text-[#666]">
                              {an.reasoning_summary}
                            </p>
                          ) : null}
                          {an.alerts && an.alerts.length > 0 ? (
                            <ul className="mt-1.5 space-y-0.5">
                              {an.alerts.map((a, i) => (
                                <li key={i} className="text-[11px] text-amber-700">
                                  ⚠ {a}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <p className="mt-1.5 text-[11px] text-[#bbb]">
                            {an.model} · {new Date(an.created_at).toLocaleString('es-CL')}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-3 text-[11px] leading-snug text-[#bbb]">
                  La IA solo recomienda. La decisión corresponde al inspector.
                </p>
              </section>
            </div>

            <div className="border-t border-[#1a1a1a]/[0.06] px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setHistoryLot(null)}
                className="min-h-11 w-full rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-2.5 text-[13px] font-medium text-[#444] transition-colors hover:bg-black/[0.03]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {labelLot && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:static print:bg-white print:p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="label-lot-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLabelLot(null);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-[#1a1a1a]/10 bg-white shadow-2xl sm:rounded-2xl print:max-w-none print:shadow-none print:border-0">
            <div className="flex items-start justify-between gap-3 border-b border-[#1a1a1a]/[0.06] px-4 py-3 print:hidden">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8fa868]">
                  Imprimir etiqueta
                </p>
                <h3 id="label-lot-title" className="mt-0.5 text-[15px] font-semibold text-[#1a1a1a]">
                  LOTE {labelLot.folio || labelLot.harvest_block}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLabelLot(null)}
                aria-label="Cerrar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a]/10 text-[16px] text-[#666] transition-colors hover:bg-black/[0.04]"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-5 print:overflow-visible print:p-0">
              <div id="lot-label" className="mx-auto w-full max-w-[280px] border-2 border-[#1a1a1a] p-5 text-center print:border-black">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]">
                  QUALITYNX
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">
                  FOLIO
                </p>
                <p className="mt-1 break-all text-[20px] font-bold leading-tight tracking-[-0.02em] text-[#1a1a1a]">
                  {labelLot.folio || labelLot.harvest_block}
                </p>
                <p className="mt-1 text-[11px] text-[#888]">Bloque: {labelLot.harvest_block}</p>
                <p className="mt-3 text-[13px] font-semibold uppercase text-[#1a1a1a]">
                  {labelLot.species_id ? nameOf(species, labelLot.species_id) : '—'}
                </p>
                <p className="mt-0.5 text-[11px] text-[#444]">
                  {nameOf(varieties, labelLot.variety_id)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#666]">Fruta: {labelLot.fruit_date}</p>
                <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center border border-dashed border-[#1a1a1a]/40 bg-black/[0.03] text-[11px] leading-tight text-[#888]">
                  QR
                  <br />
                  pendiente
                </div>
                <p className="mt-2 break-all text-[11px] text-[#aaa]">{labelLot.id}</p>
              </div>
              <p className="mt-3 text-center text-[11px] leading-snug text-[#888] print:hidden">
                Identificación física del lote. QR/código de barras: pendiente de integración.
              </p>
            </div>

            <div className="flex gap-3 border-t border-[#1a1a1a]/[0.06] px-4 py-3 print:hidden">
              <button
                type="button"
                onClick={() => setLabelLot(null)}
                className="min-h-11 flex-1 rounded-full border border-[#1a1a1a]/10 px-4 py-2.5 text-[13px] font-medium text-[#666] transition-colors hover:border-[#1a1a1a]/20"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const prev = document.title;
                  document.title = `LOTE-${labelLot.folio || labelLot.harvest_block}`;
                  window.print();
                  document.title = prev;
                }}
                className="min-h-11 flex-1 rounded-full bg-[#1a1a1a] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
