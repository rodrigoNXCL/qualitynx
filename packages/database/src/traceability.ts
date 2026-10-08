import { getSupabaseClient } from './index';
import { AvailabilityStatus } from '@qualitynx/shared';

/**
 * D-033 — Trazabilidad operacional completa.
 *
 * NO crea tablas ni eventos de dominio. Deriva todo de la arquitectura
 * existente: lots, lot_genealogy, lot_transformations (+inputs/outputs),
 * lot_stock_movements, lot_availability, inspections, decisions,
 * lot_dispositions y lot_stage_events.
 *
 * Seguridad: usa el cliente autenticado, de modo que el aislamiento por
 * company_id lo aplican las políticas RLS existentes. No se usa service_role.
 */

export interface TraceLotRef {
  id: string;
  folio: string | null;
  harvest_block: string | null;
  lot_type: string | null;
  status: string | null;
  company_id: string;
}

export interface TraceTransformation {
  id: string;
  transformation_type: string;
  status: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA' | string;
  unit: string;
  notes: string | null;
  confirmed_at: string | null;
  annulled_at: string | null;
  annul_reason: string | null;
}

export interface TraceLink {
  /** Lote del otro extremo del vínculo. */
  lot: TraceLotRef;
  /** Transformación que relaciona ambos, si la hubo. */
  transformation: TraceTransformation | null;
  /** Cantidad tomada del origen hacia el resultante, si está declarada. */
  quantity: number | null;
  unit: string | null;
  relation_type: string;
  /** Es un antecedente histórico de una transformación anulada. */
  historical: boolean;
  /** 0 = vinculo directo con el lote consultado. */
  depth: number;
}

export interface TraceMovement {
  id: string;
  movement_type: string;
  direction: string;
  quantity: number;
  unit: string;
  reason: string;
  created_at: string;
  transformation_id: string | null;
}

export interface TraceInspection {
  id: string;
  lot_id: string;
  lot_folio: string | null;
  status: string | null;
  result: string | null;
  decision: string | null;
  inspected_at: string | null;
  completed_at: string | null;
  point_name: string | null;
  stage_name: string | null;
}

export interface TraceDecision {
  id: string;
  lot_id: string;
  lot_folio: string | null;
  decision_code: string;
  decision_label: string;
  fundamento: string | null;
  status: string;
  decided_at: string | null;
}

export interface TraceDisposition {
  id: string;
  lot_id: string;
  disposition_type: string;
  quantity: number | null;
  unit: string | null;
  destination_reference: string | null;
  disposition_result: string | null;
  reason: string;
  occurred_at: string;
}

export interface TraceAvailability {
  declared_quantity: number | null;
  declared_unit: string | null;
  total_in: number | null;
  total_out: number | null;
  available_quantity: number | null;
  unit: string | null;
  availability_status: string;
  last_movement_at: string | null;
}

export interface LotTraceGraph {
  lot: TraceLotRef & {
    fruit_date: string | null;
    producer_name: string | null;
    variety_name: string | null;
    species_name: string | null;
    season_name: string | null;
    created_at: string | null;
    packaging_type: string | null;
    kg_declarados: number | null;
    quantity: number | null;
    quantity_unit: string | null;
    entry_stage_name: string | null;
    current_stage_name: string | null;
  };
  availability: TraceAvailability | null;
  upstream: TraceLink[];
  downstream: TraceLink[];
  movements: TraceMovement[];
  inspections: TraceInspection[];
  decisions: TraceDecision[];
  dispositions: TraceDisposition[];
  stage_events: Array<{ id: string; stage_name: string | null; event_type: string; occurred_at: string; notes: string | null }>;
}

export type TraceGraphResult =
  | { ok: true; data: LotTraceGraph }
  | { ok: false; status: number; error: string };

const MAX_DEPTH = 8;

async function fetchAllPaged(
  table: string,
  columns: string,
  apply?: (q: ReturnType<ReturnType<typeof getSupabaseClient>['from']>) => unknown
) {
  const client = getSupabaseClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const base = client.from(table).select(columns).range(from, from + 999);
    const q = (apply?.(base) ?? base) as typeof base;
    const { data, error } = await q;
    if (error) return { rows, error };
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { rows, error: null };
}

const LOT_COLS = 'id,folio,harvest_block,lot_type,status,company_id,created_at,fruit_date,producer_id,variety_id,species_id,season_id,packaging_type,kg_declarados,quantity,quantity_unit,entry_operational_stage_id,current_operational_stage_id';

