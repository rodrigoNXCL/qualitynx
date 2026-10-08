// Proveedor OpenRouter — único punto de contacto con el gateway.
// La API key nunca sale de server-side.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;

export interface OpenRouterChatResult {
  content: string;
  model: string;
  model_version: string | null;
}

function getEnv() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no configurada en el servidor.');
  }
  return { apiKey, model };
}

async function once(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<OpenRouterChatResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://quality.nxchile.com',
        'X-Title': 'QualityNX',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('OpenRouter devolvió respuesta vacía.');
    return {
      content,
      model: json.model ?? model,
      model_version: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function chatCompletion(
  system: string,
  user: string
): Promise<OpenRouterChatResult> {
  const { apiKey, model } = getEnv();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await once(apiKey, model, system, user);
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Fallo en OpenRouter.');
}
