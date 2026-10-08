/**
 * QualityNX — Cliente Supabase (web)
 * Etapa 01 FOUNDATION.
 *
 * Web-safe: sin dependencias de React Native.
 * El cliente para móvil se añadirá en su etapa (03+ / mobile),
 * en apps/mobile con su propio storage adapter.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Database } from './generated/database.types';
import {
  classifyObservedUnit,
  classifyObservedValue,
  observedDayKey,
  observedIsoWeek,
  observedWeekKey,
  ObservedExclusionReason,
  ObservedUnitStatus,
  ObservedValueClass,
} from '@qualitynx/shared';
import type {
  ObservedExclusionReason as ObservedExclusionReasonType,
  ObservedIndicatorBucket,
  ObservedIndicatorResult,
  ObservedMeasurementRow,
  TransformationType,
} from '@qualitynx/shared';

export * from '@qualitynx/shared';

// ============================================
// CONFIGURACIÓN DE ENTORNO
// ============================================

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Falta configuración de Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { url, anonKey };
}

// ============================================
// CLIENTE (singleton en navegador)
// ============================================

let webClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseConfig();

  if (typeof window !== 'undefined') {
    if (!webClient) {
      webClient = createClient<Database>(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return webClient;
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Alias móvil (apps/mobile). Mismo cliente; storage adapter nativo
 * se incorporará en la etapa 09 — OFFLINE.
 */
export function getMobileSupabaseClient(): SupabaseClient<Database> {
  return getSupabaseClient();
}

// ============================================
// AUTENTICACIÓN
// ============================================

export async function signIn(email: string, password: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  return { user: data.user, error };
}

export async function getCurrentSession() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  return { session: data.session, error };
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange(callback);
}

// ============================================
// PERFIL DE USUARIO (tabla users)
// ============================================

// Dedupe de consultas concurrentes del mismo perfil (layout + página + auth
// listener). La promesa se limpia al resolverse: no hay caché ni stale data.
const profileInflight = new Map<
  string,
  Promise<{ data: any; error: any }>
>();

export async function getUserProfile(userId: string) {
  const inflight = profileInflight.get(userId);
  if (inflight) return inflight;

  const client = getSupabaseClient();
  const promise = (async () => {
    const { data, error } = await client
      .from('users')
      .select('*, companies (id, name, code, is_active)')
      .eq('auth_id', userId)
      .maybeSingle();
    return { data: (data as any) ?? null, error };
  })().finally(() => {
    profileInflight.delete(userId);
  });

  profileInflight.set(userId, promise);
  return promise;
}

export async function getCompanyById(companyId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();
  return { data: (data as any) ?? null, error };
}

export async function getUserById(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return { data: (data as any) ?? null, error };
}

export async function getUserCompany(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('company_id, companies (id, name, code, is_active)')
    .eq('auth_id', userId)
    .maybeSingle();

  return { data, error };
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { data } = await client
    .from('users')
    .select('role')
    .eq('auth_id', userId)
    .maybeSingle();

  return (data as any)?.role === 'SUPER_ADMIN';
}

// ============================================
// MASTER DATA (etapa 02)
// ============================================

export type MasterDataTable =
  | 'producers'
  | 'fields'
  | 'blocks'
  | 'species'
  | 'varieties'
  | 'seasons'
  | 'packaging_types';

export async function listMasterData(table: MasterDataTable) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from(table) as any)
    .select('*')
    .order('name', { ascending: true });

  return { data: (data as any[]) ?? [], error };
}

