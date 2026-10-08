// DECISIONS (06) — servicio: valida, captura contexto y persiste decisiones.
// La decisión es humana; QUALITY ENGINE no decide. Append-only + anulación.
import { createClient } from '@supabase/supabase-js';

type Json = Record<string, unknown>;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin no configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface RegisterDecisionInput {
  lot_id: string;
  decision_catalog_id?: string;
  decision_code?: string;
  inspection_id?: string | null;
  fundamento?: string | null;
  decided_by: string; // users.id
  company_id: string;
}

export interface DecisionResult {
  decision: Json | null;
  error: string | null;
  status: number;
}

async function buildContextSnapshot(sb: ReturnType<typeof adminClient>, lotId: string, inspectionId?: string | null) {
  const { data: lot } = await sb
    .from('lots')
    .select('id, harvest_block, status, current_operational_stage_id, species_id, company_id')
    .eq('id', lotId)
    .maybeSingle();

  const { data: inspections } = await sb
    .from('inspections')
    .select('id, status, result, decision, inspection_point_id, inspected_at, completed_at')
    .eq('lot_id', lotId)
    .order('inspected_at', { ascending: false })
    .limit(10);

  let quality: Json[] = [];
  const refInsp = inspectionId ?? (inspections as Json[] | null)?.[0]?.id;
  if (refInsp) {
    const { data: evals } = await sb
      .from('quality_evaluations')
      .select('measurement_def_id, result, observed_value, criterion_snapshot, evaluated_at')
      .eq('inspection_id', refInsp)
      .order('evaluated_at', { ascending: false })
      .limit(50);
    quality = (evals as Json[]) ?? [];
  }

  const { data: prior } = await sb
    .from('decisions')
    .select('id, decision_code, decision_label, status, decided_at, fundamento')
    .eq('lot_id', lotId)
    .order('decided_at', { ascending: false })
    .limit(5);

  return {
    lot: lot ?? null,
    inspections: (inspections as Json[]) ?? [],
    quality_evaluations: quality,
    prior_decisions: (prior as Json[]) ?? [],
    captured_at: new Date().toISOString(),
  };
}

async function applyEffect(
  sb: ReturnType<typeof adminClient>,
  companyId: string,
  decisionCode: string,
  inspectionId: string | null,
  lotId: string
): Promise<{ applied: boolean; note: string }> {
  const { data: effects } = await sb
    .from('decision_effects')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);
  const rows = ((effects as Json[]) ?? []).filter(
    (r) => String(r.decision_code ?? '').toLowerCase() === decisionCode.toLowerCase()
  );
  if (rows.length === 0) {
    return { applied: false, note: 'Sin efecto configurado (mapa PENDIENTE DE DECISIÓN).' };
  }

  let effect: Json | null = null;
  if (inspectionId) {
    effect = rows.find((r) => r.inspection_point_id === inspectionId) ?? null;
  }
  if (!effect) {
    effect = rows.find((r) => r.inspection_point_id == null) ?? null;
  }
  if (!effect) {
    return { applied: false, note: 'Sin efecto aplicable al contexto.' };
  }

  const targetStatus = effect.target_lot_status as string | null;
  const targetStage = effect.target_operational_stage_id as string | null;

  if (targetStatus) {
    const { data: lot } = await sb.from('lots').select('status').eq('id', lotId).maybeSingle();
    const current = lot ? String((lot as Json).status) : null;
    if (current === 'CERRADO') {
      return { applied: false, note: 'Lote CERRADO: efecto no aplicable.' };
    }
    if (current === targetStatus) {
      return { applied: false, note: `Lote ya en ${targetStatus}.` };
    }
    const { error } = await sb.from('lots').update({ status: targetStatus }).eq('id', lotId);
    if (error) {
      return { applied: false, note: 'No se pudo aplicar el efecto de estado. La decisión quedó registrada.' };
    }
  }

  if (targetStage) {
    const { error } = await sb
      .from('lots')
      .update({ current_operational_stage_id: targetStage })
      .eq('id', lotId);
    if (error) {
      return { applied: false, note: 'No se pudo aplicar el efecto de etapa. La decisión quedó registrada.' };
    }
  }

  return { applied: true, note: 'Efecto configurable aplicado.' };
}

/**
 * Registra una decisión operacional humana sobre un lote.
 * Validaciones 06 §9: lote, tipo, fundamento si corresponde, ámbito, duplicado.
 * No toma decisiones automáticas; snapshot de contexto al momento de decidir.
 */
