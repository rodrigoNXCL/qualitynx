// QUALITY ENGINE — servicio: carga contexto, evalúa y persiste evaluaciones.
// NO modifica measurements, lots, etapas ni decisiones.
import { createClient } from '@supabase/supabase-js';
import { evaluateMeasurement } from './engine';
import type { CriterionInput, EvaluationOutcome } from './types';

type Json = Record<string, unknown>;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin no configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function toCriterion(row: Json): CriterionInput {
  return {
    measurement_def_id: String(row.id),
    name: String(row.name ?? ''),
    value_type: String(row.value_type ?? ''),
    unit: row.unit == null ? null : String(row.unit),
    min_value: row.min_value == null ? null : Number(row.min_value),
    max_value: row.max_value == null ? null : Number(row.max_value),
    options: Array.isArray(row.options) ? (row.options as string[]) : null,
    is_active: !!row.is_active,
    evaluation_kind: (row.evaluation_kind as CriterionInput['evaluation_kind']) ?? null,
    acceptable_options: Array.isArray(row.acceptable_options)
      ? (row.acceptable_options as string[])
      : null,
    criteria_version: row.criteria_version == null ? 1 : Number(row.criteria_version),
    inspection_point_id: String(row.inspection_point_id ?? ''),
    company_id: String(row.company_id ?? ''),
  };
}

export interface EvaluateInspectionResult {
  evaluations: (EvaluationOutcome & {
    measurement_id: string;
    measurement_def_id: string;
    def_name: string;
    persisted_id?: string;
  })[];
  error: string | null;
  status: number;
}

/**
 * Evalúa todas las mediciones de una inspección y persiste quality_evaluations.
 * Append-only: no reescribe evaluaciones históricas.
 * Inspección COMPLETADA: solo devuelve evaluaciones ya persistidas (no re-evalúa con criterios actuales).
 */
