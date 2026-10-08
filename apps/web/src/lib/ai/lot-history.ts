// Análisis histórico de lote — solo datos reales, informativo, no modifica nada.
import { chatCompletion } from './openrouter.provider';

export type LotHistoryAnalysisInput = {
  lot: {
    folio: string | null;
    harvest_block: string;
    status: string;
    fruit_date: string | null;
    producer: string;
    species: string;
    variety: string;
    guide: string | null;
    current_stage: string | null;
  };
  inspections: Array<{
    inspected_at: string;
    completed_at: string | null;
    status: string;
    point: string;
    stage: string | null;
    result: string | null;
    decision: string | null;
    observations: string | null;
    qe_cumple: number;
    qe_desviacion: number;
    qe_otros: number;
  }>;
  classifications: Array<{
    classified_at: string;
    commercial_class: string;
    semaphore: string;
    justification: string;
    ai_used: boolean;
  }>;
  decisions: Array<{
    decided_at: string;
    decision_label: string;
    status: string;
    fundamento: string | null;
  }>;
  ai_analyses: Array<{
    created_at: string;
    recommendation: string;
    confidence: number | null;
    reasoning_summary: string | null;
  }>;
};

export type LotHistoryAnalysisResult = {
  summary: string;
  trends: string;
  risks: string;
  notes: string[];
  model: string;
};

function buildUserPrompt(input: LotHistoryAnalysisInput): string {
  const lot = JSON.stringify(input.lot, null, 2);
  const inspections = JSON.stringify(input.inspections, null, 2);
  const classifications = JSON.stringify(input.classifications, null, 2);
  const decisions = JSON.stringify(input.decisions, null, 2);
  const ai = JSON.stringify(input.ai_analyses, null, 2);
  return [
    'Analiza el HISTORIAL completo de este lote de calidad de fruta.',
    'Responde SOLO con datos presentes en el contexto. No inventes tolerancias, normativa,',
    'categorías SAG, estados ni decisiones futuras. No recomiendes decisiones vinculantes:',
    'esto es informativo y la decisión formal es humana.',
    '',
    'Responde en JSON con esta forma exacta:',
    '{"summary": "2-4 frases con la evolución del lote",',
    ' "trends": "1-3 frases sobre patrones en inspecciones/QE/clasificaciones",',
    ' "risks": "1-3 frases sobre alertas o desviaciones observadas (solo si existen datos)",',
    ' "notes": ["nota breve opcional basada en hechos del historial"]}',
    '',
    'LOTE:',
    lot,
    '',
    'INSPECCIONES:',
    inspections,
    '',
    'CLASIFICACIONES:',
    classifications,
    '',
    'DECISIONES:',
    decisions,
    '',
    'ANÁLISIS IA PREVIOS:',
    ai,
  ].join('\n');
}

function parseResult(content: string, model: string): LotHistoryAnalysisResult {
  let parsed: unknown;
  try {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    parsed = JSON.parse(start >= 0 && end > start ? content.slice(start, end + 1) : content);
  } catch {
    return {
      summary: content.slice(0, 800),
      trends: '',
      risks: '',
      notes: [],
      model,
    };
  }
  const obj = (parsed ?? {}) as Partial<LotHistoryAnalysisResult>;
  return {
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    trends: typeof obj.trends === 'string' ? obj.trends : '',
    risks: typeof obj.risks === 'string' ? obj.risks : '',
    notes: Array.isArray(obj.notes)
      ? obj.notes.filter((n): n is string => typeof n === 'string').slice(0, 8)
      : [],
    model,
  };
}

export async function analyzeLotHistory(
  input: LotHistoryAnalysisInput
): Promise<{ analysis: LotHistoryAnalysisResult | null; error: string | null }> {
  try {
    const system = [
      'Eres QualityNX IA, analista técnico de calidad poscosecha de fruta.',
      'Tu análisis HISTÓRICO es breve, informativo y solo usa los datos del contexto.',
      'No inventes datos, categorías, normativa ni decisiones.',
      'No cierres inspecciones ni cambies estados. Nunca. Solo produces texto informativo.',
      'El semáforo QualityNX es atención operacional, no equivalente a aprobado/retenido/rechazado.',
      'Responde únicamente con JSON válido.',
    ].join(' ');

    const chat = await chatCompletion(system, buildUserPrompt(input));
    return { analysis: parseResult(chat.content, chat.model), error: null };
  } catch (err) {
    return {
      analysis: null,
      error: err instanceof Error ? err.message : 'No fue posible analizar el historial.',
    };
  }
}
