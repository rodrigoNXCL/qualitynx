// QUALITY ENGINE — tipos (05). Determinístico, sin IA.
import type {
  QualityComparisonType,
  QualityEvaluationResult,
} from '@qualitynx/shared';

export interface CriterionInput {
  measurement_def_id: string;
  name: string;
  value_type: string;
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
  options: string[] | null;
  is_active: boolean;
  evaluation_kind: QualityComparisonType | null;
  acceptable_options: string[] | null;
  criteria_version: number;
  inspection_point_id: string;
  company_id: string;
}

export interface EvaluationOutcome {
  result: QualityEvaluationResult;
  observed_value: string | null;
  comparison_type: QualityComparisonType | null;
  limit_min: number | null;
  limit_max: number | null;
  unit: string | null;
  deviation: number | null;
  condition_failed: string | null;
  criterion_snapshot: {
    measurement_def_id: string;
    name: string;
    criteria_version: number;
    value_type: string;
    unit: string | null;
    min_value: number | null;
    max_value: number | null;
    options: string[] | null;
    evaluation_kind: QualityComparisonType | null;
    acceptable_options: string[] | null;
    is_active: boolean;
    inspection_point_id: string;
    company_id: string;
    comparison_type: QualityComparisonType | null;
  };
}

export type { QualityComparisonType, QualityEvaluationResult };
