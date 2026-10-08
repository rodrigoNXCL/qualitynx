// TRACEABILITY (07) — capa de consulta semántica sobre fuentes existentes.
// NO crea eventos de dominio ni decide transiciones.
// Reutiliza: audit_logs, lot_stage_events, inspections, quality_evaluations, decisions.
import { createClient } from '@supabase/supabase-js';
import type {
  TraceabilityEvent,
  TraceabilityEventType,
} from '@qualitynx/shared';

type Json = Record<string, unknown>;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin no configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface LotTraceabilityResult {
  lot: Json | null;
  events: TraceabilityEvent[];
  error: string | null;
  status: number;
}

function asRecord(v: unknown): Json | null {
  return v && typeof v === 'object' ? (v as Json) : null;
}

function pickStatus(state: Json | null): string | null {
  if (!state) return null;
  const s = state['status'];
  return typeof s === 'string' ? s : null;
}

function relevantLotUpdate(prev: Json | null, next: Json | null): boolean {
  if (!prev || !next) return true;
  const keys = [
    'status',
    'harvest_block',
    'fruit_date',
    'producer_id',
    'variety_id',
    'species_id',
    'field_id',
    'block_id',
    'season_id',
    'current_operational_stage_id',
    'entry_operational_stage_id',
  ];
  return keys.some((k) => String(prev[k] ?? '') !== String(next[k] ?? ''));
}

function relevantInspectionUpdate(prev: Json | null, next: Json | null): boolean {
  if (!prev || !next) return false;
  const keys = [
    'status',
    'result',
    'decision',
    'completed_at',
    'observations',
    'inspection_point_id',
    'previous_inspection_id',
    'recommendation',
  ];
  return keys.some((k) => String(prev[k] ?? '') !== String(next[k] ?? ''));
}

function eventTypeForInspectionUpdate(prev: Json | null, next: Json | null): TraceabilityEventType {
  const prevStatus = String(prev?.['status'] ?? '');
  const nextStatus = String(next?.['status'] ?? '');
  if (prevStatus !== nextStatus && nextStatus === 'COMPLETADA') {
    return 'INSPECTION_COMPLETED';
  }
  return 'INSPECTION_UPDATED';
}

/**
 * Historia cronológica de un lote.
 * Valida existencia + aislamiento por empresa antes de leer fuentes.
 */
