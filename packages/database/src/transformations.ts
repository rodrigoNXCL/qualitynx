/**
 * QualityNX — D-032: TRANSFORMACIONES, EXISTENCIAS Y DISPOSICIONES
 *
 * Capa de datos. Todas las lecturas son paginadas (PostgREST trunca en 1000).
 *
 * Si el modelo todavía no está aplicado en la base, las funciones devuelven
 * `model_missing: true` en lugar de propagar el error, para que la interfaz
 * pueda explicar la situación en vez de romperse.
 */

import type {
  AvailableSource,
  OutputKind,
  RemnantHandling,
  TransformationInputDraft,
  TransformationOutputDraft,
  TransformationStatus,
  TransformationType,
  TransformationValidation,
} from '@qualitynx/shared';
import { validateTransformation } from '@qualitynx/shared';
import { getSupabaseClient } from './index';

const PAGE = 1000;

export interface ModelState {
  model_missing: boolean;
}

export interface TransformationRow {
  id: string;
  company_id: string;
  transformation_type: TransformationType;
  status: TransformationStatus;
  unit: string;
  notes: string | null;
  confirmed_at: string | null;
  annulled_at: string | null;
  annul_reason: string | null;
  created_at: string;
  inputs: Array<TransformationInputRow>;
  outputs: Array<TransformationOutputRow>;
}

export interface TransformationInputRow {
  id: string;
  source_lot_id: string;
  available_quantity: number;
  consumed_quantity: number;
  unit: string;
  remnant_handling: RemnantHandling;
  source_folio: string | null;
  source_harvest_block: string | null;
  source_producer: string | null;
  source_variety: string | null;
}

export interface TransformationOutputRow {
  id: string;
  result_lot_id: string | null;
  output_kind: OutputKind;
  quantity: number;
  unit: string;
  reason: string | null;
  result_folio: string | null;
  result_harvest_block: string | null;
}

export interface AvailabilityRow {
  lot_id: string;
  folio: string | null;
  harvest_block: string | null;
  lot_type: string | null;
  lot_status: string | null;
  declared_quantity: number | null;
  declared_unit: string | null;
  opening_quantity: number | null;
  total_in: number | null;
  total_out: number | null;
  available_quantity: number | null;
  unit: string | null;
  availability_status: string;
  producer_name: string | null;
  variety_name: string | null;
  stage_name: string | null;
}

/**
 * Tipos de disposición del modelo (D-032 §12). No se agregan categorías:
 * son exactamente los cinco que admite el CHECK de la tabla.
 */
export const DISPOSITION_TYPES = [
  'DESPACHO',
  'RECHAZO',
  'SEGREGACION',
  'RETENCION',
  'DEVOLUCION',
] as const;
export type DispositionType = (typeof DISPOSITION_TYPES)[number];

/** Etiquetas visibles. La tilde vive solo en la interfaz. */
export const DISPOSITION_TYPE_LABELS: Record<DispositionType, string> = {
  DESPACHO: 'Despacho',
  RECHAZO: 'Rechazo',
  SEGREGACION: 'Segregación',
  RETENCION: 'Retención',
  DEVOLUCION: 'Devolución',
};

export interface DispositionRow {
  id: string;
  lot_id: string;
  disposition_type: string;
  quantity: number | null;
  unit: string | null;
  destination_reference: string | null;
  disposition_result: string | null;
  reason: string;
  occurred_at: string;
  inspection_id: string | null;
  decision_id: string | null;
}

/**
 * Saldo desde el libro de movimientos. MISMA regla que la vista
 * `lot_availability` y que `availabilityFromRow`: `lots.quantity` no
 * participa, porque el movimiento APERTURA ya lo representa.
 */
const ledgerBalance = (movements: ReadonlyArray<Record<string, unknown>>) => {
  let totalIn = 0;
  let totalOut = 0;
  let openings = 0;
  const byLot: Record<string, { totalIn: number; totalOut: number; openings: number }> = {};
  for (const m of movements) {
    const lotId = String(m.lot_id);
    const qty = Number(m.quantity);
    const entry = (byLot[lotId] ??= { totalIn: 0, totalOut: 0, openings: 0 });
    if (m.direction === 'IN') { totalIn += qty; entry.totalIn += qty; }
    else { totalOut += qty; entry.totalOut += qty; }
    if (m.movement_type === 'APERTURA') openings += 1;
    if (m.movement_type === 'APERTURA') entry.openings += 1;
  }
  return { byLot, totalIn, totalOut, openings };
};

