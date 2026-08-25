/**
 * Cliente LLM contra OpenRouter. Se llama al endpoint compatible con OpenAI
 * directamente con fetch en vez de traer un SDK — mantiene el bundle pequeño y
 * funciona igual en runtime Edge y Node.
 *
 * El modelo se elige con OPENROUTER_MODEL. El más barato del catálogo
 * (inclusionai/ling-2.6-flash) se descartó: devolvía 429 del proveedor de forma
 * constante. Cambiar de modelo es una variable de entorno, no un despliegue.
 */
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELO_POR_DEFECTO = "qwen/qwen3-30b-a3b-instruct-2507";

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export async function callLLM(userMessage: string, opts: LLMOptions = {}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurada.");
  const model = opts.model ?? process.env.OPENROUTER_MODEL ?? MODELO_POR_DEFECTO;

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: userMessage });

  const body = JSON.stringify({ model, max_tokens: opts.maxTokens ?? 600, messages });
  const site = process.env.NEXT_PUBLIC_SITE_URL;

  // Los modelos baratos devuelven 429 con cierta facilidad; un reintento corto
  // evita perder un mensaje del dueño por una racha de peticiones.
  let ultimoError = "";
  for (let intento = 0; intento < 3; intento++) {
    if (intento > 0) await new Promise((r) => setTimeout(r, 700 * intento));
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(site ? { "http-referer": site, "x-title": "Don Pepe Original" } : {}),
      },
      body,
    });

    if (res.ok) {
      const json = (await res.json()) as ChatResponse;
      const text = json.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return text;
      ultimoError = json.error?.message ?? "respuesta vacía";
      continue;
    }

    ultimoError = `${res.status}: ${(await res.text()).slice(0, 300)}`;
    // 4xx que no sea 429 no mejora reintentando (clave mala, modelo inexistente…)
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(`OpenRouter ${ultimoError}`);
}

/** Extrae el primer bloque JSON válido de un string (a veces llega envuelto en ```json ... ```). */
export function extractJson<T = unknown>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(candidate.trim()) as T;
  } catch {
    // intenta encontrar el primer {...} balanceado
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(candidate.slice(first, last + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
