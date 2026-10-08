import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPERATION_TYPES = [
  'INSPECTION_CREATE',
  'INSPECTION_OBSERVATION',
  'INSPECTION_SAMPLING',
  'SAMPLE_CREATE',
  'MEASUREMENT_UPSERT',
  'EVIDENCE_ATTACH',
  'DECISION_CREATE',
  'INSPECTION_COMPLETE',
] as const;

const MAX_OPERATIONS = 200;

/**
 * `.strict()` en la operacion es deliberado: si el cliente intenta enviar
 * company_id, user_id o cualquier otra identidad, la peticion se rechaza en el
 * borde en vez de llegar a la base. La identidad se deriva SIEMPRE de la
 * sesion verificada.
 */
const operationSchema = z
  .object({
    client_operation_id: z.string().uuid('client_operation_id debe ser un UUID'),
    operation_type: z.enum(OPERATION_TYPES),
    entity_type: z.string().min(1).max(64).nullable().optional(),
    entity_id: z.string().uuid().nullable().optional(),
    payload: z.record(z.string(), z.unknown()),
    batch_seq: z.number().int().nonnegative().optional(),
  })
  .strict();

const bodySchema = z.object({ operations: z.array(operationSchema).min(1).max(MAX_OPERATIONS) });

type RpcResult = {
  outcome?: string;
  status?: string;
  entity_id?: string | null;
  result?: { ok?: boolean; error_detail?: string; error_code?: string; retryable?: boolean };
};

type OperationRow = z.infer<typeof operationSchema>;

/**
 * Cliente interno con service_role. Nunca sale de este modulo: la clave se lee
 * de process.env en el servidor y no se serializa en ninguna respuesta.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Verifica el token del usuario con la anon key y devuelve su auth uid.
 * El cliente no envía ni puede enviar su identidad: solo el token.
 */
async function requireUser(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { userId: null, error: 'No autenticado.' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { userId: null, error: 'Supabase no configurado.' };

  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { userId: null, error: 'Sesión inválida.' };
  return { userId: data.user.id, error: null };
}

async function applyOperation(sb: ReturnType<typeof adminClient>, authId: string, op: OperationRow) {
  const { data, error } = await sb!.rpc('sync_apply_operation', {
    p_actor_auth_id: authId,
    p_client_operation_id: op.client_operation_id,
    p_operation_type: op.operation_type,
    p_entity_type: op.entity_type ?? null,
    p_entity_id: op.entity_id ?? null,
    p_payload: op.payload,
    p_batch_seq: op.batch_seq ?? 0,
  });
  if (error) return { rpcError: error.message };
  return { rpc: (data ?? null) as RpcResult | null };
}

/**
 * POST /api/sync/batch
 *
 * Aplica un lote de operaciones offline (09 · Fase 1).
 *
 * - El actor se deriva de la sesion verificada; company_id y user_id los
 *   resuelve la base, nunca el cliente.
 * - Cada operacion se ejecuta en su propia transaccion via
 *   sync_apply_operation, que ya aporta reserva previa, atomicidad,
 *   idempotencia por client_operation_id y rollback del sub-bloque.
 * - El lote es secuencial para respetar batch_seq; la concurrencia entre
 *   dispositivos la resuelve la misma funcion.
 * - El resultado por operacion viaja en `results[]`; un fallo de negocio no
 *   revoca el lote entero porque cada operacion es atomica por separado.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (!auth.userId) {
      return NextResponse.json({ error: auth.error ?? 'No autenticado.' }, { status: 401 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido.', detail: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const sb = adminClient();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase admin no configurado.' }, { status: 503 });
    }

    const results: {
      client_operation_id: string;
      batch_seq: number;
      outcome?: string;
      status?: string;
      entity_id?: string | null;
      ok?: boolean;
      error_detail?: string;
      error_code?: string;
      retryable?: boolean;
    }[] = [];

    for (const [index, op] of parsed.data.operations.entries()) {
      const seq = op.batch_seq ?? index;
      const { rpc, rpcError } = await applyOperation(sb, auth.userId, op);
      if (rpcError) {
        results.push({
          client_operation_id: op.client_operation_id,
          batch_seq: seq,
          status: 'ERROR',
          ok: false,
          error_detail: rpcError,
          retryable: true,
        });
        continue;
      }
      results.push({
        client_operation_id: op.client_operation_id,
        batch_seq: seq,
        outcome: rpc?.outcome,
        status: rpc?.status,
        entity_id: rpc?.entity_id ?? null,
        ok: rpc?.result?.ok ?? false,
        error_detail: rpc?.result?.error_detail,
        error_code: rpc?.result?.error_code,
        retryable: rpc?.result?.retryable,
      });
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    console.error('[sync/batch POST]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error al aplicar el lote.' }, { status: 500 });
  }
}