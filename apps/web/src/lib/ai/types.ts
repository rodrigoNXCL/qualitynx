// QualityNX AI — contratos tipados (desacoplados de OpenRouter)
// D-013 / D-021: la IA recomienda; el inspector decide.

export const AI_PROMPT_VERSION = 'v1';

export type AiRecommendation =
  | 'APROBAR'
  | 'RECHAZAR'
  | 'RETENER'
  | 'SEGREGAR'
  | 'REPROCESAR'
  | 'LIBERAR'
  | 'SOLICITAR REVISIÓN ADICIONAL'
  | 'OTRA'
  | 'INSUFICIENTE';

export interface AiCriterionInput {
  id: string;
  name: string;
  value_type: string;
  unit: string | null;
  value: string | null;
  is_required: boolean;
  min_value: number | null;
  max_value: number | null;
  info_text: string | null;
  recommendation_text: string | null;
  method_text: string | null;
  criteria_version: number;
  out_of_range: boolean;
}

export interface AiInspectionContext {
  inspection_id: string;
  lot: {
    id: string;
    harvest_block: string;
    fruit_date: string;
    status: string;
    operational_stage: string | null;
  } | null;
  species: string | null;
  variety: string | null;
  producer: string | null;
  inspection_point: string | null;
  operational_stage: string | null;
  inspected_at: string;
  status: string;
  observations: string | null;
  technical_result: string | null;
  inspector_decision: string | null;
  criteria: AiCriterionInput[];
  samples: { label: string | null; fruit_quantity: number | null; notes: string | null }[];
  evidence_count: number;
  prior_inspections: {
    point: string | null;
    status: string;
    result: string | null;
    decision: string | null;
    inspected_at: string;
  }[];
}

export interface AiAnalysisSuccess {
  recommendation: string;
  reasoning_summary: string;
  confidence: number | null;
  alerts: string[];
  supporting_factors: string[];
  data_quality_warnings: string[];
  model: string;
  model_version: string | null;
  prompt_version: string;
}

export interface AiAnalysisError {
  error: string;
  detail?: string;
}