export async function registerDecision(input: RegisterDecisionInput): Promise<DecisionResult> {
  try {
    const sb = adminClient();

    const { data: lot } = await sb
      .from('lots')
      .select('id, company_id, status, harvest_block')
      .eq('id', input.lot_id)
      .maybeSingle();
    if (!lot) {
      return { decision: null, error: 'Lote inexistente.', status: 404 };
    }
    if (String((lot as Json).company_id) !== input.company_id) {
      return { decision: null, error: 'El lote pertenece a otra empresa.', status: 403 };
    }
    if (String((lot as Json).status) === 'CERRADO') {
      return { decision: null, error: 'No se pueden registrar decisiones sobre un lote CERRADO.', status: 409 };
    }

    let catalogId = input.decision_catalog_id ?? null;
    let catalogRow: Json | null = null;

    if (catalogId) {
      const { data } = await sb
        .from('decision_catalog')
        .select('*')
        .eq('id', catalogId)
        .maybeSingle();
      catalogRow = (data as Json) ?? null;
    } else if (input.decision_code) {
      const { data } = await sb
        .from('decision_catalog')
        .select('*')
        .eq('company_id', input.company_id)
        .eq('is_active', true);
      catalogRow =
        ((data as Json[]) ?? []).find(
          (r) => String(r.code ?? '').toLowerCase() === input.decision_code!.toLowerCase()
        ) ?? null;
      catalogId = catalogRow ? String(catalogRow.id) : null;
    }

    if (!catalogRow || !catalogId) {
      return { decision: null, error: 'Tipo de decisión inválido o inactivo.', status: 400 };
    }
    if (String(catalogRow.company_id) !== input.company_id) {
      return { decision: null, error: 'Tipo de decisión de otra empresa.', status: 403 };
    }

    const fundamento = (input.fundamento ?? '').trim();
    if (catalogRow.requires_fundamento === true && !fundamento) {
      return {
        decision: null,
        error: `Este tipo de decisión exige fundamento (${String(catalogRow.code)}).`,
        status: 400,
      };
    }

    if (input.inspection_id) {
      const { data: insp } = await sb
        .from('inspections')
        .select('id, lot_id, company_id, status')
        .eq('id', input.inspection_id)
        .maybeSingle();
      if (!insp) {
        return { decision: null, error: 'Inspección inexistente.', status: 404 };
      }
      if (String((insp as Json).lot_id) !== input.lot_id) {
        return { decision: null, error: 'La inspección no pertenece al lote.', status: 400 };
      }
      if (String((insp as Json).company_id) !== input.company_id) {
        return { decision: null, error: 'Inspección de otra empresa.', status: 403 };
      }
      // Operación incompatible: inspección EN CURSO con mediciones pendientes no bloquea
      // la decisión de lote (la decisión es del responsable sobre el lote); solo se valida
      // la relación. Inspecciones incompletas quedan en el snapshot como contexto.
    }

    const code = String(catalogRow.code);
    const { data: activeDecisions } = await sb
      .from('decisions')
      .select('id, decision_code')
      .eq('lot_id', input.lot_id)
      .eq('status', 'REGISTRADA');
    const dup = ((activeDecisions as Json[]) ?? []).find(
      (r) => String(r.decision_code ?? '').toLowerCase() === code.toLowerCase()
    );
    if (dup) {
      return {
        decision: null,
        error: `Ya existe una decisión ${code} REGISTRADA para este lote; anúlela o use otro tipo.`,
        status: 409,
      };
    }

    const snapshot = await buildContextSnapshot(sb, input.lot_id, input.inspection_id);

    const priorActive = await sb
      .from('decisions')
      .select('id')
      .eq('lot_id', input.lot_id)
      .eq('status', 'REGISTRADA')
      .order('decided_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      company_id: input.company_id,
      lot_id: input.lot_id,
      inspection_id: input.inspection_id ?? null,
      decision_catalog_id: catalogId,
      decision_code: code,
      decision_label: String(catalogRow.label ?? code),
      fundamento: fundamento || null,
      context_snapshot: snapshot,
      decided_by: input.decided_by,
      supersedes_decision_id: (priorActive.data as Json | null)?.id ?? null,
    };

    const { data: created, error } = await sb
      .from('decisions')
      .insert(payload as never)
      .select()
      .single();

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return { decision: null, error: 'Decisión duplicada: ya existe este tipo REGISTRADA en el lote.', status: 409 };
      }
      if (msg.includes('CERRADO') || msg.includes('closed')) {
        return { decision: null, error: 'El lote está CERRADO: no admite nuevas decisiones.', status: 409 };
      }
      return { decision: null, error: 'No pudimos registrar la decisión. Intenta de nuevo.', status: 500 };
    }

    const effect = await applyEffect(
      sb,
      input.company_id,
      code,
      input.inspection_id ?? null,
      input.lot_id
    );

    return {
      decision: { ...(created as Json), _effect: effect },
      error: null,
      status: 201,
    };
  } catch {
    return { decision: null, error: 'No pudimos registrar la decisión. Intenta de nuevo.', status: 500 };
  }
}

/** Anula una decisión REGISTRADA (nunca borra físico). Requiere motivo. */
export async function annulDecisionRecord(
  decisionId: string,
  annulledBy: string,
  annulReason: string,
  companyId: string
): Promise<DecisionResult> {
  try {
    const reason = (annulReason ?? '').trim();
    if (!reason) {
      return { decision: null, error: 'La anulación requiere motivo.', status: 400 };
    }

    const sb = adminClient();
    const { data: existing } = await sb
      .from('decisions')
      .select('*')
      .eq('id', decisionId)
      .maybeSingle();
    if (!existing) {
      return { decision: null, error: 'Decisión inexistente.', status: 404 };
    }
    if (String((existing as Json).company_id) !== companyId) {
      return { decision: null, error: 'Decisión de otra empresa.', status: 403 };
    }
    if (String((existing as Json).status) !== 'REGISTRADA') {
      return { decision: null, error: 'Solo se pueden anular decisiones REGISTRADAS.', status: 409 };
    }

    const { data: updated, error } = await sb
      .from('decisions')
      .update({
        status: 'ANULADA',
        annulled_by: annulledBy,
        annulled_at: new Date().toISOString(),
        annul_reason: reason,
      } as never)
      .eq('id', decisionId)
      .eq('status', 'REGISTRADA')
      .select()
      .single();

    if (error) {
      return { decision: null, error: 'No pudimos anular la decisión. Intenta de nuevo.', status: 500 };
    }
    return { decision: updated as Json, error: null, status: 200 };
  } catch {
    return { decision: null, error: 'No pudimos anular la decisión. Intenta de nuevo.', status: 500 };
  }
}
