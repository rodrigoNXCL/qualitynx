import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { analyzeLotHistory, type LotHistoryAnalysisInput } from '@/lib/ai/lot-history';

const bodySchema = z.object({
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

/**
 * POST /api/ai/analyze-lot
 * Análisis histórico informativo del lote. No modifica inspecciones, decisiones ni historia.
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

    const lotId = parsed.data.lot_id;
    const [lotRes, inspRes, classRes, decRes] = await Promise.all([
      sb.from('lots').select('*').eq('id', lotId).single(),
      sb
        .from('inspections')
        .select(
          'id, inspection_point_id, status, result, decision, observations, inspected_at, completed_at'
        )
        .eq('lot_id', lotId)
        .order('inspected_at', { ascending: true }),
      sb
        .from('quality_classifications')
        .select('commercial_class, semaphore, justification, ai_used, classified_at')
        .eq('lot_id', lotId)
        .order('classified_at', { ascending: true }),
      sb
        .from('decisions')
        .select('decision_label, status, fundamento, decided_at')
        .eq('lot_id', lotId)
        .order('decided_at', { ascending: true }),
    ]);

    const inspectionRows = ((inspRes.data as { id: string }[] | null) ?? []) as {
      id: string;
    }[];
    const inspectionIds = inspectionRows.map((i) => i.id);
    const aiRes = inspectionIds.length
      ? await sb
          .from('ai_inspection_analysis')
          .select('created_at, recommendation, confidence, reasoning_summary, inspection_id')
          .in('inspection_id', inspectionIds)
          .order('created_at', { ascending: true })
      : { data: [] as Record<string, unknown>[], error: null };

    if (lotRes.error || !lotRes.data) {
      return NextResponse.json({ error: 'Lote no encontrado.' }, { status: 404 });
    }

    const lot = lotRes.data as Record<string, unknown>;
    const pointIds = [
      ...new Set(
        ((inspRes.data as { inspection_point_id: string }[]) ?? []).map(
          (i) => i.inspection_point_id
        )
      ),
    ];
    const stageIds = [
      ...new Set(
        [
          lot.entry_operational_stage_id,
          lot.current_operational_stage_id,
        ].filter((v): v is string => typeof v === 'string' && Boolean(v))
      ),
    ];

    const [pointsRes, stagesRes, producersRes, speciesRes, varietiesRes, qeByInsp] =
      await Promise.all([
        pointIds.length
          ? sb.from('inspection_points').select('id, name').in('id', pointIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
        stageIds.length
          ? sb.from('operational_stages').select('id, name').in('id', stageIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
        lot.producer_id
          ? sb.from('producers').select('id, name').eq('id', lot.producer_id as string).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        lot.species_id
          ? sb.from('species').select('id, name').eq('id', lot.species_id as string).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        lot.variety_id
          ? sb.from('varieties').select('id, name').eq('id', lot.variety_id as string).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        Promise.all(
          ((inspRes.data as { id: string }[]) ?? []).map(async (i) => {
            const { data } = await sb
              .from('quality_evaluations')
              .select('result')
              .eq('inspection_id', i.id);
            return [i.id, (data as { result: string }[]) ?? []] as const;
          })
        ),
      ]);

    const pointName = new Map(
      ((pointsRes.data as { id: string; name: string }[]) ?? []).map((p) => [p.id, p.name])
    );
    const stageName = new Map(
      ((stagesRes.data as { id: string; name: string }[]) ?? []).map((s) => [s.id, s.name])
    );
    const qeMap = new Map(qeByInsp);

    const inspections: LotHistoryAnalysisInput['inspections'] = (
      (inspRes.data as Record<string, unknown>[]) ?? []
    ).map((i) => {
      const qe = qeMap.get(i.id as string) ?? [];
      return {
        inspected_at: String(i.inspected_at ?? ''),
        completed_at: i.completed_at ? String(i.completed_at) : null,
        status: String(i.status ?? ''),
        point: pointName.get(String(i.inspection_point_id)) ?? '—',
        stage: stageName.get(String(lot.current_operational_stage_id ?? '')) ?? null,
        result: i.result ? String(i.result) : null,
        decision: i.decision ? String(i.decision) : null,
        observations: i.observations ? String(i.observations) : null,
        qe_cumple: qe.filter((e) => e.result === 'CUMPLE').length,
        qe_desviacion: qe.filter((e) => e.result === 'DESVIACIÓN').length,
        qe_otros: qe.filter((e) => e.result !== 'CUMPLE' && e.result !== 'DESVIACIÓN').length,
      };
    });

    const producerName =
      ((producersRes.data as { name?: string } | null)?.name as string | undefined) ?? '—';
    const speciesName =
      ((speciesRes.data as { name?: string } | null)?.name as string | undefined) ?? '—';
    const varietyName =
      ((varietiesRes.data as { name?: string } | null)?.name as string | undefined) ?? '—';

    const input: LotHistoryAnalysisInput = {
      lot: {
        folio: lot.folio ? String(lot.folio) : null,
        harvest_block: String(lot.harvest_block ?? '—'),
        status: String(lot.status ?? '—'),
        fruit_date: lot.fruit_date ? String(lot.fruit_date) : null,
        producer: producerName,
        species: speciesName,
        variety: varietyName,
        guide: lot.producer_guide_number ? String(lot.producer_guide_number) : null,
        current_stage:
          stageName.get(String(lot.current_operational_stage_id ?? '')) ?? null,
      },
      inspections,
      classifications: ((classRes.data as Record<string, unknown>[]) ?? []).map((c) => ({
        classified_at: String(c.classified_at ?? ''),
        commercial_class: String(c.commercial_class ?? '—'),
        semaphore: String(c.semaphore ?? '—'),
        justification: String(c.justification ?? ''),
        ai_used: Boolean(c.ai_used),
      })),
      decisions: ((decRes.data as Record<string, unknown>[]) ?? []).map((d) => ({
        decided_at: String(d.decided_at ?? ''),
        decision_label: String(d.decision_label ?? '—'),
        status: String(d.status ?? '—'),
        fundamento: d.fundamento ? String(d.fundamento) : null,
      })),
      ai_analyses: ((aiRes.data as Record<string, unknown>[]) ?? []).map((a) => ({
        created_at: String(a.created_at ?? ''),
        recommendation: String(a.recommendation ?? '—'),
        confidence: typeof a.confidence === 'number' ? a.confidence : null,
        reasoning_summary: a.reasoning_summary ? String(a.reasoning_summary) : null,
      })),
    };

    const result = await analyzeLotHistory(input);
    if (result.error || !result.analysis) {
      return NextResponse.json(
        { error: result.error ?? 'No fue posible analizar el historial.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ analysis: result.analysis }, { status: 200 });
  } catch (err) {
    console.error('[ai/analyze-lot]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error del servidor de IA.' }, { status: 500 });
  }
}
