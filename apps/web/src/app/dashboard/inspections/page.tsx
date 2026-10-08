'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentSession,
  getUserProfile,
  listLots,
  listInspectionPoints,
  listMeasurementDefs,
  listInspections,
  createInspection,
  updateInspection,
  listSamples,
  listPackagingTypes,
  listSamplingPlans,
  listCriterionNormativeReferences,
  suggestSamplingCount,
  listMeasurements,
  upsertMeasurement,
  listInspectionEvidence,
  addInspectionEvidence,
  deleteInspectionEvidence,
  uploadEvidenceFile,
  getEvidenceSignedUrl,
  listOperationalStages,
  listMasterData,
  createLotStageEvent,
  searchContinuityInspections,
  getInspection,
  listLatestQualityClassifications,
} from '@qualitynx/database';
import {
  UserRole,
  InspectionStatus,
  LotStatus,
  LotType,
  LOT_TYPE_LABELS,
  INSPECTION_DECISION_OPTIONS,
  QualitySemaphore,
  type Lot,
  type InspectionPoint,
  type MeasurementDef,
  type Inspection,
  type Sample,
  type Measurement,
  type InspectionEvidence,
  type OperationalStage,
  type AiInspectionAnalysis,
  type PackagingType,
  type SamplingPlan,
  type CriterionNormativeReference,
  type ContinuitySearchHit,
  type QualityClassification,
} from '@qualitynx/shared';

type Message = { type: 'ok' | 'error'; text: string } | null;

const inputClass = 'qx-input';
const inheritedLotCriterionNames = new Set([
  'identificacion del lote',
  'identificacion',
  'folio de lote',
  'folio',
  'guia del productor',
  'productor',
  'variedad',
  'fecha de cosecha',
  'fecha/hora de recepcion',
  'fecha/hora de ingreso',
  'procedencia / bloque',
  'temporada',
  'tipo de envase',
  'embalaje',
  'cantidad',
  'cantidad de envases',
  'peso',
  'peso / cantidad recibida',
  'peso neto',
  'kilos',
  'kg teoricos',
  'kilos teoricos',
]);

function normalizeCriterionName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

type StructuredResponseKind = 'firmeza' | 'bloom' | 'cicatrices' | 'pedicelo' | 'heridas' | 'plagas';
type StructuredResponseSpec = { kind: StructuredResponseKind; options: string[] };
type PestObservation = { pest: string; observation: string };

const STRUCTURED_RESPONSES: Record<string, StructuredResponseSpec> = {
  // Claves pre-normalizadas (sin tildes/ñ) para matchear normalizeCriterionName.
  firmeza: { kind: 'firmeza', options: ['Firme', 'Aceptable', 'Blanda', 'Muy blanda'] },
  'bloom / pruina': { kind: 'bloom', options: ['Presente', 'Ausente'] },
  'cicatrices / russet': { kind: 'cicatrices', options: ['Sin presencia', 'Presencia'] },
  pedicelo: { kind: 'pedicelo', options: ['Normal', 'Ausente', 'Defectuoso'] },
  'pedicelo / restos florales': { kind: 'pedicelo', options: ['Normal', 'Ausente', 'Defectuoso'] },
  'heridas / partiduras': { kind: 'heridas', options: ['Sin presencia', 'Presencia'] },
  'presencia de plagas / dano de plagas': { kind: 'plagas', options: ['No', 'Sí'] },
  'plagas / dano de plagas': { kind: 'plagas', options: ['No', 'Sí'] },
};

function structuredResponseSpec(name: string): StructuredResponseSpec | null {
  return STRUCTURED_RESPONSES[normalizeCriterionName(name)] ?? null;
}

/** Estructura por nombre. Firmeza y plagas son cualitativas estructuradas aunque en BD figuren texto/numérico. */
function activeStructuredSpec(def: MeasurementDef): StructuredResponseSpec | null {
  const spec = structuredResponseSpec(def.name);
  if (!spec) return null;
  if (spec.kind === 'firmeza' || spec.kind === 'plagas') return spec;
  if (
    def.value_type === 'numérica' ||
    def.value_type === 'porcentaje' ||
    def.value_type === 'entero' ||
    def.value_type === 'temperatura'
  ) {
    return null;
  }
  if ((def.options ?? []).length > 0) return null;
  return spec;
}

function isNumericInputType(valueType: MeasurementDef['value_type']): boolean {
  return (
    valueType === 'numérica' ||
    valueType === 'porcentaje' ||
    valueType === 'entero' ||
    valueType === 'temperatura'
  );
}

function criterionScaleText(def: MeasurementDef): string | null {
  if (def.scale_description?.trim()) return def.scale_description.trim();
  const options = (def.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (options.length > 0) return options.join(' · ');
  return null;
}

function parsePestObservation(value: string): PestObservation {
  if (!value.trim()) return { pest: '', observation: '' };
  try {
    const parsed = JSON.parse(value) as { plaga?: unknown; observacion?: unknown };
    if (typeof parsed.plaga === 'string' || typeof parsed.observacion === 'string') {
      return {
        pest: typeof parsed.plaga === 'string' ? parsed.plaga : '',
        observation: typeof parsed.observacion === 'string' ? parsed.observacion : '',
      };
    }
  } catch {
    const [pest, ...rest] = value.split('|');
    return { pest: pest ?? '', observation: rest.join('|') };
  }
  return { pest: '', observation: '' };
}

function serializePestObservation(pest: string, observation: string): string {
  return JSON.stringify({ plaga: pest.trim(), observacion: observation.trim() });
}

function responseIsComplete(def: MeasurementDef, value: string, observation = ''): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  const spec = activeStructuredSpec(def);
  if (!spec) return true;
  if (!spec.options.includes(normalized)) return false;
  if (spec.kind === 'plagas' && normalized === 'Sí') {
    const detail = parsePestObservation(observation);
    return Boolean(detail.pest && detail.observation);
  }
  return true;
}

function validateValue(def: MeasurementDef, value: string, observation = ''): string | null {
  if (!value.trim()) return def.is_required ? `${def.name} es obligatoria` : null;
  const structured = activeStructuredSpec(def);
  if (structured) {
    const normalized = value.trim();
    if (!structured.options.includes(normalized)) {
      return `${def.name}: selecciona una opción válida`;
    }
    if (structured.kind === 'plagas' && normalized === 'Sí') {
      const detail = parsePestObservation(observation);
      if (!detail.pest) return `${def.name}: identifica la plaga`;
      if (!detail.observation) return `${def.name}: agrega una observación`;
    }
    return null;
  }
  const schema = (def.response_schema ?? {}) as {
    unit?: string;
    allowed_values?: unknown;
    min_value?: number;
    max_value?: number;
  };
  if (schema.unit && def.unit && schema.unit !== def.unit) {
    return `${def.name}: unidad incompatible con el método configurado`;
  }
  const allowedValues = Array.isArray(schema.allowed_values)
    ? schema.allowed_values
    : def.options ?? [];
  if (allowedValues.length > 0) {
    const selected = def.value_type === 'multiselección' ? value.split('|') : [value];
    if (selected.some((item) => !allowedValues.includes(item))) {
      return `${def.name}: valor fuera de las opciones configuradas`;
    }
  }
  if (isNumericInputType(def.value_type)) {
    if (!def.unit?.trim()) {
      return `${def.name}: unidad no configurada; no se admite ingreso numérico hasta definir unidad/método`;
    }
    const n = Number(value);
    if (Number.isNaN(n)) return `${def.name}: debe ser numérico`;
    if (def.value_type === 'entero' && !Number.isInteger(n)) return `${def.name}: debe ser entero`;
    if (typeof schema.min_value === 'number' && n < schema.min_value) {
      return `${def.name}: valor incompatible con el mínimo del método configurado`;
    }
    if (typeof schema.max_value === 'number' && n > schema.max_value) {
      return `${def.name}: valor incompatible con el máximo del método configurado`;
    }
  }
  return null;
}

function limitAlert(def: MeasurementDef, value: string): string | null {
  if (!value.trim()) return null;
  if (!isNumericInputType(def.value_type)) {
    return null;
  }
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (def.min_value != null && n < def.min_value) {
    return `Fuera de rango: mínimo configurado ${def.min_value}${def.unit ? ` ${def.unit}` : ''}`;
  }
  if (def.max_value != null && n > def.max_value) {
    return `Fuera de rango: máximo configurado ${def.max_value}${def.unit ? ` ${def.unit}` : ''}`;
  }
  return null;
}

function fieldInputType(valueType: MeasurementDef['value_type']): string {
  switch (valueType) {
    case 'temperatura':
    case 'numérica':
    case 'porcentaje':
    case 'entero':
      return 'number';
    case 'fecha':
      return 'date';
    case 'fecha-hora':
      return 'datetime-local';
    case 'foto':
    case 'archivo':
      return 'text';
    default:
      return 'text';
  }
}

