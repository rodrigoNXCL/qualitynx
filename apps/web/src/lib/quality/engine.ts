// QUALITY ENGINE — evaluación determinística (05).
// NO decide, NO cambia etapa/estado, NO usa IA, NO inventa límites.
import type {
  CriterionInput,
  EvaluationOutcome,
  QualityComparisonType,
} from './types';

const NUMERIC_TYPES = new Set([
  'numérica',
  'porcentaje',
  'entero',
  'temperatura',
]);

const QUALITATIVE_TYPES = new Set(['lista', 'sí/no', 'texto', 'multiselección']);

/** Deriva tipo de comparación desde configuración del criterio (sin inventar límites). */
export function deriveComparisonType(c: CriterionInput): QualityComparisonType | null {
  if (c.evaluation_kind) return c.evaluation_kind;
  const hasMin = c.min_value != null;
  const hasMax = c.max_value != null;
  if (hasMin && hasMax) return 'rango';
  if (hasMin && !hasMax) return 'minimo';
  if (!hasMin && hasMax) return c.value_type === 'porcentaje' ? 'porcentual' : 'maximo';
  if (
    (QUALITATIVE_TYPES.has(c.value_type) || NUMERIC_TYPES.has(c.value_type)) &&
    c.acceptable_options &&
    c.acceptable_options.length > 0
  ) {
    return 'condicion';
  }
  return null;
}

