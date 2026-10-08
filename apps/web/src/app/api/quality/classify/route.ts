import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { classifyInspection } from '@/lib/quality';

const bodySchema = z.object({
  inspection_id: z.string().uuid('inspection_id inválido'),
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

/**
 * POST /api/quality/classify
 * Deriva clasificación comercial + semáforo QualityNX desde QE (+ resumen IA en justificación).
 * Append-only. No modifica mediciones, QE, decisiones ni decision_effects.
 * El inspector no envía el color.
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

    const sb = adminClient();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase admin no configurado.' }, { status: 503 });
    }

    const result = await classifyInspection(parsed.data.inspection_id, null);
    if (result.error || !result.classification) {
      return NextResponse.json(
        { error: result.error ?? 'No fue posible clasificar.' },
        { status: result.status }
      );
    }

    return NextResponse.json({ classification: result.classification }, { status: 200 });
  } catch (err) {
    console.error('[quality/classify]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error al clasificar la inspección.' }, { status: 500 });
  }
}

/**
 * GET /api/quality/classify?inspection_id=…
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error ?? 'No autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inspectionId = searchParams.get('inspection_id') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(inspectionId)) {
      return NextResponse.json({ error: 'inspection_id inválido.' }, { status: 400 });
    }

    const sb = adminClient();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase admin no configurado.' }, { status: 503 });
    }

    const { data } = await sb
      .from('quality_classifications')
      .select('*')
      .eq('inspection_id', inspectionId)
      .maybeSingle();

    return NextResponse.json({ classification: data ?? null }, { status: 200 });
  } catch (err) {
    console.error('[quality/classify GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error al leer la clasificación.' }, { status: 500 });
  }
}
