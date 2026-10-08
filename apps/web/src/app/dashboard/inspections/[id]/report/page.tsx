'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCompanyById,
  getInspection,
  getUserById,
  getEvidenceSignedUrl,
  listDecisionsByLot,
  listInspectionEvidence,
  listInspectionPoints,
  listInspections,
  listLots,
  listMasterData,
  listMeasurementDefs,
  listMeasurements,
  listOperationalStages,
  listPackagingTypes,
  listQualityEvaluationsByInspection,
  listQualityClassificationsByInspection,
  listSamples,
  listSamplingPlans,
} from '@qualitynx/database';
import {
  LotType,
  LOT_TYPE_LABELS,
  type Company,
  type DecisionRecord,
  type Inspection,
  type InspectionEvidence,
  type InspectionPoint,
  type Lot,
  type Measurement,
  type MeasurementDef,
  type OperationalStage,
  type PackagingType,
  type Producer,
  type QualityEvaluation,
  type Sample,
  type SamplingPlan,
  type QualityClassification,
  type Season,
  type User,
} from '@qualitynx/shared';

type LoadState = 'loading' | 'ready' | 'error';
type ReportCompany = Partial<Company> & Record<string, unknown>;
type ReportEvidence = InspectionEvidence & {
  sample_id?: string | null;
  url?: string;
};
type ReportDecision = DecisionRecord;
type ReportClassification = QualityClassification | null;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CL');
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CL');
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
};

const readText = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return '—';
};

const readCompanyText = (company: ReportCompany | null, keys: string[]) => {
  if (!company) return '—';
  for (const key of keys) {
    const value = readText(company[key]);
    if (value !== '—') return value;
  }
  return '—';
};

const readRecordText = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = readText(record[key]);
    if (value !== '—') return value;
  }
  return '—';
};

const formatLimit = (evaluation: QualityEvaluation) => {
  const min = evaluation.limit_min;
  const max = evaluation.limit_max;
  if (min != null && max != null) return `${min} – ${max}`;
  if (min != null) return `≥ ${min}`;
  if (max != null) return `≤ ${max}`;
  return '—';
};

const snapshotName = (evaluation: QualityEvaluation, defs: MeasurementDef[]) => {
  const snapshot = asRecord(evaluation.criterion_snapshot);
  return readRecordText(snapshot, ['name', 'display_name', 'label']) !== '—'
    ? readRecordText(snapshot, ['name', 'display_name', 'label'])
    : defs.find((def) => def.id === evaluation.measurement_def_id)?.name ?? '—';
};

const sampleLabel = (sample: Sample, index: number) =>
  `M${String(sample.sample_number ?? index + 1).padStart(2, '0')}`;

const lotOptionalText = (lot: Lot | null, keys: string[]) => {
  if (!lot) return '—';
  return readRecordText(lot as unknown as Record<string, unknown>, keys);
};

