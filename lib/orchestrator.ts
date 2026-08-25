/**
 * Orchestrator — toda la lógica de "dueño dice X por WhatsApp, pasa tal cosa"
 * vive aquí. Lo usa la ruta /api/whatsapp/webhook y (en el futuro) tests.
 */
import { getMenu, setMenu, appendLog, getLastLog, kvSet, KV_KEYS } from "./kv";
import { callLLM, extractJson } from "./llm";
import { ActionSchema, applyAction, describeAction, type Action } from "./actions";
import {
  buildMenuAgentUserMessage,
  MENU_AGENT_SYSTEM,
  buildReviewReplyUserMessage,
  REVIEW_REPLY_SYSTEM,
} from "./prompts";
import { classifyReply, setPending, getPending, clearPending } from "./pending";
import { replyToReview } from "./google";
import type { Menu } from "./types";

export interface ReviewDraft {
  reviewId: string;
  author?: string;
  rating: number;
  text: string;
  draft: string;
}

export interface OwnerMessageResult {
  reply: string;
  published?: boolean;
  skipped?: boolean;
}

/** Devuelve { reply } — texto que se enviará al dueño. */
export async function handleOwnerMessage(
  text: string,
  from: string,
): Promise<OwnerMessageResult> {
  const lower = text.trim().toLowerCase();

  // 0. Si hay una acción pendiente, SÍ/NO/EDITAR
  const pending = await getPending(from);
  if (pending) {
    if (pending.context === "review") {
      return handleReviewConfirmation(from, text);
    }
    const cls = classifyReply(text);
    if (cls === "yes") {
      try {
        const menu = await getMenu();
        const { prev, next } = applyAction(menu, pending.action);
        await setMenu(next);
        await appendLog({
          ts: new Date().toISOString(),
          from,
          action: pending.action,
          summary: pending.summary,
          kind: "menu",
          prev,
        });
        await clearPending(from);
        return { reply: `Listo, hecho. ${pending.summary}` };
      } catch (e) {
        await clearPending(from);
        return { reply: `No he podido aplicarlo: ${(e as Error).message}. Empezamos de nuevo.` };
      }
    }
    if (cls === "no") {
      await clearPending(from);
      return { reply: `Vale, cancelado. No he tocado nada.` };
    }
    // Si no entiende (p.ej. "qué?", "a qué te refieres"), le recordamos qué está pendiente
    return {
      reply: `Tienes un cambio a la espera: "${pending.summary}". Responde SÍ para aplicar o NO para cancelar.`,
    };
  }

  // 1. Comandos explícitos (no requieren LLM)
  if (/^deshacer(\s+último)?(\s+cambio)?$/i.test(lower) || lower === "deshacer") {
    const last = await getLastLog<{ summary?: string; prev?: Menu; kind?: string }>();
    if (!last) return { reply: "No hay cambios recientes que deshacer." };
    if (last.kind !== "menu" || !last.prev) {
      return {
        reply: `El último cambio (${last.kind ?? "?"}) no es de carta, no puedo deshacerlo automáticamente.`,
      };
    }
    await setMenu(last.prev);
    await appendLog({
      ts: new Date().toISOString(),
      from,
      kind: "menu",
      action: { action: "clarify", question: "" },
      summary: `Revertido: ${last.summary}`,
      restored: true,
    });
    return { reply: `He revertido el último cambio: "${last.summary}".` };
  }
  if (lower.startsWith("precio de") || lower.startsWith("muéstrame el precio") || lower.startsWith("cuánto vale")) {
    const menu = await getMenu();
    const found = searchPlato(menu, text);
    if (!found) return { reply: "No encuentro ese plato en la carta. ¿Cómo se llama?" };
    return { reply: `${found.nombre}: ${found.precio != null ? found.precio.toFixed(2) + " €" : found.precio_texto ?? "precio a consultar"}.` };
  }

  // 2. Interpretar como acción con el LLM
  const menu = await getMenu();
  let action: Action;
  try {
    action = await interpretAction(menu, text);
  } catch (e) {
    return { reply: `No he podido procesarlo: ${(e as Error).message}.` };
  }
  if (action.action === "clarify") {
    return { reply: action.question };
  }
  const summary = describeAction(action, menu);
  await setPending(from, { action, summary, context: "menu" });
  return {
    reply: `Voy a: ${summary}\n\nResponde SÍ para confirmar, NO para cancelar, o EDITAR: <tu texto> para reescribirlo. Tienes 10 minutos.`,
  };
}