export async function createMasterData(
  table: MasterDataTable,
  payload: Record<string, unknown>
) {
  const client = getSupabaseClient();
  // Union of table names breaks Supabase builder inference; cast is intentional.
  const q = client.from(table) as any;
  const { data, error } = await q
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

export async function updateMasterData(
  table: MasterDataTable,
  id: string,
  payload: Record<string, unknown>
) {
  const client = getSupabaseClient();
  const q = client.from(table) as any;
  const { data, error } = await q
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function setMasterDataActive(
  table: MasterDataTable,
  id: string,
  isActive: boolean
) {
  return updateMasterData(table, id, { is_active: isActive });
}

export async function listPackagingTypes() {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('packaging_types') as any)
    .select('*')
    .order('name', { ascending: true });
  return { data: (data as any[]) ?? [], error };
}

export async function createPackagingType(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('packaging_types') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updatePackagingType(id: string, payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('packaging_types') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function setPackagingTypeActive(id: string, isActive: boolean) {
  return updatePackagingType(id, { is_active: isActive });
}

export async function listSamplingPlans(inspectionPointId: string) {
  const client = getSupabaseClient();
  let query = (client.from('sampling_plans') as any)
    .select('*')
    .order('name', { ascending: true });
  if (inspectionPointId) query = query.eq('inspection_point_id', inspectionPointId);
  const { data, error } = await query;
  return { data: (data as any[]) ?? [], error };
}

export async function createSamplingPlan(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('sampling_plans') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateSamplingPlan(id: string, payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('sampling_plans') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function setSamplingPlanActive(id: string, isActive: boolean) {
  return updateSamplingPlan(id, { is_active: isActive });
}

export async function suggestSamplingCount(planId: string, lotId: string) {
  const client = getSupabaseClient();
  const { data, error } = await (client.rpc as any)('calculate_sampling_plan_count', {
    p_plan_id: planId,
    p_lot_id: lotId,
  });
  return { data: (data as number | null) ?? null, error };
}


export async function listLots() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('lots')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: (data as any[]) ?? [], error };
}

export async function createLot(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('lots') as any)
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

export async function updateLot(id: string, payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('lots') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function closeLot(id: string) {
  return updateLot(id, { status: 'CERRADO' });
}

// ============================================
// LOT GENEALOGY (D-029) — proceso / repalletizaje
// ============================================

export async function listLotGenealogy(filters?: {
  source_lot_id?: string;
  derived_lot_id?: string;
}) {
  const client = getSupabaseClient();
  let q = (client.from('lot_genealogy') as any)
    .select('*')
    .order('created_at', { ascending: true });
  if (filters?.source_lot_id) q = q.eq('source_lot_id', filters.source_lot_id);
  if (filters?.derived_lot_id) q = q.eq('derived_lot_id', filters.derived_lot_id);
  const { data, error } = await q;
  return { data: (data as any[]) ?? [], error };
}

export async function insertLotGenealogy(payload: {
  company_id: string;
  source_lot_id: string;
  derived_lot_id: string;
  /**
   * Espejo de lot_transformations.transformation_type (08). La genealogía y la
   * transformación que la originó deben llevar la misma etiqueta: confirm_lot_transformation
   * rechaza cuando difieren (D032_GENEALOGY_INCOMPATIBLE).
   */
  relation_type: TransformationType;
  created_by?: string | null;
  quantity?: number | null;
  unit?: string | null;
}) {
  const client = getSupabaseClient();
  const row: Record<string, unknown> = {
    company_id: payload.company_id,
    source_lot_id: payload.source_lot_id,
    derived_lot_id: payload.derived_lot_id,
    relation_type: payload.relation_type,
    created_by: payload.created_by ?? null,
  };
  if (payload.quantity != null) row.quantity = payload.quantity;
  if (payload.unit != null) row.unit = payload.unit;
  const { data, error } = await (client.from('lot_genealogy') as any)
    .insert(row)
    .select()
    .single();
  return { data, error };
}

// ============================================
// OPERATIONAL STAGES / LOT STAGE EVENTS (D-016)
// ============================================

export async function listOperationalStages() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('operational_stages')
    .select('*')
    .order('display_order', { ascending: true });
  return { data: (data as any[]) ?? [], error };
}

export async function listLotStageEvents(
  lotId?: string,
  opts?: { latest?: number }
) {
  const client = getSupabaseClient();
  const latest = opts?.latest;
  let q = client
    .from('lot_stage_events')
    .select('*')
    .order('occurred_at', { ascending: !latest });
  if (lotId) q = q.eq('lot_id', lotId);
  if (latest) q = q.limit(latest);
  const { data, error } = await q;
  return { data: (data as any[]) ?? [], error };
}

export async function createLotStageEvent(payload: {
  lot_id: string;
  operational_stage_id: string;
  event_type: 'INGRESO' | 'TRANSICION';
  user_id: string;
  notes?: string | null;
  company_id?: string;
  occurred_at?: string;
}) {
  const client = getSupabaseClient();
  const row: Record<string, unknown> = {
    lot_id: payload.lot_id,
    operational_stage_id: payload.operational_stage_id,
    event_type: payload.event_type,
    user_id: payload.user_id,
    notes: payload.notes ?? null,
  };
  if (payload.company_id) row.company_id = payload.company_id;
  if (payload.occurred_at) row.occurred_at = payload.occurred_at;

  const { data, error } = await (client.from('lot_stage_events') as any)
    .insert(row)
    .select()
    .single();
  return { data, error };
}

// ============================================
// INSPECTIONS (etapa 04)
// ============================================

export async function listInspectionPoints(filters?: {
  company_id?: string;
  species_id?: string;
  operational_stage_id?: string;
}) {
  const client = getSupabaseClient();
  let q = client
    .from('inspection_points')
    .select('*')
    .order('name', { ascending: true });
  if (filters?.company_id) q = q.eq('company_id', filters.company_id);
  if (filters?.species_id) q = q.eq('species_id', filters.species_id);
  if (filters?.operational_stage_id)
    q = q.eq('operational_stage_id', filters.operational_stage_id);
  const { data, error } = await q;
  return { data: (data as any[]) ?? [], error };
}

export async function listMeasurementDefs(
  inspectionPointId?: string,
  options?: { includeInactive?: boolean }
) {
  const client = getSupabaseClient();
  let q = client
    .from('measurement_defs')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (inspectionPointId) q = q.eq('inspection_point_id', inspectionPointId);
  if (!options?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  return { data: (data as any[]) ?? [], error };
}

export async function createMeasurementDef(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('measurement_defs') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateMeasurementDef(id: string, payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('measurement_defs') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function listNormativeReferences() {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('normative_references') as any)
    .select('*')
    .order('source_name', { ascending: true })
    .order('document_name', { ascending: true });
  return { data: (data as any[]) ?? [], error };
}

export async function listCriterionNormativeReferences(measurementDefId: string) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('measurement_def_normative_refs') as any)
    .select('normative_reference_id, relationship, normative_references(*)')
    .eq('measurement_def_id', measurementDefId);
  const rows = (data as any[]) ?? [];
  return {
    data: rows.map((row) => ({
      ...(Array.isArray(row.normative_references)
        ? row.normative_references[0] ?? {}
        : row.normative_references ?? {}),
      normative_reference_id: row.normative_reference_id,
      relationship: row.relationship,
    })),
    error,
  };
}

export async function replaceCriterionNormativeReferences(
  measurementDefId: string,
  normativeReferenceIds: string[]
) {
  const client = getSupabaseClient();
  const table = client.from('measurement_def_normative_refs') as any;
  const { error: deleteError } = await table
    .delete()
    .eq('measurement_def_id', measurementDefId);
  if (deleteError) return { data: null, error: deleteError };
  if (normativeReferenceIds.length === 0) return { data: [], error: null };
  const { data, error } = await table
    .insert(
      normativeReferenceIds.map((normativeReferenceId) => ({
        measurement_def_id: measurementDefId,
        normative_reference_id: normativeReferenceId,
      }))
    )
    .select();
  return { data, error };
}

export async function listInspections() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('inspections')
    .select('*')
    .order('inspected_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function listInspectionsByLot(lotId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('inspections')
    .select('*')
    .eq('lot_id', lotId)
    .order('inspected_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function listAiAnalysesByLot(lotId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('ai_inspection_analysis')
    .select('*, inspections!inner(lot_id, inspection_point_id, decision, result, status)')
    .eq('inspections.lot_id', lotId)
    .order('created_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function getInspection(id: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('inspections')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createInspection(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('inspections') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateInspection(id: string, payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('inspections') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function listSamples(inspectionId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('samples')
    .select('*')
    .eq('inspection_id', inspectionId)
    .eq('is_active', true)
    .order('sample_number', { ascending: true })
    .order('created_at', { ascending: true });
  return { data: (data as any[]) ?? [], error };
}

export async function createSample(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('samples') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function deleteSample(id: string) {
  const client = getSupabaseClient();
  const { error } = await client.from('samples').delete().eq('id', id);
  return { error };
}

export async function listMeasurements(inspectionId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('measurements')
    .select('*')
    .eq('inspection_id', inspectionId);
  return { data: (data as any[]) ?? [], error };
}

/**
 * Upsert de medición: consolidado (sample_id NULL) o por muestra.
 * Índices únicos parciales — no usar ON CONFLICT genérico.
 */
export async function upsertMeasurement(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const inspectionId = String(payload.inspection_id ?? '');
  const defId = String(payload.measurement_def_id ?? '');
  const sampleId = (payload.sample_id as string | null | undefined) ?? null;

  let q = client
    .from('measurements')
    .select('id')
    .eq('inspection_id', inspectionId)
    .eq('measurement_def_id', defId);
  q = sampleId ? q.eq('sample_id', sampleId) : q.is('sample_id', null);

  const { data: existing, error: findErr } = await q.maybeSingle();
  if (findErr) {
    return { data: null, error: findErr };
  }

  const row = { ...payload, sample_id: sampleId };
  if (existing && (existing as { id: string }).id) {
    const { data, error } = await (client.from('measurements') as any)
      .update(row)
      .eq('id', (existing as { id: string }).id)
      .select()
      .single();
    return { data, error };
  }
  const { data, error } = await (client.from('measurements') as any)
    .insert(row)
    .select()
    .single();
  return { data, error };
}

/**
 * Búsqueda de continuidad: inspecciones anteriores por contexto operacional
 * (productor, campo, especie, variedad, etapa, lote, rango de fechas).
 * RLS de inspections/lots aísla por empresa.
 */
export async function searchContinuityInspections(filters: {
  producer_id?: string;
  field_id?: string;
  species_id?: string;
  variety_id?: string;
  operational_stage_id?: string;
  lot_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const client = getSupabaseClient();
  let q = client
    .from('inspections')
    .select(
      `*,
       lots!inner(id, harvest_block, fruit_date, producer_id, field_id, species_id, variety_id, status),
       inspection_points!inner(id, name, operational_stage_id)`
    )
    .order('inspected_at', { ascending: false })
    .limit(filters.limit ?? 25);

  if (filters.lot_id) q = q.eq('lot_id', filters.lot_id);
  if (filters.producer_id) q = q.eq('lots.producer_id', filters.producer_id);
  if (filters.field_id) q = q.eq('lots.field_id', filters.field_id);
  if (filters.species_id) q = q.eq('lots.species_id', filters.species_id);
  if (filters.variety_id) q = q.eq('lots.variety_id', filters.variety_id);
  if (filters.operational_stage_id) {
    q = q.eq('inspection_points.operational_stage_id', filters.operational_stage_id);
  }
  if (filters.date_from) q = q.gte('inspected_at', filters.date_from);
  if (filters.date_to) q = q.lte('inspected_at', filters.date_to);

  const { data, error } = await q;
  return { data: (data as unknown[]) ?? [], error };
}

export async function listInspectionEvidence(inspectionId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('inspection_evidence')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at');
  return { data: (data as any[]) ?? [], error };
}

export async function addInspectionEvidence(
  inspectionId: string,
  storagePath: string,
  measurementDefId?: string | null,
  sampleId?: string | null
) {
  const client = getSupabaseClient();
  const row: Record<string, unknown> = {
    inspection_id: inspectionId,
    storage_path: storagePath,
  };
  if (measurementDefId) row.measurement_def_id = measurementDefId;
  if (sampleId) row.sample_id = sampleId;
  const { data, error } = await (client.from('inspection_evidence') as any)
    .insert(row)
    .select()
    .single();
  return { data, error };
}

export async function deleteInspectionEvidence(id: string) {
  const client = getSupabaseClient();
  const { error } = await client.from('inspection_evidence').delete().eq('id', id);
  return { error };
}

export async function uploadEvidenceFile(
  companyId: string,
  inspectionId: string,
  file: File
) {
  const client = getSupabaseClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${companyId}/inspections/${inspectionId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { error } = await client.storage.from('evidence').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  return { path: error ? null : path, error };
}

export async function getEvidenceSignedUrl(storagePath: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from('evidence')
    .createSignedUrl(storagePath, 3600);
  return { data, error };
}

// ============================================
// AI ANALYSIS + LEARNING (D-021) — solo lectura/escritura desde app
// ============================================

export async function listAiAnalysesByInspection(inspectionId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('ai_inspection_analysis')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function listAiLearningByInspection(inspectionId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('ai_learning_records')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

// ============================================
// QUALITY ENGINE (05) — evaluaciones objetivas
// ============================================

export async function listQualityEvaluationsByInspection(inspectionId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('quality_evaluations')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('evaluated_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function insertQualityEvaluation(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('quality_evaluations') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function updateAiLearningOutcome(
  id: string,
  payload: {
    outcome_posterior?: string | null;
    feedback_type?: string | null;
    feedback_notes?: string | null;
    validated?: boolean;
  }
) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('ai_learning_records') as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// ============================================
// DECISIONS (06) — decisión humana operacional
// ============================================

export async function listDecisionCatalog(companyId?: string) {
  const client = getSupabaseClient();
  let q = client
    .from('decision_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  return { data: (data as any[]) ?? [], error };
}

export async function listDecisionsByLot(lotId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('decisions')
    .select('*')
    .eq('lot_id', lotId)
    .order('decided_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function insertDecision(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('decisions') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function annulDecision(
  id: string,
  payload: { annulled_by: string; annul_reason: string }
) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('decisions') as any)
    .update({
      status: 'ANULADA',
      annulled_by: payload.annulled_by,
      annulled_at: new Date().toISOString(),
      annul_reason: payload.annul_reason,
    })
    .eq('id', id)
    .eq('status', 'REGISTRADA')
    .select()
    .single();
  return { data, error };
}

// ============================================
// CLASIFICACIÓN + SEMÁFORO (append-only)
// ============================================

export async function listQualityClassificationsByLot(lotId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('quality_classifications')
    .select('*')
    .eq('lot_id', lotId)
    .order('classified_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function listQualityClassificationsByInspection(inspectionId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('quality_classifications')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('classified_at', { ascending: false })
    .limit(1);
  return { data: (data as any[]) ?? [], error };
}

/** Última clasificación vigente por lote (para listados y filtros). */
export async function listLatestQualityClassifications() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('quality_classifications')
    .select('*')
    .order('classified_at', { ascending: false });
  return { data: (data as any[]) ?? [], error };
}

export async function insertQualityClassification(payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data, error } = await (client.from('quality_classifications') as any)
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

// ============================================
// INDICADORES OBSERVADOS — QualityNX V2 Fase B
//
// Solo LECTURA de datos persistidos. NO invoca el
// Quality Engine, NO reevalúa inspecciones, NO crea
// clasificaciones ni decisiones, NO define RLS.
//
// Fecha de agrupación: `inspections.inspected_at`
// (fecha operativa existente de la inspección), en UTC.
// Unidad: `measurement_defs.unit`; nunca se convierte.
// Criterio: coincidencia por nombre exacto sobre
// `measurement_defs.name` (case-insensitive).
// Etapa: dimensión existente
// `measurement_defs → inspection_points →
// operational_stages`; nunca se mezcla entre etapas.
// ============================================

export interface ObservedDefRow {
  id: string;
  name: string;
  unit: string | null;
  value_type: string | null;
  operational_stage_id: string | null;
  operational_stage_name: string | null;
}

export interface ObservedSeriesFilter {
  companyId: string;
  criterionNames: string[];
  operationalStageId?: string | null;
  expectedUnit: string;
  grouping: 'DAY' | 'ISO_WEEK';
}

export async function listObservedMeasurementDefs(filter: {
  companyId: string;
  criterionNames: string[];
  operationalStageId?: string | null;
}) {
  const client = getSupabaseClient();
  const rows: ObservedDefRow[] = [];
  const seen = new Set<string>();

  for (const name of filter.criterionNames) {
    const { data, error } = await client
      .from('measurement_defs')
      .select(
        'id, name, unit, value_type, inspection_points(operational_stages(id, name))'
      )
      .eq('company_id', filter.companyId)
      .ilike('name', name);

    if (error) return { data: rows, error };

    for (const raw of (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      unit: string | null;
      value_type: string | null;
      inspection_points: {
        operational_stages: { id: string; name: string } | null;
      } | null;
    }>) {
      if (seen.has(raw.id)) continue;
      const stage = raw.inspection_points?.operational_stages ?? null;
      if (filter.operationalStageId && stage?.id !== filter.operationalStageId) {
        continue;
      }
      seen.add(raw.id);
      rows.push({
        id: raw.id,
        name: raw.name,
        unit: raw.unit,
        value_type: raw.value_type,
        operational_stage_id: stage?.id ?? null,
        operational_stage_name: stage?.name ?? null,
      });
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return { data: rows, error: null };
}

/**
 * Indicador descriptivo. Devuelve el detalle de cada medición
 * (con su clasificación y motivo de exclusión) y el agregado
 * por día o por semana ISO.
 *
 * Fórmula: promedio = Σ valores numéricos evaluables / nº de
 * mediciones evaluables del bucket. Cada MEDICIÓN es una
 * observación; no se consolida por inspección (N>1 sigue
 * PENDIENTE DE ESPECIFICACIÓN).
 */
export async function getObservedIndicator(filter: ObservedSeriesFilter) {
  const client = getSupabaseClient();

  const defsRes = await listObservedMeasurementDefs({
    companyId: filter.companyId,
    criterionNames: filter.criterionNames,
    operationalStageId: filter.operationalStageId ?? null,
  });
  const defs = defsRes.data ?? [];
  const defById = new Map(defs.map((d) => [d.id, d]));

  const base: ObservedIndicatorResult = {
    buckets: [],
    rows: [],
    totals: {
      included_count: 0,
      excluded_count: 0,
      excluded_by_reason: {},
      units_expected: [filter.expectedUnit],
      criterion_names: [...new Set(defs.map((d) => d.name))].sort(),
      operational_stages: [
        ...new Set(defs.map((d) => d.operational_stage_name).filter(Boolean)),
      ].sort() as string[],
      date_field: 'inspections.inspected_at',
      grouping: filter.grouping,
      timezone: 'UTC',
    },
  };

  if (defs.length === 0) return { data: base, error: null };

  const { data: measurements, error } = await client
    .from('measurements')
    .select(
      'id, inspection_id, measurement_def_id, sample_id, value, inspections!inner(id, lot_id, inspected_at, status)'
    )
    .in('measurement_def_id', defs.map((d) => d.id))
    .limit(20000);

  if (error) return { data: base, error };

  const rawRows = (measurements ?? []) as unknown as Array<{
    id: string;
    inspection_id: string;
    measurement_def_id: string;
    sample_id: string | null;
    value: string | null;
    inspections: {
      id: string;
      lot_id: string;
      inspected_at: string;
      status: string;
    } | null;
  }>;

  const inspectionIds = [
    ...new Set(rawRows.map((r) => r.inspections?.id ?? r.inspection_id)),
  ];
  const lotIds = [...new Set(rawRows.map((r) => r.inspections?.lot_id).filter(Boolean))] as string[];

  const { data: lots } = await client
    .from('lots')
    .select('id, folio, harvest_block')
    .in('id', lotIds.length > 0 ? lotIds : ['00000000-0000-0000-0000-000000000000']);
  const lotById = new Map(
    ((lots ?? []) as unknown as Array<{
      id: string;
      folio: string | null;
      harvest_block: string | null;
    }>).map((l) => [l.id, l])
  );

  const { data: evidence } = await client
    .from('inspection_evidence')
    .select('id, inspection_id')
    .in(
      'inspection_id',
      inspectionIds.length > 0
        ? inspectionIds
        : ['00000000-0000-0000-0000-000000000000']
    );
  const evidenceByInspection = new Map<string, number>();
  for (const e of (evidence ?? []) as unknown as Array<{
    id: string;
    inspection_id: string;
  }>) {
    evidenceByInspection.set(
      e.inspection_id,
      (evidenceByInspection.get(e.inspection_id) ?? 0) + 1
    );
  }

  const rows: ObservedMeasurementRow[] = rawRows.map((r) => {
    const def = defById.get(r.measurement_def_id);
    const lot = lotById.get(r.inspections?.lot_id ?? '');
    const inspectionId = r.inspections?.id ?? r.inspection_id;
    const classified = classifyObservedValue(r.value);
    const unitStatus = classifyObservedUnit(
      def?.unit ?? null,
      filter.expectedUnit
    );
    const hasDate = Boolean(r.inspections?.inspected_at);

    let exclusion: ObservedExclusionReasonType | null = null;
    if (!hasDate) exclusion = ObservedExclusionReason.NO_DATE;
    else if (unitStatus === ObservedUnitStatus.MISSING)
      exclusion = ObservedExclusionReason.UNIT_MISSING;
    else if (unitStatus === ObservedUnitStatus.INCOMPATIBLE)
      exclusion = ObservedExclusionReason.UNIT_INCOMPATIBLE;
    else if (classified.kind === ObservedValueClass.EMPTY)
      exclusion = ObservedExclusionReason.EMPTY;
    else if (classified.kind === ObservedValueClass.NON_NUMERIC)
      exclusion = ObservedExclusionReason.NON_NUMERIC;
    else if (classified.kind === ObservedValueClass.AMBIGUOUS)
      exclusion = ObservedExclusionReason.AMBIGUOUS;

    return {
      measurement_id: r.id,
      inspection_id: inspectionId,
      lot_id: r.inspections?.lot_id ?? null,
      lot_folio: lot?.folio ?? null,
      lot_harvest_block: lot?.harvest_block ?? null,
      criterion_name: def?.name ?? '(criterio no resuelto)',
      operational_stage_name: def?.operational_stage_name ?? null,
      sample_id: r.sample_id,
      observed_at: r.inspections?.inspected_at ?? null,
      value_original: classified.original,
      value_kind: classified.kind,
      numeric: classified.numeric,
      unit: def?.unit ?? null,
      unit_status: unitStatus,
      evidence_count: evidenceByInspection.get(inspectionId) ?? 0,
      included: exclusion === null,
      exclusion_reason: exclusion,
    };
  });

  rows.sort(
    (a, b) =>
      String(a.observed_at).localeCompare(String(b.observed_at)) ||
      a.measurement_id.localeCompare(b.measurement_id)
  );

  const acc = new Map<
    string,
    {
      sum: number;
      n: number;
      excluded: number;
      byReason: Partial<Record<ObservedExclusionReason, number>>;
      stages: Set<string>;
      units: Set<string>;
      year: number | null;
      week: number | null;
    }
  >();

  for (const row of rows) {
    const date = row.observed_at ? new Date(row.observed_at) : null;
    let bucket: string;
    let year: number | null = null;
    let week: number | null = null;
    if (date && !Number.isNaN(date.getTime())) {
      if (filter.grouping === 'DAY') {
        bucket = observedDayKey(date);
      } else {
        const w = observedIsoWeek(date);
        year = w.year;
        week = w.week;
        bucket = observedWeekKey(date);
      }
    } else {
      bucket = 'SIN-FECHA';
    }

    const entry = acc.get(bucket) ?? {
      sum: 0,
      n: 0,
      excluded: 0,
      byReason: {},
      stages: new Set<string>(),
      units: new Set<string>(),
      year,
      week,
    };

    if (row.included && row.numeric !== null) {
      entry.sum += row.numeric;
      entry.n += 1;
      if (row.operational_stage_name)
        entry.stages.add(row.operational_stage_name);
      if (row.unit) entry.units.add(row.unit);
      base.totals.included_count += 1;
    } else {
      entry.excluded += 1;
      base.totals.excluded_count += 1;
      const reason = row.exclusion_reason ?? ObservedExclusionReason.EMPTY;
      entry.byReason[reason] = (entry.byReason[reason] ?? 0) + 1;
      base.totals.excluded_by_reason[reason] =
        (base.totals.excluded_by_reason[reason] ?? 0) + 1;
    }
    acc.set(bucket, entry);
  }

  const buckets: ObservedIndicatorBucket[] = [...acc.entries()]
    .map(([bucket, e]) => ({
      bucket,
      iso_year: e.year,
      iso_week: e.week,
      average: e.n > 0 ? Number((e.sum / e.n).toFixed(4)) : null,
      included_count: e.n,
      excluded_count: e.excluded,
      excluded_by_reason: e.byReason,
      contributing_stages: [...e.stages].sort(),
      units: [...e.units].sort(),
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  return { data: { ...base, buckets, rows }, error: null };
}

// ============================================
// ANÁLISIS GERENCIAL — QualityNX V2 (experiencia)
//
// Solo LECTURA. Reutiliza tablas y relaciones existentes.
// NO consolida muestras, NO inventa umbrales, NO convierte
// unidades, NO clasifica, NO decide y NO afirma
// cumplimiento: los criterios están PENDIENTE DE
// VALIDACIÓN, por lo que una DESVIACIÓN es una
// desviación respecto del criterio CONFIGURADO, no un
// incumplimiento normativo.
//
// Toda tasa se publica con su denominador y con el
// conteo de registros no evaluables.
// ============================================

export type QualityEvalResult =
  | 'CUMPLE'
  | 'DESVIACIÓN'
  | 'SIN CRITERIO CONFIGURADO'
  | 'UNIDAD INCOMPATIBLE'
  | 'CONFIGURACIÓN AMBIGUA'
  | 'CRITERIO INACTIVO';

/** Resultados que NO constituyen una determinación de cumplimiento. */
export const NON_DETERMINATION_RESULTS: QualityEvalResult[] = [
  'SIN CRITERIO CONFIGURADO',
  'UNIDAD INCOMPATIBLE',
  'CONFIGURACIÓN AMBIGUA',
  'CRITERIO INACTIVO',
];

export interface StageQualityRow {
  stage_id: string | null;
  stage_name: string;
  /** Etapas sininzguna inspección en el período. */
  inspections: number;
  inspections_completed: number;
  inspections_open: number;
  measurements: number;
  /** Criterios configurados en los puntos de la etapa. */
  criteria: number;
  /** Criterios con límites min/max configurados. */
  criteria_with_limits: number;
  /** Criterios con `validation_status = 'VALIDADO'`. */
  criteria_validated: number;
  evaluations: number;
  evaluations_cumple: number;
  evaluations_desviacion: number;
  /** Evaluaciones sin determinación (no contadas como cumplimiento). */
  evaluations_non_determination: number;
  /** Denominador de la tasa de desviación: cumple + desviación. */
  evaluations_determined: number;
}

export interface ProducerQualityRow {
  producer_id: string;
  producer_name: string;
  lots: number;
  inspections: number;
  inspections_completed: number;
  measurements: number;
  evaluations: number;
  evaluations_cumple: number;
  evaluations_desviacion: number;
  evaluations_non_determination: number;
  evaluations_determined: number;
  /** Etapas con datos del productor. */
  stages_covered: number;
}

export interface RecurringDeviationRow {
  measurement_def_id: string;
  criterion_name: string;
  unit: string | null;
  value_type: string | null;
  stage_name: string | null;
  validation_status: string | null;
  evaluations: number;
  evaluations_desviacion: number;
  evaluations_cumple: number;
  evaluations_non_determination: number;
  evaluations_determined: number;
  inspections_touched: number;
}

export interface QualityCoverageRow {
  criteria_total: number;
  criteria_validated: number;
  criteria_configurable: number;
  criteria_pending: number;
  criteria_with_limits: number;
  criteria_with_source: number;
  inspections: number;
  inspections_completed: number;
  inspections_open: number;
  evaluations: number;
  evaluations_non_determination: number;
  lots: number;
  lots_with_current_stage: number;
  decisions: number;
  classifications: number;
}

const asCount = (rows: Array<Record<string, unknown>>, key: string) =>
  rows.filter((r) => r[key] === key).length;

/**
 * PostgREST trunca cada respuesta en 1000 filas (max-rows). Una lectura
 * simple de `quality_evaluations` devuelve 1000 de 1194 y produce tasas
 * equivocadas. Se lee por bloques de 1000 hasta agotar el rango, y se
 * registra si la respuesta vino truncada.
 */
const ANALYSIS_PAGE = 1000;

async function fetchAllRows<T extends Record<string, unknown>>(
  client: ReturnType<typeof getSupabaseClient>,
  table: string,
  columns: string,
  extra?: { order?: { column: string; ascending?: boolean } }
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  let from = 0;
  let truncated = false;
  for (let guard = 0; guard < 200; guard += 1) {
    let q = client
      .from(table)
      .select(columns)
      .range(from, from + ANALYSIS_PAGE - 1);
    if (extra?.order) {
      q = q.order(extra.order.column, { ascending: extra.order.ascending ?? true });
    }
    const { data, error } = await q;
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < ANALYSIS_PAGE) break;
    from += ANALYSIS_PAGE;
    if (page.length === 0) break;
  }
  // Si la última página vino exactamente completa, podría haber más.
  truncated = rows.length % ANALYSIS_PAGE === 0 && rows.length > 0;
  return { rows, truncated };
}

async function fetchAllForAnalysis(
  client: ReturnType<typeof getSupabaseClient>
) {
  const [stagesRes, pointsRes, defsRes, inspRes, measRes, lotsRes, decRes, clsRes, evalAll] =
    await Promise.all([
      client.from('operational_stages').select('*').order('display_order', { ascending: true }),
      client.from('inspection_points').select('*'),
      client.from('measurement_defs').select('*'),
      client.from('inspections').select('*'),
      client.from('measurements').select('id,inspection_id,measurement_def_id'),
      client.from('lots').select('id,producer_id,current_operational_stage_id'),
      client.from('decisions').select('id,lot_id,status'),
      client.from('quality_classifications').select('id,lot_id,inspection_id'),
      fetchAllRows<Record<string, unknown>>(
        client,
        'quality_evaluations',
        'id,inspection_id,measurement_def_id,result'
      ),
    ]);

  return {
    stages: (stagesRes.data ?? []) as any[],
    points: (pointsRes.data ?? []) as any[],
    defs: (defsRes.data ?? []) as any[],
    inspections: (inspRes.data ?? []) as any[],
    measurements: (measRes.data ?? []) as any[],
    evaluations: evalAll.rows as any[],
    evaluations_truncated: evalAll.truncated,
    lots: (lotsRes.data ?? []) as any[],
    decisions: (decRes.data ?? []) as any[],
    classifications: (clsRes.data ?? []) as any[],
    error:
      stagesRes.error ||
      pointsRes.error ||
      defsRes.error ||
      inspRes.error ||
      measRes.error ||
      lotsRes.error ||
      decRes.error ||
      clsRes.error,
  };
}

const emptyStageRow = (stageId: string | null, stageName: string): StageQualityRow => ({
  stage_id: stageId,
  stage_name: stageName,
  inspections: 0,
  inspections_completed: 0,
  inspections_open: 0,
  measurements: 0,
  criteria: 0,
  criteria_with_limits: 0,
  criteria_validated: 0,
  evaluations: 0,
  evaluations_cumple: 0,
  evaluations_desviacion: 0,
  evaluations_non_determination: 0,
  evaluations_determined: 0,
});

/** Análisis por etapa operacional. Denominadores explícitos. */
export async function listStageQualityAnalysis(companyId: string) {
  const client = getSupabaseClient();
  const d = await fetchAllForAnalysis(client);
  if (d.error) return { data: [] as StageQualityRow[], error: d.error };

  const stageByPoint = new Map<string, string | null>();
  for (const p of d.points) stageByPoint.set(p.id, p.operational_stage_id ?? null);

  const rows = new Map<string, StageQualityRow>();
  for (const s of d.stages) rows.set(s.id, emptyStageRow(s.id, s.name));
  rows.set('sin-etapa', emptyStageRow(null, 'Sin etapa asignada'));

  const defById = new Map<string, any>();
  for (const def of d.defs) {
    if (def.company_id && def.company_id !== companyId) continue;
    defById.set(def.id, def);
    const stageId = stageByPoint.get(def.inspection_point_id) ?? null;
    const row = rows.get(stageId ?? 'sin-etapa');
    if (!row) continue;
    row.criteria += 1;
    if (def.min_value !== null || def.max_value !== null) row.criteria_with_limits += 1;
    if (def.validation_status === 'VALIDADO') row.criteria_validated += 1;
  }

  const nonDetermination = new Set(NON_DETERMINATION_RESULTS as string[]);
  const inspById = new Map<string, any>();
  for (const i of d.inspections) {
    if (i.company_id && i.company_id !== companyId) continue;
    inspById.set(i.id, i);
    const stageId = stageByPoint.get(i.inspection_point_id) ?? null;
    const row = rows.get(stageId ?? 'sin-etapa');
    if (!row) continue;
    row.inspections += 1;
    if (i.status === 'COMPLETADA') row.inspections_completed += 1;
    else row.inspections_open += 1;
  }

  for (const m of d.measurements) {
    const insp = inspById.get(m.inspection_id);
    if (!insp) continue;
    const stageId = stageByPoint.get(insp.inspection_point_id) ?? null;
    const row = rows.get(stageId ?? 'sin-etapa');
    if (row) row.measurements += 1;
  }

  for (const e of d.evaluations) {
    const insp = inspById.get(e.inspection_id);
    if (!insp) continue;
    const stageId = stageByPoint.get(insp.inspection_point_id) ?? null;
    const row = rows.get(stageId ?? 'sin-etapa');
    if (!row) continue;
    row.evaluations += 1;
    if (e.result === 'CUMPLE') {
      row.evaluations_cumple += 1;
      row.evaluations_determined += 1;
    } else if (e.result === 'DESVIACIÓN') {
      row.evaluations_desviacion += 1;
      row.evaluations_determined += 1;
    } else if (nonDetermination.has(e.result)) {
      row.evaluations_non_determination += 1;
    }
  }

  const list = [...rows.values()].sort((a, b) => {
    if (a.stage_id === null) return 1;
    if (b.stage_id === null) return -1;
    return 0;
  });
  return { data: list, error: null };
}

/**
 * Análisis por productor. **No es un ranking de calidad**: no
 * asigna puntuaciones ni ordena por desempeño. Cada fila
 * publica su denominador y el número de etapas cubiertas para
 * que la comparación sea visible y el usuario la juzgue.
 */
export async function listProducerQualityAnalysis(companyId: string) {
  const client = getSupabaseClient();
  const d = await fetchAllForAnalysis(client);
  if (d.error) return { data: [] as ProducerQualityRow[], error: d.error };

  const { data: producersRaw } = await client
    .from('producers')
    .select('id,name,company_id,is_active')
    .eq('company_id', companyId)
    .order('name', { ascending: true });
  const producers = (producersRaw ?? []) as any[];

  const stageByPoint = new Map<string, string | null>();
  for (const p of d.points) stageByPoint.set(p.id, p.operational_stage_id ?? null);
  const nonDetermination = new Set(NON_DETERMINATION_RESULTS as string[]);

  const rows = new Map<string, ProducerQualityRow>();
  for (const p of producers) {
    rows.set(p.id, {
      producer_id: p.id,
      producer_name: p.name,
      lots: 0,
      inspections: 0,
      inspections_completed: 0,
      measurements: 0,
      evaluations: 0,
      evaluations_cumple: 0,
      evaluations_desviacion: 0,
      evaluations_non_determination: 0,
      evaluations_determined: 0,
      stages_covered: 0,
    });
  }

  const lots = d.lots.filter((l) => !l.company_id || l.company_id === companyId);
  const lotById = new Map<string, any>();
  for (const l of lots) {
    lotById.set(l.id, l);
    const row = rows.get(l.producer_id);
    if (row) row.lots += 1;
  }

  const stagesByProducer = new Map<string, Set<string>>();
  const inspById = new Map<string, any>();
  for (const i of d.inspections) {
    if (i.company_id && i.company_id !== companyId) continue;
    inspById.set(i.id, i);
    const lot = lotById.get(i.lot_id);
    if (!lot) continue;
    const row = rows.get(lot.producer_id);
    if (!row) continue;
    row.inspections += 1;
    if (i.status === 'COMPLETADA') row.inspections_completed += 1;
    const stageId = stageByPoint.get(i.inspection_point_id) ?? 'sin-etapa';
    if (!stagesByProducer.has(lot.producer_id)) stagesByProducer.set(lot.producer_id, new Set());
    stagesByProducer.get(lot.producer_id)!.add(stageId);
  }
  for (const [pid, set] of stagesByProducer) {
    const row = rows.get(pid);
    if (row) row.stages_covered = set.size;
  }

  for (const m of d.measurements) {
    const insp = inspById.get(m.inspection_id);
    if (!insp) continue;
    const lot = lotById.get(insp.lot_id);
    const row = lot ? rows.get(lot.producer_id) : null;
    if (row) row.measurements += 1;
  }

  for (const e of d.evaluations) {
    const insp = inspById.get(e.inspection_id);
    if (!insp) continue;
    const lot = lotById.get(insp.lot_id);
    const row = lot ? rows.get(lot.producer_id) : null;
    if (!row) continue;
    row.evaluations += 1;
    if (e.result === 'CUMPLE') {
      row.evaluations_cumple += 1;
      row.evaluations_determined += 1;
    } else if (e.result === 'DESVIACIÓN') {
      row.evaluations_desviacion += 1;
      row.evaluations_determined += 1;
    } else if (nonDetermination.has(e.result)) {
      row.evaluations_non_determination += 1;
    }
  }

  const list = [...rows.values()].sort((a, b) => b.evaluations_determined - a.evaluations_determined);
  return { data: list, error: null };
}

/**
 * Criterios que más se desvían. "Ocurrencia" = una
 * evaluación con `result = DESVIACIÓN` sobre el criterio
 * configurado. Denominador = evaluaciones determinadas
 * (CUMPLE + DESVIACIÓN). Se declara explícitamente que una
 * desviación **no** es incumplimiento normativo mientras el
 * criterio no esté validado.
 */
export async function listRecurringDeviationAnalysis(
  companyId: string,
  limit = 20
) {
  const client = getSupabaseClient();
  const d = await fetchAllForAnalysis(client);
  if (d.error) return { data: [] as RecurringDeviationRow[], error: d.error };

  const stageByPoint = new Map<string, string | null>();
  for (const p of d.points) stageByPoint.set(p.id, p.operational_stage_id ?? null);
  const stageById = new Map<string, string>();
  for (const s of d.stages) stageById.set(s.id, s.name);

  const inspById = new Map<string, any>();
  for (const i of d.inspections) {
    if (i.company_id && i.company_id !== companyId) continue;
    inspById.set(i.id, i);
  }

  const nonDetermination = new Set(NON_DETERMINATION_RESULTS as string[]);
  const acc = new Map<string, RecurringDeviationRow>();
  const inspectionsTouched = new Map<string, Set<string>>();

  for (const e of d.evaluations) {
    const insp = inspById.get(e.inspection_id);
    if (!insp) continue;
    const def = d.defs.find((x) => x.id === e.measurement_def_id);
    if (!def) continue;
    if (!acc.has(def.id)) {
      const stageId = stageByPoint.get(def.inspection_point_id) ?? null;
      acc.set(def.id, {
        measurement_def_id: def.id,
        criterion_name: def.name,
        unit: def.unit ?? null,
        value_type: def.value_type ?? null,
        stage_name: stageId ? (stageById.get(stageId) ?? null) : null,
        validation_status: def.validation_status ?? null,
        evaluations: 0,
        evaluations_desviacion: 0,
        evaluations_cumple: 0,
        evaluations_non_determination: 0,
        evaluations_determined: 0,
        inspections_touched: 0,
      });
      inspectionsTouched.set(def.id, new Set());
    }
    const row = acc.get(def.id)!;
    row.evaluations += 1;
    if (e.result === 'CUMPLE') {
      row.evaluations_cumple += 1;
      row.evaluations_determined += 1;
      inspectionsTouched.get(def.id)!.add(e.inspection_id);
    } else if (e.result === 'DESVIACIÓN') {
      row.evaluations_desviacion += 1;
      row.evaluations_determined += 1;
      inspectionsTouched.get(def.id)!.add(e.inspection_id);
    } else if (nonDetermination.has(e.result)) {
      row.evaluations_non_determination += 1;
    }
  }

  const list = [...acc.values()]
    .map((r) => ({ ...r, inspections_touched: inspectionsTouched.get(r.measurement_def_id)?.size ?? 0 }))
    .filter((r) => r.evaluations > 0)
    .sort(
      (a, b) =>
        b.evaluations_desviacion - a.evaluations_desviacion ||
        b.evaluations_determined - a.evaluations_determined
    )
    .slice(0, limit);

  return { data: list, error: null };
}

/** Cobertura y confiabilidad del dato. Alimenta la vista gerencial. */
export async function listQualityCoverage(companyId: string) {
  const client = getSupabaseClient();
  const d = await fetchAllForAnalysis(client);
  if (d.error) return { data: null, error: d.error };

  const defs = d.defs.filter((x) => !x.company_id || x.company_id === companyId);
  const inspections = d.inspections.filter((x) => !x.company_id || x.company_id === companyId);
  const evalsByInsp = new Map<string, number>();
  for (const e of d.evaluations) {
    const insp = inspections.find((i) => i.id === e.inspection_id);
    if (!insp) continue;
    evalsByInsp.set(e.inspection_id, (evalsByInsp.get(e.inspection_id) ?? 0) + 1);
  }
  const nonDetermination = new Set(NON_DETERMINATION_RESULTS as string[]);
  let nonDet = 0;
  for (const e of d.evaluations) {
    if (nonDetermination.has(e.result)) nonDet += 1;
  }

  const lots = d.lots.filter((l) => !l.company_id || l.company_id === companyId);
  const data: QualityCoverageRow = {
    criteria_total: defs.length,
    criteria_validated: defs.filter((x) => x.validation_status === 'VALIDADO').length,
    criteria_configurable: defs.filter((x) => x.validation_status === 'CONFIGURABLE').length,
    criteria_pending: defs.filter((x) => x.validation_status === 'PENDIENTE DE VALIDACIÓN').length,
    criteria_with_limits: defs.filter((x) => x.min_value !== null || x.max_value !== null).length,
    criteria_with_source: defs.filter((x) => !!x.source_kind).length,
    inspections: inspections.length,
    inspections_completed: inspections.filter((i) => i.status === 'COMPLETADA').length,
    inspections_open: inspections.filter((i) => i.status !== 'COMPLETADA').length,
    evaluations: d.evaluations.length,
    evaluations_non_determination: nonDet,
    lots: lots.length,
    lots_with_current_stage: lots.filter((l) => !!l.current_operational_stage_id).length,
    decisions: d.decisions.length,
    classifications: d.classifications.length,
  };
  void asCount;
  void evalsByInsp;
  return { data, error: null };
}

// D-032: transformaciones, existencias y disposiciones
export * from './transformations';
export * from './traceability';

// ============================================
// ANÁLISIS POR VARIEDAD — V2 (experiencia gerencial)
// Solo lectura. Misma especificación que por productor:
// sin ranking de calidad, con denominador explícito y
// conteo de registros sin determinación.
// ============================================

export interface VarietyQualityRow {
  variety_id: string;
  variety_name: string;
  species_name: string | null;
  producers: number;
  lots: number;
  inspections: number;
  measurements: number;
  evaluations: number;
  evaluations_cumple: number;
  evaluations_desviacion: number;
  evaluations_non_determination: number;
  evaluations_determined: number;
  stages_covered: number;
  /** Top de problemas por variedad: criterio con más desviaciones. */
  top_criterion: string | null;
  top_criterion_deviations: number;
}

export async function listVarietyQualityAnalysis(companyId: string) {
  const client = getSupabaseClient();
  const d = await fetchAllForAnalysis(client);
  if (d.error) return { data: [] as VarietyQualityRow[], error: d.error };

  const { data: varietiesRaw } = await client
    .from('varieties')
    .select('id,name,species_id,company_id,is_active')
    .eq('company_id', companyId)
    .order('name', { ascending: true });
  const varieties = (varietiesRaw ?? []) as any[];

  const { data: speciesRaw } = await client
    .from('species')
    .select('id,name')
    .eq('company_id', companyId);
  const speciesName: Record<string, string> = {};
  ((speciesRaw ?? []) as any[]).forEach((s) => { speciesName[s.id] = s.name; });

  const stageByPoint = new Map<string, string | null>();
  for (const p of d.points) stageByPoint.set(p.id, p.operational_stage_id ?? null);
  const nonDetermination = new Set(NON_DETERMINATION_RESULTS as string[]);

  const rows = new Map<string, VarietyQualityRow>();
  for (const v of varieties) {
    rows.set(v.id, {
      variety_id: v.id,
      variety_name: v.name,
      species_name: v.species_id ? speciesName[v.species_id] ?? null : null,
      producers: 0,
      lots: 0,
      inspections: 0,
      measurements: 0,
      evaluations: 0,
      evaluations_cumple: 0,
      evaluations_desviacion: 0,
      evaluations_non_determination: 0,
      evaluations_determined: 0,
      stages_covered: 0,
      top_criterion: null,
      top_criterion_deviations: 0,
    });
  }

  const lots = d.lots.filter((l) => !l.company_id || l.company_id === companyId);
  const lotById = new Map<string, any>();
  const producersByVariety = new Map<string, Set<string>>();
  for (const l of lots) {
    lotById.set(l.id, l);
    const row = rows.get(l.variety_id);
    if (!row) continue;
    row.lots += 1;
    if (l.producer_id) {
      if (!producersByVariety.has(l.variety_id)) producersByVariety.set(l.variety_id, new Set());
      producersByVariety.get(l.variety_id)!.add(l.producer_id);
    }
  }
  for (const [vid, set] of producersByVariety) {
    const row = rows.get(vid);
    if (row) row.producers = set.size;
  }

  const stagesByVariety = new Map<string, Set<string>>();
  const inspById = new Map<string, any>();
  for (const i of d.inspections) {
    if (i.company_id && i.company_id !== companyId) continue;
    inspById.set(i.id, i);
    const lot = lotById.get(i.lot_id);
    const row = lot ? rows.get(lot.variety_id) : null;
    if (!row) continue;
    row.inspections += 1;
    const stageId = stageByPoint.get(i.inspection_point_id) ?? 'sin-etapa';
    if (!stagesByVariety.has(lot.variety_id)) stagesByVariety.set(lot.variety_id, new Set());
    stagesByVariety.get(lot.variety_id)!.add(stageId);
  }
  for (const [vid, set] of stagesByVariety) {
    const row = rows.get(vid);
    if (row) row.stages_covered = set.size;
  }

  for (const m of d.measurements) {
    const insp = inspById.get(m.inspection_id);
    if (!insp) continue;
    const lot = lotById.get(insp.lot_id);
    const row = lot ? rows.get(lot.variety_id) : null;
    if (row) row.measurements += 1;
  }

  const devByVarietyDef = new Map<string, number>();
  const defName = new Map<string, string>();
  for (const def of d.defs) defName.set(def.id, def.name);
  for (const e of d.evaluations) {
    const insp = inspById.get(e.inspection_id);
    if (!insp) continue;
    const lot = lotById.get(insp.lot_id);
    const row = lot ? rows.get(lot.variety_id) : null;
    if (!row) continue;
    row.evaluations += 1;
    if (e.result === 'CUMPLE') {
      row.evaluations_cumple += 1;
      row.evaluations_determined += 1;
    } else if (e.result === 'DESVIACIÓN') {
      row.evaluations_desviacion += 1;
      row.evaluations_determined += 1;
      const key = lot.variety_id + '|' + e.measurement_def_id;
      devByVarietyDef.set(key, (devByVarietyDef.get(key) ?? 0) + 1);
    } else if (nonDetermination.has(e.result)) {
      row.evaluations_non_determination += 1;
    }
  }

  for (const [key, n] of devByVarietyDef) {
    const [vid, defId] = key.split('|');
    const row = rows.get(vid);
    if (row && n > row.top_criterion_deviations) {
      row.top_criterion_deviations = n;
      row.top_criterion = defName.get(defId) ?? defId;
    }
  }

  const list = [...rows.values()].sort(
    (a, b) => b.evaluations_determined - a.evaluations_determined
  );
  return { data: list, error: null };
}
