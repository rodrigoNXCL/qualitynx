// Construcción de contexto de inspección + parseo de respuesta controlada.
import type { AiAnalysisSuccess, AiInspectionContext } from './types';
import { AI_PROMPT_VERSION } from './types';

export function isOutOfRange(
  value: string | null,
  min: number | null,
  max: number | null
): boolean {
  if (value == null || value.trim() === '') return false;
  if (min == null && max == null) return false;
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  if (min != null && n < min) return true;
  if (max != null && n > max) return true;
  return false;
}

export function buildSystemPrompt(): string {
  return [
    'Eres un asistente de control de calidad de fruta (asistente de decisión).',
    'NO reemplazas al inspector. NO cierras ni apruebas lotes. NO cambias etapas ni estados.',
    'Recomiendas solo con la información del contexto. NO inventes datos faltantes.',
    'Si falta información crítica, indícalo en data_quality_warnings.',
    'Responde EXCLUSIVAMENTE con JSON válido (sin markdown) con esta forma:',
    '{"recommendation":"...","reasoning_summary":"...","confidence":0-100|null,',
    '"alerts":["..."],"supporting_factors":["..."],"data_quality_warnings":["..."]}',
    `recommendation debe ser una de: APROBAR, RECHAZAR, RETENER, SEGREGAR, REPROCESAR, LIBERAR, SOLICITAR REVISIÓN ADICIONAL, OTRA, INSUFICIENTE.`,
    `prompt_version=${AI_PROMPT_VERSION}. Español.`,
  ].join(' ');
}

export function buildUserPrompt(ctx: AiInspectionContext): string {
  return JSON.stringify(
    {
      aviso: 'Recomendación de IA — no sustituye la decisión del inspector.',
      contexto: ctx,
    },
    null,
    2
  );
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').slice(0, 20);
}

function extractJsonObject(raw: string): string | null {
  let text = raw.trim();
  // Quitar fence markdown si existe
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const start = text.indexOf('{');
  if (start < 0) return null;
  // Buscar el último '}' que cierre un objeto balanceado desde el primer '{'
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) {
    // fallback: último '}'
    const last = text.lastIndexOf('}');
    if (last > start) end = last;
    else return null;
  }
  return text.slice(start, end + 1);
}

export function parseAiResponse(
  raw: string,
  model: string,
  modelVersion: string | null
): AiAnalysisSuccess {
  const candidate = extractJsonObject(raw);
  if (!candidate) {
    throw new Error('La respuesta del modelo no es JSON válido.');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    // Último recurso: quitar comas colgantes
    try {
      const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      throw new Error('La respuesta del modelo no es JSON válido.');
    }
  }

  const recommendation =
    typeof parsed.recommendation === 'string' && parsed.recommendation.trim()
      ? parsed.recommendation.trim().toUpperCase()
      : 'INSUFICIENTE';
  const reasoning =
    typeof parsed.reasoning_summary === 'string' ? parsed.reasoning_summary.trim() : '';
  let confidence: number | null = null;
  if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) {
    confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));
  }

  return {
    recommendation,
    reasoning_summary: reasoning,
    confidence,
    alerts: asStringArray(parsed.alerts),
    supporting_factors: asStringArray(parsed.supporting_factors),
    data_quality_warnings: asStringArray(parsed.data_quality_warnings),
    model,
    model_version: modelVersion,
    prompt_version: AI_PROMPT_VERSION,
  };
}
