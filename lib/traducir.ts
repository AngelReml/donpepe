/**
 * Traducción de las descripciones de plato al idioma del visitante.
 *
 * Los NOMBRES no se traducen nunca: "pulpo a la gallega" es el nombre del
 * plato, como "paella". Lo que el visitante necesita es entender qué le van a
 * servir, y eso va en la descripción de debajo.
 *
 * Cada frase se cachea en KV por su propio hash, así que cuando el dueño
 * cambia una descripción solo se retraduce esa, y sola.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { kvGet, kvSet } from "./kv";
import { callLLM } from "./llm";
import { IDIOMA_POR_DEFECTO, NOMBRE_IDIOMA, type Idioma } from "./i18n";

/**
 * Términos que un modelo barato traduce mal o se inventa. No es un diccionario
 * por idioma: es contexto en español para que el modelo sepa qué son.
 */
const GLOSARIO = `
- grelos: brotes tiernos del nabo, verdura gallega de invierno.
- cachelos: patatas gallegas cocidas con piel, se sirven de guarnición.
- compango: las carnes del cocido (chorizo, lacón, panceta).
- fabas: alubias blancas grandes.
- raxo: tacos de lomo de cerdo adobados con ajo y pimentón.
- zorza: carne de cerdo picada y adobada con pimentón, se fríe.
- socarrat: la costra tostada del arroz pegada al fondo de la paella.
- alioli: salsa de ajo y aceite emulsionados.
- AOVE: aceite de oliva virgen extra.
- pimentón: pimentón dulce o ahumado de La Vera, especia roja.
- chimichurri: salsa de perejil, ajo, orégano, aceite y vinagre.
- orujo: aguardiente gallego de uva que se toma al final.
- lonja: mercado donde se subasta el pescado recién descargado.
- a la plancha: hecho sobre una plancha de hierro muy caliente.
- a la brasa: hecho sobre brasas de carbón o leña.
- zamburiñas: vieiras pequeñas gallegas, se sirven en su concha.
- navajas: moluscos alargados de concha estrecha (razor clams).
- S/M: "según mercado", el precio depende de la subasta del día.
`.trim();

/** Exportada para poder probar modelos con el prompt exacto de producción. */
export function sistemaPara(idioma: Idioma): string {
  return `
Traduces descripciones cortas de platos para la carta de un restaurante gallego.

Reglas:
- Traduce SOLO la descripción. Es una frase de sala: corta, apetecible, natural
  en el idioma de destino. No la alargues ni añadas información.
- NUNCA traduzcas los nombres propios de plato ni de producto.
- Los términos gallegos sin equivalente se MANTIENEN tal cual y se explican en
  dos o tres palabras entre paréntesis. Esto es obligatorio: quien lee la carta
  no sabe qué son, y una palabra suelta sin explicar no le sirve de nada.
  Ejemplo, traduciendo al inglés:
    "Grelos, fabas, patata y compango."
    → "Grelos (turnip greens), white beans, potato and compango (cured pork)."
  Y al alemán:
    → "Grelos (Stängelkohl), weiße Bohnen, Kartoffel und Compango (Pökelfleisch)."
- No inventes palabras. Si no conoces el término en el idioma de destino,
  deja el original y explícalo.
- Las aclaraciones entre paréntesis van SIEMPRE en el idioma de destino. Poner
  una explicación en inglés dentro de un texto alemán o italiano es un error.
- Mantén el registro: cercano y sobrio, sin adjetivos de folleto.
- Devuelve SOLO un array JSON de strings, en el mismo orden que recibes, con
  exactamente el mismo número de elementos. Sin texto alrededor, sin fences.

Glosario (para que entiendas los términos, no para copiarlo):
${GLOSARIO}

EQUIVALENCIAS OBLIGATORIAS para este idioma. Usa exactamente estas y no
inventes otras:
${equivalenciasPara(idioma)}

RECUERDA: cada elemento del array debe estar TRADUCIDO. Devolver la frase en
español es un error. Traduce siempre, aunque la frase sea corta o te parezca
que se entiende igual.
`.trim();
}

/**
 * Equivalencias escritas a mano para los diez términos gallegos que aparecen
 * en las descripciones. Un modelo barato los inventa ("Zuredefleisch" por
 * compango), así que no se le pide que los traduzca: se le dan hechos.
 */
