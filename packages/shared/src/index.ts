/**
 * QualityNX — Tipos compartidos (etapa 01 FOUNDATION)
 * Refleja el esquema definido en:
 * packages/database/supabase/migrations/20260811000001_foundation_initial_schema.sql
 */

// ============================================
// ROLES (ENUM: user_role)
// ============================================

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  INSPECTOR: 'INSPECTOR',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ============================================
// AUDITORÍA (ENUM: audit_action)
// ============================================

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  ACCESS_DENIED: 'ACCESS_DENIED',
  ROLE_CHANGE: 'ROLE_CHANGE',
  COMPANY_ASSIGNMENT: 'COMPANY_ASSIGNMENT',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// ============================================
// TABLA: companies
// ============================================

export interface Company {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ============================================
// TABLA: users
// ============================================

export interface User {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  company_id: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// ============================================
// TABLA: audit_logs
// ============================================

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  user_id: string;
  company_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================
// TABLA: leads
// ============================================

export const LeadStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CLOSED: 'closed',
} as const;

export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export type LeadCompanyType = 'Productor' | 'Packing' | 'Exportadora' | 'Otro';

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string | null;
  whatsapp: string;
  fruit_type: string | null;
  company_type: LeadCompanyType;
  recording_method: string | null;
  inspection_volume: string | null;
  problem: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export type LeadCreate = Omit<Lead, 'id' | 'status' | 'created_at' | 'updated_at'> & {
  role?: string | null;
  fruit_type?: string | null;
  recording_method?: string | null;
  inspection_volume?: string | null;
};

// ============================================
// MASTER DATA (etapa 02)
// ============================================

export interface MasterDataRecord {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producer extends MasterDataRecord {
  rut?: string | null;
  address?: string | null;
  comuna?: string | null;
  city?: string | null;
  gps_point?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  salida_producer_id?: string | null;
}

export interface Field extends MasterDataRecord {
  producer_id: string;
}

export interface Block extends MasterDataRecord {
  field_id: string;
}

export type Species = MasterDataRecord;

export interface Variety extends MasterDataRecord {
  species_id: string;
}

export interface Season extends MasterDataRecord {
  start_date: string | null;
  end_date: string | null;
}

export type MasterDataEntity =
  | 'producers'
  | 'fields'
  | 'blocks'
  | 'species'
  | 'varieties'
  | 'seasons'
  | 'packaging_types';

export interface PackagingType extends MasterDataRecord {
  theoretical_weight_kg: number | null;
  source_ref: string | null;
}

export interface MasterDataCreateInput {
  name: string;
  producer_id?: string;
  field_id?: string;
  species_id?: string;
  start_date?: string | null;
  end_date?: string | null;
  rut?: string | null;
  address?: string | null;
  comuna?: string | null;
  city?: string | null;
  gps_point?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  salida_producer_id?: string | null;
}

// ============================================
// LOTS (etapa 03) — CURRENT.md §8, §28, RB-002
// ============================================

export const LotStatus = {
  CREADO: 'CREADO',
  EN_PROCESO: 'EN PROCESO',
  EN_INSPECCION: 'EN INSPECCIÓN',
  RETENIDO: 'RETENIDO',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  SEGREGADO: 'SEGREGADO',
  EN_REPROCESO: 'EN REPROCESO',
  LIBERADO: 'LIBERADO',
  CERRADO: 'CERRADO',
} as const;

export type LotStatus = (typeof LotStatus)[keyof typeof LotStatus];

export const LOT_STATUSES: LotStatus[] = Object.values(LotStatus);

// D-029 — tipo de lote operacional (origen/puro, proceso, repalletizaje)
export const LotType = {
  ORIGEN: 'ORIGEN',
  PROCESO: 'PROCESO',
  REPALLETIZAJE: 'REPALLETIZAJE',
} as const;

export type LotType = (typeof LotType)[keyof typeof LotType];

export const LOT_TYPES: LotType[] = Object.values(LotType);

export const LOT_TYPE_LABELS: Record<LotType, string> = {
  ORIGEN: 'Lote de origen / puro',
  PROCESO: 'Lote nuevo de proceso',
  REPALLETIZAJE: 'Lote de repalletizaje',
};

export interface Lot {
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

export interface LotCreateInput {
  producer_id: string;
  variety_id: string;
  fruit_date: string;
  harvest_block: string;
  field_id?: string | null;
  block_id?: string | null;
  season_id?: string | null;
  folio?: string | null;
  lot_type?: LotType;
  folio_interno?: string | null;
  kg_declarados?: number | null;
  producer_guide_number?: string | null;
  packaging_type?: string | null;
  packaging_type_id?: string | null;
  theoretical_weight_kg?: number | null;
  quantity?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
}

export interface LotUpdateInput {
  producer_id?: string;
  variety_id?: string;
  fruit_date?: string;
  harvest_block?: string;
  field_id?: string | null;
  block_id?: string | null;
  season_id?: string | null;
  status?: LotStatus;
  lot_type?: LotType;
  folio_interno?: string | null;
  kg_declarados?: number | null;
  producer_guide_number?: string | null;
  packaging_type?: string | null;
  packaging_type_id?: string | null;
  theoretical_weight_kg?: number | null;
  quantity?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
}

// ============================================
// LOT GENEALOGY (D-029) — proceso / repalletizaje
// ============================================

export type LotGenealogyRelationType = Extract<LotType, 'PROCESO' | 'REPALLETIZAJE'>;

export interface LotGenealogy {
  id: string;
  company_id: string;
  source_lot_id: string;
  derived_lot_id: string;
  relation_type: LotGenealogyRelationType;
  quantity?: number | null;
  unit?: string | null;
  created_at: string;
  created_by: string | null;
}

// ============================================
// OPERATIONAL STAGES / LOT STAGE EVENTS (D-016)
// ============================================

export interface OperationalStage {
  id: string;
  name: string;
  display_order: number;
  purpose: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const LotStageEventType = {
  INGRESO: 'INGRESO',
  TRANSICION: 'TRANSICION',
} as const;

export type LotStageEventType =
  (typeof LotStageEventType)[keyof typeof LotStageEventType];

export interface LotStageEvent {
  id: string;
  company_id: string;
  lot_id: string;
  operational_stage_id: string;
  event_type: LotStageEventType;
  user_id: string;
  notes: string | null;
  occurred_at: string;
  created_at: string;
}

// ============================================
// INSPECTIONS (etapa 04)
// ============================================

export const InspectionStatus = {
  EN_CURSO: 'EN CURSO',
  COMPLETADA: 'COMPLETADA',
} as const;

export type InspectionStatus =
  (typeof InspectionStatus)[keyof typeof InspectionStatus];

export const MeasurementValueType = {
  NUMERICA: 'numérica',
  PORCENTAJE: 'porcentaje',
  ENTERO: 'entero',
  TEXTO: 'texto',
  LISTA: 'lista',
  SI_NO: 'sí/no',
  CALCULO: 'cálculo derivado',
  TEMPERATURA: 'temperatura',
  FECHA: 'fecha',
  FECHA_HORA: 'fecha-hora',
  MULTISELECT: 'multiselección',
  FOTO: 'foto',
  ARCHIVO: 'archivo',
} as const;

export type MeasurementValueType =
  (typeof MeasurementValueType)[keyof typeof MeasurementValueType];

export const MeasurementSourceKind = {
  NORMA_OFICIAL: 'NORMA OFICIAL',
  REQUISITO_FITOSANITARIO: 'REQUISITO FITOSANITARIO',
  ESPECIFICACION_COMERCIAL: 'ESPECIFICACIÓN COMERCIAL',
  PROTOCOLO_INTERNO: 'PROTOCOLO INTERNO',
  RECOMENDACION_OPERACIONAL: 'RECOMENDACIÓN OPERACIONAL',
  OTRO: 'OTRO',
} as const;

export type MeasurementSourceKind =
  (typeof MeasurementSourceKind)[keyof typeof MeasurementSourceKind];

export const MeasurementValidationStatus = {
  VALIDADO: 'VALIDADO',
  CONFIGURABLE: 'CONFIGURABLE',
  PENDIENTE: 'PENDIENTE DE VALIDACIÓN',
} as const;

export type MeasurementValidationStatus =
  (typeof MeasurementValidationStatus)[keyof typeof MeasurementValidationStatus];

export interface InspectionPoint {
  id: string;
  company_id: string;
  species_id: string;
  operational_stage_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeasurementDef {
  id: string;
  company_id: string;
  inspection_point_id: string;
  name: string;
  value_type: MeasurementValueType;
  unit: string | null;
  is_required: boolean;
  min_value: number | null;
  max_value: number | null;
  options: string[] | null;
  is_active: boolean;
  description: string | null;
  info_text: string | null;
  recommendation_text: string | null;
  method_text: string | null;
  source_kind: string | null;
  source_ref: string | null;
  validation_status: string;
  evidence_required: boolean;
  observation_required: boolean;
  sort_order: number;
  criteria_version: number;
  alert_only_out_of_range: boolean;
  evaluation_kind: QualityComparisonType | null;
  acceptable_options: string[] | null;
  observation_instructions: string | null;
  scale_description: string | null;
  instrument_text: string | null;
  response_schema: Record<string, unknown>;
  technical_status: string;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  company_id: string;
  lot_id: string;
  inspection_point_id: string;
  inspector_id: string;
  status: InspectionStatus;
  inspected_at: string;
  observations: string | null;
  result: string | null;
  decision: string | null;
  completed_at: string | null;
  previous_inspection_id: string | null;
  recommendation: string | null;
  sampling_plan_id?: string | null;
  suggested_sample_count?: number | null;
  sample_count?: number | null;
  sample_count_reason?: string | null;
  sampling_context?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Sample {
  id: string;
  inspection_id: string;
  lot_id?: string | null;
  label: string | null;
  fruit_quantity: number | null;
  notes: string | null;
  method_text: string | null;
  instrument_text: string | null;
  sample_number: number | null;
  sampling_unit: string | null;
  origin_context: string | null;
  generated_from_plan_id?: string | null;
  is_generated?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export type SamplingRuleBasis = 'fixed' | 'quantity' | 'theoretical_weight_kg';
export type SamplingRounding = 'ceil' | 'floor' | 'round';

export interface SamplingPlan {
  id: string;
  company_id: string;
  inspection_point_id: string;
  name: string;
  rule: {
    basis: SamplingRuleBasis;
    divisor?: number;
    samples?: number;
    min_samples?: number;
    max_samples?: number;
    rounding?: SamplingRounding;
    operational_label?: string;
    formula?: string;
  };
  sampling_unit: string | null;
  origin_context: string | null;
  method_text: string | null;
  instrument_text: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface NormativeReference {
  id: string;
  company_id: string | null;
  source_name: string;
  document_name: string | null;
  version: string | null;
  valid_from: string | null;
  valid_to: string | null;
  country: string | null;
  market: string | null;
  protocol_name: string | null;
  reference_type: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriterionNormativeReference extends NormativeReference {
  normative_reference_id?: string;
  relationship: string;
}

/** Resultado de búsqueda del buscador de continuidad (CONTINUAR INSPECCIÓN). */
export interface ContinuitySearchHit {
  inspection: Inspection;
  lot: {
    id: string;
    harvest_block: string;
    fruit_date: string;
    producer_id: string;
    field_id: string | null;
    species_id: string | null;
    variety_id: string;
    status: string;
  };
  point: { id: string; name: string; operational_stage_id: string | null };
  stage_name: string | null;
}

export interface Measurement {
  id: string;
  inspection_id: string;
  measurement_def_id: string;
  sample_id: string | null;
  value: string | null;
  observation: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionEvidence {
  id: string;
  inspection_id: string;
  storage_path: string;
  measurement_def_id: string | null;
  created_at: string;
}

// ============================================
// AI (D-013 / D-021) — asistente, NO decide
// ============================================

export interface AiInspectionAnalysis {
  id: string;
  company_id: string;
  inspection_id: string;
  model: string;
  model_version: string | null;
  prompt_version: string;
  input_snapshot: unknown;
  recommendation: string;
  reasoning_summary: string | null;
  confidence: number | null;
  alerts: string[] | null;
  supporting_factors: string[] | null;
  data_quality_warnings: string[] | null;
  created_by: string | null;
  created_at: string;
}

export interface AiLearningRecord {
  id: string;
  company_id: string;
  inspection_id: string;
  ai_analysis_id: string;
  recommendation_ai: string;
  decision_inspector: string | null;
  decision_inspector_user_id: string | null;
  decision_inspector_at: string | null;
  agreement: boolean | null;
  outcome_posterior: string | null;
  outcome_posterior_at: string | null;
  feedback_type: string | null;
  feedback_notes: string | null;
  validated: boolean;
  created_at: string;
  updated_at: string;
}

export const INSPECTION_DECISION_OPTIONS = [
  'APROBAR',
  'RECHAZAR',
  'RETENER',
  'SEGREGAR',
  'REPROCESAR',
  'LIBERAR',
  'SOLICITAR NUEVA INSPECCIÓN',
  'CAMBIAR DESTINO',
  'CONTINUAR',
  'DETENER',
] as const;

export type InspectionDecisionOption =
  (typeof INSPECTION_DECISION_OPTIONS)[number];

// ============================================
// QUALITY ENGINE (05) — evaluación objetiva
// ============================================

export const QualityEvaluationResult = {
  CUMPLE: 'CUMPLE',
  DESVIACION: 'DESVIACIÓN',
  SIN_CRITERIO: 'SIN CRITERIO CONFIGURADO',
  UNIDAD_INCOMPATIBLE: 'UNIDAD INCOMPATIBLE',
  CONFIG_AMBIGUA: 'CONFIGURACIÓN AMBIGUA',
  CRITERIO_INACTIVO: 'CRITERIO INACTIVO',
} as const;

export type QualityEvaluationResult =
  (typeof QualityEvaluationResult)[keyof typeof QualityEvaluationResult];

export const QualityComparisonType = {
  MINIMO: 'minimo',
  MAXIMO: 'maximo',
  RANGO: 'rango',
  CONDICION: 'condicion',
  PORCENTUAL: 'porcentual',
} as const;

export type QualityComparisonType =
  (typeof QualityComparisonType)[keyof typeof QualityComparisonType];

export interface QualityEvaluation {
  id: string;
  company_id: string;
  inspection_id: string;
  measurement_id: string;
  measurement_def_id: string;
  result: QualityEvaluationResult;
  observed_value: string | null;
  comparison_type: QualityComparisonType | null;
  limit_min: number | null;
  limit_max: number | null;
  unit: string | null;
  deviation: number | null;
  condition_failed: string | null;
  criterion_snapshot: unknown;
  evaluated_at: string;
  evaluated_by: string | null;
}

// ============================================
// DECISIONS (06) — decisión humana operacional
// ============================================

export const DecisionStatus = {
  REGISTRADA: 'REGISTRADA',
  ANULADA: 'ANULADA',
} as const;

export type DecisionStatus = (typeof DecisionStatus)[keyof typeof DecisionStatus];

export interface DecisionCatalogItem {
  id: string;
  company_id: string;
  code: string;
  label: string;
  requires_fundamento: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DecisionRecord {
  id: string;
  company_id: string;
  lot_id: string;
  inspection_id: string | null;
  decision_catalog_id: string;
  decision_code: string;
  decision_label: string;
  fundamento: string | null;
  context_snapshot: unknown;
  status: DecisionStatus;
  decided_by: string;
  decided_at: string;
  annulled_by: string | null;
  annulled_at: string | null;
  annul_reason: string | null;
  supersedes_decision_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecisionEffect {
  id: string;
  company_id: string;
  decision_code: string;
  inspection_point_id: string | null;
  target_lot_status: LotStatus | null;
  target_operational_stage_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// TRACEABILITY (07) — capa semántica de historia
// No es una tabla: eventos derivados de fuentes existentes.
// ============================================

export const TraceabilityEventType = {
  LOT_CREATED: 'LOT_CREATED',
  LOT_UPDATED: 'LOT_UPDATED',
  LOT_STATUS_CHANGED: 'LOT_STATUS_CHANGED',
  STAGE_EVENT: 'STAGE_EVENT',
  INSPECTION_CREATED: 'INSPECTION_CREATED',
  INSPECTION_UPDATED: 'INSPECTION_UPDATED',
  INSPECTION_COMPLETED: 'INSPECTION_COMPLETED',
  QUALITY_EVALUATION: 'QUALITY_EVALUATION',
  DECISION_REGISTERED: 'DECISION_REGISTERED',
  DECISION_ANNULLED: 'DECISION_ANNULLED',
} as const;

export type TraceabilityEventType =
  (typeof TraceabilityEventType)[keyof typeof TraceabilityEventType];

export type TraceabilitySource =
  | 'audit_logs'
  | 'lot_stage_events'
  | 'inspections'
  | 'quality_evaluations'
  | 'decisions';

export interface TraceabilityEvent {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  event_type: TraceabilityEventType | string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  actor_user_id: string | null;
  actor_name: string | null;
  occurred_at: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  source: TraceabilitySource | string;
  context: Record<string, unknown> | null;
}

// ============================================
// CLASIFICACIÓN COMERCIAL + SEMÁFORO QUALITYNX
// Categorías operacionales propias; NO son normativas SAG.
// El inspector no elige el color: se deriva de QE (+ resumen IA en justificación).
// ============================================

export const QualitySemaphore = {
  VERDE: 'VERDE',
  AMARILLO: 'AMARILLO',
  ROJO: 'ROJO',
} as const;

export type QualitySemaphore = (typeof QualitySemaphore)[keyof typeof QualitySemaphore];

export const QualitySemaphoreLabels: Record<QualitySemaphore, string> = {
  VERDE: 'Verde',
  AMARILLO: 'Amarillo',
  ROJO: 'Rojo',
};

/** Categorías operacionales de ejemplo (configurables por matriz futura; no asumir SAG). */
export const CommercialClassExamples = [
  'EXTRA',
  'CLASE I',
  'CLASE II',
  'FUERA DE ESPECIFICACIÓN',
  'SIN CLASIFICAR',
] as const;

export interface QualityClassification {
  id: string;
  company_id: string;
  lot_id: string;
  inspection_id: string;
  commercial_class: string;
  semaphore: QualitySemaphore;
  justification: string;
  source_snapshot: unknown;
  logic_version: string;
  ai_analysis_id: string | null;
  ai_used: boolean;
  classified_at: string;
  classified_by: string | null;
}

// ============================================
// OBSERVADOS — QualityNX V2 Fase B
// Representación numérica segura e indicadores
// DESCRIPTIVOS. No evalúa cumplimiento, no aplica
// límites, no asigna semáforo ni decisión.
// ============================================

/**
 * Clasificación de un valor observado (`measurements.value`, TEXT).
 *
 * Regla canónica (única forma aceptada): número con punto decimal,
 * sin separador de miles y sin unidad adjunta.
 *   NUMERIC    → ^[+-]?(\d+(\.\d+)?|\.\d+)$
 *   EMPTY      → null / undefined / solo espacios
 *   AMBIGUOUS  → solo dígitos, signos, punto, coma y espacios
 *                (p. ej. "1.234,56", "1,234.56", "12,5"):
 *                no se interpreta porque el separador
 *                decimal del origen no está definido.
 *   NON_NUMERIC→ contiene letras u otros símbolos
 *                (p. ej. "Morado maduro", "obs", "12 g").
 *
 * El valor original NUNCA se modifica ni se normaliza.
 */
export const ObservedValueClass = {
  NUMERIC: 'NUMERIC',
  EMPTY: 'EMPTY',
  NON_NUMERIC: 'NON_NUMERIC',
  AMBIGUOUS: 'AMBIGUOUS',
} as const;

export type ObservedValueClass =
  (typeof ObservedValueClass)[keyof typeof ObservedValueClass];

const CANONICAL_NUMBER = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;
const AMBIGUOUS_CHARS = /^[+-][\d.,\s]*$|^[\d.,\s]*$/;

export interface ClassifiedObservedValue {
  /** Valor original, tal como está persistido. */
  original: string | null;
  /** Resultado de la regla canónica. */
  kind: ObservedValueClass;
  /** Número interpretable; `null` si no es NUMERIC. */
  numeric: number | null;
}

export function classifyObservedValue(
  raw: string | null | undefined
): ClassifiedObservedValue {
  const original = raw ?? null;
  if (original === null || original.trim() === '') {
    return { original, kind: ObservedValueClass.EMPTY, numeric: null };
  }
  const trimmed = original.trim();
  if (CANONICAL_NUMBER.test(trimmed)) {
    return {
      original,
      kind: ObservedValueClass.NUMERIC,
      numeric: Number(trimmed),
    };
  }
  if (AMBIGUOUS_CHARS.test(trimmed) && /[.,\s]/.test(trimmed)) {
    return { original, kind: ObservedValueClass.AMBIGUOUS, numeric: null };
  }
  return { original, kind: ObservedValueClass.NON_NUMERIC, numeric: null };
}

/**
 * Compatibilidad de unidad. NO convierte unidades: solo
 * verifica que la unidad del registro coincida con la
 * unidad esperada por el indicador.
 */
export const ObservedUnitStatus = {
  OK: 'OK',
  MISSING: 'MISSING',
  INCOMPATIBLE: 'INCOMPATIBLE',
} as const;

export type ObservedUnitStatus =
  (typeof ObservedUnitStatus)[keyof typeof ObservedUnitStatus];

export function classifyObservedUnit(
  unit: string | null | undefined,
  expectedUnit: string | null
): ObservedUnitStatus {
  const u = (unit ?? '').trim();
  const e = (expectedUnit ?? '').trim();
  if (u === '') return ObservedUnitStatus.MISSING;
  if (e === '') return ObservedUnitStatus.INCOMPATIBLE;
  return u.toLowerCase() === e.toLowerCase()
    ? ObservedUnitStatus.OK
    : ObservedUnitStatus.INCOMPATIBLE;
}

/** Motivo por el que un registro no entra al cálculo. */
export const ObservedExclusionReason = {
  [ObservedValueClass.EMPTY]: 'EMPTY',
  [ObservedValueClass.NON_NUMERIC]: 'NON_NUMERIC',
  [ObservedValueClass.AMBIGUOUS]: 'AMBIGUOUS',
  UNIT_MISSING: 'UNIT_MISSING',
  UNIT_INCOMPATIBLE: 'UNIT_INCOMPATIBLE',
  NO_DATE: 'NO_DATE',
} as const;

export type ObservedExclusionReason =
  (typeof ObservedExclusionReason)[keyof typeof ObservedExclusionReason];

/** Una medición tal como entra al cálculo, sin consolidar por inspección. */
export interface ObservedMeasurementRow {
  measurement_id: string;
  inspection_id: string;
  lot_id: string | null;
  lot_folio: string | null;
  lot_harvest_block: string | null;
  criterion_name: string;
  operational_stage_name: string | null;
  sample_id: string | null;
  /** Fecha operativa usada para agrupar: `inspections.inspected_at`. */
  observed_at: string | null;
  value_original: string | null;
  value_kind: ObservedValueClass;
  numeric: number | null;
  unit: string | null;
  unit_status: ObservedUnitStatus;
  evidence_count: number;
  included: boolean;
  exclusion_reason: ObservedExclusionReason | null;
}

/** Fila agregada de un indicador descriptivo. */
export interface ObservedIndicatorBucket {
  /** 'YYYY-MM-DD' (día) o 'YYYY-Www' (semana ISO). */
  bucket: string;
  /** Semana ISO y año; `null` en agrupación diaria. */
  iso_year: number | null;
  iso_week: number | null;
  average: number | null;
  included_count: number;
  excluded_count: number;
  excluded_by_reason: Partial<Record<ObservedExclusionReason, number>>;
  /** Etapas que aportan registros evaluables al bucket. */
  contributing_stages: string[];
  /** Unidades presentes en los registros evaluables del bucket. */
  units: string[];
}

export interface ObservedIndicatorResult {
  buckets: ObservedIndicatorBucket[];
  rows: ObservedMeasurementRow[];
  totals: {
    included_count: number;
    excluded_count: number;
    excluded_by_reason: Partial<Record<ObservedExclusionReason, number>>;
    units_expected: string[];
    criterion_names: string[];
    operational_stages: string[];
    date_field: 'inspections.inspected_at';
    grouping: 'DAY' | 'ISO_WEEK';
    timezone: 'UTC';
  };
}

/** Clave de día en UTC (determinista, sin zona horaria inventada). */
export function observedDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Semana ISO-8601 (lunes inicio, semana 1 contiene el primer
 * jueves del año). Devuelve semana + año ISO, que es lo que
 * permite agrupar sin duplicar ni perder semanas en el cambio
 * de año.
 */
export function observedIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return { year, week };
}

export function observedWeekKey(date: Date): string {
  const { year, week } = observedIsoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// D-032: reglas de transformación (lógica pura)
export * from './transformations';