/**
 * Grafo de trazabilidad de un lote: identidad, disponibilidad, origen,
 * transformaciones, descendencia, movimientos, inspecciones, decisiones y
 * disposiciones. Respeta el estado de la transformación: una anulada queda
 * visible como antecedente histórico y no como flujo vigente.
 */
export async function getLotTraceGraph(lotId: string): Promise<TraceGraphResult> {
  const client = getSupabaseClient();

  // --- identidad del lote (RLS ya impide leer lotes de otra empresa)
  const { data: lotRow, error: lotErr } = await client
    .from('lots')
    .select(LOT_COLS)
    .eq('id', lotId)
    .maybeSingle();
  if (lotErr) return { ok: false, status: 500, error: 'No se pudo leer el lote.' };
  if (!lotRow) return { ok: false, status: 404, error: 'Lote inexistente o sin acceso.' };
  const lot = lotRow as Record<string, unknown>;
  const companyId = String(lot.company_id);

  // --- catálogos de nombres
  const [prodRes, varRes, spRes, seasonRes, stageRes, pointRes] = await Promise.all([
    fetchAllPaged('producers', 'id,name', (q) => (q as any).eq('company_id', companyId)),
    fetchAllPaged('varieties', 'id,name', (q) => (q as any).eq('company_id', companyId)),
    fetchAllPaged('species', 'id,name', (q) => (q as any).eq('company_id', companyId)),
    fetchAllPaged('seasons', 'id,name', (q) => (q as any).eq('company_id', companyId)),
    fetchAllPaged('operational_stages', 'id,name', undefined),
    fetchAllPaged('inspection_points', 'id,name,operational_stage_id', (q) => (q as any).eq('company_id', companyId)),
  ]);
  const nm = (rows: Record<string, unknown>[], id: unknown): string | null =>
    id ? (rows.find((r) => r.id === id)?.name as string) ?? null : null;
  const stageById = new Map(stageRes.rows.map((s) => [String(s.id), String(s.name)]));
  const pointName = (id: unknown) => nm(pointRes.rows, id);
  const pointStage = (id: unknown) => {
    const p = pointRes.rows.find((r) => r.id === id);
    return p ? (stageById.get(String(p.operational_stage_id)) ?? null) : null;
  };

  const lotRef: TraceLotRef = {
    id: String(lot.id),
    folio: (lot.folio as string) ?? null,
    harvest_block: (lot.harvest_block as string) ?? null,
    lot_type: (lot.lot_type as string) ?? null,
    status: (lot.status as string) ?? null,
    company_id: companyId,
  };

  // --- disponibilidad desde el ledger (nunca calculada desde lots.quantity)
  let availability: TraceAvailability | null = null;
  const av = await client
    .from('lot_availability')
    .select(
      'lot_id,declared_quantity,declared_unit,total_in,total_out,available_quantity,unit,availability_status,last_movement_at'
    )
    .eq('lot_id', lotId)
    .maybeSingle();
  if (av.error) return { ok: false, status: 500, error: 'No se pudo leer la disponibilidad.' };
  if (av.data) availability = av.data as unknown as TraceAvailability;

  // --- genealogía completa de la empresa (append-only; no se modifica)
  const genRes = await fetchAllPaged(
    'lot_genealogy',
    'id,source_lot_id,derived_lot_id,relation_type,quantity,unit,created_at',
    (q) => (q as any).eq('company_id', companyId)
  );
  if (genRes.error) return { ok: false, status: 500, error: 'No se pudo leer la genealogía.' };
  const genealogy = genRes.rows as Array<Record<string, unknown>>;

  // --- transformaciones y sus entradas/salidas
  const [trRes, tinRes, toutRes] = await Promise.all([
    fetchAllPaged('lot_transformations', '*', (q) => (q as any).eq('company_id', companyId)),
    fetchAllPaged('lot_transformation_inputs', 'transformation_id,source_lot_id,consumed_quantity,unit', (q) =>
      (q as any).eq('company_id', companyId)
    ),
    fetchAllPaged('lot_transformation_outputs', 'transformation_id,result_lot_id,output_kind,quantity,unit,reason', (q) =>
      (q as any).eq('company_id', companyId)
    ),
  ]);
  if (trRes.error || tinRes.error || toutRes.error) {
    return { ok: false, status: 500, error: 'No se pudo leer las transformaciones.' };
  }
  const trs = trRes.rows as Array<Record<string, unknown>>;
  const tIns = tinRes.rows as Array<Record<string, unknown>>;
  const tOuts = toutRes.rows as Array<Record<string, unknown>>;

  const trById = new Map(trs.map((t) => [String(t.id), t]));

  /** Transformación que relaciona un par (origen, resultante), si existe. */
  const trBetween = (sourceId: string, derivedId: string): Record<string, unknown> | null => {
    const candidates = new Set(
      tIns.filter((i) => String(i.source_lot_id) === sourceId).map((i) => String(i.transformation_id))
    );
    for (const t of candidates) {
      if (tOuts.some((o) => String(o.transformation_id) === t && String(o.result_lot_id) === derivedId)) {
        return trById.get(t) ?? null;
      }
    }
    return null;
  };

  // --- recorrer la cadena con límite de profundidad y sin ciclos
  const lotsRes = await fetchAllPaged('lots', LOT_COLS, (q) => (q as any).eq('company_id', companyId));
  if (lotsRes.error) return { ok: false, status: 500, error: 'No se pudieron leer los lotes.' };
  const lotById = new Map((lotsRes.rows as Array<Record<string, unknown>>).map((l) => [String(l.id), l]));

  const refOf = (id: string): TraceLotRef | null => {
    const l = lotById.get(id);
    if (!l) return null;
    return {
      id,
      folio: (l.folio as string) ?? null,
      harvest_block: (l.harvest_block as string) ?? null,
      lot_type: (l.lot_type as string) ?? null,
      status: (l.status as string) ?? null,
      company_id: String(l.company_id),
    };
  };
  const trView = (t: Record<string, unknown> | null): TraceTransformation | null =>
    t
      ? {
          id: String(t.id),
          transformation_type: String(t.transformation_type),
          status: String(t.status),
          unit: String(t.unit),
          notes: (t.notes as string) ?? null,
          confirmed_at: (t.confirmed_at as string) ?? null,
          annulled_at: (t.annulled_at as string) ?? null,
          annul_reason: (t.annul_reason as string) ?? null,
        }
      : null;

  const walk = (
    rootId: string,
    dir: 'up' | 'down'
  ): TraceLink[] => {
    const out: TraceLink[] = [];
    const seen = new Set<string>([rootId]);
    let frontier = [rootId];
    for (let d = 0; d < MAX_DEPTH && frontier.length > 0; d++) {
      const next: string[] = [];
      for (const cur of frontier) {
        const edges = genealogy.filter((g) =>
          dir === 'up' ? String(g.derived_lot_id) === cur : String(g.source_lot_id) === cur
        );
        for (const g of edges) {
          const otherId = String(dir === 'up' ? g.source_lot_id : g.derived_lot_id);
          if (seen.has(otherId)) continue;
          const ref = refOf(otherId);
          if (!ref) continue;
          seen.add(otherId);
          // Al ir hacia atras el par es (otro_lote, actual); hacia adelante (actual, otro_loto).
          const t = dir === 'up' ? trBetween(otherId, cur) : trBetween(cur, otherId);
          out.push({
            lot: ref,
            transformation: trView(t),
            quantity: g.quantity == null ? null : Number(g.quantity),
            unit: (g.unit as string) ?? null,
            relation_type: String(g.relation_type ?? ''),
            historical: t ? String(t.status) === 'ANULADA' : false,
            depth: d,
          });
          next.push(otherId);
        }
      }
      frontier = next;
    }
    return out;
  };

  const upstream = walk(lotId, 'up');
  const downstream = walk(lotId, 'down');

  // --- movimientos, disposiciones y etapas del lote
  const [mvRes, dispRes, stageEvRes] = await Promise.all([
    fetchAllPaged(
      'lot_stock_movements',
      'id,movement_type,direction,quantity,unit,reason,created_at,transformation_id',
      (q) => (q as any).eq('lot_id', lotId)
    ),
    fetchAllPaged(
      'lot_dispositions',
      'id,lot_id,disposition_type,quantity,unit,destination_reference,disposition_result,reason,occurred_at',
      (q) => (q as any).eq('lot_id', lotId)
    ),
    fetchAllPaged(
      'lot_stage_events',
      'id,operational_stage_id,event_type,occurred_at,notes',
      (q) => (q as any).eq('lot_id', lotId)
    ),
  ]);

  // --- inspecciones y decisiones del lote y de los lotes relacionados
  const relatedIds = [lotId, ...upstream.map((u) => u.lot.id), ...downstream.map((d) => d.lot.id)];
  const inList = relatedIds.join(',');
  const [inspRes, decRes] = await Promise.all([
    fetchAllPaged(
      'inspections',
      'id,lot_id,status,result,decision,inspected_at,completed_at,inspection_point_id',
      (q) => (q as any).in('lot_id', relatedIds)
    ),
    fetchAllPaged(
      'decisions',
      'id,lot_id,decision_code,decision_label,fundamento,status,decided_at',
      (q) => (q as any).in('lot_id', relatedIds)
    ),
  ]);
  if (mvRes.error || dispRes.error || stageEvRes.error || inspRes.error || decRes.error) {
    return { ok: false, status: 500, error: 'No se pudo completar el historial del lote.' };
  }

  const inspections: TraceInspection[] = (inspRes.rows as Array<Record<string, unknown>>).map((i) => ({
    id: String(i.id),
    lot_id: String(i.lot_id),
    lot_folio: refOf(String(i.lot_id))?.folio ?? null,
    status: (i.status as string) ?? null,
    result: (i.result as string) ?? null,
    decision: (i.decision as string) ?? null,
    inspected_at: (i.inspected_at as string) ?? null,
    completed_at: (i.completed_at as string) ?? null,
    point_name: pointName(i.inspection_point_id),
    stage_name: pointStage(i.inspection_point_id),
  }));

  const decisions: TraceDecision[] = (decRes.rows as Array<Record<string, unknown>>).map((d) => ({
    id: String(d.id),
    lot_id: String(d.lot_id),
    lot_folio: refOf(String(d.lot_id))?.folio ?? null,
    decision_code: String(d.decision_code ?? ''),
    decision_label: String(d.decision_label ?? ''),
    fundamento: (d.fundamento as string) ?? null,
    status: String(d.status ?? ''),
    decided_at: (d.decided_at as string) ?? null,
  }));

  return {
    ok: true,
    data: {
      lot: {
        ...lotRef,
        created_at: (lot.created_at as string) ?? null,
        fruit_date: (lot.fruit_date as string) ?? null,
        producer_name: nm(prodRes.rows, lot.producer_id),
        variety_name: nm(varRes.rows, lot.variety_id),
        species_name: nm(spRes.rows, lot.species_id),
        season_name: nm(seasonRes.rows, lot.season_id),
        packaging_type: (lot.packaging_type as string) ?? null,
        kg_declarados: lot.kg_declarados == null ? null : Number(lot.kg_declarados),
        quantity: lot.quantity == null ? null : Number(lot.quantity),
        quantity_unit: (lot.quantity_unit as string) ?? null,
        entry_stage_name: stageById.get(String(lot.entry_operational_stage_id)) ?? null,
        current_stage_name: stageById.get(String(lot.current_operational_stage_id)) ?? null,
      },
      availability,
      upstream,
      downstream,
      movements: (mvRes.rows as Array<Record<string, unknown>>).map((m) => ({
        id: String(m.id),
        movement_type: String(m.movement_type),
        direction: String(m.direction),
        quantity: Number(m.quantity),
        unit: String(m.unit),
        reason: String(m.reason ?? ''),
        created_at: String(m.created_at),
        transformation_id: (m.transformation_id as string) ?? null,
      })),
      inspections,
      decisions,
      dispositions: (dispRes.rows as Array<Record<string, unknown>>).map((d) => ({
        id: String(d.id),
        lot_id: String(d.lot_id),
        disposition_type: String(d.disposition_type),
        quantity: d.quantity == null ? null : Number(d.quantity),
        unit: (d.unit as string) ?? null,
        destination_reference: (d.destination_reference as string) ?? null,
        disposition_result: (d.disposition_result as string) ?? null,
        reason: String(d.reason ?? ''),
        occurred_at: String(d.occurred_at),
      })),
      stage_events: (stageEvRes.rows as Array<Record<string, unknown>>).map((s) => ({
        id: String(s.id),
        stage_name: stageById.get(String(s.operational_stage_id)) ?? null,
        event_type: String(s.event_type ?? ''),
        occurred_at: String(s.occurred_at),
        notes: (s.notes as string) ?? null,
      })),
    },
  };
}

/** Estado de disponibilidad con la etiqueta compartida (sin inventar unidades). */
export function availabilityLabel(status: string | null): string {
  switch (status) {
    case AvailabilityStatus.DISPONIBLE:
      return 'Disponible';
    case AvailabilityStatus.PARCIALMENTE_UTILIZADO:
      return 'Parcialmente utilizado';
    case AvailabilityStatus.AGOTADO:
      return 'Agotado';
    case AvailabilityStatus.SIN_APERTURA:
      return 'Sin apertura registrada';
    case AvailabilityStatus.CANTIDAD_NO_DECLARADA:
      return 'Cantidad no declarada';
    default:
      return 'Sin información';
  }
}