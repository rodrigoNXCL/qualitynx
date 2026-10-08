import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getLotTraceability } from '@/lib/traceability';

const querySchema = z.object({
  lot_id: z.string().uuid('lot_id inválido'),
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
    .select('id, company_id, role, is_active')
    .eq('auth_id', userId)
    .maybeSingle();
  return data;
}

/**
 * GET /api/traceability?lot_id=…
 * Historia cronológica del lote (07). Solo lectura; respeta company_id.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error ?? 'No autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ lot_id: searchParams.get('lot_id') ?? '' });
    if (!parsed.success) {
      return NextResponse.json({ error: 'lot_id inválido.' }, { status: 400 });
    }

    const profile = await resolveProfile(auth.user.id);
    if (!profile || !(profile as { is_active: boolean }).is_active) {
      return NextResponse.json({ error: 'Usuario inexistente o inactivo.' }, { status: 403 });
    }

    const result = await getLotTraceability(parsed.data.lot_id, {
      companyId: (profile as { company_id: string | null }).company_id,
      role: String((profile as { role: string }).role),
    });

    if (result.error || result.status >= 400) {
      return NextResponse.json(
        { error: result.error ?? 'No se pudo construir la historia.' },
        { status: result.status >= 400 ? result.status : 500 }
      );
    }

    return NextResponse.json(
      { lot: result.lot, events: result.events },
      { status: 200 }
    );
  } catch (err) {
    console.error('[traceability GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error al consultar la historia.' }, { status: 500 });
  }
}