export default function InspectionReportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [insp, setInsp] = useState<Inspection | null>(null);
  const [company, setCompany] = useState<ReportCompany | null>(null);
  const [inspector, setInspector] = useState<User | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [point, setPoint] = useState<InspectionPoint | null>(null);
  const [points, setPoints] = useState<InspectionPoint[]>([]);
  const [stage, setStage] = useState<OperationalStage | null>(null);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [fieldName, setFieldName] = useState('—');
  const [blockName, setBlockName] = useState('—');
  const [speciesName, setSpeciesName] = useState('—');
  const [varietyName, setVarietyName] = useState('—');
  const [season, setSeason] = useState<Season | null>(null);
  const [packaging, setPackaging] = useState<PackagingType | null>(null);
  const [samplingPlan, setSamplingPlan] = useState<SamplingPlan | null>(null);
  const [defs, setDefs] = useState<MeasurementDef[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [evidence, setEvidence] = useState<ReportEvidence[]>([]);
  const [qualityEvaluations, setQualityEvaluations] = useState<QualityEvaluation[]>([]);
  const [classification, setClassification] = useState<ReportClassification>(null);
  const [decisions, setDecisions] = useState<ReportDecision[]>([]);
  const [previous, setPrevious] = useState<Inspection | null>(null);
  const [next, setNext] = useState<Inspection | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setState('loading');
    setErrorMsg('');

    try {
      const { data: inspectionData, error: inspectionError } = await getInspection(id);
      if (inspectionError || !inspectionData) {
        setErrorMsg('No pudimos cargar la inspección.');
        setState('error');
        return;
      }

      const inspection = inspectionData as Inspection;
      const [
        companyRes,
        inspectorRes,
        lotsRes,
        pointsRes,
        defsRes,
        samplesRes,
        measurementsRes,
        evidenceRes,
        stagesRes,
        producersRes,
        fieldsRes,
        blocksRes,
        speciesRes,
        varietiesRes,
        seasonsRes,
        packagingRes,
        plansRes,
        qualityRes,
        inspectionsRes,
        decisionsRes,
        previousRes,
        classRes,
      ] = await Promise.all([
        getCompanyById(inspection.company_id),
        getUserById(inspection.inspector_id),
        listLots(),
        listInspectionPoints(),
        listMeasurementDefs(inspection.inspection_point_id),
        listSamples(inspection.id),
        listMeasurements(inspection.id),
        listInspectionEvidence(inspection.id),
        listOperationalStages(),
        listMasterData('producers'),
        listMasterData('fields'),
        listMasterData('blocks'),
        listMasterData('species'),
        listMasterData('varieties'),
        listMasterData('seasons'),
        listPackagingTypes(),
        listSamplingPlans(inspection.inspection_point_id),
        listQualityEvaluationsByInspection(inspection.id),
        listInspections(),
        listDecisionsByLot(inspection.lot_id),
        inspection.previous_inspection_id
          ? getInspection(inspection.previous_inspection_id)
          : Promise.resolve({ data: null, error: null }),
        listQualityClassificationsByInspection(inspection.id),
      ]);

      const foundLot =
        ((lotsRes.data as Lot[]) ?? []).find((item) => item.id === inspection.lot_id) ?? null;
      const allPoints = (pointsRes.data as InspectionPoint[]) ?? [];
      const foundPoint = allPoints.find((item) => item.id === inspection.inspection_point_id) ?? null;
      const allStages = (stagesRes.data as OperationalStage[]) ?? [];
      const foundStage =
        allStages.find((item) => item.id === foundPoint?.operational_stage_id) ??
        allStages.find((item) => item.id === foundLot?.current_operational_stage_id) ??
        null;
      const foundProducer =
        ((producersRes.data as Producer[]) ?? []).find((item) => item.id === foundLot?.producer_id) ??
        null;
      const foundField =
        ((fieldsRes.data as { id: string; name: string }[]) ?? []).find(
          (item) => item.id === foundLot?.field_id
        ) ?? null;
      const foundBlock =
        ((blocksRes.data as { id: string; name: string }[]) ?? []).find(
          (item) => item.id === foundLot?.block_id
        ) ?? null;
      const foundSpecies =
        ((speciesRes.data as { id: string; name: string }[]) ?? []).find(
          (item) => item.id === foundLot?.species_id
        ) ?? null;
      const foundVariety =
        ((varietiesRes.data as { id: string; name: string }[]) ?? []).find(
          (item) => item.id === foundLot?.variety_id
        ) ?? null;
      const foundSeason =
        ((seasonsRes.data as Season[]) ?? []).find((item) => item.id === foundLot?.season_id) ??
        null;
      const foundPackaging =
        ((packagingRes.data as PackagingType[]) ?? []).find(
          (item) => item.id === foundLot?.packaging_type_id
        ) ??
        ((packagingRes.data as PackagingType[]) ?? []).find(
          (item) => item.name === foundLot?.packaging_type
        ) ??
        null;
      const activeSamples = ((samplesRes.data as Sample[]) ?? []).filter(
        (item) => item.is_active !== false
      );
      const foundPlan =
        ((plansRes.data as SamplingPlan[]) ?? []).find(
          (item) => item.id === inspection.sampling_plan_id
        ) ??
        ((plansRes.data as SamplingPlan[]) ?? []).find((item) => item.is_active) ??
        null;
      const sortedDefs = ((defsRes.data as MeasurementDef[]) ?? []).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
      );
      const evidenceRows = (evidenceRes.data as ReportEvidence[]) ?? [];
      const evidenceWithUrls = await Promise.all(
        evidenceRows.map(async (item) => {
          try {
            const { data: signedData } = await getEvidenceSignedUrl(item.storage_path);
            return { ...item, url: signedData?.signedUrl };
          } catch {
            return item;
          }
        })
      );
      const allInspections = (inspectionsRes.data as Inspection[]) ?? [];
      const nextInspection =
        allInspections.find((item) => item.previous_inspection_id === inspection.id) ?? null;
      const previousInspection = previousRes.data
        ? ((previousRes.data as unknown) as Inspection)
        : null;
      const linkedDecisions = ((decisionsRes.data as ReportDecision[]) ?? []).filter(
        (item) => item.inspection_id === inspection.id
      );

      setInsp(inspection);
      setCompany(companyRes.data as ReportCompany | null);
      setInspector(inspectorRes.data as User | null);
      setLot(foundLot);
      setPoint(foundPoint);
      setPoints(allPoints);
      setStage(foundStage);
      setProducer(foundProducer);
      setFieldName(foundField?.name ?? '—');
      setBlockName(foundBlock?.name ?? '—');
      setSpeciesName(foundSpecies?.name ?? '—');
      setVarietyName(foundVariety?.name ?? '—');
      setSeason(foundSeason);
      setPackaging(foundPackaging);
      setSamplingPlan(foundPlan);
      setDefs(sortedDefs);
      setSamples(activeSamples);
      setMeasurements((measurementsRes.data as Measurement[]) ?? []);
      setEvidence(evidenceWithUrls);
      setQualityEvaluations((qualityRes.data as QualityEvaluation[]) ?? []);
      setClassification(
        (((classRes.data as QualityClassification[]) ?? [])[0] as QualityClassification) ?? null
      );
      setDecisions(linkedDecisions);
      setPrevious(previousInspection);
      setNext(nextInspection);
      setState('ready');
    } catch {
      setErrorMsg('No pudimos cargar el informe.');
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handlePrint = useCallback(() => {
    const previousTitle = document.title;
    document.title = `Informe de inspección ${lot?.folio ?? insp?.id ?? ''}`.trim();
    try {
      window.print();
    } finally {
      document.title = previousTitle;
    }
  }, [insp?.id, lot?.folio]);

  useEffect(() => {
    if (state !== 'ready') return;
    const action = new URLSearchParams(window.location.search).get('action');
    if (action !== 'pdf' && action !== 'print') return;
    const timer = window.setTimeout(() => {
      handlePrint();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [handlePrint, state]);

  if (state === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-16">
        <div className="h-4 w-1/3 animate-pulse rounded bg-black/[0.06]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-black/[0.06]" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-black/[0.04]" />
        <p className="text-[13px] text-[#888]">Cargando informe…</p>
      </div>
    );
  }

  if (state === 'error' || !insp) {
    return (
      <div className="mx-auto max-w-3xl pb-16">
        <div className="qx-card p-6">
          <p className="qx-eyebrow">INFORME</p>
          <p className="qx-h1 mt-1">No disponible</p>
          <p className="mt-2 text-[13px] text-[#666]">{errorMsg}</p>
          <Link href="/dashboard/inspections" className="qx-btn-ghost mt-4 inline-block">
            Volver a inspecciones
          </Link>
        </div>
      </div>
    );
  }

  const consolidated = new Map<string, Measurement>();
  const bySample = new Map<string, Map<string, Measurement>>();
  for (const measurement of measurements) {
    if (measurement.sample_id) {
      const sampleMap = bySample.get(measurement.sample_id) ?? new Map<string, Measurement>();
      sampleMap.set(measurement.measurement_def_id, measurement);
      bySample.set(measurement.sample_id, sampleMap);
    } else {
      consolidated.set(measurement.measurement_def_id, measurement);
    }
  }

  const missingCriteria = defs.filter((def) => !(consolidated.get(def.id)?.value ?? '').trim());
  const missingRequired = defs.filter(
    (def) => def.is_required && !(consolidated.get(def.id)?.value ?? '').trim()
  );
  const qualitySummary = {
    cumple: qualityEvaluations.filter((item) => item.result === 'CUMPLE').length,
    desviacion: qualityEvaluations.filter((item) => item.result === 'DESVIACIÓN').length,
    otros: qualityEvaluations.filter(
      (item) => !['CUMPLE', 'DESVIACIÓN'].includes(item.result)
    ).length,
  };
  const samplingContext = asRecord(insp.sampling_context);
  const samplingRuleName =
    readRecordText(samplingContext, ['sampling_rule_name', 'rule_name']) !== '—'
      ? readRecordText(samplingContext, ['sampling_rule_name', 'rule_name'])
      : samplingPlan?.name ?? '—';
  const suggestedSampleCount = insp.suggested_sample_count;
  const realizedSampleCount = insp.sample_count ?? samples.length;
  const samplingUnit =
    readRecordText(samplingContext, ['sampling_unit']) !== '—'
      ? readRecordText(samplingContext, ['sampling_unit'])
      : samplingPlan?.sampling_unit?.trim() ||
        (lot?.quantity != null ? 'envase' : 'unidad de muestreo');
  const unitWeightKgRaw =
    readRecordText(samplingContext, ['unit_weight_kg']) !== '—'
      ? Number(readRecordText(samplingContext, ['unit_weight_kg']))
      : packaging?.theoretical_weight_kg ??
        (lot?.quantity != null &&
        lot.quantity > 0 &&
        (lot.weight ?? lot.theoretical_weight_kg) != null
          ? (lot.weight ?? lot.theoretical_weight_kg ?? 0) / lot.quantity
          : null);
  const unitWeightKg =
    unitWeightKgRaw != null && Number.isFinite(unitWeightKgRaw) ? unitWeightKgRaw : null;
  const suggestedWeightKg =
    readRecordText(samplingContext, ['suggested_sample_weight_kg']) !== '—'
      ? Number(readRecordText(samplingContext, ['suggested_sample_weight_kg']))
      : suggestedSampleCount != null && unitWeightKg != null
        ? suggestedSampleCount * unitWeightKg
        : null;
  const realizedWeightKg =
    readRecordText(samplingContext, ['sample_weight_kg']) !== '—'
      ? Number(readRecordText(samplingContext, ['sample_weight_kg']))
      : realizedSampleCount != null && unitWeightKg != null
        ? realizedSampleCount * unitWeightKg
        : null;
  const formatKg = (value: number | null) =>
    value != null && Number.isFinite(value)
      ? `${value.toLocaleString('es-CL', { maximumFractionDigits: 3 })} kg`
      : '—';
  const formatN = (value: number | null | undefined) => {
    if (value == null) return '—';
    const label =
      value === 1
        ? samplingUnit
        : samplingUnit === 'envase'
          ? 'envases'
          : samplingUnit === 'unidad de muestreo'
            ? 'unidades de muestreo'
            : samplingUnit;
    return `${value} ${label}`;
  };
  const samplingRuleFormula =
    readRecordText(samplingContext, ['rule_formula']) !== '—'
      ? readRecordText(samplingContext, ['rule_formula'])
      : samplingPlan?.rule?.formula ?? samplingPlan?.rule?.operational_label ?? '—';
  const companyName = readCompanyText(company, ['razon_social', 'legal_name', 'name']);
  const companyRut = readCompanyText(company, ['rut', 'tax_id']);
  const companyAddress = readCompanyText(company, ['address', 'direccion']);
  const companyPhone = readCompanyText(company, ['phone', 'telefono']);
  const companyEmail = readCompanyText(company, ['email', 'correo']);
  const companyWebsite = readCompanyText(company, ['website', 'sitio_web']);
  const companyLogo = readCompanyText(company, ['logo_url', 'logo', 'logo_path']);
  const inspectionIdentifier = insp.id;
  const reportDate = new Date().toLocaleString('es-CL');
  const previousPoint = previous
    ? points.find((item) => item.id === previous.inspection_point_id)?.name
    : null;
  const nextPoint = next ? points.find((item) => item.id === next.inspection_point_id)?.name : null;
  const packagingName = packaging?.name ?? lot?.packaging_type ?? '—';
  const lotWeight = lot?.weight ?? lot?.theoretical_weight_kg ?? null;
  const lotWeightUnit = lot?.weight_unit ?? (lot?.theoretical_weight_kg != null ? 'kg teóricos' : '—');

  return (
    <div className="report-document" data-testid="inspection-report" id="inspection-report">
      <div className="report-screen-controls report-screen-only">
        <Link href="/dashboard/inspections" className="qx-btn-ghost">
          Volver a inspecciones
        </Link>
        <div className="report-actions">
          <button type="button" onClick={handlePrint} className="qx-btn-brand-solid">
            GENERAR PDF
          </button>
          <button type="button" onClick={handlePrint} className="qx-btn-ghost">
            IMPRIMIR
          </button>
        </div>
      </div>

      <header className="report-company-header">
        <div className="report-brand-lockup">
          {companyLogo !== '—' ? (
            <img src={companyLogo} alt="Logotipo de la empresa" className="report-company-logo" />
          ) : (
            <div className="report-company-mark">QX</div>
          )}
          <div>
            <p className="report-company-name">{companyName}</p>
            <p className="report-company-subtitle">Informe de control de calidad</p>
          </div>
        </div>
        <div className="report-company-details">
          <span>RUT: {companyRut}</span>
          <span>Dirección: {companyAddress}</span>
          <span>Teléfono: {companyPhone}</span>
          <span>Email: {companyEmail}</span>
          {companyWebsite !== '—' && <span>Sitio web: {companyWebsite}</span>}
          <span>Código empresa: {readCompanyText(company, ['code'])}</span>
        </div>
      </header>

      <div className="report-print-footer report-print-only">
        <span>Informe {inspectionIdentifier}</span>
        <span className="report-page-number" />
      </div>

      <main className="report-content">
        <section className="report-title-section report-section">
          <p className="report-kicker">INFORME DE INSPECCIÓN INDIVIDUAL</p>
          <h1 className="report-title">{lot?.folio ?? `Lote ${lot?.id.slice(0, 8) ?? '—'}`}</h1>
          <p className="report-subtitle">
            {point?.name ?? 'Punto de inspección no identificado'} · {stage?.name ?? 'Etapa no identificada'}
          </p>
          <div className="report-title-meta">
            <span>Estado: <strong>{insp.status}</strong></span>
            <span>Fecha de emisión: <strong>{reportDate}</strong></span>
            <span>ID inspección: <strong className="report-id">{inspectionIdentifier}</strong></span>
          </div>
        </section>

        <section className="report-two-column report-section">
          <article className="report-panel">
            <h2>1. Datos del lote</h2>
            <dl className="report-fields">
              <div><dt>Folio / lote</dt><dd>{lot?.folio ?? '—'}</dd></div>
              <div><dt>Folio interno / planta</dt><dd>{lot?.folio_interno ?? '—'}</dd></div>
              <div><dt>Tipo de lote</dt><dd>{LOT_TYPE_LABELS[lot?.lot_type ?? LotType.ORIGEN]}</dd></div>
              <div><dt>Productor</dt><dd>{producer?.name ?? '—'}</dd></div>
              <div><dt>RUT productor</dt><dd>{producer?.rut ?? '—'}</dd></div>
              <div><dt>Campo</dt><dd>{fieldName}</dd></div>
              <div><dt>Bloque / cuartel</dt><dd>{blockName}</dd></div>
              <div><dt>Referencia de cosecha</dt><dd>{lot?.harvest_block ?? '—'}</dd></div>
              <div><dt>Guía del productor</dt><dd>{lot?.producer_guide_number ?? '—'}</dd></div>
              <div><dt>Especie</dt><dd>{speciesName}</dd></div>
              <div><dt>Variedad</dt><dd>{varietyName}</dd></div>
              <div><dt>Temporada</dt><dd>{season?.name ?? '—'}</dd></div>
              <div><dt>Tipo de embalaje</dt><dd>{packagingName}</dd></div>
              <div><dt>Cantidad / peso</dt><dd>{lot?.quantity != null ? `${lot.quantity} envases` : '—'}{lotWeight != null ? ` · ${lotWeight} ${lotWeightUnit}` : ''}</dd></div>
              <div><dt>Kg declarados (guía)</dt><dd>{lot?.kg_declarados != null ? `${lot.kg_declarados} kg` : '—'}</dd></div>
              <div><dt>Fecha de fruta</dt><dd>{formatDate(lot?.fruit_date)}</dd></div>
              <div><dt>Cliente</dt><dd>{lotOptionalText(lot, ['client_name', 'client', 'cliente'])}</dd></div>
              <div><dt>Destino</dt><dd>{lotOptionalText(lot, ['destination', 'destino'])}</dd></div>
              <div><dt>Origen / procedencia</dt><dd>{lot?.harvest_block ?? '—'}</dd></div>
            </dl>
          </article>

          <article className="report-panel">
            <h2>2. Datos de la inspección</h2>
            <dl className="report-fields">
              <div><dt>Fecha y hora</dt><dd>{formatDateTime(insp.inspected_at)}</dd></div>
              <div><dt>Inspector responsable</dt><dd>{inspector?.full_name ?? '—'}</dd></div>
              <div><dt>Correo del inspector</dt><dd>{inspector?.email ?? '—'}</dd></div>
              <div><dt>Punto de inspección</dt><dd>{point?.name ?? '—'}</dd></div>
              <div><dt>Etapa operacional</dt><dd>{stage?.name ?? '—'}</dd></div>
              <div><dt>Estado</dt><dd>{insp.status}</dd></div>
              <div><dt>Fecha de cierre</dt><dd>{formatDateTime(insp.completed_at)}</dd></div>
              <div><dt>Muestras realizadas</dt><dd>{realizedSampleCount}</dd></div>
              <div><dt>Resultado técnico</dt><dd>{insp.result ?? '—'}</dd></div>
              <div><dt>Decisión adoptada</dt><dd>{insp.decision ?? '—'}</dd></div>
            </dl>
          </article>
        </section>

        <section className="report-panel report-section">
          <h2>3. Plan y ejecución del muestreo</h2>
          <dl className="report-fields report-fields-four">
            <div><dt>Plan utilizado</dt><dd>{samplingRuleName}</dd></div>
            <div><dt>Regla utilizada</dt><dd>{samplingRuleFormula}</dd></div>
            <div><dt>N sugerido</dt><dd>{formatN(suggestedSampleCount)}</dd></div>
            <div><dt>Unidad de muestreo</dt><dd>{samplingUnit}</dd></div>
            <div><dt>N realizado</dt><dd>{formatN(realizedSampleCount)}</dd></div>
            <div>
              <dt>Peso teórico por unidad</dt>
              <dd>{unitWeightKg != null ? `${unitWeightKg.toLocaleString('es-CL', { maximumFractionDigits: 3 })} kg/${samplingUnit}` : '—'}</dd>
            </div>
            <div><dt>Peso total referencial (N sugerido)</dt><dd>{formatKg(suggestedWeightKg)}</dd></div>
            <div><dt>Peso total referencial (N realizado)</dt><dd>{formatKg(realizedWeightKg)}</dd></div>
            <div><dt>Motivo si N real difiere</dt><dd>{insp.sample_count_reason ?? '—'}</dd></div>
            <div><dt>Base de cálculo</dt><dd>{samplingPlan?.rule?.basis ?? '—'}</dd></div>
            <div><dt>Fórmula / regla</dt><dd>{samplingPlan?.rule?.formula ?? samplingPlan?.rule?.operational_label ?? '—'}</dd></div>
            <div><dt>Divisor</dt><dd>{samplingPlan?.rule?.divisor ?? '—'}</dd></div>
            <div><dt>Origen / contexto</dt><dd>{samplingPlan?.origin_context ?? '—'}</dd></div>
            <div><dt>Método</dt><dd>{samplingPlan?.method_text ?? '—'}</dd></div>
            <div><dt>Instrumento</dt><dd>{samplingPlan?.instrument_text ?? '—'}</dd></div>
            <div><dt>Versión del plan</dt><dd>{samplingPlan?.version ?? '—'}</dd></div>
          </dl>
          {samples.length > 0 && (
            <div className="report-samples-summary">
              <h3>Muestras registradas</h3>
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead><tr><th>Muestra</th><th>Etiqueta</th><th>Frutos</th><th>Unidad</th><th>Origen</th><th>Método</th><th>Instrumento</th></tr></thead>
                  <tbody>
                    {samples.map((sample, index) => (
                      <tr key={sample.id}>
                        <td>{sampleLabel(sample, index)}</td>
                        <td>{sample.label ?? '—'}</td>
                        <td>{sample.fruit_quantity ?? '—'}</td>
                        <td>{sample.sampling_unit ?? '—'}</td>
                        <td>{sample.origin_context ?? '—'}</td>
                        <td>{sample.method_text ?? '—'}</td>
                        <td>{sample.instrument_text ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="report-panel report-section">
          <div className="report-section-heading">
            <h2>4. Resultados consolidados por criterio</h2>
            <span className="report-section-note">Resultado consolidado de la inspección</span>
          </div>
          <div className="report-table-wrap">
            <table className="report-table report-table-results">
              <thead><tr><th>Criterio</th><th>Resultado</th><th>Unidad / escala</th><th>Observación</th><th>Muestra</th></tr></thead>
              <tbody>
                {defs.map((def) => {
                  const measurement = consolidated.get(def.id);
                  return (
                    <tr key={def.id}>
                      <td><strong>{def.name}</strong>{def.is_required ? <span className="report-required"> · obligatorio</span> : null}</td>
                      <td>{measurement?.value ?? '—'}</td>
                      <td>{def.scale_description ?? def.options?.join(' / ') ?? def.unit ?? '—'}</td>
                      <td>{measurement?.observation ?? '—'}</td>
                      <td>Consolidado</td>
                    </tr>
                  );
                })}
                {defs.length === 0 && <tr><td colSpan={5}>No hay criterios registrados para esta inspección.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {samples.length > 0 && (
          <section className="report-panel report-section">
            <h2>5. Resultados por muestra</h2>
            <div className="report-table-wrap">
              <table className="report-table report-table-samples">
                <thead><tr><th>Criterio</th>{samples.map((sample, index) => <th key={sample.id}>{sampleLabel(sample, index)}</th>)}</tr></thead>
                <tbody>
                  {defs.map((def) => (
                    <tr key={def.id}>
                      <td><strong>{def.name}</strong></td>
                      {samples.map((sample) => <td key={sample.id}>{bySample.get(sample.id)?.get(def.id)?.value ?? '—'}</td>)}
                    </tr>
                  ))}
                  {defs.length === 0 && <tr><td colSpan={samples.length + 1}>No hay criterios registrados para esta inspección.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="report-panel report-section">
          <h2>6. Evidencia registrada</h2>
          {evidence.length === 0 ? (
            <p className="report-empty">No se registró evidencia fotográfica para esta inspección.</p>
          ) : (
            <div className="report-evidence-grid">
              {evidence.map((item) => {
                const defName = defs.find((def) => def.id === item.measurement_def_id)?.name ?? 'Evidencia general';
                const sample = samples.find((entry) => entry.id === item.sample_id);
                return (
                  <figure key={item.id} className="report-evidence-item">
                    {item.url ? <img src={item.url} alt={defName} /> : <div className="report-evidence-placeholder">Sin vista previa</div>}
                    <figcaption><strong>{defName}</strong>{sample ? ` · ${sampleLabel(sample, samples.indexOf(sample))}` : ''}<br />{formatDateTime(item.created_at)}</figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </section>

        <section className="report-panel report-section">
          <h2>7. Evaluación de calidad</h2>
          <div className="report-evaluation-summary">
            <div><span>Cumple</span><strong>{qualitySummary.cumple}</strong></div>
            <div><span>Desviaciones</span><strong>{qualitySummary.desviacion}</strong></div>
            <div><span>Sin resultado</span><strong>{qualitySummary.otros}</strong></div>
          </div>
          {missingCriteria.length > 0 && (
            <p className="report-alert">Criterios consolidados sin resultado: {missingCriteria.map((def) => def.name).join(' · ')}{missingRequired.length > 0 ? ` (${missingRequired.length} obligatorios)` : ''}</p>
          )}
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr><th>Criterio</th><th>Resultado</th><th>Observado</th><th>Límite</th><th>Unidad</th><th>Fecha evaluación</th></tr></thead>
              <tbody>
                {qualityEvaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td><strong>{snapshotName(evaluation, defs)}</strong></td>
                    <td><span className={evaluation.result === 'DESVIACIÓN' ? 'report-result-deviation' : 'report-result-ok'}>{evaluation.result}</span></td>
                    <td>{evaluation.observed_value ?? '—'}</td>
                    <td>{formatLimit(evaluation)}</td>
                    <td>{evaluation.unit ?? '—'}</td>
                    <td>{formatDateTime(evaluation.evaluated_at)}</td>
                  </tr>
                ))}
                {qualityEvaluations.length === 0 && <tr><td colSpan={6}>No hay evaluaciones registradas.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-panel report-section">
          <div className="report-section-heading">
            <h2>8. Clasificación comercial y semáforo QualityNX</h2>
            <span className="report-section-note">Categorías operacionales QualityNX (no SAG)</span>
          </div>
          {classification ? (
            <>
              <dl className="report-fields">
                <div><dt>Clasificación comercial</dt><dd>{classification.commercial_class}</dd></div>
                <div><dt>Semáforo QualityNX</dt><dd>{classification.semaphore}</dd></div>
                <div><dt>Fecha de clasificación</dt><dd>{formatDateTime(classification.classified_at)}</dd></div>
                <div><dt>Versión de lógica</dt><dd className="report-id">{classification.logic_version}</dd></div>
                <div><dt>Aporte de IA</dt><dd>{classification.ai_used ? 'Sí (informativo; no decide el color)' : 'No'}</dd></div>
              </dl>
              <p className="report-empty" style={{ whiteSpace: 'pre-wrap' }}>{classification.justification}</p>
              <p className="report-section-note">
                Generada a partir de Quality Engine + datos de la inspección. No modifica la decisión humana.
              </p>
            </>
          ) : (
            <p className="report-empty">Sin clasificación registrada para esta inspección.</p>
          )}
        </section>

        <section className="report-panel report-section">
          <h2>9. Decisión adoptada</h2>
          <dl className="report-fields">
            <div><dt>Resultado técnico</dt><dd>{insp.result ?? '—'}</dd></div>
            <div><dt>Decisión</dt><dd>{insp.decision ?? '—'}</dd></div>
            <div><dt>Recomendación</dt><dd>{insp.recommendation ?? '—'}</dd></div>
            <div><dt>Observaciones</dt><dd>{insp.observations ?? '—'}</dd></div>
            <div><dt>Inspector responsable</dt><dd>{inspector?.full_name ?? '—'}</dd></div>
            <div><dt>Fecha de cierre</dt><dd>{formatDateTime(insp.completed_at)}</dd></div>
          </dl>
          {decisions.length > 0 && (
            <div className="report-decisions">
              <h3>Decisiones formales vinculadas</h3>
              {decisions.map((decision) => (
                <div className="report-decision" key={decision.id}>
                  <div><strong>{decision.decision_label}</strong> <span>{decision.status}</span></div>
                  <p>Fecha: {formatDateTime(decision.decided_at)}</p>
                  {decision.fundamento && <p>Fundamento: {decision.fundamento}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="report-panel report-section">
          <h2>10. Identificación, trazabilidad y continuidad</h2>
          <dl className="report-fields">
            <div><dt>ID inspección</dt><dd className="report-id">{inspectionIdentifier}</dd></div>
            <div><dt>ID lote</dt><dd className="report-id">{lot?.id ?? '—'}</dd></div>
            <div><dt>Inspección anterior</dt><dd>{previous ? `${previous.id} · ${previousPoint ?? 'Punto no identificado'} · ${formatDateTime(previous.inspected_at)}` : insp.previous_inspection_id ?? 'No existe'}</dd></div>
            <div><dt>Inspección siguiente</dt><dd>{next ? `${next.id} · ${nextPoint ?? 'Punto no identificado'} · ${formatDateTime(next.inspected_at)}` : 'No existe'}</dd></div>
            <div><dt>Resultado de continuidad</dt><dd>{previous?.result ?? next?.result ?? '—'}</dd></div>
            <div><dt>Emisión del informe</dt><dd>{reportDate}</dd></div>
          </dl>
        </section>
      </main>
    </div>
  );
}
