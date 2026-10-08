import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { evaluateInspection, listLatestEvaluations } from '@/lib/quality';

const bodySchema = z.object({
  inspection_id: z.string().uuid('inspection_id inválido'),
  reevaluate_completed: z.boolean().optional().default(false),
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
 * POST /api/quality/evaluate
 * QUALITY ENGINE: evalúa mediciones vs criterios configurados.
 * NO cambia etapa, estado del lote ni decisión humana.
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

    const result = await evaluateInspection(
      parsed.data.inspection_id,
      null,
      { reevaluateCompleted: parsed.data.reevaluate_completed }
    );
    if (result.error || result.status !== 200) {
      return NextResponse.json(
        { error: result.error ?? 'No fue posible evaluar.' },
        { status: result.status }
      );
    }

    return NextResponse.json({ evaluations: result.evaluations }, { status: 200 });
  } catch (err) {
    console.error('[quality/evaluate]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error del Quality Engine.' }, { status: 500 });
  }
}

/**
 * GET /api/quality/evaluate?inspection_id=…
 * Devuelve última evaluación por medición (histórico intacto).
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

    const { data, error } = await listLatestEvaluations(inspectionId);
    if (error) {
      return NextResponse.json({ error: 'No se pudieron leer evaluaciones.' }, { status: 500 });
    }
    return NextResponse.json({ evaluations: data }, { status: 200 });
  } catch (err) {
    console.error('[quality/evaluate GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error del Quality Engine.' }, { status: 500 });
  }
}