export async function getLotTraceability(
  lotId: string,
  scope: { companyId: string | null; role: string }
): Promise<LotTraceabilityResult> {
  const sb = adminClient();

  const { data: lot, error: lotErr } = await sb
    .from('lots')
    .select('*')
    .eq('id', lotId)
    .maybeSingle();

  if (lotErr) {
    return { lot: null, events: [], error: 'No se pudo leer el lote.', status: 500 };
  }
  if (!lot) {
    return { lot: null, events: [], error: 'Lote inexistente.', status: 404 };
  }

  const lotCompany = String((lot as Json).company_id);
  if (scope.role !== 'SUPER_ADMIN' && scope.companyId && lotCompany !== scope.companyId) {
    return { lot: null, events: [], error: 'El lote pertenece a otra empresa.', status: 403 };
  }

  const companyId = scope.role === 'SUPER_ADMIN' && !scope.companyId ? lotCompany : scope.companyId ?? lotCompany;

  const [stagesRes, inspectionsRes, decisionsRes, auditLotRes] = await Promise.all([
    sb.from('lot_stage_events').select('*').eq('lot_id', lotId).order('occurred_at', { ascending: true }),
    sb.from('inspections').select('*').eq('lot_id', lotId).order('created_at', { ascending: true }),
    sb.from('decisions').select('*').eq('lot_id', lotId).order('decided_at', { ascending: true }),
    sb
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'lots')
      .eq('entity_id', lotId)
      .order('created_at', { ascending: true }),
  ]);

  if (stagesRes.error || inspectionsRes.error || decisionsRes.error || auditLotRes.error) {
    return { lot: null, events: [], error: 'No se pudo construir la historia.', status: 500 };
  }

  const stages = (stagesRes.data as Json[]) ?? [];
  const inspections = (inspectionsRes.data as Json[]) ?? [];
  const decisions = (decisionsRes.data as Json[]) ?? [];
  const auditLots = ((auditLotRes.data as Json[]) ?? []).filter(
    (r) => String(r['company_id'] ?? '') === companyId || scope.role === 'SUPER_ADMIN'
  );

  const inspectionIds = inspections.map((i) => String(i['id']));
  let evals: Json[] = [];
  let auditInspections: Json[] = [];

  if (inspectionIds.length > 0) {
    const [evalsRes, auditInspRes] = await Promise.all([
      sb
        .from('quality_evaluations')
        .select('*')
        .in('inspection_id', inspectionIds)
        .order('evaluated_at', { ascending: true }),
      sb
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'inspections')
        .in('entity_id', inspectionIds)
        .order('created_at', { ascending: true }),
    ]);
    if (evalsRes.error || auditInspRes.error) {
      return { lot: null, events: [], error: 'No se pudo construir la historia.', status: 500 };
    }
    evals = (evalsRes.data as Json[]) ?? [];
    auditInspections = (auditInspRes.data as Json[]) ?? [];
  }

  // Nombres de actores (mínimo)
  const actorIds = new Set<string>();
  for (const r of [
    ...stages,
    ...inspections,
    ...decisions,
    ...evals,
    ...auditLots,
    ...auditInspections,
  ]) {
    const candidates = [
      r['user_id'],
      r['inspector_id'],
      r['decided_by'],
      r['annulled_by'],
      r['evaluated_by'],
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c) actorIds.add(c);
    }
  }

  let names = new Map<string, string>();
  if (actorIds.size > 0) {
    const { data: users } = await sb
      .from('users')
      .select('id, full_name')
      .in('id', Array.from(actorIds));
    names = new Map(
      ((users as { id: string; full_name: string }[]) ?? []).map((u) => [u.id, u.full_name])
    );
  }

  const events: TraceabilityEvent[] = [];

  const push = (
    e: Omit<TraceabilityEvent, 'actor_name' | 'company_id'> & { company_id?: string }
  ) => {
    const { company_id: eCompany, ...rest } = e;
    events.push({
      ...rest,
      company_id: eCompany || companyId,
      actor_name: rest.actor_user_id ? names.get(rest.actor_user_id) ?? null : null,
    });
  };

  // --- audit_logs del lote: creación, modificación, cambio de estado ---
  for (const row of auditLots) {
    const action = String(row['action'] ?? '');
    const prev = asRecord(row['previous_value']);
    const next = asRecord(row['new_value']);
    const prevStatus = pickStatus(prev);
    const nextStatus = pickStatus(next);
    const actor = typeof row['user_id'] === 'string' ? row['user_id'] : null;
    const base = {
      id: String(row['id']),
      entity_type: 'lots',
      entity_id: lotId,
      operation: action,
      actor_user_id: actor,
      occurred_at: String(row['created_at']),
      source: 'audit_logs' as const,
      company_id: String(row['company_id'] ?? companyId),
    };

    if (action === 'CREATE') {
      push({
        ...base,
        event_type: 'LOT_CREATED',
        previous_state: null,
        new_state: next,
        context: { harvest_block: next?.['harvest_block'], status: nextStatus },
      });
      continue;
    }

    if (action === 'UPDATE') {
      if (prevStatus && nextStatus && prevStatus !== nextStatus) {
        push({
          ...base,
          event_type: 'LOT_STATUS_CHANGED',
          previous_state: { status: prevStatus },
          new_state: { status: nextStatus },
          context: {
            previous_status: prevStatus,
            new_status: nextStatus,
            reason: row['reason'] ?? null,
          },
        });
      }
      if (relevantLotUpdate(prev, next)) {
        push({
          ...base,
          event_type: 'LOT_UPDATED',
          previous_state: prev,
          new_state: next,
          context: { fields: Object.keys(next ?? {}) },
        });
      }
      continue;
    }

    if (action === 'DELETE') {
      push({
        ...base,
        event_type: 'LOT_UPDATED',
        previous_state: prev,
        new_state: null,
        context: { operation: 'DELETE' },
      });
    }
  }

  // --- audit de inspecciones: creación + cambios relevantes ---
  for (const row of auditInspections) {
    const action = String(row['action'] ?? '');
    const prev = asRecord(row['previous_value']);
    const next = asRecord(row['new_value']);
    const entity = String(row['entity_id'] ?? '');
    const actor = typeof row['user_id'] === 'string' ? row['user_id'] : null;
    const inspection = inspections.find((i) => String(i['id']) === entity);
    const base = {
      id: String(row['id']),
      entity_type: 'inspections',
      entity_id: entity,
      operation: action,
      actor_user_id: actor ?? (inspection ? String(inspection['inspector_id']) : null),
      occurred_at: String(row['created_at']),
      source: 'audit_logs' as const,
      company_id: String(row['company_id'] ?? companyId),
    };

    if (action === 'CREATE') {
      push({
        ...base,
        event_type: 'INSPECTION_CREATED',
        previous_state: null,
        new_state: { status: next?.['status'], inspection_point_id: next?.['inspection_point_id'] },
        context: {
          lot_id: lotId,
          inspection_point_id: next?.['inspection_point_id'],
          status: next?.['status'],
          previous_inspection_id: next?.['previous_inspection_id'] ?? null,
        },
      });
      continue;
    }

    if (action === 'UPDATE' && relevantInspectionUpdate(prev, next)) {
      push({
        ...base,
        event_type: eventTypeForInspectionUpdate(prev, next),
        previous_state: prev ? { status: prev['status'], result: prev['result'], decision: prev['decision'] } : null,
        new_state: next ? { status: next['status'], result: next['result'], decision: next['decision'] } : null,
        context: {
          lot_id: lotId,
          status: next?.['status'],
          result: next?.['result'],
          decision: next?.['decision'],
          completed_at: next?.['completed_at'],
        },
      });
    }
  }

  // --- lot_stage_events (fuente de verdad de etapas) ---
  for (const ev of stages) {
    push({
      id: String(ev['id']),
      entity_type: 'lot_stage_events',
      entity_id: String(ev['id']),
      event_type: 'STAGE_EVENT',
      operation: String(ev['event_type'] ?? 'INGRESO'),
      actor_user_id: typeof ev['user_id'] === 'string' ? ev['user_id'] : null,
      occurred_at: String(ev['occurred_at']),
      previous_state: null,
      new_state: {
        event_type: ev['event_type'],
        operational_stage_id: ev['operational_stage_id'],
      },
      source: 'lot_stage_events',
      context: {
        lot_id: lotId,
        event_type: ev['event_type'],
        operational_stage_id: ev['operational_stage_id'],
        notes: ev['notes'],
      },
      company_id: String(ev['company_id'] ?? companyId),
    });
  }

  // --- quality_evaluations ---
  for (const qe of evals) {
    push({
      id: String(qe['id']),
      entity_type: 'quality_evaluations',
      entity_id: String(qe['id']),
      event_type: 'QUALITY_EVALUATION',
      operation: 'CREATE',
      actor_user_id: typeof qe['evaluated_by'] === 'string' ? qe['evaluated_by'] : null,
      occurred_at: String(qe['evaluated_at']),
      previous_state: null,
      new_state: {
        result: qe['result'],
        observed_value: qe['observed_value'],
        comparison_type: qe['comparison_type'],
        limit_min: qe['limit_min'],
        limit_max: qe['limit_max'],
        unit: qe['unit'],
        deviation: qe['deviation'],
      },
      source: 'quality_evaluations',
      context: {
        lot_id: lotId,
        inspection_id: qe['inspection_id'],
        measurement_def_id: qe['measurement_def_id'],
        measurement_id: qe['measurement_id'],
        result: qe['result'],
        criterion_snapshot: qe['criterion_snapshot'],
        observed_value: qe['observed_value'],
      },
      company_id: String(qe['company_id'] ?? companyId),
    });
  }

  // --- decisions (creación + anulación; original conservado) ---
  for (const d of decisions) {
    const decidedBy = typeof d['decided_by'] === 'string' ? d['decided_by'] : null;
    push({
      id: `decision-create-${String(d['id'])}`,
      entity_type: 'decisions',
      entity_id: String(d['id']),
      event_type: 'DECISION_REGISTERED',
      operation: 'CREATE',
      actor_user_id: decidedBy,
      occurred_at: String(d['decided_at']),
      previous_state: null,
      new_state: {
        decision_code: d['decision_code'],
        decision_label: d['decision_label'],
        status: d['status'],
        fundamento: d['fundamento'],
      },
      source: 'decisions',
      context: {
        lot_id: lotId,
        inspection_id: d['inspection_id'],
        decision_code: d['decision_code'],
        decision_label: d['decision_label'],
        status: d['status'],
        fundamento: d['fundamento'],
        supersedes_decision_id: d['supersedes_decision_id'],
      },
      company_id: String(d['company_id'] ?? companyId),
    });

    if (d['status'] === 'ANULADA' && d['annulled_at']) {
      push({
        id: `decision-annul-${String(d['id'])}`,
        entity_type: 'decisions',
        entity_id: String(d['id']),
        event_type: 'DECISION_ANNULLED',
        operation: 'UPDATE',
        actor_user_id: typeof d['annulled_by'] === 'string' ? d['annulled_by'] : null,
        occurred_at: String(d['annulled_at']),
        previous_state: { status: 'REGISTRADA', decision_code: d['decision_code'] },
        new_state: { status: 'ANULADA', annul_reason: d['annul_reason'] },
        source: 'decisions',
        context: {
          lot_id: lotId,
          decision_code: d['decision_code'],
          annul_reason: d['annul_reason'],
          original_decision_id: d['id'],
        },
        company_id: String(d['company_id'] ?? companyId),
      });
    }
  }

  events.sort((a, b) => {
    const ta = Date.parse(a.occurred_at) || 0;
    const tb = Date.parse(b.occurred_at) || 0;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  // Asegurar company_id en todos
  for (const e of events) {
    if (!e.company_id) e.company_id = companyId;
  }

  return { lot: lot as Json, events, error: null, status: 200 };
}