function searchPlato(menu: Menu, text: string): { nombre: string; precio?: number; precio_texto?: string } | null {
  const t = text.toLowerCase();
  const all = [
    ...menu.entrantes,
    ...menu.arroces,
    ...menu.pescados,
    ...menu.carnes,
  ];
  // 1) match por id explícito
  const byId = all.find((p) => t.includes(p.id));
  if (byId) return byId;
  // 2) match por substring en nombre
  const byName = all.find((p) => t.includes(p.nombre.toLowerCase()));
  if (byName) return byName;
  return null;
}

async function interpretAction(menu: Menu, text: string): Promise<Action> {
  const raw = await callLLM(buildMenuAgentUserMessage(menu, text), {
    system: MENU_AGENT_SYSTEM,
    maxTokens: 400,
  });
  const json = extractJson<unknown>(raw);
  if (!json) {
    return {
      action: "clarify",
      question: "No he entendido bien. ¿Puedes reformular? (ej: 'sube el pulpo a 20', 'quita las zamburiñas', 'hoy el pescado del día es rodaballo')",
    };
  }
  const parsed = ActionSchema.safeParse(json);
  if (!parsed.success) {
    return {
      action: "clarify",
      question: `He recibido una orden pero no encaja con lo que sé hacer. Detalle: ${parsed.error.issues[0]?.message ?? "formato inválido"}. Reformúlalo, por favor.`,
    };
  }
  return parsed.data;
}

/** Maneja la confirmación de un borrador de reseña (PUBLICAR / EDITAR / SALTAR). */
export async function handleReviewConfirmation(
  from: string,
  text: string,
): Promise<{ reply: string; published?: boolean; skipped?: boolean }> {
  const pending = await getPending(from);
  if (!pending || pending.context !== "review" || !pending.reviewId) {
    return { reply: "No tengo ninguna reseña pendiente de aprobación ahora mismo." };
  }
  const draft = pending.summary;
  const reviewId = pending.reviewId;
  const t = text.trim().toLowerCase();
  const isPublish = t === "publicar" || /^publicar[\s.,!]?$/.test(t);
  const isSkip = t === "no" || t === "saltar" || /^no[\s.,!]?$/.test(t) || /^saltar[\s.,!]?$/.test(t);
  const isEdit = /^editar[:\s]/i.test(text);

  if (isPublish) {
    try {
      await replyToReview(reviewId, draft);
      await kvSet(`${KV_KEYS.reviewsSeen}:${reviewId}`, {
        repliedAt: new Date().toISOString(),
        text: draft,
      });
      await clearPending(from);
      await appendLog({
        ts: new Date().toISOString(),
        from,
        kind: "review",
        action: "publish",
        reviewId,
        text: draft,
      });
      return { reply: "Publicado en Google. ¡Gracias!", published: true };
    } catch (e) {
      return { reply: `Error al publicar: ${(e as Error).message}. Sigue pendiente.` };
    }
  }
  if (isSkip) {
    await clearPending(from);
    await kvSet(`${KV_KEYS.reviewsSeen}:${reviewId}`, {
      skippedAt: new Date().toISOString(),
    });
    return { reply: "Vale, la marco como vista sin responder.", skipped: true };
  }
  if (isEdit) {
    const edited = text.replace(/^editar[:\s]*/i, "").trim();
    if (!edited) {
      return { reply: "EDITAR sin texto. Escribe: EDITAR: <tu respuesta>" };
    }
    await setPending(from, {
      action: { action: "clarify", question: "" },
      summary: edited,
      context: "review",
      reviewId,
    });
    return { reply: `Tu versión queda así:\n\n"${edited}"\n\nResponde PUBLICAR para enviarla a Google o NO para descartar.` };
  }
  return {
    reply: `Tengo esta reseña a la espera. Responde PUBLICAR, EDITAR: <texto>, o NO (saltar).\n\nBorrador: "${draft}"`,
  };
}

export async function buildReviewDraft(
  review: { id: string; author?: string; rating: number; text: string },
): Promise<ReviewDraft> {
  const draft = await callLLM(buildReviewReplyUserMessage(review), {
    system: REVIEW_REPLY_SYSTEM,
    maxTokens: 400,
  });
  return { reviewId: review.id, ...review, draft: draft.trim() };
}