const isMissingRelation = (error: { code?: string; message?: string } | null) => {
  const code = error?.code ?? '';
  const msg = (error?.message ?? '').toLowerCase();
  return code === '42P01' || code === '42703' || msg.includes('does not exist');
};

async function fetchPaged<T extends Record<string, unknown>>(
  table: string,
  columns: string,
  build?: (q: ReturnType<ReturnType<typeof getSupabaseClient>['from']>) => unknown
): Promise<{ rows: T[]; error: unknown }> {
  const client = getSupabaseClient();
  const rows: T[] = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const base = client.from(table).select(columns).range(from, from + PAGE - 1);
    // El constructor puede no aplicar filtros (p. ej. catálogos globales como
    // operational_stages): en ese caso se usa la consulta base.
    const built = build?.(base as ReturnType<ReturnType<typeof getSupabaseClient>['from']>);
    const q = (built ?? base) as typeof base;
    const { data, error } = await q;
    if (error) return { rows, error };
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return { rows, error: null };
}

/**
 * Lotes con existencia real disponible para consumir.
 * Se lee la vista `lot_availability` (D-032). Si la vista no existe,
 * `model_missing` viene en true.
 */
export async function listAvailableSourcesForTransformation(params: {
  companyId: string;
  query?: string;
}): Promise<{ data: AvailableSource[]; model_missing: boolean; error: unknown }> {
  const client = getSupabaseClient();
  const { rows: lots, error } = await fetchPaged<Record<string, unknown>>(
    'lots',
    'id,folio,harvest_block,producer_id,variety_id,quantity,quantity_unit,current_operational_stage_id',
    (q) => q.eq('company_id', params.companyId)
  );
  if (error) return { data: [], model_missing: isMissingRelation(error as never), error };

  const { rows: movements, error: mErr } = await fetchPaged<Record<string, unknown>>(
    'lot_stock_movements',
    'lot_id,quantity,direction,movement_type',
    (q) => q.eq('company_id', params.companyId)
  );
  if (mErr) return { data: [], model_missing: isMissingRelation(mErr as never), error: mErr };

  const { rows: producers } = await fetchPaged<Record<string, unknown>>(
    'producers',
    'id,name',
    (q) => q.eq('company_id', params.companyId)
  );
  const { rows: varieties } = await fetchPaged<Record<string, unknown>>(
    'varieties',
    'id,name',
    (q) => q.eq('company_id', params.companyId)
  );
  const { rows: stages } = await fetchPaged<Record<string, unknown>>(
    'operational_stages',
    'id,name',
    () => undefined as never
  );

  const ledger = ledgerBalance(movements);
  const producerName: Record<string, string> = {};
  producers.forEach((p) => { producerName[String(p.id)] = String(p.name); });
  const varietyName: Record<string, string> = {};
  varieties.forEach((v) => { varietyName[String(v.id)] = String(v.name); });
  const stageName: Record<string, string> = {};
  stages.forEach((s) => { stageName[String(s.id)] = String(s.name); });

  const q = (params.query ?? '').trim().toLowerCase();
  const out: AvailableSource[] = [];
  for (const l of lots) {
    const lotId = String(l.id);
    const declared = l.quantity == null ? null : Number(l.quantity);
    const unit = (l.quantity_unit ?? null) as string | null;
    const entry = ledger.byLot[lotId] ?? { totalIn: 0, totalOut: 0, openings: 0 };
    let available: number | null = null;
    let availabilityStatus: AvailableSource['availability_status'];
    if (entry.openings === 0 && entry.totalIn === 0 && entry.totalOut === 0) {
      availabilityStatus = 'CANTIDAD_NO_DECLARADA';
    } else if (entry.openings === 0) {
      availabilityStatus = 'SIN_APERTURA';
    } else {
      available = entry.totalIn - entry.totalOut;
      availabilityStatus =
        available > 1e-9
          ? entry.totalOut > 0
            ? 'PARCIALMENTE_UTILIZADO'
            : 'DISPONIBLE'
          : 'AGOTADO';
    }
    if (availabilityStatus === 'AGOTADO' || availabilityStatus === 'CANTIDAD_NO_DECLARADA') {
      // Un lote agotado no es disponible; uno sin unidad declarada tampoco es
      // consumible porque no se puede validar la unidad. Ambos siguen en
      // historial, pero no se ofrecen como fuente.
      continue;
    }
    const producer = l.producer_id ? producerName[String(l.producer_id)] ?? null : null;
    const variety = l.variety_id ? varietyName[String(l.variety_id)] ?? null : null;
    const stage = l.current_operational_stage_id
      ? stageName[String(l.current_operational_stage_id)] ?? null
      : null;
    if (q) {
      const hay = [l.folio, l.harvest_block, producer, variety, stage].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
    }
    out.push({
      lot_id: lotId,
      folio: (l.folio ?? null) as string | null,
      harvest_block: (l.harvest_block ?? null) as string | null,
      producer_name: producer,
      variety_name: variety,
      fruit_date: null,
      stage_name: stage,
      available_quantity: available ?? 0,
      unit,
      availability_status: availabilityStatus,
    });
  }
  out.sort((a, b) => b.available_quantity - a.available_quantity);
  return { data: out, model_missing: false, error: null };
}

