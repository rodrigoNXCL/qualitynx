// AI Service — fachada desacoplada (contexto → proveedor → validación → persistencia).
import { createClient } from '@supabase/supabase-js';
import { chatCompletion } from './openrouter.provider';
import {
  buildSystemPrompt,
  buildUserPrompt,
  isOutOfRange,
  parseAiResponse,
} from './inspection-ai';
import type { AiAnalysisSuccess, AiCriterionInput, AiInspectionContext } from './types';
import { AI_PROMPT_VERSION } from './types';

type Json = Record<string, unknown>;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin no configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function analyzeInspection(inspectionId: string): Promise<{
  analysis: (AiAnalysisSuccess & { id: string; learning_id: string | null }) | null;
  error: string | null;
  status: number;
}> {
  try {
    const sb = adminClient();

    const { data: insp, error: inspErr } = await sb
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();
    if (inspErr || !insp) {
      return { analysis: null, error: 'Inspección no encontrada.', status: 404 };
    }

    const [lotRes, pointRes, defsRes, measRes, samplesRes, evRes, priorRes] =
      await Promise.all([
        sb.from('lots').select('*').eq('id', (insp as Json).lot_id as string).single(),
        sb
          .from('inspection_points')
          .select('*')
          .eq('id', (insp as Json).inspection_point_id as string)
          .single(),
        sb
          .from('measurement_defs')
          .select('*')
          .eq('inspection_point_id', (insp as Json).inspection_point_id as string)
          .eq('is_active', true)
          .order('sort_order')
          .order('name'),
        sb.from('measurements').select('*').eq('inspection_id', inspectionId),
        sb.from('samples').select('*').eq('inspection_id', inspectionId),
        sb.from('inspection_evidence').select('*').eq('inspection_id', inspectionId),
        sb
          .from('inspections')
          .select('id, inspection_point_id, status, result, decision, inspected_at')
          .eq('lot_id', (insp as Json).lot_id as string)
          .neq('id', inspectionId)
          .order('inspected_at', { ascending: false })
          .limit(5),
      ]);

    const lot = lotRes.data as
      | (Json & {
          species_id?: string;
          variety_id?: string;
          producer_id?: string;
          harvest_block?: string;
          fruit_date?: string;
          status?: string;
          current_operational_stage_id?: string | null;
        })
      | null;
    const point = pointRes.data as
      | (Json & { name?: string; species_id?: string; operational_stage_id?: string | null })
      | null;
    const defs = ((defsRes.data as Record<string, unknown>[]) ?? []) as Json[];
    const meas = ((measRes.data as Record<string, unknown>[]) ?? []) as Json[];
    const samples = ((samplesRes.data as Record<string, unknown>[]) ?? []) as Json[];
    const evidence = ((evRes.data as Record<string, unknown>[]) ?? []) as Json[];
    const prior = ((priorRes.data as Record<string, unknown>[]) ?? []) as Json[];

    // Lookup master (nombres)
    const [speciesRes, varietyRes, producerRes, stagesRes, pointsAllRes] = await Promise.all([
      lot?.species_id
        ? sb.from('species').select('id, name').eq('id', lot.species_id).single()
        : Promise.resolve({ data: null }),
      lot?.variety_id
        ? sb.from('varieties').select('id, name').eq('id', lot.variety_id).single()
        : Promise.resolve({ data: null }),
      lot?.producer_id
        ? sb.from('producers').select('id, name').eq('id', lot.producer_id).single()
        : Promise.resolve({ data: null }),
      sb.from('operational_stages').select('id, name'),
      sb.from('inspection_points').select('id, name'),
    ]);

    const stageById = new Map(
      ((stagesRes.data as Json[]) ?? []).map((s) => [s.id as string, s.name as string])
    );
    const pointById = new Map(
      ((pointsAllRes.data as Json[]) ?? []).map((p) => [p.id as string, p.name as string])
    );

    const measByDef = new Map<string, Json>();
    for (const m of meas) measByDef.set(m.measurement_def_id as string, m);

    const criteria: AiCriterionInput[] = defs.map((d) => {
      const m = measByDef.get(d.id as string);
      const value = (m?.value as string | null) ?? null;
      const min = d.min_value == null ? null : Number(d.min_value);
      const max = d.max_value == null ? null : Number(d.max_value);
      return {
        id: String(d.id),
        name: String(d.name ?? ''),
        value_type: String(d.value_type ?? ''),
        unit: d.unit == null ? null : String(d.unit),
        value,
        is_required: !!d.is_required,
        min_value: Number.isFinite(min as number) ? (min as number) : null,
        max_value: Number.isFinite(max as number) ? (max as number) : null,
        info_text: d.info_text == null ? null : String(d.info_text),
        recommendation_text: d.recommendation_text == null ? null : String(d.recommendation_text),
        method_text: d.method_text == null ? null : String(d.method_text),
        criteria_version: d.criteria_version == null ? 1 : Number(d.criteria_version),
        out_of_range: isOutOfRange(
          value,
          Number.isFinite(min as number) ? (min as number) : null,
          Number.isFinite(max as number) ? (max as number) : null
        ),
      };
    });

    const missing = criteria.filter((c) => c.is_required && !c.value);
    const dataQuality: string[] = [];
    if (missing.length) {
      dataQuality.push(
        `Faltan criterios obligatorios: ${missing.map((c) => c.name).join(', ')}.`
      );
    }
    if (!evidence.length) dataQuality.push('Sin evidencia fotográfica registrada.');
    if (!(insp as Json).result) dataQuality.push('Sin resultado técnico registrado.');
    if (!(insp as Json).decision) dataQuality.push('Sin decisión del inspector aún.');
    if (!samples.length) dataQuality.push('Sin muestras registradas.');

    const ctx: AiInspectionContext = {
      inspection_id: inspectionId,
      lot: lot
        ? {
            id: lot.id as string,
            harvest_block: (lot.harvest_block as string) ?? '',
            fruit_date: (lot.fruit_date as string) ?? '',
            status: (lot.status as string) ?? '',
            operational_stage: lot.current_operational_stage_id
              ? (stageById.get(lot.current_operational_stage_id) ?? null)
              : null,
          }
        : null,
      species: lot?.species_id
        ? (((speciesRes.data as Json | null)?.name as string) ?? null)
        : null,
      variety: lot?.variety_id
        ? (((varietyRes.data as Json | null)?.name as string) ?? null)
        : null,
      producer: lot?.producer_id
        ? (((producerRes.data as Json | null)?.name as string) ?? null)
        : null,
      inspection_point: point?.name ?? null,
      operational_stage: point?.operational_stage_id
        ? (stageById.get(point.operational_stage_id) ?? null)
        : null,
      inspected_at: (insp as Json).inspected_at as string,
      status: (insp as Json).status as string,
      observations: ((insp as Json).observations as string | null) ?? null,
      technical_result: ((insp as Json).result as string | null) ?? null,
      inspector_decision: ((insp as Json).decision as string | null) ?? null,
      criteria,
      samples: samples.map((s) => ({
        label: (s.label as string | null) ?? null,
        fruit_quantity: (s.fruit_quantity as number | null) ?? null,
        notes: (s.notes as string | null) ?? null,
      })),
      evidence_count: evidence.length,
      prior_inspections: prior.map((p) => ({
        point: pointById.get(p.inspection_point_id as string) ?? null,
        status: p.status as string,
        result: (p.result as string | null) ?? null,
        decision: (p.decision as string | null) ?? null,
        inspected_at: p.inspected_at as string,
      })),
    };

    // Reintenta chat+parse si el modelo FREE devuelve JSON inválido (hasta 3 intentos)
    let parsed: AiAnalysisSuccess | null = null;
    let lastParseErr: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const chat = await chatCompletion(
          buildSystemPrompt(),
          buildUserPrompt(ctx)
        );
        parsed = parseAiResponse(chat.content, chat.model, chat.model_version);
        break;
      } catch (err) {
        lastParseErr = err instanceof Error ? err : new Error('Fallo de IA.');
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    if (!parsed) {
      throw lastParseErr ?? new Error('La respuesta del modelo no es JSON válido.');
    }
    if (dataQuality.length && !parsed.data_quality_warnings.length) {
      parsed.data_quality_warnings = dataQuality;
    }

    // Snapshot mínimo reconstruible (sin PII innecesaria)
    const input_snapshot = {
      prompt_version: AI_PROMPT_VERSION,
      model_requested: process.env.OPENROUTER_MODEL || 'openrouter/free',
      context: ctx,
      hints: { data_quality: dataQuality },
    };

    const { data: analysisRow, error: insAnalysisErr } = await sb
      .from('ai_inspection_analysis')
      .insert({
        company_id: (insp as Json).company_id,
        inspection_id: inspectionId,
        model: parsed.model,
        model_version: parsed.model_version,
        prompt_version: parsed.prompt_version,
        input_snapshot,
        recommendation: parsed.recommendation,
        reasoning_summary: parsed.reasoning_summary,
        confidence: parsed.confidence,
        alerts: parsed.alerts,
        supporting_factors: parsed.supporting_factors,
        data_quality_warnings: parsed.data_quality_warnings,
        created_by: (insp as Json).inspector_id,
      })
      .select('id')
      .single();

    if (insAnalysisErr || !analysisRow) {
      return {
        analysis: null,
        error: 'No pudimos guardar el análisis de IA. La inspección puede continuar.',
        status: 500,
      };
    }

    const decision = (insp as Json).decision as string | null;
    let agreement: boolean | null = null;
    if (decision) {
      const a = parsed.recommendation.toUpperCase();
      const d = decision.toUpperCase();
      // Coincidencia laxa: misma opción o contención mutua (p.ej. APROBAR vs LIBERAR no se fuerza)
      agreement = a === d || (a.includes(d) || d.includes(a));
    }

    const { data: learningRow } = await sb
      .from('ai_learning_records')
      .insert({
        company_id: (insp as Json).company_id,
        inspection_id: inspectionId,
        ai_analysis_id: (analysisRow as { id: string }).id,
        recommendation_ai: parsed.recommendation,
        decision_inspector: decision,
        decision_inspector_user_id: decision ? ((insp as Json).inspector_id as string) : null,
        decision_inspector_at: decision
          ? ((insp as Json).updated_at as string)
          : null,
        agreement,
        validated: false,
      })
      .select('id')
      .single();

    return {
      analysis: {
        ...parsed,
        id: (analysisRow as { id: string }).id,
        learning_id: (learningRow as { id: string } | null)?.id ?? null,
      },
      error: null,
      status: 200,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de IA.';
    // La inspección debe continuar aunque falle la IA
    return { analysis: null, error: msg, status: 502 };
  }
}

/** Sincroniza decisión humana + agreement en learning records al guardar la inspección. */
export async function syncLearningWithDecision(inspectionId: string): Promise<void> {
  try {
    const sb = adminClient();
    const { data: insp } = await sb
      .from('inspections')
      .select('id, decision, inspector_id, updated_at, company_id')
      .eq('id', inspectionId)
      .single();
    if (!insp) return;
    const decision = (insp as { decision: string | null }).decision;
    const { data: records } = await sb
      .from('ai_learning_records')
      .select('id, recommendation_ai')
      .eq('inspection_id', inspectionId);
    if (!records?.length) return;

    for (const r of records as { id: string; recommendation_ai: string }[]) {
      let agreement: boolean | null = null;
      if (decision) {
        const a = r.recommendation_ai.toUpperCase();
        const d = decision.toUpperCase();
        agreement = a === d || a.includes(d) || d.includes(a);
      }
      await sb
        .from('ai_learning_records')
        .update({
          decision_inspector: decision,
          decision_inspector_user_id: decision
            ? (insp as { inspector_id: string }).inspector_id
            : null,
          decision_inspector_at: decision
            ? (insp as { updated_at: string }).updated_at
            : null,
          agreement,
        })
        .eq('id', r.id);
    }
  } catch {
    // learning es best-effort; no bloquea la inspección
  }
}