const EQUIVALENCIAS: Record<string, Partial<Record<Idioma, string>>> = {
  grelos:      { gl: "grelos",     en: "turnip greens",           pt: "grelos de nabo",        de: "Stängelkohl",              fr: "pousses de navet",          it: "cime di rapa" },
  fabas:       { gl: "fabas",      en: "white beans",             pt: "feijão branco",         de: "weiße Bohnen",             fr: "haricots blancs",           it: "fagioli bianchi" },
  compango:    { gl: "compango",   en: "cured pork cuts",         pt: "carnes de porco curadas", de: "Pökelfleisch vom Schwein", fr: "charcuterie du pot-au-feu", it: "carni di maiale salate" },
  cachelos:    { gl: "cachelos",   en: "boiled potatoes",         pt: "batatas cozidas",       de: "gekochte Kartoffeln",      fr: "pommes de terre à l'eau",   it: "patate lesse" },
  alioli:      { gl: "allioli",    en: "garlic mayonnaise",       pt: "maionese de alho",      de: "Knoblauchmayonnaise",      fr: "aïoli",                     it: "salsa all'aglio" },
  socarrat:    { gl: "socarrat",   en: "crisp toasted rice crust", pt: "crosta tostada do arroz", de: "knusprige Reiskruste",  fr: "croûte de riz grillée",     it: "crosticina di riso" },
  "pimentón":  { gl: "pementón",   en: "smoked paprika",          pt: "colorau fumado",        de: "geräuchertes Paprikapulver", fr: "paprika fumé",            it: "paprica affumicata" },
  AOVE:        { gl: "AOVE",       en: "extra virgin olive oil",  pt: "azeite virgem extra",   de: "natives Olivenöl extra",   fr: "huile d'olive vierge extra", it: "olio extravergine d'oliva" },
  chimichurri: { gl: "chimichurri", en: "chimichurri (parsley and garlic sauce)", pt: "chimichurri (molho de salsa e alho)", de: "Chimichurri (Petersilien-Knoblauch-Sauce)", fr: "chimichurri (sauce persil-ail)", it: "chimichurri (salsa di prezzemolo e aglio)" },
  "a la plancha": { gl: "á prancha",  en: "grilled",                 pt: "na chapa",              de: "gegrillt",                 fr: "à la plancha",              it: "alla piastra" },
  "a la brasa": { gl: "á brasa",    en: "chargrilled",             pt: "na brasa",              de: "vom Holzkohlegrill",       fr: "grillé à la braise",        it: "alla brace" },
  perejil:     { gl: "perexil",    en: "parsley",                 pt: "salsa",                 de: "Petersilie",               fr: "persil",                    it: "prezzemolo" },
  "al vapor":  { gl: "ao vapor",   en: "steamed",                 pt: "ao vapor",              de: "gedämpft",                 fr: "à la vapeur",               it: "al vapore" },
  lonja:       { gl: "lonxa",      en: "fish market",             pt: "lota",                  de: "Fischauktionshalle",       fr: "criée",                     it: "mercato del pesce" },
};

/** Tabla de equivalencias para el idioma de destino, lista para el prompt. */
function equivalenciasPara(idioma: Idioma): string {
  const filas = Object.entries(EQUIVALENCIAS)
    .map(([termino, porIdioma]) => {
      const equivalente = porIdioma[idioma];
      return equivalente ? `- "${termino}" → "${equivalente}"` : null;
    })
    .filter(Boolean);
  return filas.join("\n");
}

/**
 * Las equivalencias del glosario son minúsculas ("gegrillt", "alla piastra") y
 * a veces caen al principio de la frase. Pedirle al modelo que respete las
 * mayúsculas es poco fiable; hacerlo aquí es seguro y gratis.
 */
function capitalizar(texto: string): string {
  const limpio = texto.trim();
  if (!limpio) return limpio;
  const primera = limpio[0];
  if (primera !== primera.toLocaleLowerCase()) return limpio; // ya va en mayúscula
  return primera.toLocaleUpperCase() + limpio.slice(1);
}

type Revisadas = Record<string, Partial<Record<Idioma, string>>>;
let revisadasCache: Revisadas | null = null;

/**
 * Traducciones escritas y revisadas a mano en data/traducciones.json. Mandan
 * sobre todo lo demás: son las únicas que ha leído una persona.
 *
 * La clave es la frase en español. Si alguien la cambia, deja de coincidir y
 * esa frase —solo esa— vuelve a pasar por el traductor automático.
 */
function traduccionesRevisadas(): Revisadas {
  if (revisadasCache) return revisadasCache;
  try {
    const ruta = path.join(process.cwd(), "data", "traducciones.json");
    const crudo = JSON.parse(fs.readFileSync(ruta, "utf-8")) as Revisadas;
    delete (crudo as Record<string, unknown>)._comentario;
    revisadasCache = crudo;
  } catch {
    revisadasCache = {};
  }
  return revisadasCache;
}

function hash(texto: string): string {
  return createHash("sha1").update(texto).digest("hex").slice(0, 16);
}

function clave(idioma: Idioma, texto: string): string {
  return `t:${idioma}:${hash(texto)}`;
}

