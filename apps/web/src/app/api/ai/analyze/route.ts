import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { analyzeInspection, syncLearningWithDecision } from '@/lib/ai';

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
 * POST /api/ai/analyze
 * Server-side only → OpenRouter. La IA no cierra inspecciones ni cambia etapas.
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

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'IA no configurada en el servidor (OPENROUTER_API_KEY).' },
        { status: 503 }
      );
    }

    const sb = adminClient();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase admin no configurado.' }, { status: 503 });
    }

    const { data: insp, error: inspErr } = await sb
      .from('inspections')
      .select('id, company_id, status')
      .eq('id', parsed.data.inspection_id)
      .single();
    if (inspErr || !insp) {
      return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
    }

    // Sync decisión humana si ya existe
    await syncLearningWithDecision(parsed.data.inspection_id);

    const result = await analyzeInspection(parsed.data.inspection_id);
    if (result.error || !result.analysis) {
      return NextResponse.json(
        { error: result.error ?? 'No fue posible analizar la inspección.' },
        { status: result.status }
      );
    }

    return NextResponse.json({ analysis: result.analysis }, { status: 200 });
  } catch (err) {
    console.error('[ai/analyze]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error del servidor de IA.' }, { status: 500 });
  }
}