/** Extrae número y unidad opcional del valor observado ("11.8 °Bx", "3%", "12"). */
export function parseObservedValue(raw: string): {
  n: number | null;
  unitInValue: string | null;
  text: string;
} {
  const text = raw.trim();
  if (!text) return { n: null, unitInValue: null, text: '' };
  const m = text.match(/^([+-]?\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { n: null, unitInValue: null, text };
  const n = Number(m[1].replace(',', '.'));
  const unitInValue = (m[2] || '').trim() || null;
  return { n: Number.isFinite(n) ? n : null, unitInValue, text };
}

function unitsCompatible(criterionUnit: string | null, valueUnit: string | null): boolean {
  if (!valueUnit) return true;
  if (!criterionUnit) return true;
  const a = valueUnit.replace(/^%$/, '%').toLowerCase();
  const b = criterionUnit.replace(/^%$/, '%').toLowerCase();
  if (a === b) return true;
  // sinónimos mínimos configurables, no conversión silenciosa
  const synonyms: Record<string, string[]> = {
    '%': ['pct', 'porcentaje'],
    '°bx': ['bx', 'brix'],
  };
  const expand = (u: string) => [u, ...(synonyms[u] ?? [])];
  return expand(a).some((x) => expand(b).includes(x));
}

function snapshot(c: CriterionInput, comparison: QualityComparisonType | null) {
  return {
    measurement_def_id: c.measurement_def_id,
    name: c.name,
    criteria_version: c.criteria_version,
    value_type: c.value_type,
    unit: c.unit,
    min_value: c.min_value,
    max_value: c.max_value,
    options: c.options,
    evaluation_kind: c.evaluation_kind,
    acceptable_options: c.acceptable_options,
    is_active: c.is_active,
    inspection_point_id: c.inspection_point_id,
    company_id: c.company_id,
    comparison_type: comparison,
  };
}

function outcome(
  c: CriterionInput | null,
  result: EvaluationOutcome['result'],
  partial: Partial<EvaluationOutcome> = {},
  rawValue: string | null = null
): EvaluationOutcome {
  if (!c) {
    return {
      result,
      observed_value: rawValue,
      comparison_type: null,
      limit_min: null,
      limit_max: null,
      unit: null,
      deviation: null,
      condition_failed: null,
      criterion_snapshot: {
        measurement_def_id: '',
        name: '',
        criteria_version: 0,
        value_type: '',
        unit: null,
        min_value: null,
        max_value: null,
        options: null,
        evaluation_kind: null,
        acceptable_options: null,
        is_active: false,
        inspection_point_id: '',
        company_id: '',
        comparison_type: null,
      },
    };
  }
  const comparison = partial.comparison_type ?? deriveComparisonType(c);
  return {
    result,
    observed_value: rawValue,
    comparison_type: comparison,
    limit_min: c.min_value,
    limit_max: c.max_value,
    unit: c.unit,
    deviation: null,
    condition_failed: null,
    criterion_snapshot: snapshot(c, comparison),
    ...partial,
  };
}

/**
 * Resuelve el criterio aplicable.
 * - 0 candidatos → sin criterio / inactivo si había inactivo.
 * - >1 candidatos activos sin prioridad inequívoca → CONFIGURACIÓN AMBIGUA.
 * - 1 → ok.
 */
export function resolveCriterion(
  candidates: CriterionInput[]
): { ok: true; criterion: CriterionInput } | { ok: false; outcome: EvaluationOutcome } {
  const active = candidates.filter((c) => c.is_active);
  const inactive = candidates.filter((c) => !c.is_active);
  if (active.length === 0) {
    if (inactive.length === 1) {
      return { ok: false, outcome: outcome(inactive[0], 'CRITERIO INACTIVO', {}, null) };
    }
    if (inactive.length > 1) {
      return {
        ok: false,
        outcome: outcome(inactive[0], 'CONFIGURACIÓN AMBIGUA', {
          condition_failed: 'Múltiples criterios inactivos aplicables sin prioridad.',
        }),
      };
    }
    return { ok: false, outcome: outcome(null, 'SIN CRITERIO CONFIGURADO') };
  }
  if (active.length > 1) {
    return {
      ok: false,
      outcome: outcome(active[0], 'CONFIGURACIÓN AMBIGUA', {
        condition_failed: `${active.length} criterios activos aplicables sin prioridad inequívoca.`,
      }),
    };
  }
  return { ok: true, criterion: active[0] };
}

/**
 * Evalúa valor observado contra el criterio configurado.
 * Determinístico y reproducible. No modifica la medición.
 */
export function evaluateValue(criterion: CriterionInput, rawValue: string): EvaluationOutcome {
  if (!criterion.is_active) {
    return outcome(criterion, 'CRITERIO INACTIVO', {}, rawValue);
  }

  const comparison = deriveComparisonType(criterion);
  if (!comparison) {
    // Medición válida sin regla de aceptación configurada
    if (
      !NUMERIC_TYPES.has(criterion.value_type) &&
      !QUALITATIVE_TYPES.has(criterion.value_type)
    ) {
      return outcome(criterion, 'SIN CRITERIO CONFIGURADO', {}, rawValue);
    }
    if (
      NUMERIC_TYPES.has(criterion.value_type) &&
      criterion.min_value == null &&
      criterion.max_value == null
    ) {
      return outcome(criterion, 'SIN CRITERIO CONFIGURADO', {}, rawValue);
    }
    return outcome(criterion, 'SIN CRITERIO CONFIGURADO', { comparison_type: comparison }, rawValue);
  }

  // Configuración contradictoria (ej. min > max) → no evaluar arbitrariamente
  if (
    criterion.min_value != null &&
    criterion.max_value != null &&
    criterion.min_value > criterion.max_value
  ) {
    return outcome(criterion, 'CONFIGURACIÓN AMBIGUA', {
      comparison_type: comparison,
      condition_failed: 'Límite mínimo mayor que máximo en el criterio.',
    }, rawValue);
  }

  // Rango/explícito incompleto
  if (
    (comparison === 'rango' || comparison === 'porcentual') &&
    criterion.min_value == null &&
    criterion.max_value == null
  ) {
    return outcome(criterion, 'CONFIGURACIÓN AMBIGUA', {
      comparison_type: comparison,
      condition_failed: 'Tipo de comparación rango/porcentual sin límites configurados.',
    }, rawValue);
  }

  const value = rawValue.trim();
  if (!value) {
    return outcome(criterion, 'SIN CRITERIO CONFIGURADO', {
      comparison_type: comparison,
      condition_failed: 'Sin valor observado para evaluar.',
    }, rawValue);
  }

  if (comparison === 'condicion') {
    const allowed =
      criterion.acceptable_options && criterion.acceptable_options.length > 0
        ? criterion.acceptable_options
        : null;
    if (!allowed) {
      return outcome(criterion, 'SIN CRITERIO CONFIGURADO', {
        comparison_type: 'condicion',
        condition_failed: 'Condición sin opciones aceptables configuradas.',
      }, rawValue);
    }
    const ok = allowed.some((a) => a.trim().toLowerCase() === value.toLowerCase());
    if (ok) {
      return outcome(criterion, 'CUMPLE', {
        comparison_type: 'condicion',
        condition_failed: null,
      }, rawValue);
    }
    return outcome(criterion, 'DESVIACIÓN', {
      comparison_type: 'condicion',
      condition_failed: `Valor fuera de opciones aceptables: ${allowed.join(' | ')}`,
    }, rawValue);
  }

  // Numéricos: mínimo / máximo / rango / porcentual
  const parsed = parseObservedValue(value);
  if (parsed.n == null) {
    return outcome(criterion, 'UNIDAD INCOMPATIBLE', {
      comparison_type: comparison,
      condition_failed: 'El valor observado no es numérico evaluable.',
    }, rawValue);
  }
  if (!unitsCompatible(criterion.unit, parsed.unitInValue)) {
    return outcome(criterion, 'UNIDAD INCOMPATIBLE', {
      comparison_type: comparison,
      unit: criterion.unit,
      condition_failed: `Unidad del valor (${parsed.unitInValue}) incompatible con criterio (${criterion.unit ?? 'sin unidad'}).`,
    }, rawValue);
  }
  // Unidad de tipo no numérico configurada vs valor con unidad distinta ya cubierta.
  if (
    criterion.unit &&
    parsed.unitInValue &&
    !unitsCompatible(criterion.unit, parsed.unitInValue)
  ) {
    return outcome(criterion, 'UNIDAD INCOMPATIBLE', {
      comparison_type: comparison,
    }, rawValue);
  }

  const n = parsed.n;

  if (comparison === 'minimo') {
    const min = criterion.min_value;
    if (min == null) {
      return outcome(criterion, 'CONFIGURACIÓN AMBIGUA', {
        comparison_type: 'minimo',
        condition_failed: 'Comparación mínimo sin límite configurado.',
      }, rawValue);
    }
    if (n >= min) {
      return outcome(criterion, 'CUMPLE', {
        comparison_type: 'minimo',
        limit_min: min,
        deviation: null,
      }, rawValue);
    }
    return outcome(criterion, 'DESVIACIÓN', {
      comparison_type: 'minimo',
      limit_min: min,
      deviation: Number((min - n).toFixed(6)),
      condition_failed: `Valor ${n} < mínimo ${min}${criterion.unit ? ` ${criterion.unit}` : ''}`,
    }, rawValue);
  }

  if (comparison === 'maximo' || comparison === 'porcentual') {
    const max = criterion.max_value;
    if (max == null) {
      return outcome(criterion, 'CONFIGURACIÓN AMBIGUA', {
        comparison_type: comparison,
        condition_failed: 'Comparación máximo/porcentual sin límite configurado.',
      }, rawValue);
    }
    if (n <= max) {
      return outcome(criterion, 'CUMPLE', {
        comparison_type: comparison,
        limit_max: max,
        deviation: null,
      }, rawValue);
    }
    return outcome(criterion, 'DESVIACIÓN', {
      comparison_type: comparison,
      limit_max: max,
      deviation: Number((n - max).toFixed(6)),
      condition_failed: `Valor ${n} > máximo ${max}${criterion.unit ? ` ${criterion.unit}` : ''}`,
    }, rawValue);
  }

  // rango
  const min = criterion.min_value;
  const max = criterion.max_value;
  if (min == null || max == null) {
    return outcome(criterion, 'CONFIGURACIÓN AMBIGUA', {
      comparison_type: 'rango',
      condition_failed: 'Rango incompleto (requiere mínimo y máximo).',
    }, rawValue);
  }
  if (n >= min && n <= max) {
    return outcome(criterion, 'CUMPLE', {
      comparison_type: 'rango',
      limit_min: min,
      limit_max: max,
      deviation: null,
    }, rawValue);
  }
  const deviation =
    n < min
      ? Number((min - n).toFixed(6))
      : Number((n - max).toFixed(6));
  return outcome(criterion, 'DESVIACIÓN', {
    comparison_type: 'rango',
    limit_min: min,
    limit_max: max,
    deviation,
    condition_failed:
      n < min
        ? `Valor ${n} < mínimo ${min}${criterion.unit ? ` ${criterion.unit}` : ''}`
        : `Valor ${n} > máximo ${max}${criterion.unit ? ` ${criterion.unit}` : ''}`,
  }, rawValue);
}

/** Evaluación completa: resolver criterio + comparar. */
export function evaluateMeasurement(
  candidates: CriterionInput[],
  rawValue: string | null
): EvaluationOutcome {
  const resolved = resolveCriterion(candidates);
  if (!resolved.ok) {
    if (rawValue != null && resolved.outcome.result !== 'SIN CRITERIO CONFIGURADO') {
      resolved.outcome.observed_value = rawValue;
    }
    if (resolved.outcome.result === 'SIN CRITERIO CONFIGURADO') {
      resolved.outcome.observed_value = rawValue;
    }
    return resolved.outcome;
  }
  if (rawValue == null || !rawValue.trim()) {
    return evaluateValue(resolved.criterion, '');
  }
  return evaluateValue(resolved.criterion, rawValue);
}