/** Traduce las frases que falten y las deja cacheadas. Devuelve original→traducción. */
export async function traducirDescripciones(
  frases: string[],
  idioma: Idioma,
  opciones: { soloCache?: boolean; tamanoLote?: number } = {},
): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  const unicas = Array.from(new Set(frases.filter((f) => f && f.trim())));
  if (idioma === IDIOMA_POR_DEFECTO || unicas.length === 0) {
    unicas.forEach((f) => resultado.set(f, f));
    return resultado;
  }

  // 1. las revisadas a mano ganan siempre
  const revisadas = traduccionesRevisadas();
  const sinRevisar = unicas.filter((frase) => {
    const v = revisadas[frase]?.[idioma];
    if (v && v.trim()) {
      resultado.set(frase, v.trim());
      return false;
    }
    return true;
  });

  // 2. de lo que quede, lo que haya en caché
  const pendientes: string[] = [];
  await Promise.all(
    sinRevisar.map(async (frase) => {
      const guardada = await kvGet<string>(clave(idioma, frase));
      if (typeof guardada === "string" && guardada) resultado.set(frase, guardada);
      else pendientes.push(frase);
    }),
  );
  if (pendientes.length === 0) return conMayuscula(resultado);

  // La carta NUNCA llama al modelo: pedir 34 traducciones mientras el cliente
  // espera con el móvil en la mano costaba más de seis segundos. Lo que falte
  // sale en español y se traduce fuera de banda, en /api/traducciones.
  if (opciones.soloCache) {
    pendientes.forEach((f) => resultado.set(f, f));
    return conMayuscula(resultado);
  }

  // 3. lotes pequeños: un lote largo tarda más y el modelo se salta frases
  const lote = Math.max(1, opciones.tamanoLote ?? 10);
  for (let inicio = 0; inicio < pendientes.length; inicio += lote) {
    await traducirLote(pendientes.slice(inicio, inicio + lote), idioma, resultado);
  }

  pendientes.forEach((f) => {
    if (!resultado.has(f)) resultado.set(f, f);
  });
  return conMayuscula(resultado);
}

/** Aplica la mayúscula inicial a todo el mapa, venga de caché o del modelo. */
function conMayuscula(mapa: Map<string, string>): Map<string, string> {
  const salida = new Map<string, string>();
  mapa.forEach((valor, clave) => salida.set(clave, capitalizar(valor)));
  return salida;
}

async function traducirLote(
  pendientes: string[],
  idioma: Idioma,
  resultado: Map<string, string>,
): Promise<void> {
  try {
    const bruto = await callLLM(
      `Idioma de destino: ${NOMBRE_IDIOMA[idioma]}.\n\n` +
        `Frases a traducir (array JSON de ${pendientes.length} elementos):\n` +
        JSON.stringify(pendientes, null, 1),
      {
        system: sistemaPara(idioma),
        maxTokens: 1400,
        // Traducir y extraer acciones son tareas distintas: si un modelo da
        // problemas en una, se cambia solo esa sin tocar la otra ni el código.
        model: process.env.OPENROUTER_MODEL_TRADUCCION,
      },
    );
    const traducidas = extraerArray(bruto);
    if (!traducidas || traducidas.length !== pendientes.length) {
      // Otro camino que antes no dejaba rastro: el modelo respondió, pero no
      // con la lista que le pedimos. Sin esto la carta se queda en español y
      // no hay forma de saber por qué.
      console.error(
        `[traducir] ${idioma}: esperaba ${pendientes.length} frases, recibí ` +
          `${traducidas ? traducidas.length : "nada parseable"}. Respuesta: ` +
          bruto.slice(0, 200),
      );
    }
    const sinTraducir =
      traducidas && traducidas.length === pendientes.length
        ? pendientes.filter((f, i) => String(traducidas[i] ?? "").trim() === f.trim()).length
        : 0;
    if (traducidas && sinTraducir > pendientes.length * 0.5) {
      // El modelo devolvió el español tal cual, con la longitud correcta: sin
      // esta comprobación se cacheaba como si fuese una traducción válida y la
      // carta se quedaba en español para siempre, sin un solo error.
      console.error(
        `[traducir] ${idioma}: ${sinTraducir}/${pendientes.length} frases volvieron sin traducir; se descarta.`,
      );
      throw new Error("respuesta sin traducir");
    }
    if (traducidas && traducidas.length === pendientes.length) {
      await Promise.all(
        pendientes.map(async (frase, i) => {
          const t = String(traducidas[i] ?? "").trim();
          if (!t) return;
          resultado.set(frase, t);
          await kvSet(clave(idioma, frase), t);
        }),
      );
    }
  } catch (e) {
    // La carta se sirve igual, en español; pero que no falle en silencio: si
    // la clave caduca, esto es lo único que lo delata en los registros.
    console.error(
      `[traducir] falló ${idioma} (${pendientes.length} frases):`,
      (e as Error).message,
    );
  }

}

/** El modelo a veces envuelve el array en texto o en fences. */
function extraerArray(bruto: string): unknown[] | null {
  const sinFences = bruto.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? bruto;
  const i = sinFences.indexOf("[");
  const j = sinFences.lastIndexOf("]");
  if (i === -1 || j <= i) return null;
  try {
    const v = JSON.parse(sinFences.slice(i, j + 1));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
