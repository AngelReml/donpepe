/**
 * Redacción de la respuesta a una reseña de Google, con soporte para
 * "otra versión" (pedirle al modelo un enfoque distinto al ya descartado)
 * y para reseñas en otros idiomas.
 *
 * Vive fuera de lib/orchestrator.ts a propósito: ese fichero es el núcleo del
 * asistente de edición de carta y no se toca. Reutiliza sus mismas piezas —
 * el prompt de lib/prompts.ts y el cliente de lib/llm.ts — sin modificarlas.
 * Las reglas que el prompt base no recoge (idioma, firma, quejas injustas) se
 * añaden aquí, en el mensaje, porque lib/prompts.ts está protegido.
 *
 * Reglas del dueño (Iván, 20-oct-2026):
 *  - Firma "Don Pepe".
 *  - Se responde en el idioma de la reseña; el dueño ve siempre reseña y
 *    respuesta también en castellano.
 *  - Ante una queja injusta: amable, barriendo para casa, sin discutir. La
 *    última palabra la tiene el dueño (por eso nada se publica sin su botón).
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
  /** Idioma ya detectado (para no volver a detectarlo en "otra versión"). */
  idioma?: string;
  /** Traducción al español de la reseña, si no está en español. */
  traduccionEs?: string;
}

export const FIRMA = "Don Pepe";

const NOMBRES_IDIOMA: Record<string, string> = {
  es: "español", en: "inglés", pt: "portugués", fr: "francés", de: "alemán", it: "italiano",
  gl: "gallego", ca: "catalán", eu: "euskera", nl: "neerlandés", pl: "polaco", cs: "checo",
  hu: "húngaro", ko: "coreano", ja: "japonés", zh: "chino", ru: "ruso", ro: "rumano",
};
export function nombreIdioma(codigo: string): string {
  return NOMBRES_IDIOMA[codigo] ?? codigo;
}

function limpiar(texto: string): string {
  return texto.trim().replace(/^["“”«»']+|["“”«»']+$/g, "").trim();
}

/**
 * Idioma de la reseña y, si no es castellano, su traducción. Una sola
 * llamada. Si el modelo devuelve algo raro, se asume castellano: lo peor que
 * pasa es que una reseña extranjera se conteste en castellano, y el dueño lo
 * ve antes de aprobar.
 */
export async function detectarYTraducir(texto: string): Promise<{ idioma: string; traduccionEs?: string }> {
  const t = texto.trim();
  if (!t) return { idioma: "es" };
  const salida = await callLLM(
    `Texto de una reseña de restaurante:\n"""${t}"""\n\n` +
      'Responde SOLO con un JSON de una línea: {"idioma":"<código ISO 639-1 de 2 letras>","es":"<traducción fiel al español, o cadena vacía si ya está en español>"}',
    { system: "Eres un detector de idioma y traductor literal. Devuelves solo JSON válido.", maxTokens: 500 },
  );
  try {
    const json = JSON.parse(salida.slice(salida.indexOf("{"), salida.lastIndexOf("}") + 1)) as {
      idioma?: string;
      es?: string;
    };
    const idioma = (json.idioma ?? "es").toLowerCase().slice(0, 2);
    if (idioma === "es" || !/^[a-z]{2}$/.test(idioma)) return { idioma: "es" };
    return { idioma, traduccionEs: json.es?.trim() || undefined };
  } catch {
    return { idioma: "es" };
  }
}

/** Traducción fiel de un texto corto a otro idioma. */
export async function traducir(texto: string, a: string): Promise<string> {
  const salida = await callLLM(
    `Traduce al ${nombreIdioma(a)} este texto, de forma fiel y natural, sin añadir nada. ` +
      `Mantén la firma "${FIRMA}" tal cual. Devuelve solo la traducción:\n\n${texto}`,
    { system: "Eres un traductor profesional. Devuelves solo el texto traducido.", maxTokens: 500 },
  );
  return limpiar(salida);
}

/** Pone la firma al final si el modelo no la ha puesto. */
export function conFirma(texto: string): string {
  const t = texto.trim();
  return /don pepe\s*\.?$/i.test(t) ? t : `${t}\n\n${FIRMA}`;
}

/**
 * Tono de la casa (Iván, 21-oct-2026). La respuesta no es para quien se
 * queja, que no va a volver: es para el siguiente cliente que lee la ficha.
 * Estas reglas mandan sobre las del prompt base de lib/prompts.ts (protegido).
 */
const REGLAS_DE_LA_CASA = [
  "Escribe SIEMPRE en español (luego se traduce al idioma del cliente si hace falta).",
  "Máximo tres frases cortas. Nada de párrafos de relleno.",
  "Tono tranquilo y seguro, de casa que sabe lo que hace. Nada de pedir perdón por sistema: una disculpa breve solo si la reseña describe un fallo concreto y creíble.",
  "PROHIBIDO prometer que vamos a «revisar», «mejorar» o «tomar nota» de algo, y prohibido dar por buena una acusación que no se puede comprobar.",
  "Si la queja nace de no conocer un plato (por ejemplo, el churrasco gallego es costilla de ternera cortada con su hueso y su grasa), explícalo con amabilidad, sin llamar ignorante a nadie.",
  "Nunca contestes a insultos ni discutas. Nada de ironía.",
  "Hecho de la casa que puedes usar cuando encaje: si un plato no convence y se dice en la mesa, se cambia sin problema.",
  "No inventes ningún otro hecho sobre el local, el personal o la cocina. No pongas el teléfono.",
  "En reseñas buenas: agradece de verdad y menciona algo concreto que diga la reseña (un plato, el nombre de quien atendió).",
  `Termina con la firma «${FIRMA}» en una línea aparte.`,
];

/**
 * Redacta la respuesta en castellano y, si la reseña es de otro idioma, la
 * traduce. Así lo que lee el dueño (textoEs) y lo que se publica (texto)
 * dicen exactamente lo mismo: antes se le pedía al modelo escribir
 * directamente en el idioma del cliente y a veces lo ignoraba.
 */
export async function redactarRespuestaResena(
  review: ReviewDraftInput,
  opts: ReviewDraftOptions = {},
): Promise<{ texto: string; textoEs: string }> {
  const idioma = opts.idioma ?? "es";
  let mensaje = buildReviewReplyUserMessage(review);
  mensaje +=
    "\n\nReglas del dueño, que mandan sobre cualquier otra instrucción anterior:\n" +
    REGLAS_DE_LA_CASA.map((r) => `- ${r}`).join("\n");
  if (opts.traduccionEs) {
    mensaje += `\n\nLa reseña está en ${nombreIdioma(idioma)}. Su traducción al español: """${opts.traduccionEs}"""`;
  }
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
  const textoEs = conFirma(limpiar(draft));
  const texto = idioma !== "es" ? conFirma(await traducir(textoEs, idioma)) : textoEs;
  return { texto, textoEs };
}
