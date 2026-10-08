import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { annulDecisionRecord } from '@/lib/decisions';

const bodySchema = z.object({
  decision_id: z.string().uuid('decision_id inválido'),
  annul_reason: z.string().min(3, 'El motivo de anulación es obligatorio.').max(2000),
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

const ANNULER_ROLES = new Set(['COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN']);

/**
 * POST /api/decisions/annul
 * Anula una decisión REGISTRADA → estado ANULADA (06 §10–§11).
 * Nunca elimina el registro; conserva historial y trazabilidad.
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
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message ?? 'Payload inválido.' },
        { status: 400 }
      );
    }

    const sb = adminClient();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase admin no configurado.' }, { status: 503 });
    }

    const { data: profile } = await sb
      .from('users')
      .select('id, company_id, role, is_active')
      .eq('auth_id', auth.user.id)
      .maybeSingle();

    if (!profile || !(profile as { is_active: boolean }).is_active) {
      return NextResponse.json({ error: 'Usuario inexistente o inactivo.' }, { status: 403 });
    }
    const role = String((profile as { role: string }).role);
    if (!ANNULER_ROLES.has(role)) {
      return NextResponse.json({ error: 'Usuario sin autorización para anular.' }, { status: 403 });
    }

    const usersId = String((profile as { id: string }).id);
    const companyId = String((profile as { company_id: string | null }).company_id ?? '');
    const companyIdFinal =
      companyId ||
      String(
        ((await sb.from('decisions').select('company_id').eq('id', parsed.data.decision_id).maybeSingle())
          .data as { company_id?: string } | null)?.company_id ?? ''
      );

    if (!companyIdFinal) {
      return NextResponse.json({ error: 'No se pudo determinar el ámbito de la decisión.' }, { status: 403 });
    }

    const result = await annulDecisionRecord(
      parsed.data.decision_id,
      usersId,
      parsed.data.annul_reason,
      companyIdFinal
    );

    if (result.error || result.status >= 400) {
      return NextResponse.json(
        { error: result.error ?? 'No fue posible anular.' },
        { status: result.status }
      );
    }

    return NextResponse.json({ decision: result.decision }, { status: 200 });
  } catch (err) {
    console.error('[decisions/annul]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error al anular decisión.' }, { status: 500 });
  }
}