/** Lotes con existencia real, para el listado de existencias. */
export async function listLotAvailability(params: {
  companyId: string;
  query?: string;
  onlyAvailable?: boolean;
}): Promise<{ data: AvailabilityRow[]; model_missing: boolean; error: unknown }> {
  const client = getSupabaseClient();
  const { rows: lots, error } = await fetchPaged<Record<string, unknown>>(
    'lots',
    'id,folio,harvest_block,producer_id,variety_id,lot_type,status,quantity,quantity_unit,current_operational_stage_id',
    (q) => q.eq('company_id', params.companyId)
  );
  if (error) return { data: [], model_missing: isMissingRelation(error as never), error };

  const { rows: movements, error: mErr } = await fetchPaged<Record<string, unknown>>(
    'lot_stock_movements',
    'lot_id,quantity,direction,movement_type,unit,reason,created_at,transformation_id',
    (q) => q.eq('company_id', params.companyId)
  );
  if (mErr) return { data: [], model_missing: isMissingRelation(mErr as never), error: mErr };

  const { rows: producers } = await fetchPaged<Record<string, unknown>>('producers', 'id,name', (q) => q.eq('company_id', params.companyId));
  const { rows: varieties } = await fetchPaged<Record<string, unknown>>('varieties', 'id,name', (q) => q.eq('company_id', params.companyId));
  const { rows: stages } = await fetchPaged<Record<string, unknown>>('operational_stages', 'id,name');
  const { rows: dispositions } = await fetchPaged<Record<string, unknown>>(
    'lot_dispositions',
    'lot_id,disposition_type,quantity,occurred_at',
    (q) => q.eq('company_id', params.companyId)
  );

  const producerName: Record<string, string> = {};
  producers.forEach((p) => { producerName[String(p.id)] = String(p.name); });
  const varietyName: Record<string, string> = {};
  varieties.forEach((v) => { varietyName[String(v.id)] = String(v.name); });
  const stageName: Record<string, string> = {};
  stages.forEach((s) => { stageName[String(s.id)] = String(s.name); });
  const dispByLot: Record<string, number> = {};
  dispositions.forEach((d) => { dispByLot[String(d.lot_id)] = (dispByLot[String(d.lot_id)] ?? 0) + 1; });

  const ledger = ledgerBalance(movements);

  const q = (params.query ?? '').trim().toLowerCase();
  const rows: AvailabilityRow[] = lots.map((l) => {
    const lotId = String(l.id);
    const declared = l.quantity == null ? null : Number(l.quantity);
    const unit = (l.quantity_unit ?? null) as string | null;
    const entry = ledger.byLot[lotId] ?? { totalIn: 0, totalOut: 0, openings: 0 };
    const totalIn = entry.totalIn;
    const totalOut = entry.totalOut;
    const hasLedger = entry.openings > 0 || entry.totalIn > 0 || entry.totalOut > 0;
    const available = hasLedger && entry.openings > 0 ? totalIn - totalOut : null;
    const status =
      !hasLedger
        ? 'CANTIDAD_NO_DECLARADA'
        : entry.openings === 0
          ? 'SIN_APERTURA'
          : available! > 1e-9
            ? totalOut > 0
              ? 'PARCIALMENTE_UTILIZADO'
              : 'DISPONIBLE'
            : 'AGOTADO';
    const producer = l.producer_id ? producerName[String(l.producer_id)] ?? null : null;
    const variety = l.variety_id ? varietyName[String(l.variety_id)] ?? null : null;
    const stage = l.current_operational_stage_id ? stageName[String(l.current_operational_stage_id)] ?? null : null;
    return {
      lot_id: lotId,
      folio: (l.folio ?? null) as string | null,
      harvest_block: (l.harvest_block ?? null) as string | null,
      lot_type: (l.lot_type ?? null) as string | null,
      lot_status: (l.status ?? null) as string | null,
      declared_quantity: declared,
      declared_unit: unit,
      opening_quantity: entry.openings > 0 ? totalIn - totalOut + totalOut : 0,
      total_in: totalIn,
      total_out: totalOut,
      available_quantity: available,
      unit,
      availability_status: status,
      producer_name: producer,
      variety_name: variety,
      stage_name: stage,
    };
  });

  const filtered = rows.filter((r) => {
    if (params.onlyAvailable && r.availability_status !== 'DISPONIBLE' && r.availability_status !== 'PARCIALMENTE_UTILIZADO') {
      return false;
    }
    if (!q) return true;
    return [r.folio, r.harvest_block, r.producer_name, r.variety_name, r.stage_name, r.availability_status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  filtered.sort((a, b) => (b.available_quantity ?? -1) - (a.available_quantity ?? -1));
  void client;
  return { data: filtered, model_missing: false, error: null };
}

export async function listTransformations(params: {
  companyId: string;
}): Promise<{ data: TransformationRow[]; model_missing: boolean; error: unknown }> {
  const { rows: heads, error } = await fetchPaged<Record<string, unknown>>(
    'lot_transformations',
    '*',
    (q) => q.eq('company_id', params.companyId)
  );
  if (error) return { data: [], model_missing: isMissingRelation(error as never), error };

  const { rows: inputs } = await fetchPaged<Record<string, unknown>>(
    'lot_transformation_inputs',
    '*',
    (q) => q.eq('company_id', params.companyId)
  );
  const { rows: outputs } = await fetchPaged<Record<string, unknown>>(
    'lot_transformation_outputs',
    '*',
    (q) => q.eq('company_id', params.companyId)
  );

  const lotIds = [
    ...new Set([
      ...inputs.map((i) => String(i.source_lot_id)),
      ...outputs.map((o) => String(o.result_lot_id)).filter((x) => x !== 'null'),
    ]),
  ];
  const { rows: lots } = await fetchPaged<Record<string, unknown>>(
    'lots',
    'id,folio,harvest_block,producer_id,variety_id',
    (q) => q.in('id', lotIds.length ? lotIds : ['00000000-0000-0000-0000-000000000000'])
  );
  const { rows: producers } = await fetchPaged<Record<string, unknown>>('producers', 'id,name', (q) => q.eq('company_id', params.companyId));
  const { rows: varieties } = await fetchPaged<Record<string, unknown>>('varieties', 'id,name', (q) => q.eq('company_id', params.companyId));
  const lotById: Record<string, Record<string, unknown>> = {};
  lots.forEach((l) => { lotById[String(l.id)] = l; });
  const producerName: Record<string, string> = {};
  producers.forEach((p) => { producerName[String(p.id)] = String(p.name); });
  const varietyName: Record<string, string> = {};
  varieties.forEach((v) => { varietyName[String(v.id)] = String(v.name); });

  const data: TransformationRow[] = heads.map((h) => {
    const id = String(h.id);
    return {
      id,
      company_id: String(h.company_id),
      transformation_type: h.transformation_type as TransformationType,
      status: h.status as TransformationStatus,
      unit: String(h.unit),
      notes: (h.notes ?? null) as string | null,
      confirmed_at: (h.confirmed_at ?? null) as string | null,
      annulled_at: (h.annulled_at ?? null) as string | null,
      annul_reason: (h.annul_reason ?? null) as string | null,
      created_at: String(h.created_at),
      inputs: inputs
        .filter((i) => String(i.transformation_id) === id)
        .map((i) => {
          const src = lotById[String(i.source_lot_id)];
          return {
            id: String(i.id),
            source_lot_id: String(i.source_lot_id),
            available_quantity: Number(i.available_quantity),
            consumed_quantity: Number(i.consumed_quantity),
            unit: String(i.unit),
            remnant_handling: i.remnant_handling as RemnantHandling,
            source_folio: (src?.folio ?? null) as string | null,
            source_harvest_block: (src?.harvest_block ?? null) as string | null,
            source_producer: src?.producer_id ? producerName[String(src.producer_id)] ?? null : null,
            source_variety: src?.variety_id ? varietyName[String(src.variety_id)] ?? null : null,
          };
        }),
      outputs: outputs
        .filter((o) => String(o.transformation_id) === id)
        .map((o) => {
          const res = o.result_lot_id ? lotById[String(o.result_lot_id)] : null;
          return {
            id: String(o.id),
            result_lot_id: (o.result_lot_id ?? null) as string | null,
            output_kind: o.output_kind as OutputKind,
            quantity: Number(o.quantity),
            unit: String(o.unit),
            reason: (o.reason ?? null) as string | null,
            result_folio: (res?.folio ?? null) as string | null,
            result_harvest_block: (res?.harvest_block ?? null) as string | null,
          };
        }),
    };
  });
  data.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { data, model_missing: false, error: null };
}

export async function listDispositions(params: {
  companyId: string;
  lotId?: string;
}): Promise<{ data: DispositionRow[]; model_missing: boolean; error: unknown }> {
  const { rows, error } = await fetchPaged<Record<string, unknown>>(
    'lot_dispositions',
    '*',
    (q) => (params.lotId ? q.eq('lot_id', params.lotId) : q.eq('company_id', params.companyId))
  );
  if (error) return { data: [], model_missing: isMissingRelation(error as never), error };
  return {
    data: rows.map((d) => ({
      id: String(d.id),
      lot_id: String(d.lot_id),
      disposition_type: String(d.disposition_type),
      quantity: d.quantity == null ? null : Number(d.quantity),
      unit: (d.unit ?? null) as string | null,
      destination_reference: (d.destination_reference ?? null) as string | null,
      disposition_result: (d.disposition_result ?? null) as string | null,
      reason: String(d.reason),
      occurred_at: String(d.occurred_at),
      inspection_id: (d.inspection_id ?? null) as string | null,
      decision_id: (d.decision_id ?? null) as string | null,
    })),
    model_missing: false,
    error: null,
  };
}

/**
 * Registra la disposición final de un lote (D-032 §12).
 *
 * Reglas que respeta, sin inventar nada:
 *   · `reason` es obligatorio: la base lo declara NOT NULL.
 *   · `quantity` es opcional en el modelo; si se informa, la unidad es
 *     obligatoria (misma convención que el ledger: no se convierte).
 *   · `destination_reference` es texto libre. NULL significa "no registrado",
 *     nunca "no hubo despacho".
 *   · Se puede respaldar con una inspección o una decisión. No se exige ninguno:
 *     el modelo los declara opcionales y forzarlo sería inventar una regla.
 *   · Los tipos son los cinco del modelo. No se agregan categorías.
 */
export async function createDisposition(params: {
  companyId: string;
  lotId: string;
  dispositionType: DispositionType;
  reason: string;
  quantity?: number | null;
  unit?: string | null;
  destinationReference?: string | null;
  dispositionResult?: string | null;
  inspectionId?: string | null;
  decisionId?: string | null;
  registeredBy?: string | null;
}): Promise<{ data: { id: string } | null; error: { message?: string } | null }> {
  const reason = params.reason.trim();
  if (!reason) return { data: null, error: { message: 'La disposición exige motivo.' } };

  const quantity = params.quantity != null && params.quantity > 0 ? params.quantity : null;
  const unit = params.unit?.trim() || null;
  if (quantity != null && !unit) {
    return { data: null, error: { message: 'Si informa cantidad, la unidad es obligatoria.' } };
  }

  const client = getSupabaseClient();
  const { data, error } = await (client as any)
    .from('lot_dispositions')
    .insert({
      company_id: params.companyId,
      lot_id: params.lotId,
      disposition_type: params.dispositionType,
      reason,
      quantity,
      unit,
      destination_reference: params.destinationReference?.trim() || null,
      disposition_result: params.dispositionResult?.trim() || null,
      inspection_id: params.inspectionId ?? null,
      decision_id: params.decisionId ?? null,
      registered_by: params.registeredBy ?? null,
    })
    .select('id')
    .single();
  return {
    data: data ? { id: String((data as { id: string }).id) } : null,
    error: error as { message?: string } | null,
  };
}

/**
 * Crea una transformación en BORRADOR. El alta de un lote de proceso o
 * repalletizaje la deja en borrador a propósito: la confirmación es un acto
 * operacional aparte (`confirmTransformation`) y es atómica.
 */
export async function createTransformationDraft(params: {
  companyId: string;
  transformationType: TransformationType;
  unit: string;
  notes?: string | null;
}) {
  const client = getSupabaseClient();
  const { data, error } = await (client as any)
    .from('lot_transformations')
    .insert({
      company_id: params.companyId,
      transformation_type: params.transformationType,
      unit: params.unit,
      notes: params.notes ?? null,
    })
    .select()
    .single();
  return { data: (data as any) ?? null, error: error as { message?: string } | null };
}

export async function addTransformationInput(params: {
  transformationId: string;
  companyId: string;
  sourceLotId: string;
  availableQuantity: number;
  consumedQuantity: number;
  unit: string;
  remnantHandling: 'COMO_LOTE_NUEVO' | 'SIN_REMANENTE';
}) {
  const client = getSupabaseClient();
  const { data, error } = await (client as any)
    .from('lot_transformation_inputs')
    .insert({
      transformation_id: params.transformationId,
      company_id: params.companyId,
      source_lot_id: params.sourceLotId,
      available_quantity: params.availableQuantity,
      consumed_quantity: params.consumedQuantity,
      unit: params.unit,
      remnant_handling: params.remnantHandling,
    })
    .select()
    .single();
  return { data: (data as any) ?? null, error: error as { message?: string } | null };
}

export async function addTransformationOutput(params: {
  transformationId: string;
  companyId: string;
  outputKind: 'RESULTADO' | 'REMANENTE' | 'MERMA' | 'DESCARTE';
  quantity: number;
  unit: string;
  resultLotId?: string | null;
  reason?: string | null;
}) {
  const client = getSupabaseClient();
  const { data, error } = await (client as any)
    .from('lot_transformation_outputs')
    .insert({
      transformation_id: params.transformationId,
      company_id: params.companyId,
      output_kind: params.outputKind,
      quantity: params.quantity,
      unit: params.unit,
      result_lot_id: params.resultLotId ?? null,
      reason: params.reason ?? null,
    })
    .select()
    .single();
  return { data: (data as any) ?? null, error: error as { message?: string } | null };
}

/**
 * Confirma una transformación. La validación definitiva la hace la función SQL
 * `confirm_lot_transformation`, que es atómica: o deja todo confirmado, o no
 * deja nada. Esta capa solo la invoca.
 */
export async function confirmTransformation(transformationId: string) {
  const client = getSupabaseClient();
  const { data, error } = await (client as any).rpc('confirm_lot_transformation', {
    p_transformation_id: transformationId,
  });
  return { data: data ?? null, error: error as { message?: string } | null };
}

/** Valida sin escribir nada. Devuelve los mismos errores que la base. */
export async function validateTransformationOnServer(transformationId: string) {
  const client = getSupabaseClient();
  const { data, error } = await (client as any).rpc('validate_lot_transformation', {
    p_transformation_id: transformationId,
  });
  if (error) return { data: null, error: error as { message?: string } | null };
  const row = (Array.isArray(data) ? data[0] : data) as
    | { ok: boolean; errors: string[]; total_input: number; total_output: number; total_remanent: number; total_loss: number }
    | null;
  return { data: row, error: null };
}

/** Anula una transformación confirmada sin reescribir el pasado. */
export async function annulTransformation(transformationId: string, reason: string) {
  const client = getSupabaseClient();
  const { error } = await (client as any).rpc('annul_lot_transformation', {
    p_transformation_id: transformationId,
    p_reason: reason,
  });
  return { error: error as { message?: string } | null };
}

/** Reexporta la validación pura para que la UI use la misma especificación. */
export { validateTransformation };
export type {
  TransformationInputDraft,
  TransformationOutputDraft,
  TransformationValidation,
};