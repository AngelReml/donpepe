/**
 * Redacción de la respuesta a una reseña de Google, con soporte para
 * "otra versión" (pedirle al modelo un enfoque distinto al ya descartado).
 *
 * Vive fuera de lib/orchestrator.ts a propósito: ese fichero es el núcleo del
 * asistente de edición de carta y esta sesión no lo toca ni una línea.
 * Reutiliza sus mismas piezas — el prompt de lib/prompts.ts y el cliente de
 * lib/llm.ts — sin modificarlas.
 */
import { callLLM } from "./llm";
import { buildReviewReplyUserMessage, REVIEW_REPLY_SYSTEM } from "./prompts";

export interface ReviewDraftInput {
  id: string;
  author?: string;
  rating: number;
  text: string;
}

export interface ReviewDraftOptions {
  /** Textos ya propuestos y descartados: se le piden al modelo para que no repita frases. */
  evitar?: string[];
}

export async function redactarRespuestaResena(
  review: ReviewDraftInput,
  opts: ReviewDraftOptions = {},
): Promise<string> {
  let mensaje = buildReviewReplyUserMessage(review);
  if (opts.evitar?.length) {
    // "Otra versión" en Telegram: al dueño no le sirve que le devuelvan la
    // misma frase con dos palabras cambiadas, así que se le pasan al modelo
    // las versiones ya descartadas y se le pide un enfoque distinto.
    mensaje +=
      "\n\nYa has propuesto estas versiones y no valen. Escribe una DISTINTA, " +
      "con otro enfoque y otro arranque, sin repetir sus frases:\n" +
      opts.evitar.map((t, i) => `${i + 1}. ${t}`).join("\n");
  }
  const draft = await callLLM(mensaje, {
    system: REVIEW_REPLY_SYSTEM,
    maxTokens: 400,
  });
  return draft.trim();
}