export async function evaluateInspection(
  inspectionId: string,
  evaluatedBy?: string | null,
  opts?: { reevaluateCompleted?: boolean }
): Promise<EvaluateInspectionResult> {
  try {
    const sb = adminClient();
    const { data: insp, error: inspErr } = await sb
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();
    if (inspErr || !insp) {
      return { evaluations: [], error: 'Inspección no encontrada.', status: 404 };
    }

    const status = String((insp as Json).status ?? '');
    const companyId = String((insp as Json).company_id ?? '');

    // Histórico: no recalcular con criterios actuales salvo reevaluación explícita
    if (status === 'COMPLETADA' && !opts?.reevaluateCompleted) {
      const { data: existing } = await sb
        .from('quality_evaluations')
        .select('*, measurements!inner(id, measurement_def_id, value)')
        .eq('inspection_id', inspectionId)
        .order('evaluated_at', { ascending: false });
      const byMeas = new Map<string, Json>();
      for (const row of ((existing as Json[]) ?? [])) {
        const mid = String((row.measurements as Json)?.id ?? row.measurement_id);
        if (!byMeas.has(mid)) byMeas.set(mid, row);
      }
      const evaluations = [...byMeas.values()].map((row) => ({
        result: row.result as EvaluationOutcome['result'],
        observed_value: (row.observed_value as string | null) ?? null,
        comparison_type: (row.comparison_type as EvaluationOutcome['comparison_type']) ?? null,
        limit_min: row.limit_min == null ? null : Number(row.limit_min),
        limit_max: row.limit_max == null ? null : Number(row.limit_max),
        unit: (row.unit as string | null) ?? null,
        deviation: row.deviation == null ? null : Number(row.deviation),
        condition_failed: (row.condition_failed as string | null) ?? null,
        criterion_snapshot:
          (row.criterion_snapshot as EvaluationOutcome['criterion_snapshot']) ??
          ({
            measurement_def_id: String(row.measurement_def_id ?? ''),
            name: '',
            criteria_version: 0,
            value_type: '',
            unit: null,
            min_value: null,
            max_value: null,
            options: null,
            evaluation_kind: null,
            acceptable_options: null,
            is_active: true,
            inspection_point_id: '',
            company_id: String(row.company_id ?? ''),
            comparison_type: null,
          } satisfies EvaluationOutcome['criterion_snapshot']),
        measurement_id: String(row.measurement_id),
        measurement_def_id: String(row.measurement_def_id),
        def_name: String(
          ((row.criterion_snapshot as Json | null)?.name as string) ?? ''
        ),
        persisted_id: String(row.id),
      }));
      return { evaluations, error: null, status: 200 };
    }

    // QE evalúa el resultado CONSOLIDADO (sample_id IS NULL).
    // Mediciones por muestra se conservan pero no se promedian ni se evalúan solas (D-023).
    const [measRes, defsRes] = await Promise.all([
      sb
        .from('measurements')
        .select('*')
        .eq('inspection_id', inspectionId)
        .is('sample_id', null),
      sb
        .from('measurement_defs')
        .select('*')
        .eq('inspection_point_id', (insp as Json).inspection_point_id as string),
    ]);

    const measurements = ((measRes.data as Json[]) ?? []);
    const defs = ((defsRes.data as Json[]) ?? []).map(toCriterion);
    const defById = new Map(defs.map((d) => [d.measurement_def_id, d]));

    const evaluations: EvaluateInspectionResult['evaluations'] = [];

    for (const m of measurements) {
      const defId = String(m.measurement_def_id);
      const value = (m.value as string | null) ?? null;
      const primary = defById.get(defId);
      // Candidatos: el def de la medición + homónimos activos del punto
      // (si hubiera más de uno activo equivalente → amigüedad controlada)
      const candidates: CriterionInput[] = [];
      if (primary) candidates.push(primary);
      const nameKey = primary?.name.trim().toLowerCase() ?? '';
      if (nameKey) {
        for (const d of defs) {
          if (
            d.measurement_def_id !== defId &&
            d.name.trim().toLowerCase() === nameKey &&
            d.is_active
          ) {
            candidates.push(d);
          }
        }
      }
      if (!primary && candidates.length === 0) {
        // def inexistente en memoria: traerlo puntual (inactivo/borrado lógico)
        const { data: one } = await sb
          .from('measurement_defs')
          .select('*')
          .eq('id', defId)
          .maybeSingle();
        if (one) candidates.push(toCriterion(one as Json));
      }

      const outcome = evaluateMeasurement(candidates, value);
      const row = {
        company_id: companyId,
        inspection_id: inspectionId,
        measurement_id: String(m.id),
        measurement_def_id: defId,
        result: outcome.result,
        observed_value: outcome.observed_value,
        comparison_type: outcome.comparison_type,
        limit_min: outcome.limit_min,
        limit_max: outcome.limit_max,
        unit: outcome.unit,
        deviation: outcome.deviation,
        condition_failed: outcome.condition_failed,
        criterion_snapshot: outcome.criterion_snapshot,
        evaluated_by: evaluatedBy ?? ((insp as Json).inspector_id as string | null) ?? null,
      };
      const { data: saved, error: saveErr } = await sb
        .from('quality_evaluations')
        .insert(row as never)
        .select('id')
        .single();
      if (saveErr) {
        return {
          evaluations,
          error: `No se pudo persistir evaluación: ${saveErr.message}`,
          status: 500,
        };
      }
      evaluations.push({
        ...outcome,
        measurement_id: String(m.id),
        measurement_def_id: defId,
        def_name: outcome.criterion_snapshot.name || primary?.name || '',
        persisted_id: (saved as { id: string } | null)?.id,
      });
    }

    return { evaluations, error: null, status: 200 };
  } catch {
    return { evaluations: [], error: 'No pudimos evaluar la calidad. Intenta de nuevo.', status: 500 };
  }
}

/** Última evaluación por medición (para UI). */
export async function listLatestEvaluations(inspectionId: string) {
  const sb = adminClient();
  const { data, error } = await sb
    .from('quality_evaluations')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('evaluated_at', { ascending: false });
  if (error) return { data: [], error };
  const latest = new Map<string, Json>();
  for (const row of ((data as Json[]) ?? [])) {
    const mid = String(row.measurement_id);
    if (!latest.has(mid)) latest.set(mid, row);
  }
  return { data: [...latest.values()], error: null };
}
