// CLASIFICACIÓN COMERCIAL + SEMÁFORO QUALITYNX
// Se deriva de evaluaciones Quality Engine (+ resumen IA en justificación).
// El inspector NO elige el color. La IA no reemplaza QE ni decide.
// Semáforo: categorías operacionales QualityNX (no SAG).
// Clase comercial: mapeo operacional por defecto; matriz por especie/mercado = futura.
import { createClient } from '@supabase/supabase-js';
import { QualitySemaphore, type QualitySemaphore as Semaphore } from '@qualitynx/shared';

export const CLASSIFICATION_LOGIC_VERSION = 'qnx-classify-2026-09-24-v1';

type Json = Record<string, unknown>;

export interface DeriveInput {
  evaluations: {
    result: string;
    criterion_name?: string;
    observed_value?: string | null;
    unit?: string | null;
    limit_min?: number | null;
    limit_max?: number | null;
  }[];
  ai?: {
    id: string;
    recommendation: string;
    reasoning_summary: string | null;
    alerts: string[] | null;
    confidence: number | null;
  } | null;
  technicalResult?: string | null;
  observations?: string | null;
}

export interface DerivedClassification {
  commercial_class: string;
  semaphore: Semaphore;
  justification: string;
  source_snapshot: Json;
  logic_version: string;
  ai_analysis_id: string | null;
  ai_used: boolean;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin no configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function asText(v: string | null | undefined): string {
  return (v ?? '').trim();
}

/**
 * Mapeo operacional por defecto (lógica versionada; NO es normativa SAG).
 * Clases: CLASE I / CLASE II / FUERA DE ESPECIFICACIÓN / SIN CLASIFICAR.
 * Cuando exista matriz por especie/mercado, reemplazar este mapeo (nueva logic_version).
 *
 * Semáforo operacional QualityNX:
 * - VERDE: sin desviaciones evaluables
 * - AMARILLO: desviaciones presentes (atención/seguimiento)
 * - ROJO: desviaciones mayoritarias o totalidad de evaluables
 */
export function deriveFromEvaluations(input: DeriveInput): DerivedClassification {
  const evals = input.evaluations ?? [];
  const cumple = evals.filter((e) => e.result === 'CUMPLE');
  const desvio = evals.filter((e) => e.result === 'DESVIACIÓN');
  const evaluable = cumple.length + desvio.length;

  let commercialClass: string;
  let semaphore: Semaphore;
  let baseReason: string;

  if (evaluable === 0) {
    commercialClass = 'SIN CLASIFICAR';
    semaphore = QualitySemaphore.AMARILLO;
    baseReason =
      'No hay criterios evaluables con CUMPLE/DESVIACIÓN en el Quality Engine de esta inspección.';
  } else if (desvio.length === 0) {
    commercialClass = 'CLASE I';
    semaphore = QualitySemaphore.VERDE;
    baseReason = `Quality Engine: ${cumple.length} criterio(s) CUMPLEN y 0 desviaciones.`;
  } else if (desvio.length < cumple.length) {
    commercialClass = 'CLASE II';
    semaphore = QualitySemaphore.AMARILLO;
    baseReason = `Quality Engine: ${cumple.length} CUMPLEN y ${desvio.length} DESVIACIÓN(ES) (desviaciones no mayoritarias).`;
  } else {
    commercialClass = 'FUERA DE ESPECIFICACIÓN';
    semaphore = QualitySemaphore.ROJO;
    baseReason = `Quality Engine: ${desvio.length} DESVIACIÓN(ES) y ${cumple.length} CUMPLEN (desviaciones mayoritarias o totalidad de evaluables).`;
  }

  const desvioNames = desvio
    .map((e) => asText(e.criterion_name))
    .filter(Boolean)
    .slice(0, 8);

  const parts: string[] = [baseReason];
  if (desvioNames.length) {
    parts.push(`Desviaciones: ${desvioNames.join(', ')}.`);
  }

  let aiUsed = false;
  let aiAnalysisId: string | null = null;
  if (input.ai) {
    aiUsed = true;
    aiAnalysisId = input.ai.id;
    const bits: string[] = [];
    if (input.ai.recommendation) bits.push(`recomendación IA: ${input.ai.recommendation}`);
    if (input.ai.reasoning_summary) bits.push(input.ai.reasoning_summary);
    if (input.ai.alerts?.length) bits.push(`alertas IA: ${input.ai.alerts.slice(0, 5).join(' | ')}`);
    if (bits.length) {
      parts.push(`Análisis IA (informativo, no decide): ${bits.join(' · ')}.`);
    }
  }

  parts.push(
    'Clasificación y semáforo generados por QualityNX a partir de datos + QE; el responsable de calidad mantiene la decisión formal.'
  );

  const source_snapshot: Json = {
    logic_version: CLASSIFICATION_LOGIC_VERSION,
    counts: {
      total: evals.length,
      cumple: cumple.length,
      desviacion: desvio.length,
      other: evals.length - evaluable,
      evaluable,
    },
    desviaciones: desvioNames,
    technical_result: asText(input.technicalResult) || null,
    ai_used: aiUsed,
    ai_recommendation: input.ai?.recommendation ?? null,
    ai_confidence: input.ai?.confidence ?? null,
    semaphore_meaning: {
      VERDE: 'Condición estable, sin alertas relevantes que requieran acción inmediata.',
      AMARILLO: 'Existen desviaciones o condiciones que requieren atención o seguimiento.',
      ROJO: 'Existen desviaciones o condiciones relevantes que requieren atención prioritaria.',
    },
    note: 'Semáforo operacional QualityNX (no SAG). Clase comercial = mapeo operacional; matriz por especie/mercado pendiente de configurar.',
  };

  return {
    commercial_class: commercialClass,
    semaphore,
    justification: parts.join(' '),
    source_snapshot,
    logic_version: CLASSIFICATION_LOGIC_VERSION,
    ai_analysis_id: aiAnalysisId,
    ai_used: aiUsed,
  };
}

export interface ClassifyResult {
  classification: (DerivedClassification & { id: string }) | null;
  error: string | null;
  status: number;
}

/**
 * Genera y persiste (append-only) la clasificación de una inspección.
 * Carga QE + última IA; no modifica mediciones, QE ni decisiones.
 * Reintentable: si ya existe para la inspección, devuelve la existente (200).
 */
export async function classifyInspection(
  inspectionId: string,
  classifiedBy?: string | null
): Promise<ClassifyResult> {
  try {
    const sb = adminClient();
    const { data: insp, error: inspErr } = await sb
      .from('inspections')
      .select('id, company_id, lot_id, status, result, decision, observations, inspector_id')
      .eq('id', inspectionId)
      .single();
    if (inspErr || !insp) {
      return { classification: null, error: 'Inspección no encontrada.', status: 404 };
    }

    const { data: existing } = await sb
      .from('quality_classifications')
      .select('*')
      .eq('inspection_id', inspectionId)
      .maybeSingle();
    if (existing) {
      const row = existing as Json;
      return {
        classification: {
          id: String(row.id),
          commercial_class: String(row.commercial_class),
          semaphore: row.semaphore as Semaphore,
          justification: String(row.justification ?? ''),
          source_snapshot: (row.source_snapshot as Json) ?? {},
          logic_version: String(row.logic_version ?? CLASSIFICATION_LOGIC_VERSION),
          ai_analysis_id: (row.ai_analysis_id as string | null) ?? null,
          ai_used: !!row.ai_used,
        },
        error: null,
        status: 200,
      };
    }

    const [qeRes, aiRes] = await Promise.all([
      sb
        .from('quality_evaluations')
        .select('result, observed_value, unit, limit_min, limit_max, criterion_snapshot')
        .eq('inspection_id', inspectionId)
        .order('evaluated_at', { ascending: false }),
      sb
        .from('ai_inspection_analysis')
        .select('id, recommendation, reasoning_summary, alerts, confidence, created_at')
        .eq('inspection_id', inspectionId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const qeRows = ((qeRes.data as Json[]) ?? []);
    // Última evaluación por medición (misma pauta que listLatestEvaluations)
    const byMeas = new Map<string, Json>();
    const { data: qeAll } = await sb
      .from('quality_evaluations')
      .select('measurement_id, result, observed_value, unit, limit_min, limit_max, criterion_snapshot, evaluated_at')
      .eq('inspection_id', inspectionId)
      .order('evaluated_at', { ascending: false });
    for (const row of ((qeAll as Json[]) ?? qeRows)) {
      const mid = String(row.measurement_id ?? '');
      if (mid && !byMeas.has(mid)) byMeas.set(mid, row);
    }
    const latest = byMeas.size ? [...byMeas.values()] : qeRows;

    const evaluations = latest.map((row) => {
      const snap = (row.criterion_snapshot as Json | null) ?? {};
      return {
        result: String(row.result ?? ''),
        criterion_name: String(snap.name ?? snap.display_name ?? ''),
        observed_value: (row.observed_value as string | null) ?? null,
        unit: (row.unit as string | null) ?? null,
        limit_min: row.limit_min == null ? null : Number(row.limit_min),
        limit_max: row.limit_max == null ? null : Number(row.limit_max),
      };
    });

    const aiRow = ((aiRes.data as Json[]) ?? [])[0] ?? null;
    const ai = aiRow
      ? {
          id: String(aiRow.id),
          recommendation: String(aiRow.recommendation ?? ''),
          reasoning_summary: (aiRow.reasoning_summary as string | null) ?? null,
          alerts: Array.isArray(aiRow.alerts) ? (aiRow.alerts as string[]) : null,
          confidence: aiRow.confidence == null ? null : Number(aiRow.confidence),
        }
      : null;

    const derived = deriveFromEvaluations({
      evaluations,
      ai,
      technicalResult: (insp as Json).result as string | null,
      observations: (insp as Json).observations as string | null,
    });

    const { data: saved, error: saveErr } = await sb
      .from('quality_classifications')
      .insert({
        company_id: (insp as Json).company_id,
        lot_id: (insp as Json).lot_id,
        inspection_id: inspectionId,
        commercial_class: derived.commercial_class,
        semaphore: derived.semaphore,
        justification: derived.justification,
        source_snapshot: derived.source_snapshot,
        logic_version: derived.logic_version,
        ai_analysis_id: derived.ai_analysis_id,
        ai_used: derived.ai_used,
        classified_by: classifiedBy ?? ((insp as Json).inspector_id as string | null) ?? null,
      })
      .select('id')
      .single();

    if (saveErr || !saved) {
      // 23505 = ya clasificada (única por inspección)
      if (saveErr?.code === '23505') {
        return classifyInspection(inspectionId, classifiedBy);
      }
      return {
        classification: null,
        error: `No se pudo persistir la clasificación: ${saveErr?.message ?? 'error desconocido'}`,
        status: 500,
      };
    }

    return {
      classification: { ...derived, id: String((saved as { id: string }).id) },
      error: null,
      status: 200,
    };
  } catch (err) {
    return {
      classification: null,
      error: err instanceof Error ? err.message : 'Error al clasificar.',
      status: 500,
    };
  }
}