export default function InspectionsPage() {
  const searchParams = useSearchParams();
  const preselectedLot = searchParams.get('lot') ?? '';

  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [lots, setLots] = useState<Lot[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<PackagingType[]>([]);
  const [points, setPoints] = useState<InspectionPoint[]>([]);
  const [stages, setStages] = useState<OperationalStage[]>([]);
  const [speciesList, setSpeciesList] = useState<{ id: string; name: string }[]>([]);
  const [varietiesList, setVarietiesList] = useState<{ id: string; name: string }[]>([]);
  const [producersList, setProducersList] = useState<{ id: string; name: string }[]>([]);
  const [seasonsList, setSeasonsList] = useState<{ id: string; name: string }[]>([]);
  const [fieldsList, setFieldsList] = useState<{ id: string; name: string; producer_id?: string }[]>([]);
  const [labelLotId, setLabelLotId] = useState<string | null>(null);
  const [inspectorsMap, setInspectorsMap] = useState<Record<string, string>>({});
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [defs, setDefs] = useState<MeasurementDef[]>([]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Inspection | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [prevDetail, setPrevDetail] = useState<Inspection | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [samplingPlans, setSamplingPlans] = useState<SamplingPlan[]>([]);
  const [suggestedSampleCount, setSuggestedSampleCount] = useState<number | null>(null);
  const [sampleCount, setSampleCount] = useState('');
  const [sampleCountReason, setSampleCountReason] = useState('');
  const [samplingPlanId, setSamplingPlanId] = useState('');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [evidence, setEvidence] = useState<(InspectionEvidence & { url?: string })[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sampleValues, setSampleValues] = useState<Record<string, Record<string, string>>>({});
  const [measurementObservations, setMeasurementObservations] = useState<Record<string, string>>({});
  const [sampleMeasurementObservations, setSampleMeasurementObservations] = useState<
    Record<string, Record<string, string>>
  >({});
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [observations, setObservations] = useState('');
  const [resultText, setResultText] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<
    (AiInspectionAnalysis & { id: string }) | null
  >(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [classification, setClassification] = useState<{
    commercial_class: string;
    semaphore: string;
    justification: string;
    ai_used?: boolean;
  } | null>(null);
  const [evaluations, setEvaluations] = useState<
    {
      measurement_id: string;
      measurement_def_id: string;
      result: string;
      observed_value: string | null;
      comparison_type: string | null;
      limit_min: number | null;
      limit_max: number | null;
      unit: string | null;
      deviation: number | null;
      condition_failed: string | null;
      def_name?: string;
      evaluated_at?: string;
    }[]
  >([]);
  const [openHelpId, setOpenHelpId] = useState<string | null>(null);
  const [normativeReferencesByDef, setNormativeReferencesByDef] = useState<
    Record<string, CriterionNormativeReference[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [listFilters, setListFilters] = useState({
    folio: '',
    producerId: '',
    guide: '',
    date: '',
    status: '',
  });
  const hasListFilters = Object.values(listFilters).some((value) => value.trim());

  // BUSCAR LOTE — flujo principal de la pantalla
  const [lotQuery, setLotQuery] = useState('');
  const [latestClassByLot, setLatestClassByLot] = useState<
    Map<string, QualityClassification>
  >(new Map());

  // Creación
  const [newLotId, setNewLotId] = useState('');
  const [newPointId, setNewPointId] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Continuidad — CONTINUAR INSPECCIÓN
  const [contOpen, setContOpen] = useState(false);
  const [contBusy, setContBusy] = useState(false);
  const [contMessage, setContMessage] = useState<Message>(null);
  const [contFilters, setContFilters] = useState({
    producer_id: '',
    field_id: '',
    species_id: '',
    variety_id: '',
    operational_stage_id: '',
    lot_id: '',
    date_from: '',
    date_to: '',
  });
  const [contResults, setContResults] = useState<
    (ContinuitySearchHit & { previous?: Inspection | null })[]
  >([]);
  const [continueHit, setContinueHit] = useState<ContinuitySearchHit | null>(null);
  const [continuePointId, setContinuePointId] = useState('');

  // Muestras
  const canManage =
    role === UserRole.COMPANY_ADMIN || role === UserRole.SUPER_ADMIN;
  const canInspect =
    canManage || role === UserRole.INSPECTOR;

  const loadList = useCallback(async () => {
    // Ola 1: datos de la lista principal (lotes, puntos, inspecciones, etapas
    // y clasificación/semáforo). Desbloquea la pantalla en cuanto llegan.
    const [lotsRes, pointsRes, inspRes, stagesRes, classRes] =
      await Promise.all([
        listLots(),
        listInspectionPoints(),
        listInspections(),
        listOperationalStages(),
        listLatestQualityClassifications().catch(() => ({
          data: [] as QualityClassification[],
          error: null,
        })),
      ]);
    setLots(lotsRes.data as Lot[]);
    setPoints((pointsRes.data as InspectionPoint[]).filter((p) => p.is_active));
    setInspections(inspRes.data as Inspection[]);
    setStages((stagesRes.data as OperationalStage[]).filter((s) => s.is_active));
    const latest = new Map<string, QualityClassification>();
    if (!classRes.error && Array.isArray(classRes.data)) {
      for (const row of classRes.data as QualityClassification[]) {
        if (row?.lot_id && !latest.has(row.lot_id)) latest.set(row.lot_id, row);
      }
    }
    setLatestClassByLot(latest);
    setLoading(false);

    // Ola 2: datos maestros solo para filtros, formularios y nombres de
    // apoyo. No bloquea la pantalla.
    void Promise.all([
      listMasterData('species'),
      listMasterData('varieties'),
      listMasterData('producers'),
      listMasterData('fields'),
      listMasterData('seasons'),
      listPackagingTypes(),
    ])
      .then(([spRes, varRes, prodRes, fieldRes, seaRes, packagingRes]) => {
        setSpeciesList(
          ((spRes.data as { id: string; name: string; is_active: boolean }[]) ?? []).filter(
            (s) => s.is_active
          )
        );
        setVarietiesList(
          ((varRes.data as { id: string; name: string; is_active: boolean }[]) ?? []).filter(
            (v) => v.is_active
          )
        );
        setProducersList(
          ((prodRes.data as { id: string; name: string }[]) ?? []).map((p) => ({
            id: p.id,
            name: p.name,
          }))
        );
        setSeasonsList(
          ((seaRes.data as { id: string; name: string }[]) ?? []).map((s) => ({
            id: s.id,
            name: s.name,
          }))
        );
        setFieldsList(
          ((fieldRes.data as { id: string; name: string; producer_id?: string }[]) ?? []).map(
            (f) => ({ id: f.id, name: f.name, producer_id: f.producer_id })
          )
        );
        setPackagingTypes(
          ((packagingRes.data as PackagingType[])).filter((p) => p.is_active)
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
        // users.id (FK inspections.inspector_id), NO auth.users.id
        setUserId((data as { id: string }).id);
        setCompanyId((data as { company_id: string | null }).company_id);
        setRole((data as { role: UserRole }).role);
        const fullName = (data as { full_name?: string }).full_name;
        const uid = (data as { id: string }).id;
        if (fullName) setInspectorsMap((m) => ({ ...m, [uid]: fullName }));
      }
    };
    init();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!preselectedLot) return;
    const timer = window.setTimeout(() => {
      setNewLotId(preselectedLot);
      setLotQuery('');
      setShowCreate(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [preselectedLot]);

  useEffect(() => {
    if (!openHelpId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenHelpId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openHelpId]);

  const loadNormativeReferences = useCallback(async (defsToLoad: MeasurementDef[]) => {
    const entries = await Promise.all(
      defsToLoad.map(async (def) => {
        const { data } = await listCriterionNormativeReferences(def.id);
        return [def.id, (data as CriterionNormativeReference[]) ?? []] as const;
      })
    );
    setNormativeReferencesByDef(Object.fromEntries(entries));
  }, []);

  const loadDefs = useCallback(async (pointId: string) => {
    const { data } = await listMeasurementDefs(pointId);
    const activeDefs = (data as MeasurementDef[])
      .filter((d) => d.is_active)
      .filter((d) => !inheritedLotCriterionNames.has(normalizeCriterionName(d.name)));
    setDefs(activeDefs);
    await loadNormativeReferences(activeDefs);
  }, [loadNormativeReferences]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (newPointId) loadDefs(newPointId);
    else setDefs([]);
  }, [newPointId, loadDefs]);

  const openDetail = useCallback(
    async (insp: Inspection) => {
      setOpenId(insp.id);
      setDetail(insp);
      setDetailLoading(true);
      setMessage(null);
      setObservations(insp.observations ?? '');
      setResultText(insp.result ?? '');
      setDecisionText(insp.decision ?? '');
      setRecommendation(insp.recommendation ?? '');
      setPrevDetail(null);
      setActiveSampleId(null);
      setSampleValues({});
      setMeasurementObservations({});
      setSampleMeasurementObservations({});
      setOpenHelpId(null);
      setAiAnalysis(null);
      setAiError(null);
      setClassification(null);
      setEvaluations([]);
      setNormativeReferencesByDef({});
      try {
        const [defsRes, samplesRes, measRes, evRes, plansRes] = await Promise.all([
          listMeasurementDefs(insp.inspection_point_id),
          listSamples(insp.id),
          listMeasurements(insp.id),
          listInspectionEvidence(insp.id),
          listSamplingPlans(insp.inspection_point_id),
        ]);
        const activeDefs = ((defsRes.data as MeasurementDef[]) ?? [])
          .filter((d) => d.is_active)
          .filter((d) => !inheritedLotCriterionNames.has(normalizeCriterionName(d.name)))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
        setDefs(activeDefs);
        await loadNormativeReferences(activeDefs);
        const sampleList = ((samplesRes.data as Sample[]) ?? []).filter((sample) => sample.is_active !== false);
        setSamples(sampleList);
        const planList = (plansRes.data as SamplingPlan[]) ?? [];
        setSamplingPlans(planList);
        const activePlan = planList.find((p) => p.is_active) ?? null;
        const selectedPlanId = insp.sampling_plan_id || activePlan?.id || '';
        setSamplingPlanId(selectedPlanId);
        setSampleCount(insp.sample_count != null ? String(insp.sample_count) : '');
        setSampleCountReason(insp.sample_count_reason ?? '');
        let nextSuggested = insp.suggested_sample_count ?? null;
        const currentLot = lots.find((l) => l.id === insp.lot_id);
        if (nextSuggested == null && selectedPlanId && currentLot) {
          const suggested = await suggestSamplingCount(selectedPlanId, currentLot.id);
          nextSuggested = suggested.data ?? null;
          if (nextSuggested != null) {
            await updateInspection(insp.id, { suggested_sample_count: nextSuggested });
          }
        }
        setSuggestedSampleCount(nextSuggested);
        if (insp.sample_count == null && nextSuggested != null) {
          setSampleCount(String(nextSuggested));
        }
        setActiveSampleId(sampleList.length > 0 ? sampleList[0].id : null);
        const meas = (measRes.data as Measurement[]) ?? [];
        setMeasurements(meas);
        const map: Record<string, string> = {};
        const bySample: Record<string, Record<string, string>> = {};
        const observationMap: Record<string, string> = {};
        const sampleObservationMap: Record<string, Record<string, string>> = {};
        for (const m of meas) {
          if (m.sample_id) {
            if (!bySample[m.sample_id]) bySample[m.sample_id] = {};
            if (!sampleObservationMap[m.sample_id]) sampleObservationMap[m.sample_id] = {};
            bySample[m.sample_id][m.measurement_def_id] = m.value ?? '';
            sampleObservationMap[m.sample_id][m.measurement_def_id] = m.observation ?? '';
          } else {
            map[m.measurement_def_id] = m.value ?? '';
            observationMap[m.measurement_def_id] = m.observation ?? '';
          }
        }
        setValues(map);
        setSampleValues(bySample);
        setMeasurementObservations(observationMap);
        setSampleMeasurementObservations(sampleObservationMap);
        // Visualización del consolidado: solo N=1 copia la única muestra en el estado de vista (no persiste aún).
        // N>1: no se preselecciona valor (agregación por criterio pendiente de especificación).
        if (sampleList.length === 1 && Object.keys(map).length === 0) {
          const only = sampleList[0];
          const derivedValues: Record<string, string> = {};
          const derivedObs: Record<string, string> = {};
          for (const def of activeDefs) {
            derivedValues[def.id] = bySample[only.id]?.[def.id] ?? '';
            derivedObs[def.id] = sampleObservationMap[only.id]?.[def.id] ?? '';
          }
          if (Object.values(derivedValues).some((v) => v.trim())) {
            setValues(derivedValues);
            setMeasurementObservations(derivedObs);
          }
        }

        if (insp.previous_inspection_id) {
          const { data: prev } = await getInspection(insp.previous_inspection_id);
          setPrevDetail(prev ? ((prev as unknown) as Inspection) : null);
        }

        const ev = (evRes.data as InspectionEvidence[]) ?? [];
        const withUrls = await Promise.all(
          ev.map(async (e) => {
            const { data } = await getEvidenceSignedUrl(e.storage_path);
            return { ...e, url: data?.signedUrl };
          })
        );
        setEvidence(withUrls);

        // Cargar último análisis IA si existe (best-effort)
        try {
          const { listAiAnalysesByInspection } = await import('@qualitynx/database');
          const { data: analyses } = await listAiAnalysesByInspection(insp.id);
          if (analyses?.length) {
            setAiAnalysis(analyses[0] as AiInspectionAnalysis);
          }
        } catch {
          // IA opcional
        }

        // Cargar evaluaciones QUALITY ENGINE (best-effort)
        try {
          const { session } = await getCurrentSession();
          if (session) {
            const res = await fetch(
              `/api/quality/evaluate?inspection_id=${encodeURIComponent(insp.id)}`,
              { headers: { Authorization: `Bearer ${session.access_token}` } }
            );
            if (res.ok) {
              const j = (await res.json().catch(() => ({}))) as {
                evaluations?: typeof evaluations;
              };
              if (Array.isArray(j.evaluations)) setEvaluations(j.evaluations);
            }
            // Clasificación comercial + semáforo (si existe)
            try {
              const cres = await fetch(
                `/api/quality/classify?inspection_id=${encodeURIComponent(insp.id)}`,
                { headers: { Authorization: `Bearer ${session.access_token}` } }
              );
              if (cres.ok) {
                const cj = (await cres.json().catch(() => ({}))) as {
                  classification?: {
                    commercial_class: string;
                    semaphore: string;
                    justification: string;
                    ai_used?: boolean;
                  } | null;
                };
                if (cj.classification) setClassification(cj.classification);
              }
            } catch {
              // clasificación opcional al abrir
            }
          }
        } catch {
          // evaluaciones opcionales al abrir
        }
      } finally {
        setDetailLoading(false);
      }
    },
    [lots, loadNormativeReferences]
  );

  const closeDetail = () => {
    setOpenId(null);
    setDetail(null);
    setDetailLoading(false);
    setDefs([]);
    setMeasurementObservations({});
    setSampleMeasurementObservations({});
    setOpenHelpId(null);
    setEvaluations([]);
    setNormativeReferencesByDef({});
    setMessage(null);
    loadList();
  };

  const lotCode = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return '—';
      const lot = lots.find((l) => l.id === id);
      if (lot?.folio) return lot.folio;
      return lot?.harvest_block || `Lote ${id.slice(0, 8)}`;
    },
    [lots]
  );

  const packagingName = useCallback(
    (id: string | null | undefined, fallback: string | null | undefined) =>
      packagingTypes.find((p) => p.id === id)?.name ?? fallback ?? '—',
    [packagingTypes]
  );

  const lotPhysical = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return '';
      const lot = lots.find((l) => l.id === id);
      if (!lot) return '';
      const parts: string[] = [];
      if (lot.producer_guide_number) parts.push(`Guía ${lot.producer_guide_number}`);
      const packaging = packagingName(lot.packaging_type_id, lot.packaging_type);
      if (packaging !== '—') parts.push(packaging);
      if (lot.quantity != null) parts.push(`${lot.quantity} envases`);
      if (lot.theoretical_weight_kg != null) parts.push(`${lot.theoretical_weight_kg} kg`);
      return parts.join(' · ');
    },
    [lots, packagingName]
  );

  const producerName = useCallback(
    (id?: string | null) =>
      id ? (producersList.find((p) => p.id === id)?.name ?? '—') : '—',
    [producersList]
  );

  const pointName = useCallback(
    (id: string) => points.find((p) => p.id === id)?.name ?? '—',
    [points]
  );

  const stageName = useCallback(
    (id: string | null) => (id ? (stages.find((s) => s.id === id)?.name ?? '—') : 'Sin etapa'),
    [stages]
  );

  const pointStageOf = useCallback(
    (pointId: string) => points.find((p) => p.id === pointId)?.operational_stage_id ?? null,
    [points]
  );

  const speciesName = useCallback(
    (id?: string | null) =>
      id ? (speciesList.find((s) => s.id === id)?.name ?? '—') : '—',
    [speciesList]
  );

  const varietyName = useCallback(
    (id?: string | null) =>
      id ? (varietiesList.find((v) => v.id === id)?.name ?? '—') : '—',
    [varietiesList]
  );

  const seasonName = useCallback(
    (id?: string | null) =>
      id ? (seasonsList.find((s) => s.id === id)?.name ?? '—') : '—',
    [seasonsList]
  );

  const inspectorLabel = useCallback(
    (id: string) => inspectorsMap[id] ?? `Inspector ${id.slice(0, 8)}`,
    [inspectorsMap]
  );

  const selectableLots = useMemo(
    () => lots.filter((lot) => lot.status !== LotStatus.CERRADO),
    [lots]
  );
  const selectedLot = useMemo(
    () => selectableLots.find((l) => l.id === newLotId) ?? null,
    [selectableLots, newLotId]
  );
  const selectedPoint = useMemo(
    () => points.find((p) => p.id === newPointId) ?? null,
    [points, newPointId]
  );
  const derivedStageId = selectedPoint?.operational_stage_id ?? null;

  const activeSamplingPlan = useMemo(
    () => samplingPlans.find((plan) => plan.id === samplingPlanId) ?? null,
    [samplingPlanId, samplingPlans]
  );

  const detailLot = useMemo(
    () => (detail ? lots.find((l) => l.id === detail.lot_id) ?? null : null),
    [detail, lots]
  );

  /** Unidad física de muestreo (envase si el plan/lote está en packaging). */
  const samplingUnitLabel = useMemo(() => {
    const planUnit = activeSamplingPlan?.sampling_unit?.trim();
    if (planUnit) return planUnit;
    if (detailLot?.quantity != null) return 'envase';
    return 'unidad de muestreo';
  }, [activeSamplingPlan, detailLot]);

  /** Peso teórico por unidad de muestreo (kg/envase). */
  const unitWeightKg = useMemo(() => {
    if (!detailLot) return null;
    const fromPackaging = packagingTypes.find(
      (p) =>
        p.id === detailLot.packaging_type_id ||
        (detailLot.packaging_type && p.name.toLowerCase() === detailLot.packaging_type.toLowerCase())
    )?.theoretical_weight_kg;
    if (fromPackaging != null) return fromPackaging;
    if (
      detailLot.quantity != null &&
      detailLot.quantity > 0 &&
      detailLot.theoretical_weight_kg != null
    ) {
      return detailLot.theoretical_weight_kg / detailLot.quantity;
    }
    return null;
  }, [detailLot, packagingTypes]);

  const nSuggested = suggestedSampleCount;
  const nReal = sampleCount.trim() ? Number(sampleCount) : null;
  const totalSampleWeightKg =
    nSuggested != null && unitWeightKg != null ? nSuggested * unitWeightKg : null;
  const totalRealWeightKg =
    nReal != null && Number.isFinite(nReal) && unitWeightKg != null
      ? nReal * unitWeightKg
      : null;

  const formatKg = (value: number): string =>
    value.toLocaleString('es-CL', { maximumFractionDigits: 3 });

  const formatCountUnit = (n: number | null | undefined, unit: string): string => {
    if (n == null || !Number.isFinite(n)) return '—';
    const label =
      n === 1
        ? unit
        : unit === 'envase'
          ? 'envases'
          : unit === 'unidad de muestreo'
            ? 'unidades de muestreo'
            : unit;
    return `${n} ${label}`;
  };

  const nextStageForDetail = useMemo(() => {
    if (!detail) return null;
    const currentLot = lots.find((l) => l.id === detail.lot_id);
    const currentPoint = points.find((p) => p.id === detail.inspection_point_id);
    if (!currentLot || !currentPoint) return null;
    const stageIndex = stages.findIndex((stage) => stage.id === currentPoint.operational_stage_id);
    if (stageIndex < 0) return null;
    const nextStage = stages[stageIndex + 1];
    if (!nextStage) return null;
    const nextPoint = points.find(
      (point) =>
        point.operational_stage_id === nextStage.id &&
        point.species_id === currentLot.species_id
    );
    return nextPoint ? nextStage : null;
  }, [detail, lots, points, stages]);

  const availablePoints = useMemo(() => {
    if (!selectedLot) return points.filter((p) => p.is_active);
    return points.filter(
      (p) => p.is_active && (!selectedLot.species_id || p.species_id === selectedLot.species_id)
    );
  }, [points, selectedLot]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!newLotId || !newPointId || !companyId || !userId) {
      setMessage({ type: 'error', text: 'Lote y punto de inspección son obligatorios.' });
      return;
    }
    if (!selectedLot || !selectedPoint) {
      setMessage({ type: 'error', text: 'Selecciona lote y punto de inspección.' });
      return;
    }
    if (selectedLot.status === 'CERRADO') {
      setMessage({ type: 'error', text: 'Un lote CERRADO no admite inspecciones.' });
      return;
    }
    const pointStage = selectedPoint.operational_stage_id;
    if (!pointStage) {
      setMessage({ type: 'error', text: 'El punto de inspección no tiene etapa operacional.' });
      return;
    }
    const currentStage = selectedLot.current_operational_stage_id;
    const needsStageEvent = !currentStage || currentStage !== pointStage;

    setBusy(true);
    try {
      if (needsStageEvent) {
        const isFirst = !currentStage;
        const { error: stageError } = await createLotStageEvent({
          lot_id: selectedLot.id,
          company_id: companyId,
          operational_stage_id: pointStage,
          event_type: isFirst ? 'INGRESO' : 'TRANSICION',
          user_id: userId,
          notes: isFirst
            ? `Ingreso vía punto de inspección: ${selectedPoint.name}`
            : `Transición por punto de inspección: ${selectedPoint.name}`,
        });
        if (stageError) {
          setMessage({
            type: 'error',
            text: 'No pudimos registrar la etapa derivada del punto. Revisa la configuración del punto en Configuración → Puntos de inspección.',
          });
          return;
        }
      }

      const { data, error } = await createInspection({
        company_id: companyId,
        lot_id: newLotId,
        inspection_point_id: newPointId,
        inspector_id: userId,
      });
      if (error) {
        const raw = error.message ?? '';
        setMessage({
          type: 'error',
          text: raw.includes('duplicate')
            ? 'Ya existe una inspección EN CURSO para este lote y punto.'
            : raw.includes('especie')
              ? 'El punto de inspección no corresponde a la especie del lote. Elige otro punto compatible.'
              : 'No pudimos abrir la inspección. Revisa el lote y el punto.',
        });
        return;
      }
      const stageNote = stageName(pointStage);
      setMessage({
        type: 'ok',
        text: needsStageEvent
          ? `Etapa registrada: ${stageNote}. Inspección abierta EN CURSO.`
          : `Inspección abierta EN CURSO en ${stageNote}.`,
      });
      setNewLotId('');
      setNewPointId('');
      setShowCreate(false);
      await loadList();
      if (data) await openDetail(data as Inspection);
    } catch {
      setMessage({
        type: 'error',
        text: 'No pudimos abrir la inspección. Intenta de nuevo.',
      });
    } finally {
      setBusy(false);
    }
  };

  const saveInfo = async (): Promise<boolean> => {
    if (!detail) return false;
    const { error } = await updateInspection(detail.id, {
      observations: observations.trim() || null,
      result: resultText.trim() || null,
      decision: decisionText.trim() || null,
      recommendation: recommendation.trim() || null,
    });
    if (error) {
      setMessage({
        type: 'error',
        text: 'No pudimos guardar los cambios de la inspección.',
      });
      return false;
    }
    return true;
  };

  /** Guarda mediciones del destino actual: consolidado (sin muestra) o muestra activa. */
  const saveValues = async (): Promise<boolean> => {
    if (!detail) return false;
    const targetSampleId =
      samples.length === 0
        ? null
        : activeSampleId === '__CONSOLIDATED__' || activeSampleId === null
          ? null
          : activeSampleId;
    const sourceMap =
      targetSampleId === null ? values : sampleValues[targetSampleId] ?? {};
    const sourceObservationMap =
      targetSampleId === null
        ? measurementObservations
        : sampleMeasurementObservations[targetSampleId] ?? {};

    for (const def of defs) {
      const raw = sourceMap[def.id] ?? '';
      const observation = sourceObservationMap[def.id] ?? '';
      const filled = raw.trim().length > 0;
      const err = validateValue(def, raw, observation);
      if (err && (targetSampleId === null || filled)) {
        setMessage({ type: 'error', text: err });
        return false;
      }
      if (!filled) continue;
      const { error } = await upsertMeasurement({
        inspection_id: detail.id,
        measurement_def_id: def.id,
        value: raw.trim(),
        observation: observation.trim() || null,
        sample_id: targetSampleId,
      });
      if (error) {
        setMessage({
          type: 'error',
          text: 'No pudimos guardar la medición. Intenta de nuevo.',
        });
        return false;
      }
    }
    return true;
  };

  /**
   * Consolidado derivado de las muestras efectivamente realizadas (N real).
   * N=1 → copia exacta de la única muestra.
   * N>1 → null: la agregación por tipo de criterio está PENDIENTE DE ESPECIFICACIÓN
   * (no se usa "primer valor", promedio ni otra regla inventada).
   * No modifica mediciones individuales de muestra.
   */
  const deriveConsolidatedFromSamples = useCallback((): {
    nextValues: Record<string, string>;
    nextObs: Record<string, string>;
  } | null => {
    if (samples.length !== 1) return null;
    const only = samples[0];
    const nextValues: Record<string, string> = {};
    const nextObs: Record<string, string> = {};
    for (const def of defs) {
      nextValues[def.id] = sampleValues[only.id]?.[def.id] ?? '';
      nextObs[def.id] = sampleMeasurementObservations[only.id]?.[def.id] ?? '';
    }
    return { nextValues, nextObs };
  }, [defs, sampleMeasurementObservations, sampleValues, samples]);

  /**
   * Guarda el consolidado (sample_id NULL).
   * N=1 → se copia automáticamente desde la única muestra (sin acción del inspector).
   * N>1 → no se genera valor consolidado (agregación pendiente de especificación);
   *       no bloquea completar ni exige acción manual.
   * Sin muestras → guarda lo capturado en el destino consolidado.
   */
  const saveConsolidated = async (): Promise<boolean> => {
    if (!detail) return false;
    if (samples.length > 1) {
      return true;
    }
    let sourceValues = values;
    let sourceObs = measurementObservations;
    if (samples.length === 1) {
      const derived = deriveConsolidatedFromSamples();
      if (!derived) return true;
      sourceValues = derived.nextValues;
      sourceObs = derived.nextObs;
      setValues(sourceValues);
      setMeasurementObservations(sourceObs);
    }
    for (const def of defs) {
      const v = (sourceValues[def.id] ?? '').trim();
      const observation = sourceObs[def.id] ?? '';
      if (!v) continue;
      const validationError = validateValue(def, v, observation);
      if (validationError) {
        setMessage({ type: 'error', text: validationError });
        return false;
      }
      const { error } = await upsertMeasurement({
        inspection_id: detail.id,
        measurement_def_id: def.id,
        value: v,
        observation: observation.trim() || null,
        sample_id: null,
      });
      if (error) {
        setMessage({
          type: 'error',
          text: 'No pudimos guardar el resultado consolidado.',
        });
        return false;
      }
    }
    return true;
  };

  /** Guarda todas las muestras activas (por muestra) — usado al consolidar/completar. */
  const saveAllSampleMeasurements = async (): Promise<boolean> => {
    if (!detail || samples.length === 0) return true;
    for (const sample of samples) {
      const map = sampleValues[sample.id] ?? {};
      const observationMap = sampleMeasurementObservations[sample.id] ?? {};
      for (const def of defs) {
        const v = (map[def.id] ?? '').trim();
        const observation = observationMap[def.id] ?? '';
        if (!v) continue;
        const validationError = validateValue(def, v, observation);
        if (validationError) {
          setMessage({ type: 'error', text: validationError });
          return false;
        }
        const { error } = await upsertMeasurement({
          inspection_id: detail.id,
          measurement_def_id: def.id,
          value: v,
          observation: observation.trim() || null,
          sample_id: sample.id,
        });
        if (error) {
          setMessage({
            type: 'error',
            text: `No pudimos guardar la medición de la muestra ${sample.label ?? sample.id.slice(0, 8)}.`,
          });
          return false;
        }
      }
    }
    return true;
  };

  const runQualityEvaluate = async (inspectionId: string) => {
    try {
      const { session } = await getCurrentSession();
      if (!session) return;
      const res = await fetch('/api/quality/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inspection_id: inspectionId }),
      });
      if (!res.ok) return;
      const j = (await res.json().catch(() => ({}))) as {
        evaluations?: typeof evaluations;
      };
      if (Array.isArray(j.evaluations)) setEvaluations(j.evaluations);
    } catch {
      // motor no bloquea el guardado
    }
  };

  /** IA best-effort al cierre: no bloquea; no reemplaza QE ni decide. */
  const runAiAnalyzeBestEffort = async (inspectionId: string) => {
    try {
      const { session } = await getCurrentSession();
      if (!session) return;
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inspection_id: inspectionId }),
      });
      if (res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          analysis?: AiInspectionAnalysis;
        };
        if (j.analysis) setAiAnalysis(j.analysis);
      }
    } catch {
      // IA no bloquea el cierre
    }
  };

  /**
   * Clasificación comercial + semáforo tras QE (+ resumen IA si existe).
   * El inspector no envía el color. Append-only en quality_classifications.
   */
  const runClassify = async (inspectionId: string): Promise<boolean> => {
    try {
      const { session } = await getCurrentSession();
      if (!session) return false;
      const res = await fetch('/api/quality/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inspection_id: inspectionId }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        classification?: {
          commercial_class: string;
          semaphore: string;
          justification: string;
          ai_used?: boolean;
        } | null;
        error?: string;
      };
      if (j.classification) {
        setClassification(j.classification);
        return true;
      }
      // Si la tabla aún no existe en remoto, informar sin bloquear cierre histórico
      if (/quality_classifications|does not exist|schema cache/i.test(j.error ?? '')) {
        setMessage({
          type: 'error',
          text: 'Clasificación pendiente: aplica la migración 20260924000003_quality_classifications.sql en Supabase y vuelve a clasificar desde el informe.',
        });
        return false;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleComplete = async () => {
    if (!detail) return;
    setMessage(null);
    if (!resultText.trim()) {
      setMessage({
        type: 'error',
        text: 'El resultado técnico es obligatorio para completar.',
      });
      return;
    }
    if (!decisionText.trim()) {
      setMessage({
        type: 'error',
        text: 'La decisión del inspector es obligatoria para completar.',
      });
      return;
    }
    setBusy(true);
    try {
      if (samples.length > 0) {
        // Validar SOLO las muestras efectivamente generadas (N real). No validar N sugerido.
        const incompleteSampleFields = samples.flatMap((sample) =>
          defs
            .filter(
              (d) =>
                d.is_required &&
                !responseIsComplete(
                  d,
                  (sampleValues[sample.id] ?? {})[d.id] ?? '',
                  (sampleMeasurementObservations[sample.id] ?? {})[d.id] ?? ''
                )
            )
            .map((d) => ({ sample, def: d }))
        );
        if (incompleteSampleFields.length > 0) {
          const firstIncomplete = incompleteSampleFields[0];
          setMessage({
            type: 'error',
            text: `Completa el criterio obligatorio "${firstIncomplete.def.name}" en ${firstIncomplete.sample.label ?? `Muestra ${firstIncomplete.sample.sample_number}`} antes de completar.`,
          });
          return;
        }
        const okSamples = await saveAllSampleMeasurements();
        if (!okSamples) return;
        // Consolidado: N=1 copia la única muestra; N>1 no genera valor (agregación pendiente). Sin acción del inspector.
        const okCons = await saveConsolidated();
        if (!okCons) return;
      } else {
        const okVals = await saveValues();
        if (!okVals) return;
      }
      const okInfo = await saveInfo();
      if (!okInfo) return;
      const formalDecisionCode = decisionText.trim();
      const isFormalDecision = INSPECTION_DECISION_OPTIONS.includes(
        formalDecisionCode as (typeof INSPECTION_DECISION_OPTIONS)[number]
      );
      if (isFormalDecision) {
        const { session } = await getCurrentSession();
        if (!session) {
          setMessage({
            type: 'error',
            text: 'Sesión expirada. Vuelve a entrar para registrar la decisión formal.',
          });
          return;
        }
        const decisionRes = await fetch('/api/decisions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            lot_id: detail.lot_id,
            inspection_id: detail.id,
            decision_code: formalDecisionCode,
            fundamento: observations.trim() || recommendation.trim() || null,
          }),
        });
        if (!decisionRes.ok) {
          const decisionJson = (await decisionRes.json().catch(() => ({}))) as { error?: string };
          if (decisionRes.status !== 409) {
            setMessage({
              type: 'error',
              text: `No se pudo registrar la decisión formal: ${decisionJson.error ?? 'intenta de nuevo.'}`,
            });
            return;
          }
        }
      }
      await runQualityEvaluate(detail.id);
      // Flujo: QE → IA (best-effort) → clasificación comercial + semáforo
      await runAiAnalyzeBestEffort(detail.id);
      try {
        const { syncLearningWithDecision } = await import('@/lib/ai');
        await syncLearningWithDecision(detail.id);
      } catch {
        // learning best-effort
      }
      await runClassify(detail.id);
      const { error } = await updateInspection(detail.id, { status: InspectionStatus.COMPLETADA });
      if (error) {
        const raw =
          (error as { message?: string; code?: string; details?: string }).message ||
          (error as { details?: string }).details ||
          '';
        const summaryLines = raw
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith('CONTEXT') && !l.startsWith('DETAIL'));
        const mapped = summaryLines
          .map((line) => {
            const lower = line.toLowerCase();
            if (lower.includes('measurement') || lower.includes('medici') || lower.includes('valor'))
              return `Faltan mediciones/criterios obligatorios: ${line}`;
            if (lower.includes('evidence') || lower.includes('evidencia') || lower.includes('foto'))
              return `Evidencia obligatoria según configuración del criterio: ${line}`;
            if (lower.includes('result') || lower.includes('resultado'))
              return `Resultado técnico: ${line}`;
            if (lower.includes('decision') || lower.includes('decisión'))
              return `Decisión del inspector: ${line}`;
            if (lower.includes('folio') || lower.includes('duplicate'))
              return `Conflicto de folio/lote: ${line}`;
            return line;
          })
          .join(' · ');
        const list =
          mapped ||
          'No pudimos completar la inspección. Revisa resultado, decisión y criterios obligatorios.';
        setMessage({
          type: 'error',
          text: `NO SE PUEDE COMPLETAR LA INSPECCIÓN — un solo motivo a corregir: ${list}`,
        });
        return;
      }
      setMessage({
        type: 'ok',
        text: 'Inspección COMPLETADA con clasificación comercial y semáforo QualityNX.',
      });
      const { data } = await listInspections();
      setInspections(data as Inspection[]);
      const refreshed = (data as Inspection[]).find((i) => i.id === detail.id);
      if (refreshed) await openDetail(refreshed);
    } finally {
      setBusy(false);
    }
  };

  const handleContinueNextPoint = async () => {
    if (!detail || !userId || !companyId) return;
    setBusy(true);
    setMessage(null);
    try {
      const currentLot = lots.find((l) => l.id === detail.lot_id);
      const currentPoint = points.find((p) => p.id === detail.inspection_point_id);
      if (!currentLot || !currentPoint) {
        setMessage({ type: 'error', text: 'No se pudo determinar el lote o el punto actual.' });
        return;
      }
      if (detail.status !== InspectionStatus.COMPLETADA) {
        setMessage({ type: 'error', text: 'Completa la inspección actual antes de continuar.' });
        return;
      }
      const currentStageIndex = stages.findIndex(
        (stage) => stage.id === currentPoint.operational_stage_id
      );
      const nextStage = currentStageIndex >= 0 ? stages[currentStageIndex + 1] : undefined;
      const nextPoint = nextStage
        ? points.find(
            (point) =>
              point.operational_stage_id === nextStage.id &&
              point.species_id === currentLot.species_id
          )
        : undefined;
      if (!nextStage || !nextPoint) {
        setMessage({ type: 'error', text: 'No hay un siguiente punto base configurado para este lote.' });
        return;
      }
      if (currentLot.current_operational_stage_id !== nextStage.id) {
        const { error: stageError } = await createLotStageEvent({
          lot_id: currentLot.id,
          company_id: companyId,
          operational_stage_id: nextStage.id,
          event_type: 'TRANSICION',
          user_id: userId,
        });
        if (stageError) {
          setMessage({ type: 'error', text: 'No se pudo registrar el avance de etapa del lote.' });
          return;
        }
      }
      const { data, error } = await createInspection({
        company_id: companyId,
        lot_id: currentLot.id,
        inspection_point_id: nextPoint.id,
        previous_inspection_id: detail.id,
        inspector_id: userId,
      });
      if (error || !data) {
        setMessage({ type: 'error', text: 'No se pudo crear la inspección del siguiente punto.' });
        return;
      }
      await openDetail(data as Inspection);
      setMessage({ type: 'ok', text: `Inspección creada en ${nextStage.name}.` });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!detail) return;
    setMessage(null);
    setBusy(true);
    try {
      const okVals = samples.length > 0
        ? await saveAllSampleMeasurements() && await saveConsolidated()
        : await saveValues();
      if (!okVals) return;
      const okInfo = await saveInfo();
      if (!okInfo) return;
      await runQualityEvaluate(detail.id);
      try {
        const { syncLearningWithDecision } = await import('@/lib/ai');
        await syncLearningWithDecision(detail.id);
      } catch {
        // learning best-effort
      }
      setMessage({ type: 'ok', text: 'Borrador guardado y calidad evaluada.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAnalyzeAi = async () => {
    if (!detail) return;
    setMessage(null);
    setAiError(null);
    setAiLoading(true);
    try {
      const okVals = await saveValues();
      if (!okVals) return;
      const okInfo = await saveInfo();
      if (!okInfo) return;

      const { session } = await getCurrentSession();
      if (!session) {
        setAiError('Sesión expirada. Vuelve a entrar.');
        return;
      }
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inspection_id: detail.id }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        analysis?: AiInspectionAnalysis;
        error?: string;
      };
      if (!res.ok || !json.analysis) {
        const apiMsg = (json.error ?? '').slice(0, 160);
        const technical = /traceback|postgres|jwt|column|relation |sql|stack/i.test(apiMsg);
        setAiError(
          technical || !apiMsg
            ? 'La IA no respondió. La inspección puede continuar.'
            : apiMsg
        );
        return;
      }
      setAiAnalysis(json.analysis);
      setMessage({
        type: 'ok',
        text: 'Recomendación IA registrada (no sustituye tu decisión).',
      });
    } catch {
      setAiError('No pudimos consultar la IA. La inspección puede continuar.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSamplingPlanChange = async (planId: string) => {
    setSamplingPlanId(planId);
    setSampleCountReason('');
    if (!detail || !planId) {
      setSuggestedSampleCount(null);
      setSampleCount('');
      return;
    }
    const result = await suggestSamplingCount(planId, detail.lot_id);
    const suggested = result.data ?? null;
    setSuggestedSampleCount(suggested);
    setSampleCount(suggested != null ? String(suggested) : '');
  };

  const handleSaveSamplingPlan = async () => {
    if (!detail || !samplingPlanId || !sampleCount.trim()) {
      setMessage({ type: 'error', text: 'Selecciona un plan e indica la cantidad de muestras.' });
      return;
    }
    const count = Number(sampleCount);
    if (!Number.isInteger(count) || count < 1) {
      setMessage({ type: 'error', text: 'La cantidad de muestras debe ser un entero positivo.' });
      return;
    }
    setBusy(true);
    try {
      let suggested = suggestedSampleCount;
      if (suggested == null) {
        const result = await suggestSamplingCount(samplingPlanId, detail.lot_id);
        suggested = result.data ?? null;
        setSuggestedSampleCount(suggested);
      }
      if (suggested != null && count !== suggested && !sampleCountReason.trim()) {
        setMessage({ type: 'error', text: 'Registra el motivo de la modificación.' });
        return;
      }
      const { error } = await updateInspection(detail.id, {
        sampling_plan_id: samplingPlanId,
        suggested_sample_count: suggested,
        sample_count: count,
        sample_count_reason: sampleCountReason.trim() || null,
      });
      if (error) {
        setMessage({ type: 'error', text: 'No pudimos guardar la decisión de muestreo.' });
        return;
      }
      // Enriquecer sampling_context con unidad física y pesos (además del trigger base).
      try {
        const { data: inspRow } = await getInspection(detail.id);
        if (inspRow) {
          const row = (inspRow as unknown) as Inspection & {
            sampling_context?: Record<string, unknown> | null;
          };
          const ctx = { ...(row.sampling_context ?? {}) } as Record<string, unknown>;
          ctx.sampling_unit = samplingUnitLabel;
          ctx.unit_weight_kg = unitWeightKg;
          ctx.lot_quantity_units = detailLot?.quantity ?? null;
          ctx.lot_theoretical_weight_kg = detailLot?.theoretical_weight_kg ?? null;
          ctx.suggested_sample_count = suggested;
          ctx.sample_count = count;
          ctx.sample_count_reason = sampleCountReason.trim() || null;
          ctx.suggested_sample_weight_kg = totalSampleWeightKg;
          ctx.sample_weight_kg = totalRealWeightKg;
          ctx.rule_formula =
            activeSamplingPlan?.rule?.formula ??
            activeSamplingPlan?.rule?.operational_label ??
            'N = CEIL(kg teóricos / 1000 × 10)';
          ctx.rule_basis = activeSamplingPlan?.rule?.basis ?? null;
          ctx.n_is_sampling_units_not_kg = true;
          await updateInspection(detail.id, { sampling_context: ctx });
          setDetail({ ...row, sampling_context: ctx } as unknown as Inspection);
        }
      } catch {
        // context enriquecimiento best-effort
      }
      const { data } = await listSamples(detail.id);
      const generatedSamples = ((data as Sample[]) ?? []).filter((sample) => sample.is_active !== false);
      setSamples(generatedSamples);
      setActiveSampleId(generatedSamples[0]?.id ?? null);
      setMessage({ type: 'ok', text: 'Plan de muestreo aplicado; las muestras fueron generadas.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSample = async () => {
    if (!detail || samples.length === 0 || activeSampleId === '__CONSOLIDATED__') return;
    const ok = await saveValues();
    if (!ok) return;
    const current = samples.find((sample) => sample.id === activeSampleId);
    setMessage({ type: 'ok', text: `Muestra ${current?.sample_number ?? ''} guardada.` });
  };

  const handlePreviousSample = async () => {
    if (!detail || samples.length === 0) return;
    const currentIndex = samples.findIndex((sample) => sample.id === activeSampleId);
    const ok = await saveValues();
    if (!ok) return;
    if (currentIndex <= 0) {
      setActiveSampleId('__CONSOLIDATED__');
      return;
    }
    setActiveSampleId(samples[currentIndex - 1].id);
  };

  const handleNextSample = async () => {
    if (!detail || samples.length === 0 || activeSampleId === '__CONSOLIDATED__') return;
    const ok = await saveValues();
    if (!ok) return;
    const currentIndex = samples.findIndex((sample) => sample.id === activeSampleId);
    const nextSample = samples[currentIndex + 1];
    if (nextSample) {
      setActiveSampleId(nextSample.id);
      return;
    }
      setActiveSampleId('__CONSOLIDATED__');
      setMessage({
        type: 'ok',
        text:
          samples.length === 1
            ? 'Muestreo finalizado. El consolidado se copia desde la única muestra.'
            : 'Muestreo finalizado. La agregación del consolidado (N real > 1) queda pendiente de especificación.',
      });
  };

  const refreshEvidenceOnly = useCallback(async (inspectionId: string) => {
    const { data: evRes } = await listInspectionEvidence(inspectionId);
    const ev = (evRes as InspectionEvidence[]) ?? [];
    const withUrls = await Promise.all(
      ev.map(async (e) => {
        const { data } = await getEvidenceSignedUrl(e.storage_path);
        return { ...e, url: data?.signedUrl };
      })
    );
    setEvidence(withUrls);
  }, []);

  const handleUpload = async (file: File | null) => {
    if (!file || !detail || !companyId) return;
    setBusy(true);
    setMessage(null);
    try {
      const { path, error } = await uploadEvidenceFile(companyId, detail.id, file);
      if (error || !path) {
        setMessage({
          type: 'error',
          text: 'No pudimos subir la evidencia. Verifica el formato y el tamaño del archivo.',
        });
        return;
      }
      const targetSampleId =
        samples.length > 0 &&
        activeSampleId &&
        activeSampleId !== '__CONSOLIDATED__'
          ? activeSampleId
          : null;
      const { error: evError } = await addInspectionEvidence(
        detail.id,
        path,
        null,
        targetSampleId
      );
      if (evError) {
        setMessage({ type: 'error', text: 'No pudimos guardar la evidencia.' });
        return;
      }
      // Solo refrescar evidencia: NO openDetail (reescribe values/sampleValues/draft).
      await refreshEvidenceOnly(detail.id);
      setMessage({
        type: 'ok',
        text: targetSampleId
          ? 'Evidencia adjuntada a la muestra activa.'
          : 'Evidencia adjuntada a la inspección.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEvidence = async (id: string) => {
    if (!detail) return;
    const { error } = await deleteInspectionEvidence(id);
    if (error) {
      setMessage({ type: 'error', text: 'No pudimos quitar la evidencia.' });
      return;
    }
    // Solo actualizar lista de evidencia: no tocar criterios/observaciones/muestra activa.
    await refreshEvidenceOnly(detail.id);
  };

  const isOpen = detail?.status === InspectionStatus.EN_CURSO;

  /** Destino de edición de criterios: consolidado o muestra activa. */
  const editTargetSampleId: string | null =
    samples.length === 0
      ? null
      : activeSampleId === '__CONSOLIDATED__' || activeSampleId === null
        ? null
        : activeSampleId;
  const editMap: Record<string, string> =
    editTargetSampleId === null ? values : sampleValues[editTargetSampleId] ?? {};
  const activeSampleIndex = samples.findIndex((sample) => sample.id === activeSampleId);
  const isLastSample = activeSampleIndex >= 0 && activeSampleIndex === samples.length - 1;
  const setEditValue = (defId: string, v: string) => {
    const targetDef = defs.find((d) => d.id === defId) ?? null;
    const pestSpec = targetDef ? activeStructuredSpec(targetDef) : null;
    if (editTargetSampleId === null) {
      setValues((p) => ({ ...p, [defId]: v }));
      if (pestSpec?.kind === 'plagas' && v !== 'Sí') {
        setMeasurementObservations((p) => ({ ...p, [defId]: '' }));
      }
    } else {
      setSampleValues((p) => ({
        ...p,
        [editTargetSampleId]: { ...(p[editTargetSampleId] ?? {}), [defId]: v },
      }));
      if (pestSpec?.kind === 'plagas' && v !== 'Sí') {
        setSampleMeasurementObservations((p) => ({
          ...p,
          [editTargetSampleId]: { ...(p[editTargetSampleId] ?? {}), [defId]: '' },
        }));
      }
    }
  };

  const getEditObservation = (defId: string): string =>
    editTargetSampleId === null
      ? measurementObservations[defId] ?? ''
      : sampleMeasurementObservations[editTargetSampleId]?.[defId] ?? '';

  const setEditObservation = (defId: string, observation: string) => {
    if (editTargetSampleId === null) {
      setMeasurementObservations((p) => ({ ...p, [defId]: observation }));
    } else {
      setSampleMeasurementObservations((p) => ({
        ...p,
        [editTargetSampleId]: { ...(p[editTargetSampleId] ?? {}), [defId]: observation },
      }));
    }
  };

  const missingRequired = useMemo(() => {
    if (samples.length > 0) {
      return defs.filter((d) =>
        d.is_required &&
        samples.some(
          (sample) =>
            !responseIsComplete(
              d,
              sampleValues[sample.id]?.[d.id] ?? '',
              sampleMeasurementObservations[sample.id]?.[d.id] ?? ''
            )
        )
      );
    }
    return defs.filter(
      (d) =>
        d.is_required &&
        !responseIsComplete(d, values[d.id] ?? '', measurementObservations[d.id] ?? '')
    );
  }, [defs, sampleMeasurementObservations, sampleValues, samples, measurementObservations, values]);

  const criteriaDone = useMemo(() => {
    if (samples.length > 0) {
      return defs.filter((d) =>
        samples.every((sample) =>
          responseIsComplete(
            d,
            sampleValues[sample.id]?.[d.id] ?? '',
            sampleMeasurementObservations[sample.id]?.[d.id] ?? ''
          )
        )
      ).length;
    }
    return defs.filter(
      (d) =>
        responseIsComplete(d, values[d.id] ?? '', measurementObservations[d.id] ?? '') ||
        measurements.some(
          (m) =>
            m.measurement_def_id === d.id &&
            responseIsComplete(d, m.value ?? '', m.observation ?? '')
        )
    ).length;
  }, [defs, sampleMeasurementObservations, sampleValues, values, measurementObservations, measurements, samples]);

  const evalSummary = useMemo(() => {
    let cumple = 0;
    let desv = 0;
    let otros = 0;
    for (const e of evaluations) {
      if (e.result === 'CUMPLE') cumple++;
      else if (e.result === 'DESVIACIÓN') desv++;
      else otros++;
    }
    return { cumple, desv, otros, total: evaluations.length };
  }, [evaluations]);

  const evidenceRequiredByConfig = useMemo(() => defs.some((d) => d.evidence_required === true), [defs]);

  const labelLot = labelLotId ? lots.find((l) => l.id === labelLotId) ?? null : null;

  const openLabelPrint = (lotId: string) => setLabelLotId(lotId);

  const handlePrintLabel = () => {
    if (!labelLot) return;
    const prev = document.title;
    document.title = `LOTE-${labelLot.folio || labelLot.harvest_block}`;
    window.print();
    document.title = prev;
  };

  /** Busca inspecciones anteriores por contexto operacional (sin IDs de inspección). */
  const handleContinuitySearch = async () => {
    setContBusy(true);
    setContMessage(null);
    try {
      const filters = Object.fromEntries(
        Object.entries(contFilters)
          .map(([k, v]) => [k, (v || '').trim()])
          .filter(([, v]) => v !== '')
      ) as Record<string, string>;
      const { data, error } = await searchContinuityInspections(filters);
      if (error) {
        setContMessage({
          type: 'error',
          text: 'No pudimos buscar inspecciones anteriores.',
        });
        return;
      }
      const rows = (data ?? []) as unknown[] as Array<
        Inspection & {
          lots: ContinuitySearchHit['lot'];
          inspection_points: ContinuitySearchHit['point'];
        }
      >;
      const hits: ContinuitySearchHit[] = rows.map((r) => {
        const stageId = r.inspection_points?.operational_stage_id ?? null;
        return {
          inspection: {
            id: r.id,
            company_id: r.company_id,
            lot_id: r.lot_id,
            inspection_point_id: r.inspection_point_id,
            inspector_id: r.inspector_id,
            status: r.status,
            inspected_at: r.inspected_at,
            observations: r.observations ?? null,
            result: r.result ?? null,
            decision: r.decision ?? null,
            completed_at: r.completed_at ?? null,
            previous_inspection_id: r.previous_inspection_id ?? null,
            recommendation: r.recommendation ?? null,
            created_at: r.created_at,
            updated_at: r.updated_at,
          },
          lot: r.lots,
          point: r.inspection_points,
          stage_name: stageId
            ? (stages.find((s) => s.id === stageId)?.name ?? null)
            : null,
        };
      });
      setContResults(hits);
      if (hits.length === 0) {
        setContMessage({
          type: 'ok',
          text: 'Sin resultados con esos criterios. Amplía el rango o quita filtros.',
        });
      }
    } finally {
      setContBusy(false);
    }
  };

  /**
   * Crea la NUEVA inspección de continuidad (otra etapa/fecha/inspector).
   * La anterior permanece inmutable; solo se enlaza con previous_inspection_id.
   */
  const handleContinueFrom = async () => {
    if (!continueHit || !continuePointId || !companyId || !userId) {
      setContMessage({
        type: 'error',
        text: 'Selecciona un punto de inspección de la etapa a continuar.',
      });
      return;
    }
    const prev = continueHit.inspection;
    const prevStage = continueHit.point.operational_stage_id ?? null;
    const nextPoint = points.find((p) => p.id === continuePointId);
    const nextStage = nextPoint?.operational_stage_id ?? null;
    if (!nextPoint) {
      setContMessage({ type: 'error', text: 'Punto de inspección inválido.' });
      return;
    }
    if (prevStage && nextStage && prevStage === nextStage) {
      setContMessage({
        type: 'error',
        text: 'Elige un punto de otra etapa. Ya existe una inspección en la etapa anterior.',
      });
      return;
    }
    if (prev.status === InspectionStatus.EN_CURSO) {
      setContMessage({
        type: 'error',
        text: 'La inspección anterior está EN CURSO. Complétala antes de continuar.',
      });
      return;
    }

    setContBusy(true);
    try {
      const lot = lots.find((l) => l.id === prev.lot_id);
      const needsStageEvent =
        !lot || !lot.current_operational_stage_id || lot.current_operational_stage_id !== nextStage;
      if (needsStageEvent && lot && nextStage) {
        const isFirst = !lot.current_operational_stage_id;
        const { error: stageError } = await createLotStageEvent({
          lot_id: lot.id,
          company_id: companyId,
          operational_stage_id: nextStage,
          event_type: isFirst ? 'INGRESO' : 'TRANSICION',
          user_id: userId,
          notes: isFirst
            ? `Ingreso al continuar inspección desde ${continueHit.point.name}`
            : `Transición al continuar inspección: ${continueHit.point.name}`,
        });
        if (stageError) {
          setContMessage({
            type: 'error',
            text: 'No pudimos registrar la etapa de continuidad.',
          });
          return;
        }
      }

      const { data, error } = await createInspection({
        company_id: companyId,
        lot_id: prev.lot_id,
        inspection_point_id: continuePointId,
        inspector_id: userId,
        previous_inspection_id: prev.id,
      });
      if (error) {
        const raw = error.message ?? '';
        setContMessage({
          type: 'error',
          text: raw.includes('duplicate')
            ? 'Ya hay una inspección EN CURSO para este lote y punto.'
            : 'No pudimos crear la inspección de continuación.',
        });
        return;
      }
      setContOpen(false);
      setContinueHit(null);
      setContinuePointId('');
      setContResults([]);
      await loadList();
      if (data) await openDetail(data as Inspection);
    } finally {
      setContBusy(false);
    }
  };

  const matchInspectionQuery = useCallback(
    (insp: Inspection): boolean => {
      const lot = lots.find((l) => l.id === insp.lot_id);
      const folio = (lot?.folio ?? '').trim().toLowerCase();
      const guide = (lot?.producer_guide_number ?? '').trim().toLowerCase();
      const date = insp.inspected_at.slice(0, 10);
      const filters = listFilters;
      if (filters.folio && !folio.includes(filters.folio.trim().toLowerCase())) return false;
      if (filters.producerId && lot?.producer_id !== filters.producerId) return false;
      if (filters.guide && !guide.includes(filters.guide.trim().toLowerCase())) return false;
      if (filters.date && date !== filters.date && lot?.fruit_date !== filters.date) return false;
      if (filters.status && insp.status !== filters.status) return false;
      return true;
    },
    [listFilters, lots]
  );

  const openInspections = useMemo(
    () =>
      inspections
        .filter((i) => i.status === InspectionStatus.EN_CURSO)
        .filter(matchInspectionQuery)
        .sort((a, b) => b.inspected_at.localeCompare(a.inspected_at)),
    [inspections, matchInspectionQuery]
  );
  const recentInspections = useMemo(
    () =>
      inspections
        .filter((i) => i.status !== InspectionStatus.EN_CURSO)
        .filter(matchInspectionQuery)
        .slice()
        .sort((a, b) => b.inspected_at.localeCompare(a.inspected_at))
        .slice(0, hasListFilters ? 50 : 12),
    [hasListFilters, inspections, matchInspectionQuery]
  );

  /** Última inspección (cualquier estado) por lote. */
  const lastInspByLot = useMemo(() => {
    const m = new Map<string, Inspection>();
    const sorted = inspections
      .slice()
      .sort((a, b) => b.inspected_at.localeCompare(a.inspected_at));
    for (const i of sorted) {
      if (!m.has(i.lot_id)) m.set(i.lot_id, i);
    }
    return m;
  }, [inspections]);

  const semaphoreDotClass = (semaphore: string): string => {
    if (semaphore === QualitySemaphore.VERDE) return 'bg-[#4A5D23]';
    if (semaphore === QualitySemaphore.ROJO) return 'bg-[#dc2626]';
    if (semaphore === QualitySemaphore.AMARILLO) return 'bg-[#d97706]';
    return 'bg-[#9ca3af]';
  };

  const matchLotSearch = useCallback(
    (lot: Lot): boolean => {
      const q = lotQuery.trim().toLowerCase();
      if (!q) return false;
      const lotInsp = inspections.filter((i) => i.lot_id === lot.id);
      const pointNames = lotInsp
        .map((i) => pointName(i.inspection_point_id))
        .join(' ');
      const statuses = lotInsp.map((i) => i.status).join(' ');
      const hay = [
        lot.folio ?? '',
        lot.folio_interno ?? '',
        lot.lot_type ?? '',
        lot.kg_declarados != null ? String(lot.kg_declarados) : '',
        lot.harvest_block ?? '',
        lot.producer_guide_number ?? '',
        lot.fruit_date ?? '',
        lot.status ?? '',
        producerName(lot.producer_id),
        speciesName(lot.species_id),
        varietyName(lot.variety_id),
        stageName(lot.current_operational_stage_id),
        pointNames,
        statuses,
        latestClassByLot.get(lot.id)?.commercial_class ?? '',
        latestClassByLot.get(lot.id)?.semaphore ?? '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    },
    [lotQuery, inspections, latestClassByLot, pointName, producerName, speciesName, varietyName, stageName]
  );

  const lotSearchResults = useMemo(
    () => lots.filter((lot) => matchLotSearch(lot)).slice(0, 25),
    [lots, matchLotSearch]
  );

  const startNewInspection = (lotId: string, pointId?: string) => {
    setNewLotId(lotId);
    setNewPointId(pointId ?? '');
    setShowCreate(true);
    setMessage(null);
    window.setTimeout(() => {
      document.getElementById('new-inspection-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  const inspectionCard = (insp: Inspection, primary: boolean) => {
    const done = insp.status === InspectionStatus.COMPLETADA;
    const lot = lots.find((l) => l.id === insp.lot_id);
    return (
      <li
        key={insp.id}
        className="qx-ops-row p-4 sm:p-5"
        data-attention={primary ? 'true' : 'false'}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="qx-label">FOLIO / LOTE</p>
            <p className="qx-ops-id mt-0.5">{lotCode(insp.lot_id)}</p>
            <p className="mt-1 text-[13px] text-[#5c6355]">
              {pointName(insp.inspection_point_id)}
              <span className="text-[#b0b5a8]"> · </span>
              {lot ? lot.fruit_date : ''}
            </p>
            {lot && lot.producer_guide_number && (
              <p className="mt-0.5 text-[12px] text-[#9aa090]">Guía {lot.producer_guide_number}</p>
            )}
            <p className="mt-0.5 text-[12px] text-[#9aa090]">
              {new Date(insp.inspected_at).toLocaleString('es-CL')}
              {insp.inspector_id ? ` · ${inspectorLabel(insp.inspector_id)}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`qx-chip ${
                done
                  ? 'bg-[#dce8c8] text-[#2f4016] border border-[#4A5D23]/35'
                  : 'bg-[#e7edd9] text-[#3a4d1b] border border-[#4A5D23]/30'
              }`}
            >
              {insp.status}
            </span>
            {primary && (
              <span className="text-[11px] font-semibold text-[#b45309]">En curso</span>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="qx-stage-block">
            <p className="qx-field-label">Punto · Etapa</p>
            <p className="qx-field-value">
              {pointName(insp.inspection_point_id)}
              {' · '}
              {stageName(
                points.find((p) => p.id === insp.inspection_point_id)?.operational_stage_id ??
                  lot?.current_operational_stage_id ??
                  null
              )}
            </p>
          </div>
          <div className="sm:justify-self-end">
            <button
              type="button"
              onClick={() => openDetail(insp)}
              className={primary ? 'qx-btn-brand-solid w-full sm:w-auto' : 'qx-btn-ghost w-full sm:w-auto'}
            >
              {primary ? 'Continuar inspección' : 'Ver detalle'}
            </button>
          </div>
        </div>
      </li>
    );
  };

  if (openId && detail) {
    const lot = lots.find((l) => l.id === detail.lot_id);
    const stageLabelName = stageName(
      pointStageOf(detail.inspection_point_id) ??
        lot?.current_operational_stage_id ??
        null
    );

    if (detailLoading) {
      return (
        <div className="space-y-6">
          <button
            type="button"
            onClick={closeDetail}
            className="qx-btn-ghost"
          >
            ← Volver a inspecciones
          </button>
          <div className="qx-card p-6">
            <p className="qx-eyebrow">LOTE</p>
            <p className="qx-h1 !mt-1">{lotCode(detail.lot_id)}</p>
            <div className="mt-6 space-y-3">
              <div className="h-4 w-1/3 rounded bg-black/[0.06] animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-black/[0.06] animate-pulse" />
              <div className="h-24 w-full rounded-xl bg-black/[0.04] animate-pulse" />
              <div className="h-24 w-full rounded-xl bg-black/[0.04] animate-pulse" />
            </div>
            <p className="mt-4 text-[13px] text-[#888]">Cargando inspección…</p>
          </div>
        </div>
      );
    }

    const evidenceRequired = evidenceRequiredByConfig;
    const helpDef = openHelpId ? defs.find((def) => def.id === openHelpId) ?? null : null;
    const requiredCriteriaCount = defs.filter((def) => def.is_required).length;
    const requiredCriteriaDone = defs.filter((def) => {
      if (!def.is_required) return false;
      if (samples.length > 0) {
        return samples.every((sample) =>
          responseIsComplete(
            def,
            sampleValues[sample.id]?.[def.id] ?? '',
            sampleMeasurementObservations[sample.id]?.[def.id] ?? ''
          )
        );
      }
      return responseIsComplete(def, values[def.id] ?? '', measurementObservations[def.id] ?? '');
    }).length;
    const progressItems = [
      {
        label: 'Criterios',
        value: defs.length ? `${criteriaDone} / ${defs.length}` : '—',
        ok: requiredCriteriaCount === 0 || requiredCriteriaDone >= requiredCriteriaCount,
      },
      {
        label: 'Evidencia',
        value: evidenceRequired
          ? evidence.length > 0
            ? `${evidence.length} archivo${evidence.length === 1 ? '' : 's'}`
            : 'Pendiente (requerida)'
          : evidence.length > 0
            ? `${evidence.length} archivo${evidence.length === 1 ? '' : 's'}`
            : 'Opcional',
        ok: evidenceRequired ? evidence.length > 0 : true,
      },
      {
        label: 'Resultado',
        value: resultText.trim() ? 'Listo' : 'Pendiente',
        ok: !!resultText.trim(),
      },
      {
        label: 'Decisión',
        value: decisionText.trim() ? 'Listo' : 'Pendiente',
        ok: !!decisionText.trim(),
      },
    ];

    const readyCount = progressItems.filter((p) => p.ok).length;

    return (
      <div className="flex flex-col gap-6 pb-24">
        {/* Sticky — identificación + progreso (siempre visible) */}
        <div className="order-0 sticky top-0 z-30 -mx-2 -mt-2 border-b border-[#1a1a1a]/[0.08] bg-[#f4f5f0]/95 px-2 pt-2 pb-3 backdrop-blur-sm sm:-mx-4 sm:px-4">
          <div className="qx-surface p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="qx-eyebrow !text-[#4A5D23]">Inspección en curso</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="col-span-2 min-w-0 sm:col-span-1 lg:col-span-1">
                    <p className="qx-field-label">Folio</p>
                    <p className="break-all text-[15px] font-semibold text-[#1a1a1a]">
                      {lot?.folio || lot?.harvest_block || '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="qx-field-label">Productor</p>
                    <p className="truncate text-[13px] font-medium text-[#1a1a1a]">
                      {producerName(lot?.producer_id)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="qx-field-label">Variedad</p>
                    <p className="truncate text-[13px] font-medium text-[#1a1a1a]">
                      {varietyName(lot?.variety_id)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="qx-field-label">Embalaje</p>
                    <p className="truncate text-[13px] font-medium text-[#1a1a1a]">
                      {packagingName(lot?.packaging_type_id, lot?.packaging_type)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="qx-field-label">Cantidad</p>
                    <p className="text-[13px] font-medium text-[#1a1a1a]">
                      {lot?.quantity ?? '—'} envases
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="qx-field-label">Kg teóricos</p>
                    <p className="text-[13px] font-medium text-[#1a1a1a]">
                      {lot?.theoretical_weight_kg != null ? `${lot.theoretical_weight_kg} kg` : '—'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#5c6355]">
                  <span>Punto: {pointName(detail.inspection_point_id)}</span>
                  <span>Etapa: {stageLabelName}</span>
                  <span>Temporada: {seasonName(lot?.season_id)}</span>
                  <span>Inspector: {inspectorLabel(detail.inspector_id)}</span>
                  <span>{new Date(detail.inspected_at).toLocaleString('es-CL')}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`qx-chip ${
                    detail.status === InspectionStatus.COMPLETADA
                      ? 'bg-[#dce8c8] text-[#2f4016] border border-[#4A5D23]/35'
                      : 'bg-[#e7edd9] text-[#3a4d1b] border border-[#4A5D23]/30'
                  }`}
                >
                  {detail.status}
                </span>
                {lot && (
                  <button type="button" onClick={() => openLabelPrint(lot.id)} className="qx-btn-ghost">
                    Etiqueta
                  </button>
                )}
                {detail.status === InspectionStatus.COMPLETADA && (
                  <>
                    <Link href={`/dashboard/inspections/${detail.id}/report`} className="qx-btn-ghost">
                      VER INFORME
                    </Link>
                    <Link
                      href={`/dashboard/inspections/${detail.id}/report?action=pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="qx-btn-ghost"
                    >
                      GENERAR PDF
                    </Link>
                    <Link
                      href={`/dashboard/inspections/${detail.id}/report?action=print`}
                      target="_blank"
                      rel="noreferrer"
                      className="qx-btn-ghost"
                    >
                      IMPRIMIR
                    </Link>
                  </>
                )}
                <button type="button" onClick={closeDetail} className="qx-btn-ghost">
                  Volver
                </button>
              </div>
            </div>

            {/* Progreso */}
            <div className="qx-progress-bar mt-3">
              {progressItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border px-3 py-2 ${
                    item.ok
                      ? 'border-[#4A5D23]/30 bg-[#e7edd9]'
                      : 'border-[#1a1a1a]/[0.08] bg-white'
                  }`}
                >
                  <p className="qx-field-label">{item.label}</p>
                  <p
                    className={`mt-0.5 text-[13px] font-semibold ${
                      item.ok ? 'text-[#3a4d1b]' : 'text-[#1a1a1a]'
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-medium text-[#73786a]">
              PROGRESO {readyCount}/{progressItems.length} — criterios, evidencia, resultado y
              decisión para completar.
            </p>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className={`qx-banner order-1 ${message.type === 'ok' ? 'qx-banner-ok' : 'qx-banner-error'}`}
          >
            {message.text}
          </div>
        )}

        {/* Continuidad — inspección anterior (si esta es continuación) */}
        {prevDetail && (
          <div
            role="status"
            className="order-1 rounded-xl border border-[#4A5D23]/30 bg-[#4A5D23]/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[#3a4d1b]"
            data-testid="continuity-banner"
          >
            <p className="font-semibold">Existe un control anterior relacionado</p>
            <p className="mt-1 text-[12px] text-[#5c6b45]">
              Lote {lotCode(prevDetail.lot_id)} ·{' '}
              {pointName(prevDetail.inspection_point_id)} ·{' '}
              {new Date(prevDetail.inspected_at).toLocaleString('es-CL')} ·{' '}
              {inspectorLabel(prevDetail.inspector_id)} · {prevDetail.status}
            </p>
            {prevDetail.recommendation && (
              <p className="mt-1 text-[12px]">
                Recomendación del control anterior:{' '}
                <strong>{prevDetail.recommendation}</strong>
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-[#6b7a55]">
              El control anterior permanece inmutable. Esta inspección solo lo referencia
              (continuidad operacional).
            </p>
          </div>
        )}

        {/* CRITERIOS + MEDICIONES */}
        <section className="order-4 rounded-2xl border border-[#1a1a1a]/[0.07] bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
                2 · Criterios de evaluación y mediciones
              </p>
              <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
                Criterios del punto
                {defs.length > 0 && (
                  <span className="ml-2 font-normal text-[#888]">
                    {criteriaDone} / {defs.length} completos
                  </span>
                )}
              </h2>
            </div>
            {evaluations.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-[#4A5D23]/30 bg-[#4A5D23]/10 px-2.5 py-1 font-medium text-[#3a4d1b]">
                  CUMPLE {evalSummary.cumple}
                </span>
                <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 font-medium text-amber-900">
                  DESVIACIÓN {evalSummary.desv}
                </span>
                {evalSummary.otros > 0 && (
                  <span className="rounded-full border border-[#1a1a1a]/10 bg-black/[0.03] px-2.5 py-1 font-medium text-[#666]">
                    Otros {evalSummary.otros}
                  </span>
                )}
                <span className="rounded-full border border-[#1a1a1a]/10 px-2.5 py-1 text-[#888]">
                  {evaluations.length} evaluaciones
                </span>
              </div>
            )}
            {classification && (
              <div className="flex flex-wrap items-center gap-2" data-testid="inspection-classification">
                <span
                  className={`qx-chip ${
                    classification.semaphore === 'VERDE'
                      ? 'bg-[#dce8c8] text-[#2f4016] border border-[#4A5D23]/35'
                      : classification.semaphore === 'ROJO'
                        ? 'bg-[#fee2e2] text-[#991b1b] border border-red-300/70'
                        : 'bg-[#fef3c7] text-[#92400e] border border-amber-300/70'
                  }`}
                >
                  Semáforo: {classification.semaphore}
                </span>
                <span className="qx-chip border border-[#1a1a1a]/15 bg-[#f3f4f1] text-[#444]">
                  {classification.commercial_class}
                </span>
                {classification.ai_used && (
                  <span className="rounded-full border border-[#1a1a1a]/10 bg-black/[0.03] px-2.5 py-1 text-[11px] text-[#666]">
                    con aporte IA
                  </span>
                )}
              </div>
            )}
            {detail.status === InspectionStatus.COMPLETADA && !classification && (
              <p className="text-[12px] text-[#888]" data-testid="inspection-classification-missing">
                Sin clasificación registrada para esta inspección.
              </p>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!detail) return;
                if (samples.length > 0) {
                  const okS = await saveAllSampleMeasurements();
                  if (!okS) return;
                  const okC = await saveConsolidated();
                  if (!okC) return;
                } else {
                  const ok = await saveValues();
                  if (!ok) return;
                }
                await runQualityEvaluate(detail.id);
                setMessage({ type: 'ok', text: 'Calidad evaluada (Quality Engine).' });
              }}
              disabled={!isOpen}
              className="min-h-9 rounded-full border border-[#4A5D23]/40 bg-white px-3.5 text-[12px] font-medium text-[#3a4d1b] transition-colors hover:bg-[#4A5D23]/5 disabled:opacity-40"
            >
              Evaluar calidad
            </button>
          </div>
          {activeSampleId && activeSampleId !== '__CONSOLIDATED__' && samples.length > 0 && (
            <div className="sticky bottom-2 z-20 mt-3 space-y-2 rounded-xl border border-[#4A5D23]/30 bg-[#e7edd9]/95 p-2.5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#2f4016]">
                  MUESTRA {samples.find((s) => s.id === activeSampleId)?.sample_number ?? '—'} / {samples.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handlePreviousSample}
                  disabled={!isOpen || busy}
                  className="min-h-10 rounded-lg border border-[#1a1a1a]/15 bg-white px-2 text-[12px] font-medium text-[#555] disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={handleSaveSample}
                  disabled={!isOpen || busy}
                  className="min-h-10 rounded-lg border border-[#4A5D23]/40 bg-white px-2 text-[12px] font-medium text-[#3a4d1b] disabled:opacity-40"
                >
                  Guardar muestra
                </button>
                {isLastSample ? (
                  <button
                    type="button"
                    onClick={handleNextSample}
                    disabled={!isOpen || busy}
                    className="min-h-10 rounded-lg bg-[#4A5D23] px-2 text-[12px] font-semibold text-white disabled:opacity-40"
                  >
                    Finalizar muestreo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextSample}
                    disabled={!isOpen || busy}
                    className="min-h-10 rounded-lg bg-[#4A5D23] px-2 text-[12px] font-semibold text-white disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                )}
              </div>
            </div>
          )}
          {defs.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#1a1a1a]/15 px-3.5 py-5 text-center">
              <p className="text-[13px] font-medium text-[#555]">
                Este punto aún no tiene criterios configurados.
              </p>
              <p className="mt-1 text-[12px] text-[#888]">
                Sin criterios no se puede evaluar calidad. Un administrador puede agregarlos en
                Configuración → Puntos de inspección.
              </p>
              <div className="mt-3">
                <Link href="/dashboard/inspection-points" className="qx-btn-brand">
                  Configurar criterios
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {samples.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8fa868]">
                    Destino de captura
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSampleId('__CONSOLIDATED__')}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        editTargetSampleId === null
                          ? 'border-[#4A5D23] bg-[#4A5D23] text-white'
                          : 'border-[#1a1a1a]/15 text-[#666] hover:border-[#4A5D23]/40'
                      }`}
                    >
                      Consolidado
                    </button>
                    {samples.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSampleId(s.id)}
                        className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          activeSampleId === s.id
                            ? 'border-[#4A5D23] bg-[#4A5D23] text-white'
                            : 'border-[#1a1a1a]/15 text-[#666] hover:border-[#4A5D23]/40'
                        }`}
                      >
                        {s.label ?? `M${s.sample_number ?? ''}`}
                      </button>
                    ))}
                  </div>

                </div>
              )}
              {defs.map((def) => {
                const current = editMap[def.id] ?? '';
                const alert = limitAlert(def, current);
                const structured = activeStructuredSpec(def);
                const observation = getEditObservation(def.id);
                const pestDetail = structured?.kind === 'plagas' ? parsePestObservation(observation) : null;
                const scaleText =
                  criterionScaleText(def) ??
                  (structured ? structured.options.join(' · ') : null);
                const needsUnit = isNumericInputType(def.value_type) && !structured;
                const unitMissing = needsUnit && !def.unit?.trim();
                const responseLabel = structured
                  ? structured.kind === 'firmeza'
                    ? 'cualitativa (firmeza)'
                    : structured.kind === 'plagas'
                      ? 'estructurada (No/Sí)'
                      : 'respuesta estructurada'
                  : def.value_type;
                return (
                  <div key={def.id} className="rounded-xl border border-[#1a1a1a]/[0.06] p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                        {def.name}
                        {def.is_required && <span className="text-[#4A5D23]"> *</span>}
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenHelpId(openHelpId === def.id ? null : def.id)}
                        aria-label={`Ayuda técnica de ${def.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a]/10 text-[13px] text-[#666] transition-colors hover:border-[#4A5D23]/40 hover:text-[#3a4d1b]"
                      >
                        ⓘ
                      </button>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] leading-snug">
                      <span className="rounded-full bg-black/[0.05] px-2 py-0.5 font-medium text-[#555]">
                        Respuesta: {responseLabel}
                      </span>
                      {def.unit?.trim() && !structured ? (
                        <span className="rounded-full bg-[#4A5D23]/10 px-2 py-0.5 font-semibold text-[#3a4d1b]">
                          Unidad: {def.unit.trim()}
                        </span>
                      ) : needsUnit ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                          Unidad: pendiente de configuración
                        </span>
                      ) : null}
                      {scaleText ? (
                        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[#555]">
                          Escala: {scaleText}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2">
                      {unitMissing ? (
                        <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-[12px] leading-snug text-amber-900">
                          Configuración técnica incompleta: no hay unidad/método definidos para
                          registrar un valor numérico. Un administrador debe completar la definición
                          en Configuración antes de ingresar datos aquí.
                        </div>
                      ) : structured ? (
                        <div className="space-y-2">
                          {structured.kind === 'plagas' ? (
                            <div
                              className="flex flex-wrap gap-2"
                              role="radiogroup"
                              aria-label={`Presencia de plagas — ${def.name}`}
                            >
                              {structured.options.map((option) => {
                                const selected = current === option;
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    disabled={!isOpen}
                                    onClick={() => setEditValue(def.id, option)}
                                    className={
                                      selected
                                        ? 'rounded-full border border-[#4A5D23] bg-[#4A5D23] px-5 py-2 text-[13px] font-semibold text-white'
                                        : 'rounded-full border border-[#1a1a1a]/15 bg-white px-5 py-2 text-[13px] font-medium text-[#555] hover:border-[#4A5D23]/40'
                                    }
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <select
                              value={current}
                              onChange={(e) => setEditValue(def.id, e.target.value)}
                              disabled={!isOpen}
                              className={inputClass}
                            >
                              <option value="">Seleccionar…</option>
                              {structured.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                          {structured.kind === 'plagas' && current === 'Sí' && pestDetail && (
                            <>
                              <label className="block text-[11px] font-medium text-[#73786a]">
                                Plaga
                                <input
                                  type="text"
                                  value={pestDetail.pest}
                                  onChange={(e) =>
                                    setEditObservation(
                                      def.id,
                                      serializePestObservation(e.target.value, pestDetail.observation)
                                    )
                                  }
                                  disabled={!isOpen}
                                  className={inputClass}
                                  placeholder="Otra — identificación de la plaga"
                                />
                              </label>
                              <label className="block text-[11px] font-medium text-[#73786a]">
                                Detalle
                                <input
                                  type="text"
                                  value={pestDetail.observation}
                                  onChange={(e) =>
                                    setEditObservation(
                                      def.id,
                                      serializePestObservation(pestDetail.pest, e.target.value)
                                    )
                                  }
                                  disabled={!isOpen}
                                  className={inputClass}
                                  placeholder="Detalle observado"
                                />
                              </label>
                            </>
                          )}
                        </div>
                      ) : def.value_type === 'sí/no' ? (
                        <select
                          value={current}
                          onChange={(e) => setEditValue(def.id, e.target.value)}
                          disabled={!isOpen}
                          className={inputClass}
                        >
                          <option value="">Seleccionar…</option>
                          <option value="Sí">Sí</option>
                          <option value="No">No</option>
                        </select>
                      ) : def.value_type === 'lista' ? (
                        <select
                          value={current}
                          onChange={(e) => setEditValue(def.id, e.target.value)}
                          disabled={!isOpen}
                          className={inputClass}
                        >
                          <option value="">Seleccionar…</option>
                          {(def.options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : def.value_type === 'multiselección' ? (
                        <div className="space-y-2 rounded-lg border border-[#1a1a1a]/10 bg-white p-2.5">
                          {(def.options ?? []).length > 0 ? (
                            (def.options ?? []).map((option) => {
                              const selected = current ? current.split('|') : [];
                              return (
                                <label key={option} className="flex items-center gap-2 text-[12px] text-[#555]">
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    disabled={!isOpen}
                                    onChange={() => {
                                      const next = selected.includes(option)
                                        ? selected.filter((item) => item !== option)
                                        : [...selected, option];
                                      setEditValue(def.id, next.join('|'));
                                    }}
                                  />
                                  {option}
                                </label>
                              );
                            })
                          ) : null}
                        </div>
                      ) : def.value_type === 'cálculo derivado' ? (
                        <div className="rounded-lg border border-[#1a1a1a]/10 bg-[#fafaf7] px-3 py-2.5 text-[12px] text-[#666]">
                          Resultado calculado por QualityNX; no se registra manualmente.
                        </div>
                      ) : def.value_type === 'foto' || def.value_type === 'archivo' ? (
                        <div className="rounded-lg border border-[#1a1a1a]/10 bg-[#fafaf7] px-3 py-2.5 text-[12px] text-[#666]">
                          La evidencia se adjunta en la sección de evidencia de la muestra.
                        </div>
                      ) : (
                        <div className="flex items-stretch gap-2">
                          <input
                            type={fieldInputType(def.value_type)}
                            step="any"
                            value={current}
                            onChange={(e) => setEditValue(def.id, e.target.value)}
                            disabled={!isOpen}
                            className={`${inputClass} flex-1`}
                            placeholder={
                              def.min_value != null || def.max_value != null
                                ? `${def.min_value ?? '−∞'} … ${def.max_value ?? '∞'}`
                                : def.unit?.trim()
                                  ? `Ej.: 12 ${def.unit.trim()}`
                                  : ''
                            }
                            aria-label={`${def.name}${def.unit?.trim() ? ` (${def.unit.trim()})` : ''}`}
                          />
                          {def.unit?.trim() ? (
                            <span className="flex shrink-0 items-center rounded-xl border border-[#1a1a1a]/10 bg-[#fafaf7] px-3 text-[13px] font-semibold text-[#444]">
                              {def.unit.trim()}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {alert && (
                      <p
                        role="alert"
                        className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800"
                      >
                        {alert} — solo alerta; no modifica resultado ni decisión.
                      </p>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5 · MUESTREO */}
        <section className="order-3 rounded-2xl border border-[#1a1a1a]/[0.07] bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
            5 · Muestreo
          </p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
            Muestras
          </h2>
          <div className="mt-2 rounded-xl border border-[#4A5D23]/20 bg-[#4A5D23]/[0.05] px-3.5 py-2.5 text-[12px] text-[#3a4d1b]">
            <span className="font-semibold">Plan:</span> {activeSamplingPlan?.name ?? '—'}
            <span className="mx-2 opacity-50">·</span>
            <span className="font-semibold">Unidad de muestreo:</span> {samplingUnitLabel}
            <span className="mx-2 opacity-50">·</span>
            <span className="font-semibold">Regla:</span>{' '}
            {activeSamplingPlan?.rule?.formula ??
              activeSamplingPlan?.rule?.operational_label ??
              'N = CEIL(kg teóricos / 1000 × 10)'}
            <span className="mx-2 opacity-50">·</span>
            N = unidades de muestreo ({samplingUnitLabel}), no kg.
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#4A5D23]/25 bg-[#FAFAF7] px-3.5 py-3">
              <p className="qx-field-label">N SUGERIDO</p>
              <p className="mt-0.5 text-[18px] font-semibold text-[#1a1a1a]">
                {formatCountUnit(nSuggested, samplingUnitLabel)}
              </p>
              <p className="mt-0.5 text-[11px] text-[#6b7065]">
                Cantidad de unidades de muestreo, no kg
              </p>
            </div>
            <div className="rounded-xl border border-[#4A5D23]/25 bg-[#FAFAF7] px-3.5 py-3">
              <p className="qx-field-label">PESO TEÓRICO POR UNIDAD</p>
              <p className="mt-0.5 text-[18px] font-semibold text-[#1a1a1a]">
                {unitWeightKg != null
                  ? `${formatKg(unitWeightKg)} kg/${samplingUnitLabel}`
                  : '—'}
              </p>
              {detailLot?.quantity != null && detailLot?.theoretical_weight_kg != null ? (
                <p className="mt-0.5 text-[11px] text-[#6b7065]">
                  Lote: {formatKg(detailLot.theoretical_weight_kg)} kg · {detailLot.quantity}{' '}
                  {samplingUnitLabel}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-[#4A5D23]/25 bg-[#FAFAF7] px-3.5 py-3">
              <p className="qx-field-label">PESO TOTAL REFERENCIAL DE MUESTRA</p>
              <p className="mt-0.5 text-[18px] font-semibold text-[#1a1a1a]">
                {totalSampleWeightKg != null ? `${formatKg(totalSampleWeightKg)} kg` : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-[#6b7065]">
                {nSuggested != null && unitWeightKg != null
                  ? `${nSuggested} ${samplingUnitLabel} × ${formatKg(unitWeightKg)} kg`
                  : 'Equivalente calculado a peso teórico'}
              </p>
            </div>
          </div>
          {isOpen && (
            <div className="mt-4 rounded-xl border border-[#4A5D23]/25 bg-[#f7f9f2] p-3.5">
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5c6355]">
                    Plan de muestreo
                  </label>
                  <select
                    value={samplingPlanId}
                    onChange={(e) => void handleSamplingPlanChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleccionar plan…</option>
                    {samplingPlans.filter((p) => p.is_active).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5c6355]">
                    N sugerido ({samplingUnitLabel})
                  </label>
                  <div className="qx-field-value">{formatCountUnit(nSuggested, samplingUnitLabel)}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSamplingPlan}
                  disabled={busy || !samplingPlanId}
                  className="qx-btn-primary min-h-11"
                >
                  Aplicar N
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5c6355]">
                    N real ({samplingUnitLabel})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sampleCount}
                    onChange={(e) => setSampleCount(e.target.value)}
                    className={inputClass}
                    disabled={!isOpen}
                    aria-label={`N real en ${samplingUnitLabel}`}
                  />
                  {totalRealWeightKg != null && nReal != null && Number.isFinite(nReal) ? (
                    <p className="mt-1 text-[11px] text-[#6b7065]">
                      Equivalente: {formatKg(totalRealWeightKg)} kg
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5c6355]">
                    Motivo si N real difiere del sugerido
                  </label>
                  <input
                    type="text"
                    value={sampleCountReason}
                    onChange={(e) => setSampleCountReason(e.target.value)}
                    className={inputClass}
                    placeholder="Obligatorio solo si cambia la sugerencia"
                    disabled={!isOpen}
                  />
                </div>
              </div>
            </div>
          )}
          {samples.length > 0 ? (
            <ul className="mt-4 divide-y divide-[#1a1a1a]/[0.05]">
              {samples.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="text-[#444]">
                    <span className="font-semibold text-[#3a4d1b]">Muestra {s.sample_number ?? '—'}</span>
                    {s.fruit_quantity != null && (
                      <span className="text-[#6b7065]"> · {s.fruit_quantity} frutos</span>
                    )}
                    {s.sampling_unit ? (
                      <span className="text-[#6b7065]"> · 1 {s.sampling_unit}</span>
                    ) : null}
                  </span>
                  <span className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSampleId(s.id)}
                      className="text-[12px] font-medium text-[#3a4d1b] hover:underline"
                    >
                      Capturar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-[#888]">Sin muestras registradas.</p>
          )}
          {samples.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#4A5D23]/25 bg-[#FAFAF7] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
                Consolidación
              </p>
              <p className="mt-1.5 text-[12px] text-[#6b7065]">
                {samples.length === 1
                  ? 'Con N real = 1 se copia automáticamente desde la única muestra. Sin acción del inspector.'
                  : 'Con N real > 1 la agregación por criterio está pendiente de especificación. No se exige consolidación manual.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveSampleId('__CONSOLIDATED__')}
                className="mt-2 rounded-full border border-[#4A5D23]/40 bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#3a4d1b] hover:bg-[#4A5D23]/5"
              >
                Ver consolidado
              </button>
            </div>
          )}
        </section>

        {/* 6 · EVIDENCIA */}
        <section className="order-5 rounded-2xl border border-[#1a1a1a]/[0.07] bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
            6 · Evidencia
          </p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
            Evidencia fotográfica{' '}
            <span className="font-normal text-[#73786a]">
              {evidenceRequiredByConfig ? '(obligatoria según criterios)' : '(opcional según criterios)'}
            </span>
          </h2>
          <p className="mt-1 text-[12px] text-[#6b7065]">
            LOTE {lot?.folio || lotCode(detail.lot_id)} · Referencia: {lot?.harvest_block ?? '—'}
            visible al capturar fotos.
          </p>
          {isOpen && (
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#1a1a1a]/10 px-4 py-2 text-[13px] font-medium text-[#666] transition-colors hover:border-[#1a1a1a]/20 hover:text-[#1a1a1a]">
              Subir fotografía
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    void handleUpload(f);
                  }}
                  disabled={busy}
                />
            </label>
          )}
          <p className="mt-2 text-[12px] text-[#6b7065]">
            {evidenceRequiredByConfig
              ? 'Alguno de los criterios de esta inspección exige evidencia fotográfica.'
              : 'La evidencia no es obligatoria para esta configuración de criterios (Opcional / No aplica).'}
          </p>
          {evidence.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {evidence.map((ev) => (
                <div key={ev.id} className="relative">
                  {ev.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ev.url}
                      alt="Evidencia"
                      className="h-24 w-24 rounded-xl border border-[#1a1a1a]/[0.07] object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-[#1a1a1a]/[0.07] bg-black/[0.03] text-[11px] text-[#6b7065]">
                      Cargando…
                    </div>
                  )}
                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvidence(ev.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] text-white"
                      aria-label="Quitar evidencia"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[#888]">Sin evidencia adjunta.</p>
          )}
        </section>

        {/* 7-9 · RESULTADO → DECISIÓN → IA */}
        <section className="order-6 rounded-2xl border border-[#1a1a1a]/[0.07] bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
            7 · Resultado · 8 · Decisión · 9 · Recomendación IA
          </p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
            Registro del control
          </h2>
          <p className="mt-0.5 text-[12px] text-[#6b7065]">
            LOTE {lot?.folio || lotCode(detail.lot_id)}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-5">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Observaciones
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={!isOpen}
                rows={3}
                className={inputClass}
                placeholder="Lo observado en terreno…"
              />
            </div>

            {/* 1. RESULTADO TÉCNICO */}
            <div className="rounded-xl border border-[#1a1a1a]/[0.06] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
                1 · Resultado técnico
              </p>
              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                disabled={!isOpen}
                rows={2}
                className={inputClass}
                placeholder="Lo observado/medido (no es la decisión)"
              />
            </div>

            {/* 2. DECISIÓN DEL INSPECTOR */}
            <div className="rounded-xl border border-[#1a1a1a]/[0.06] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
                2 · Decisión del inspector
              </p>
              <select
                value={
                  decisionText.trim() &&
                  INSPECTION_DECISION_OPTIONS.includes(
                    decisionText.trim() as (typeof INSPECTION_DECISION_OPTIONS)[number]
                  )
                    ? decisionText.trim()
                    : decisionText.trim()
                      ? '__LIBRE__'
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__LIBRE__') setDecisionText('');
                  else setDecisionText(v);
                }}
                disabled={!isOpen}
                className={inputClass}
              >
                <option value="">Seleccionar decisión…</option>
                {INSPECTION_DECISION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="__LIBRE__">OTRA / texto libre…</option>
              </select>
              {(!decisionText.trim() ||
                !INSPECTION_DECISION_OPTIONS.includes(
                  decisionText.trim() as (typeof INSPECTION_DECISION_OPTIONS)[number]
                )) && (
                <textarea
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  disabled={!isOpen}
                  rows={2}
                  className={inputClass}
                  placeholder="Describe la acción tomada si es otra…"
                />
              )}
              <p className="mt-1 text-[11px] text-[#73786a]">
                Responsable, fecha/hora y resultado técnico quedan asociados al completar.
                Separado del resultado (04 §13).
              </p>
            </div>

            {/* Recomendación de seguimiento (continuidad) */}
            <div className="rounded-xl border border-[#4A5D23]/20 bg-[#4A5D23]/[0.04] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4A5D23]">
                Recomendación de seguimiento
              </p>
              <textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                disabled={!isOpen}
                rows={2}
                className={inputClass}
                placeholder="Ej: Fruta aún no cosechar. Revisar nuevamente en 3 días."
              />
              <p className="mt-1 text-[11px] text-[#73786a]">
                Orienta al siguiente inspector. NO genera cambio automático de etapa ni de estado
                del lote.
              </p>
            </div>

            {/* 3. RECOMENDACIÓN IA */}
            <div className="rounded-xl border border-[#4A5D23]/25 bg-[#4A5D23]/[0.04] p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4A5D23]">
                    3 · Recomendación IA
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#666]">
                    Lote:{' '}
                    <span className="font-semibold text-[#1a1a1a]">
                      {lot?.folio || lotCode(detail.lot_id)}
                    </span>
                  </p>
                </div>
                {isOpen && canInspect && (
                  <button
                    type="button"
                    onClick={handleAnalyzeAi}
                    disabled={aiLoading || busy}
                    className="min-h-10 rounded-full border border-[#4A5D23]/30 bg-white px-4 py-2 text-[12px] font-semibold text-[#3a4d1b] transition-colors hover:bg-[#4A5D23]/10 disabled:opacity-40"
                  >
                    {aiLoading ? 'Analizando…' : aiAnalysis ? 'Re-analizar' : 'Solicitar análisis IA'}
                  </button>
                )}
              </div>

              {aiLoading && (
                <div className="mt-3 flex items-center gap-3 text-[13px] text-[#3a4d1b]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4A5D23]/25 border-t-[#4A5D23]" />
                  Analizando inspección…
                </div>
              )}

              {aiError && (
                <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  {aiError} La inspección puede continuar sin IA.
                </p>
              )}

              {!aiLoading && !aiAnalysis && !aiError && (
                <p className="mt-2 text-[12px] text-[#888]">
                  La IA analiza criterios, valores, límites y contexto. No decide por el lote.
                </p>
              )}

              {aiAnalysis && !aiLoading && (
                <div className="mt-3 space-y-2">
                  <p className="text-[13px] font-semibold text-[#1a1a1a]">
                    RECOMENDACIÓN:{' '}
                    <span className="text-[#4A5D23]">{aiAnalysis.recommendation}</span>
                  </p>
                  <p className="text-[13px] text-[#444]">
                    CONFIANZA:{' '}
                    <span className="font-semibold">
                      {aiAnalysis.confidence != null ? `${aiAnalysis.confidence}%` : '—'}
                    </span>
                  </p>
                  {aiAnalysis.reasoning_summary && (
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#888]">
                        Fundamentos
                      </p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#444]">
                        {aiAnalysis.reasoning_summary}
                      </p>
                    </div>
                  )}
                  {Array.isArray(aiAnalysis.supporting_factors) &&
                    aiAnalysis.supporting_factors.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-[#666]">
                        {(aiAnalysis.supporting_factors as string[]).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  {Array.isArray(aiAnalysis.alerts) && aiAnalysis.alerts.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-amber-800">
                      {(aiAnalysis.alerts as string[]).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                  {Array.isArray(aiAnalysis.data_quality_warnings) &&
                    aiAnalysis.data_quality_warnings.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-[#888]">
                        {(aiAnalysis.data_quality_warnings as string[]).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  <p className="rounded-lg bg-white/70 px-3 py-2 text-[12px] font-medium text-[#3a4d1b]">
                    Recomendación de IA — no sustituye la decisión del inspector.
                  </p>
                  <p className="text-[11px] text-[#6b7065]">
                    Modelo: {aiAnalysis.model}
                    {aiAnalysis.prompt_version ? ` · prompt ${aiAnalysis.prompt_version}` : ''}
                    {aiAnalysis.created_at
                      ? ` · ${new Date(aiAnalysis.created_at).toLocaleString('es-CL')}`
                      : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 10 · CIERRE */}
        {isOpen && canInspect && (
          <div className="qx-card order-7 p-4 sm:p-6">
            <p className="qx-eyebrow">10 · Cierre</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#444]">
                  Progreso de cierre
                </p>
                <p className="mt-0.5 text-[12px] text-[#888]">
                  <span className="font-semibold text-[#666]">LOTE {lot?.folio || lotCode(detail.lot_id)}</span>
                  {' · '}
                  {missingRequired.length > 0
                    ? `Pendientes: ${missingRequired.map((d) => d.name).join(', ')}`
                    : evidenceRequiredByConfig && evidence.length === 0
                      ? 'Falta evidencia fotográfica'
                      : !resultText.trim()
                        ? 'Falta resultado técnico'
                        : !decisionText.trim()
                          ? 'Falta decisión del inspector'
                          : 'Listo para completar'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={busy}
                  className="qx-btn-ghost"
                >
                  Guardar borrador
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={busy}
                  className="qx-btn-primary"
                >
                  {busy ? 'Procesando…' : 'Completar inspección'}
                </button>
              </div>
            </div>
          </div>
        )}

        {detail.status === InspectionStatus.COMPLETADA && nextStageForDetail && (
          <div className="order-8 rounded-2xl border border-[#4A5D23]/25 bg-[#4A5D23]/[0.06] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4A5D23]">
                  Continuidad del lote
                </p>
                <p className="mt-1 text-[13px] text-[#34421a]">
                  La siguiente inspección heredará el contexto del lote y preservará este historial.
                </p>
              </div>
              <button
                type="button"
                onClick={handleContinueNextPoint}
                disabled={busy || !canInspect}
                className="qx-btn-brand w-full sm:w-auto"
              >
                CONTINUAR A {nextStageForDetail.name.toUpperCase()}
              </button>
            </div>
          </div>
        )}

        {/* CTA fija móvil — Continuar / completar siempre visible */}
          {isOpen && canInspect && (
          <div className="qx-sticky-cta order-9">
            <p className="hidden sm:block text-[12px] text-[#888]">
              LOTE {lot?.folio || lotCode(detail.lot_id)}
            </p>
            <button
              type="button"
              onClick={handleComplete}
              disabled={busy}
              className="qx-btn-primary w-full sm:w-auto"
            >
              {busy ? 'Procesando…' : 'Completar inspección'}
            </button>
          </div>
        )}

        {/* Acceso a configuración del punto (no es acción operacional) */}
        {canManage && (
          <section className="qx-card order-10 p-4 sm:p-6">
            <p className="qx-eyebrow">Configuración</p>
            <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
              Criterios y puntos de inspección
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#888]">
              Los puntos y criterios se administran fuera de la operación, en Configuración.
              Si este punto no tiene criterios o necesita ajustar límites, hazlo allí.
            </p>
            <div className="mt-3">
              <Link href="/dashboard/inspection-points" className="qx-btn-brand">
                Abrir Puntos de inspección
              </Link>
            </div>
          </section>
        )}

        {helpDef && (
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="criterion-help-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpenHelpId(null);
            }}
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#1a1a1a]/10 bg-white p-5 shadow-xl sm:rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 id="criterion-help-title" className="text-[15px] font-semibold text-[#1a1a1a]">
                  {helpDef.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenHelpId(null)}
                  aria-label="Cerrar ayuda"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a]/10 text-[#666]"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 space-y-4 text-[13px]">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-[#555]">
                    Respuesta:{' '}
                    {activeStructuredSpec(helpDef)
                      ? activeStructuredSpec(helpDef)?.kind === 'firmeza'
                        ? ' cualitativa (firmeza)'
                        : activeStructuredSpec(helpDef)?.kind === 'plagas'
                          ? ' estructurada (No/Sí)'
                          : ' respuesta estructurada'
                      : ` ${helpDef.value_type}`}
                  </span>
                  {helpDef.unit?.trim() && !activeStructuredSpec(helpDef) ? (
                    <span className="rounded-full bg-[#4A5D23]/10 px-2 py-0.5 text-[11px] font-semibold text-[#3a4d1b]">
                      Unidad: {helpDef.unit.trim()}
                    </span>
                  ) : isNumericInputType(helpDef.value_type) && !activeStructuredSpec(helpDef) ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Unidad: pendiente de configuración
                    </span>
                  ) : null}
                  {criterionScaleText(helpDef) ? (
                    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-[#555]">
                      Escala: {criterionScaleText(helpDef)}
                    </span>
                  ) : activeStructuredSpec(helpDef) ? (
                    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-[#555]">
                      Escala: {activeStructuredSpec(helpDef)?.options.join(' · ')}
                    </span>
                  ) : null}
                  {helpDef.min_value != null || helpDef.max_value != null ? (
                    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-[#555]">
                      Rango config.: {helpDef.min_value ?? '—'} … {helpDef.max_value ?? '—'}
                      {helpDef.unit?.trim() ? ` ${helpDef.unit.trim()}` : ''}
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold text-[#4A5D23]">Qué mide</p>
                  <p className="mt-0.5 text-[#555]">
                    {helpDef.description?.trim() || 'Información técnica pendiente de configuración'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#4A5D23]">Qué observar</p>
                  <p className="mt-0.5 text-[#555]">
                    {helpDef.observation_instructions?.trim() ||
                      helpDef.info_text?.trim() ||
                      'Información técnica pendiente de configuración'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#4A5D23]">Cómo registrar</p>
                  <p className="mt-0.5 text-[#555]">
                    {helpDef.method_text?.trim() ||
                      (isNumericInputType(helpDef.value_type) && helpDef.unit?.trim()
                        ? `Ingresar valor numérico en ${helpDef.unit.trim()}.`
                        : 'Información técnica pendiente de configuración')}
                    {helpDef.instrument_text?.trim() ? ` · ${helpDef.instrument_text}` : ''}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#4A5D23]">Referencia técnica</p>
                  {normativeReferencesByDef[helpDef.id]?.length ? (
                    <ul className="mt-1 space-y-1 text-[12px] text-[#555]">
                      {normativeReferencesByDef[helpDef.id].map((reference) => (
                        <li key={reference.id}>
                          {reference.source_name} · {reference.document_name || '—'} ·{' '}
                          {reference.version || '—'} · {reference.market || '—'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-0.5 text-[#555]">—</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal etiqueta de lote */}
        {labelLot && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:static print:bg-white print:p-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="label-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLabelLotId(null);
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-[#1a1a1a]/10 bg-white shadow-2xl sm:rounded-2xl print:max-w-none print:shadow-none print:border-0">
              <div className="flex items-start justify-between gap-3 border-b border-[#1a1a1a]/[0.06] px-4 py-3 print:hidden">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8fa868]">
                    Imprimir etiqueta
                  </p>
                  <h3 id="label-title" className="mt-0.5 text-[15px] font-semibold text-[#1a1a1a]">
                    LOTE {labelLot.folio || labelLot.harvest_block}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLabelLotId(null)}
                  aria-label="Cerrar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a]/10 text-[16px] text-[#666] transition-colors hover:bg-black/[0.04]"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto px-4 py-5 print:overflow-visible print:p-0">
                <div
                  id="lot-label"
                  className="mx-auto w-full max-w-[280px] border-2 border-[#1a1a1a] p-5 text-center print:border-black"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]">
                    QUALITYNX
                  </p>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#666]">
                    LOTE
                  </p>
                  <p className="mt-1 break-all text-[20px] font-bold leading-tight tracking-[-0.02em] text-[#1a1a1a]">
                    {labelLot.folio || labelLot.harvest_block}
                  </p>
                  <p className="mt-3 text-[13px] font-semibold uppercase text-[#1a1a1a]">
                    {speciesName(labelLot.species_id)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#444]">
                    {varietyName(labelLot.variety_id)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#666]">
                    Fruta: {labelLot.fruit_date}
                  </p>
                  <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center border border-dashed border-[#1a1a1a]/40 bg-black/[0.03] text-[11px] leading-tight text-[#888]">
                    QR
                    <br />
                    pendiente
                  </div>
                  <p className="mt-2 break-all text-[11px] text-[#6b7065]">{labelLot.id}</p>
                </div>
                <p className="mt-3 text-center text-[11px] leading-snug text-[#888] print:hidden">
                  Etiqueta para identificación física. QR/código de barras: pendiente de
                  integración (no sensible).
                </p>
              </div>

              <div className="flex gap-3 border-t border-[#1a1a1a]/[0.06] px-4 py-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setLabelLotId(null)}
                  className="min-h-11 flex-1 rounded-full border border-[#1a1a1a]/10 px-4 py-2.5 text-[13px] font-medium text-[#666] transition-colors hover:border-[#1a1a1a]/20"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handlePrintLabel}
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

  const openCount = inspections.filter((i) => i.status === InspectionStatus.EN_CURSO).length;
  const doneCount = inspections.length - openCount;

  const lotFicha = (lot: Lot) => {
    const last = lastInspByLot.get(lot.id) ?? null;
    const cls = latestClassByLot.get(lot.id) ?? null;
    const openForLot = inspections.some(
      (i) => i.lot_id === lot.id && i.status === InspectionStatus.EN_CURSO
    );
    const closed = lot.status === LotStatus.CERRADO;
    return (
      <li
        key={lot.id}
        className="qx-ops-row p-4 sm:p-5"
        data-testid={`lot-ficha-${lot.id}`}
        data-attention={cls?.semaphore === QualitySemaphore.ROJO ? 'true' : 'false'}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="qx-label">FOLIO / LOTE</p>
            <p className="qx-ops-id mt-0.5">{lot.folio || lot.harvest_block || `Lote ${lot.id.slice(0, 8)}`}</p>
            <p className="mt-1 text-[13px] text-[#5c6355]">
              {speciesName(lot.species_id)}
              <span className="text-[#b0b5a8]"> · </span>
              {varietyName(lot.variety_id)}
              <span className="text-[#b0b5a8]"> · </span>
              {producerName(lot.producer_id)}
            </p>
            <p className="mt-0.5 text-[12px] text-[#9aa090]">
              Bloque {lot.harvest_block}
              {lot.producer_guide_number ? ` · Guía ${lot.producer_guide_number}` : ''}
              {lot.folio_interno ? ` · Interno ${lot.folio_interno}` : ''}
              {lot.fruit_date ? ` · Fruta ${lot.fruit_date}` : ''}
            </p>
            <p className="mt-0.5 text-[12px] text-[#5c6355]">
              {LOT_TYPE_LABELS[lot.lot_type ?? LotType.ORIGEN]}
              {lot.kg_declarados != null ? ` · ${lot.kg_declarados} kg declarados` : ''}
            </p>
            <p className="mt-0.5 text-[12px] text-[#5c6355]">
              {last ? (
                <>
                  Última inspección: {pointName(last.inspection_point_id)} ·{' '}
                  {new Date(last.inspected_at).toLocaleString('es-CL')} · {last.status}
                  {last.decision ? ` · Decisión: ${last.decision}` : ''}
                </>
              ) : (
                'Sin inspecciones registradas'
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="qx-chip border border-[#1a1a1a]/15 bg-[#f3f4f1] text-[#444]">
              {lot.status}
            </span>
            {cls ? (
              <div
                className="flex flex-wrap items-center justify-end gap-1.5"
                data-testid={`lot-classification-${lot.id}`}
              >
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#444]"
                  title={`Semáforo operacional QualityNX (no SAG): ${cls.semaphore}`}
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${semaphoreDotClass(cls.semaphore)}`}
                    aria-hidden
                  />
                  <span>{cls.semaphore}</span>
                </span>
                <span className="qx-chip border border-[#1a1a1a]/15 bg-[#f3f4f1] text-[#444]">
                  {cls.commercial_class}
                </span>
              </div>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] text-[#6b7065]"
                title="Sin clasificación registrada"
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#1a1a1a]/25 bg-[#e5e7eb]"
                  aria-hidden
                />
                Sin clasificación
              </span>
            )}
            {openForLot && (
              <span className="text-[11px] font-semibold text-[#b45309]">
                Inspección en curso
              </span>
            )}
          </div>
        </div>
        <div className="mt-3">
          <p className="qx-field-label">Puntos disponibles · abrir nueva inspección</p>
          <div className="mt-1.5 flex flex-wrap gap-2" data-testid={`lot-points-${lot.id}`}>
            {points
              .filter((p) => p.is_active && (!lot.species_id || p.species_id === lot.species_id))
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="qx-btn-ghost !min-h-9 !rounded-full !px-3 !py-1.5 !text-[12px]"
                  onClick={() => startNewInspection(lot.id, p.id)}
                  disabled={busy || closed}
                  data-testid={`lot-point-${lot.id}-${p.id}`}
                >
                  {p.name}
                </button>
              ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/dashboard/lots/${lot.id}/report`}
            className="qx-btn-ghost"
            data-testid={`lot-history-${lot.id}`}
          >
            Ver historial
          </Link>
          {canInspect && !closed && (
            <button
              type="button"
              className="qx-btn-brand-solid"
              onClick={() => startNewInspection(lot.id)}
              data-testid={`lot-new-inspection-${lot.id}`}
              disabled={busy}
            >
              Nueva inspección
            </button>
          )}
        </div>
        {closed && (
          <p className="mt-2 text-right text-[12px] text-[#888]">
            Lote CERRADO: consulta el historial; no admite nuevas inspecciones.
          </p>
        )}
      </li>
    );
  };

  return (
      <div className="space-y-6 sm:space-y-7">
        {/* Cabecera de operación */}
        <header className="qx-opheader">
          <div className="min-w-0 flex-1">
            <p className="qx-eyebrow">Operación</p>
            <h1 className="qx-h1">Inspecciones</h1>
            <p className="qx-sub max-w-2xl">
              Busca el lote por folio QualityNX (o productor, bloque, especie, variedad, guía,
              fecha, punto o estado), revisa su última inspección y abre una nueva en el mismo
              lote. Cada punto genera un inspection_id nuevo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="qx-metric" style={openCount > 0 ? { borderColor: 'rgba(74,93,35,0.35)', background: '#eef1e6' } : undefined}>
              <strong>{openCount}</strong>
              <span>En curso</span>
            </div>
            <div className="qx-metric">
              <strong>{doneCount}</strong>
              <span>Completadas</span>
            </div>
            <div className="qx-metric">
              <strong>{inspections.length}</strong>
              <span>Total</span>
            </div>
            {canInspect && (
              <button
                type="button"
                className="qx-btn-brand-solid"
                onClick={() => {
                  setShowCreate((v) => !v);
                  if (!showCreate) {
                    window.setTimeout(() => {
                      document.getElementById('new-inspection-form')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }, 0);
                  }
                }}
              >
                {showCreate ? 'Ocultar formulario' : 'Nueva inspección'}
              </button>
            )}
          </div>
        </header>

        {message && (
          <div
            role="status"
            className={`qx-banner order-1 ${message.type === 'ok' ? 'qx-banner-ok' : 'qx-banner-error'}`}
          >
            {message.text}
          </div>
        )}

        {/* FLUJO PRINCIPAL — BUSCAR LOTE */}
        <section aria-labelledby="insp-lot-search-title" data-testid="lot-search-section">
          <div className="qx-section-title">
            <h2 id="insp-lot-search-title">Buscar lote</h2>
            <span className="qx-count">
              {loading
                ? ''
                : lotQuery.trim()
                  ? `${lotSearchResults.length} coinciden`
                  : 'Folio QualityNX u otros criterios'}
            </span>
          </div>
          <div className="mt-3">
            <label className="block">
              <span className="qx-field-label">
                Folio QualityNX, folio interno, productor, bloque, guía, especie, variedad,
                fecha, punto o estado
              </span>
              <input
                type="search"
                value={lotQuery}
                onChange={(e) => setLotQuery(e.target.value)}
                className="qx-input"
                placeholder="Ej: 2026-000032, PL-45872, productor, guía…"
                aria-label="Buscar lote"
                data-testid="lot-search-input"
                autoComplete="off"
              />
            </label>

            {loading ? (
              <div className="qx-card mt-3 flex justify-center py-10">
                <div className="h-7 w-7 rounded-full border-2 border-[#4A5D23]/20 border-t-[#4A5D23] animate-spin" />
              </div>
            ) : !lotQuery.trim() ? (
              <div className="qx-card mt-3">
                <div className="qx-empty">
                  <h3>Busca el lote a inspeccionar</h3>
                  <p>
                    Escribe el folio QualityNX (principal) u otro criterio. Al seleccionar
                    Nueva inspección eliges el punto y se crea un inspection_id nuevo en el
                    mismo lote; el historial anterior se conserva.
                  </p>
                </div>
              </div>
            ) : lotSearchResults.length === 0 ? (
              <div className="qx-card mt-3">
                <div className="qx-empty">
                  <h3>Sin lotes que coincidan</h3>
                  <p>Ajusta el folio o el criterio de búsqueda.</p>
                </div>
              </div>
            ) : (
              <ul className="mt-3 space-y-3" data-testid="lot-search-results">
                {lotSearchResults.map(lotFicha)}
              </ul>
            )}
          </div>
        </section>

        {canInspect && (showCreate || preselectedLot) && (
          <form
            id="new-inspection-form"
            onSubmit={handleCreate}
            className="qx-card p-4 sm:p-6 scroll-mt-24"
            data-testid="new-inspection-form"
          >
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
            Nueva inspección · elegir punto
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[#6b7065]">
            Selecciona el punto de inspección sobre el lote elegido. Se crea un{' '}
            <strong>inspection_id nuevo</strong> en el mismo lote (no se edita ni reutiliza el
            anterior). COMPLETADA no cierra el lote.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Lote *
              </label>
              <select
                value={newLotId}
                onChange={(e) => {
                  setNewLotId(e.target.value);
                  setNewPointId('');
                }}
                required
                className={inputClass}
                data-testid="new-lot-select"
              >
<option value="">Buscar un lote arriba o seleccionar…</option>
                {selectableLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    FOLIO {l.folio || '—'} · Referencia {l.harvest_block} · {l.fruit_date} · {l.status}
                    {l.current_operational_stage_id
                      ? ` · ${stageName(l.current_operational_stage_id)}`
                      : ' · sin etapa'}
                  </option>
                ))}
              </select>
              {selectedLot && (
                <div className="mt-3 rounded-xl border border-[#1a1a1a]/[0.08] bg-black/[0.02] px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
                    FOLIO / LOTE seleccionado
                  </p>
                  <p className="mt-0.5 text-[16px] font-semibold text-[#1a1a1a] break-all">
                    {selectedLot.folio || selectedLot.harvest_block}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8fa868]">
                    Bloque {selectedLot.harvest_block}
                    {lotPhysical(selectedLot.id) ? ` · ${lotPhysical(selectedLot.id)}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#666]">
                    <span>Especie: {speciesName(selectedLot.species_id)}</span>
                    <span>Variedad: {varietyName(selectedLot.variety_id)}</span>
                    <span>Productor: {producerName(selectedLot.producer_id)}</span>
                    <span>Fruta: {selectedLot.fruit_date}</span>
                  </div>
                  {(() => {
                    const last = lastInspByLot.get(selectedLot.id);
                    if (!last) {
                      return (
                        <p className="mt-1.5 text-[11px] leading-snug text-[#888]">
                          Sin inspecciones previas: esta será la primera. Identifique el lote
                          físicamente con este folio antes de muestrear.
                        </p>
                      );
                    }
                    const prevCls = latestClassByLot.get(selectedLot.id);
                    return (
                      <div className="mt-2 rounded-lg border border-[#4A5D23]/20 bg-[#4A5D23]/[0.06] px-2.5 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3a4d1b]">
                          Contexto antes de nueva inspección
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#444]">
                          Última: {pointName(last.inspection_point_id)} ·{' '}
                          {new Date(last.inspected_at).toLocaleString('es-CL')} · {last.status}
                          {last.decision ? ` · Decisión: ${last.decision}` : ''}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#666]">
                          {prevCls
                            ? `Clase: ${prevCls.commercial_class} · Semáforo: ${prevCls.semaphore}`
                            : 'Sin clasificación vigente'}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#888]">
                          El historial previo no se modifica. Identifique el lote físicamente con
                          este folio antes de muestrear.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
              {selectedLot && !selectedLot.current_operational_stage_id && (
                <p className="mt-1.5 text-[12px] text-[#888]">
                  Sin etapa aún: se registrará automáticamente al elegir el punto y abrir la
                  inspección.
                </p>
              )}
              {selectedLot && selectedLot.current_operational_stage_id && (
                <p className="mt-1.5 text-[12px] text-[#888]">
                  Etapa actual del lote: {stageName(selectedLot.current_operational_stage_id)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                Punto de inspección *
              </label>
              <select
                value={newPointId}
                onChange={(e) => setNewPointId(e.target.value)}
                required
                disabled={!selectedLot || availablePoints.length === 0}
                className={inputClass}
                data-testid="new-point-select"
              >
                <option value="">
                  {!selectedLot
                    ? 'Seleccionar lote primero…'
                    : availablePoints.length === 0
                      ? 'Sin puntos para la especie del lote'
                      : 'Seleccionar punto…'}
                </option>
                {availablePoints.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {stages.find((s) => s.id === p.operational_stage_id)
                      ? ` · ${stages.find((s) => s.id === p.operational_stage_id)!.name}`
                      : ''}
                  </option>
                ))}
              </select>
              {selectedPoint && (
                <div className="mt-3 rounded-xl border border-[#4A5D23]/20 bg-[#4A5D23]/[0.06] px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3a4d1b]">
                    Etapa (derivada del punto)
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[#1a1a1a]">
                    {stageName(derivedStageId)}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-[#666]">
                    {selectedLot && !selectedLot.current_operational_stage_id
                      ? 'Se registrará INGRESO al abrir la inspección.'
                      : selectedLot &&
                          derivedStageId &&
                          selectedLot.current_operational_stage_id !== derivedStageId
                        ? 'Se registrará TRANSICION al abrir la inspección.'
                        : 'El lote ya está en esta etapa: no se duplica el evento.'}
                  </p>
                </div>
              )}
              {selectedLot && availablePoints.length === 0 && (
                <p className="mt-1.5 text-[12px] text-[#73786a]">
                  No hay puntos activos para la especie de este lote.
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            {showCreate && (
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewPointId('');
                }}
                className="qx-btn-ghost"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={
                busy ||
                selectableLots.length === 0 ||
                !selectedLot ||
                !newPointId ||
                availablePoints.length === 0
              }
              className="min-h-11 w-full rounded-full bg-[#1a1a1a] px-6 py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40 sm:w-auto"
              data-testid="create-inspection-submit"
            >
              {busy ? 'Abriendo…' : 'Abrir inspección (nuevo inspection_id)'}
            </button>
          </div>
          {(selectableLots.length === 0 || availablePoints.length === 0) && (
            <p className="mt-3 text-right text-[12px] text-[#73786a]">
              {selectableLots.length === 0
                ? 'Crea un lote (no cerrado) para inspeccionar. '
                : ''}
              {availablePoints.length === 0
                ? 'Sin puntos compatibles con la especie del lote.'
                : ''}
            </p>
          )}
        </form>
      )}

        <section aria-labelledby="insp-open-title">
          <div className="qx-section-title">
            <h2 id="insp-open-title">Inspecciones en curso</h2>
            <span className="qx-count">
              {loading
                ? ''
                : hasListFilters
                  ? `${openInspections.length} coinciden · ${inspections.filter((i) => i.status === InspectionStatus.EN_CURSO).length} en curso`
                  : `${openInspections.length} en curso`}
            </span>
            <button
              type="button"
              onClick={() => {
                setContOpen(true);
                setContResults([]);
                setContMessage(null);
                setContinueHit(null);
                setContinuePointId('');
              }}
              className="qx-btn-ghost"
              data-testid="open-continuity-search"
            >
              Continuar inspección
            </button>
          </div>
          <div className="mt-3">
            <div
              className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
              data-testid="inspections-filters"
            >
              <label className="text-[11px] font-medium text-[#73786a]">
                Folio
                <input
                  id="insp-search"
                  type="search"
                  value={listFilters.folio}
                  onChange={(e) => setListFilters((f) => ({ ...f, folio: e.target.value }))}
                  className="qx-input !mt-1"
                  aria-label="Buscar por folio"
                  data-testid="inspections-search"
                />
              </label>
              <label className="text-[11px] font-medium text-[#73786a]">
                Productor
                <input
                  type="search"
                  list="insp-producer-options"
                  value={
                    producersList.find((p) => p.id === listFilters.producerId)?.name ?? ''
                  }
                  onChange={(e) => {
                    const name = e.target.value.trim().toLowerCase();
                    if (!name) {
                      setListFilters((f) => ({ ...f, producerId: '' }));
                      return;
                    }
                    const match = producersList.find(
                      (p) => p.name.trim().toLowerCase() === name
                    );
                    setListFilters((f) => ({ ...f, producerId: match?.id ?? '' }));
                  }}
                  className="qx-input !mt-1"
                  aria-label="Filtrar por productor"
                  placeholder="Escribe o selecciona…"
                  autoComplete="off"
                />
                <datalist id="insp-producer-options">
                  {producersList.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </label>
              <label className="text-[11px] font-medium text-[#73786a]">
                Guía
                <input
                  type="search"
                  value={listFilters.guide}
                  onChange={(e) => setListFilters((f) => ({ ...f, guide: e.target.value }))}
                  className="qx-input !mt-1"
                  aria-label="Buscar por guía"
                />
              </label>
              <label className="text-[11px] font-medium text-[#73786a]">
                Fecha
                <input
                  type="date"
                  value={listFilters.date}
                  onChange={(e) => setListFilters((f) => ({ ...f, date: e.target.value }))}
                  className="qx-input !mt-1"
                  aria-label="Buscar por fecha"
                />
              </label>
              <label className="text-[11px] font-medium text-[#73786a]">
                Estado
                <select
                  value={listFilters.status}
                  onChange={(e) => setListFilters((f) => ({ ...f, status: e.target.value }))}
                  className="qx-input !mt-1"
                  aria-label="Filtrar por estado"
                >
                  <option value="">Todos</option>
                  <option value={InspectionStatus.EN_CURSO}>En curso</option>
                  <option value={InspectionStatus.COMPLETADA}>Completada</option>
                </select>
              </label>
            </div>
            {hasListFilters && (
              <button
                type="button"
                onClick={() => setListFilters({ folio: '', producerId: '', guide: '', date: '', status: '' })}
                className="mb-3 text-[12px] font-medium text-[#4A5D23] underline"
              >
                Limpiar filtros
              </button>
            )}
            {loading ? (
              <div className="qx-card flex justify-center py-12">
                <div className="h-7 w-7 rounded-full border-2 border-[#4A5D23]/20 border-t-[#4A5D23] animate-spin" />
              </div>
            ) : openInspections.length === 0 ? (
              <div className="qx-card">
                <div className="qx-empty">
                  <h3>
                    {hasListFilters
                      ? 'Sin coincidencias'
                      : 'No hay inspecciones en curso.'}
                  </h3>
                  <p>
                    {hasListFilters
                      ? 'Ajusta los filtros para ver otras inspecciones.'
                      : 'Busca un lote y abre una nueva inspección.'}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">{openInspections.map((i) => inspectionCard(i, true))}</ul>
            )}
          </div>
        </section>

        <section aria-labelledby="insp-recent-title">
          <div className="qx-section-title">
            <h2 id="insp-recent-title">Inspecciones recientes</h2>
            <span className="qx-count">
              {loading ? '' : `${recentInspections.length} recientes`}
            </span>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="qx-card flex justify-center py-12">
                <div className="h-7 w-7 rounded-full border-2 border-[#4A5D23]/20 border-t-[#4A5D23] animate-spin" />
              </div>
            ) : inspections.length === 0 ? (
              <div className="qx-card">
                <div className="qx-empty">
                  <h3>Aún no hay inspecciones.</h3>
                  <p>
                    La inspección registra mediciones, evidencia y resultado sobre un lote.
                    Busca el lote arriba para abrir la primera.
                  </p>
                </div>
              </div>
            ) : recentInspections.length === 0 ? (
              <div className="qx-card">
                <div className="qx-empty">
                  <h3>
                    {hasListFilters
                      ? 'Sin coincidencias'
                      : 'Solo hay inspecciones en curso.'}
                  </h3>
                  <p>
                    {hasListFilters
                      ? 'Ajusta los filtros para ver otras inspecciones.'
                      : 'Al completar una inspección quedará listada aquí.'}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">{recentInspections.map((i) => inspectionCard(i, false))}</ul>
            )}
          </div>
        </section>

      {!canInspect && (
        <p className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Su rol permite consultar las inspecciones.{' '}
          <Link href="/dashboard" className="font-medium underline">
            Volver al inicio
          </Link>
          .
        </p>
      )}

      {/* Modal — CONTINUAR INSPECCIÓN (buscar control anterior sin IDs) */}
      {contOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cont-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1a1a1a]/10 bg-white p-5 shadow-xl"
            data-testid="continuity-modal"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="qx-eyebrow">CONTINUIDAD</p>
                <h3 id="cont-title" className="qx-h2 !mt-1">
                  Continuar inspección
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[#666]">
                  Busca un control anterior por contexto operacional (productor, campo, especie,
                  variedad, etapa, lote o fechas). No necesitas el ID de la inspección. La
                  anterior no se modifica; se crea una NUEVA inspección relacionada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContOpen(false)}
                className="qx-btn-ghost shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {contMessage && (
              <div
                role="status"
                className={`mt-3 qx-banner ${
                  contMessage.type === 'ok' ? 'qx-banner-ok' : 'qx-banner-error'
                }`}
              >
                {contMessage.text}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="qx-field-label" htmlFor="cont-producer">
                  Productor
                </label>
                <select
                  id="cont-producer"
                  value={contFilters.producer_id}
                  onChange={(e) =>
                    setContFilters((f) => ({ ...f, producer_id: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Cualquiera</option>
                  {producersList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="qx-field-label" htmlFor="cont-field">
                  Campo
                </label>
                <select
                  id="cont-field"
                  value={contFilters.field_id}
                  onChange={(e) => setContFilters((f) => ({ ...f, field_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Cualquiera</option>
                  {fieldsList
                    .filter(
                      (f) =>
                        !contFilters.producer_id ||
                        !f.producer_id ||
                        f.producer_id === contFilters.producer_id
                    )
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="qx-field-label" htmlFor="cont-species">
                  Especie
                </label>
                <select
                  id="cont-species"
                  value={contFilters.species_id}
                  onChange={(e) => setContFilters((f) => ({ ...f, species_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Cualquiera</option>
                  {speciesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="qx-field-label" htmlFor="cont-variety">
                  Variedad
                </label>
                <select
                  id="cont-variety"
                  value={contFilters.variety_id}
                  onChange={(e) => setContFilters((f) => ({ ...f, variety_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Cualquiera</option>
                  {varietiesList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="qx-field-label" htmlFor="cont-stage">
                  Etapa (del control anterior)
                </label>
                <select
                  id="cont-stage"
                  value={contFilters.operational_stage_id}
                  onChange={(e) =>
                    setContFilters((f) => ({ ...f, operational_stage_id: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Cualquiera</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="qx-field-label" htmlFor="cont-lot">
                  Lote / folio
                </label>
                <select
                  id="cont-lot"
                  value={contFilters.lot_id}
                  onChange={(e) => setContFilters((f) => ({ ...f, lot_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Cualquiera</option>
                {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.folio ? `${l.folio} · ${l.harvest_block}` : l.harvest_block}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="qx-field-label" htmlFor="cont-from">
                  Desde
                </label>
                <input
                  id="cont-from"
                  type="date"
                  value={contFilters.date_from}
                  onChange={(e) => setContFilters((f) => ({ ...f, date_from: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="qx-field-label" htmlFor="cont-to">
                  Hasta
                </label>
                <input
                  id="cont-to"
                  type="date"
                  value={contFilters.date_to}
                  onChange={(e) => setContFilters((f) => ({ ...f, date_to: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleContinuitySearch}
                disabled={contBusy}
                className="qx-btn-brand-solid"
                data-testid="continuity-search"
              >
                {contBusy ? 'Buscando…' : 'Buscar controles anteriores'}
              </button>
            </div>

            {contResults.length > 0 && (
              <ul className="mt-4 space-y-2" data-testid="continuity-results">
                {contResults.map((hit) => (
                  <li
                    key={hit.inspection.id}
                    className="rounded-xl border border-[#1a1a1a]/[0.08] p-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1a1a1a]">
                          {hit.lot.harvest_block} · {hit.point.name}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#666]">
                          {hit.stage_name ?? 'Sin etapa'} ·{' '}
                          {new Date(hit.inspection.inspected_at).toLocaleString('es-CL')} ·{' '}
                          {inspectorLabel(hit.inspection.inspector_id)} ·{' '}
                          {hit.inspection.status}
                        </p>
                        {hit.inspection.recommendation && (
                          <p className="mt-1 text-[12px] text-[#3a4d1b]">
                            Recomendación:{' '}
                            <strong>{hit.inspection.recommendation}</strong>
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setContinueHit(hit);
                          setContinuePointId('');
                        }}
                        className="qx-btn-ghost shrink-0"
                      >
                        Continuar desde aquí
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {continueHit && (
              <div
                className="mt-4 rounded-xl border border-[#4A5D23]/30 bg-[#4A5D23]/[0.05] p-4"
                data-testid="continuity-confirm"
              >
                <p className="text-[13px] font-semibold text-[#3a4d1b]">
                  Nueva inspección de continuación
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#5c6b45]">
                  Lote {continueHit.lot.harvest_block} · anterior:{' '}
                  {continueHit.point.name} ({continueHit.stage_name ?? 'sin etapa'}) ·{' '}
                  {new Date(continueHit.inspection.inspected_at).toLocaleString('es-CL')}. Se
                  creará una inspección NUEVA con etapa distinta; la anterior queda inmutable.
                </p>
                <label className="mt-3 block qx-field-label" htmlFor="continue-point">
                  Punto de inspección de la nueva etapa
                </label>
                <select
                  id="continue-point"
                  value={continuePointId}
                  onChange={(e) => setContinuePointId(e.target.value)}
                  className={inputClass}
                  data-testid="continue-point-select"
                >
                  <option value="">Seleccionar punto…</option>
                  {points
                    .filter((p) => p.is_active && p.operational_stage_id)
                    .map((p) => {
                      const same = Boolean(
                        p.operational_stage_id &&
                          p.operational_stage_id === continueHit.point.operational_stage_id
                      );
                      return (
                        <option key={p.id} value={p.id} disabled={same}>
                          {p.name}
                          {same ? ' (misma etapa — no aplica)' : ''}
                        </option>
                      );
                    })}
                </select>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleContinueFrom}
                    disabled={contBusy || !continuePointId}
                    className="qx-btn-brand-solid"
                    data-testid="continue-create"
                  >
                    {contBusy ? 'Creando…' : 'Abrir inspección de continuación'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContinueHit(null)}
                    className="qx-btn-ghost"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
