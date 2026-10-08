import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { registerDecision } from '@/lib/decisions';

const bodySchema = z.object({
  lot_id: z.string().uuid('lot_id inválido'),
  decision_catalog_id: z.string().uuid().optional(),
  decision_code: z.string().min(1).max(100).optional(),
  inspection_id: z.string().uuid().nullable().optional(),
  fundamento: z.string().max(4000).nullable().optional(),
});

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireAuth(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { user: null, error: 'No autenticado.' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { user: null, error: 'Supabase no configurado.' };

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { user: null, error: 'Sesión inválida.' };
  return { user: data.user, error: null };
}

async function resolveProfile(userId: string) {
  const sb = adminClient();
  if (!sb) return null;
  const { data } = await sb
    .from('users')
    .select('id, company_id, role, is_active, email')
    .eq('auth_id', userId)
    .maybeSingle();
  return data;
}

const DECIDER_ROLES = new Set(['COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN']);

/**
 * POST /api/decisions
 * Registra una decisión operacional humana sobre un lote (06).
 * No toma decisiones automáticas; valida permisos, lote, tipo y fundamento.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error ?? 'No autenticado.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }
    if (!parsed.data.decision_catalog_id && !parsed.data.decision_code) {
      return NextResponse.json(
        { error: 'Debe indicar decision_catalog_id o decision_code.' },
        { status: 400 }
      );
    }

    const profile = await resolveProfile(auth.user.id);
    if (!profile || !(profile as { is_active: boolean }).is_active) {
      return NextResponse.json({ error: 'Usuario inexistente o inactivo.' }, { status: 403 });
    }
    const role = String((profile as { role: string }).role);
    if (!DECIDER_ROLES.has(role)) {
      return NextResponse.json({ error: 'Usuario sin autorización para decidir.' }, { status: 403 });
    }

    const companyId = (profile as { company_id: string | null }).company_id;
    const usersId = String((profile as { id: string }).id);
    if (!companyId && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Usuario sin empresa asignada.' }, { status: 403 });
    }

    // SUPER_ADMIN sin empresa: exigir que el lote exista y derivar company del lote
    let companyIdFinal = companyId;
    if (!companyIdFinal) {
      const sb = adminClient();
      if (!sb) {
        return NextResponse.json({ error: 'Supabase admin no configurado.' }, { status: 503 });
      }
      const { data: lot } = await sb
        .from('lots')
        .select('company_id')
        .eq('id', parsed.data.lot_id)
        .maybeSingle();
      if (!lot) {
        return NextResponse.json({ error: 'Lote inexistente.' }, { status: 404 });
      }
      companyIdFinal = String((lot as { company_id: string }).company_id);
    }

    const result = await registerDecision({
      lot_id: parsed.data.lot_id,
      decision_catalog_id: parsed.data.decision_catalog_id,
      decision_code: parsed.data.decision_code,
      inspection_id: parsed.data.inspection_id ?? null,
      fundamento: parsed.data.fundamento ?? null,
      decided_by: usersId,
      company_id: companyIdFinal,
    });

    if (result.error || result.status >= 400) {
      return NextResponse.json({ error: result.error ?? 'No fue posible registrar.' }, {
        status: result.status,
      });
    }

    return NextResponse.json({ decision: result.decision }, { status: 201 });
  } catch (err) {
    console.error('[decisions POST]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error al registrar decisión.' }, { status: 500 });
  }
}

/**
 * GET /api/decisions?lot_id=…
 * Lista decisiones de un lote (incluye ANULADAS como historial).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error ?? 'No autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lot_id') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(lotId)) {
      return NextResponse.json({ error: 'lot_id inválido.' }, { status: 400 });
    }

    const sb = adminClient();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase admin no configurado.' }, { status: 503 });
    }

    const profile = await resolveProfile(auth.user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Usuario inexistente.' }, { status: 403 });
    }

    const { data, error } = await sb
      .from('decisions')
      .select('*')
      .eq('lot_id', lotId)
      .order('decided_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'No se pudieron leer decisiones.' }, { status: 500 });
    }

    const companyId = (profile as { company_id: string | null }).company_id;
    const role = String((profile as { role: string }).role);
    const rows = ((data as Record<string, unknown>[]) ?? []).filter(
      (r) => role === 'SUPER_ADMIN' || !companyId || r.company_id === companyId
    );

    return NextResponse.json({ decisions: rows }, { status: 200 });
  } catch (err) {
    console.error('[decisions GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error al leer decisiones.' }, { status: 500 });
  }
}
