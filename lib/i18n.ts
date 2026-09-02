/**
 * Idiomas de la carta. Fase 1: solo la interfaz — los nombres de los platos
 * siguen viniendo en español desde KV / data/menu.json.
 *
 * Padrón está en el Camino Portugués, y eso marca qué idiomas importan.
 */
export const IDIOMAS = ["es", "gl", "en", "pt", "de", "fr", "it"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Cookie donde se recuerda la elección manual del visitante. */
export const COOKIE_IDIOMA = "dp_idioma";

/** Nombre de cada idioma en su propio idioma, para el selector. */
export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: "Español",
  gl: "Galego",
  en: "English",
  pt: "Português",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
};

/** Etiqueta corta del selector. */
export const CODIGO_IDIOMA: Record<Idioma, string> = {
  es: "ES", gl: "GL", en: "EN", pt: "PT", de: "DE", fr: "FR", it: "IT",
};

/** `lang` completo para el atributo del documento y los hreflang. */
export const ETIQUETA_HTML: Record<Idioma, string> = {
  es: "es-ES", gl: "gl-ES", en: "en", pt: "pt", de: "de", fr: "fr", it: "it",
};

export interface Textos {
  marca: string;
  tituloCarta: string;
  /** Lleva el marcador {mesa}; se sustituye con `conMesa()`. */
  mesaBienvenida: string;
  seccionMenus: string;
  pieCartaViva: string;
  categorias: Record<"entrantes" | "arroces" | "pescados" | "carnes", string>;
  etiquetaCarta: string;
  etiquetaCategorias: string;
  sinPlatos: string;
  notaPrecios: string;
  aElegirPrimero: string;
  aElegirSegundo: string;
  incluyeLista: string;
  incluye: string;
  noIncluye: string;
  selectorIdioma: string;
  metaTitulo: string;
  metaDescripcion: string;
  /** Botón fijo de la carta: llamada directa para reservar. */
  reservar: string;
  /** Mensaje que va precargado en el enlace wa.me del botón WhatsApp. */
  whatsappMensaje: string;
  /** Enlace secundario, al pie de la carta, hacia el escaparate del local (/local). */
  descubreLocal: string;
}

export const TEXTOS: Record<Idioma, Textos> = {
  es: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "La carta",
    mesaBienvenida: "Mesa {mesa}, bienvenidos.",
    seccionMenus: "Menús",
    pieCartaViva: "Carta viva — puede variar según mercado del día. Consulte al personal.",
    categorias: { entrantes: "Entrantes", arroces: "Arroces", pescados: "Pescados", carnes: "Carnes" },
    etiquetaCarta: "Carta",
    etiquetaCategorias: "Categorías de la carta",
    sinPlatos: "No hay platos en esta categoría.",
    notaPrecios: "Precios en euros. IVA incluido. Consulte al personal sobre alérgenos.",
    aElegirPrimero: "A elegir primero",
    aElegirSegundo: "A elegir segundo",
    incluyeLista: "Incluye",
    incluye: "Incluye:",
    noIncluye: "No incluye:",
    selectorIdioma: "Idioma",
    metaTitulo: "Carta",
    metaDescripcion: "Carta completa de Don Pepe Original: entrantes, arroces, pescados, carnes y menús.",
    reservar: "Reservar",
    whatsappMensaje: "Hola, querría reservar mesa.",
    descubreLocal: "Descubre el local",
  },
  gl: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "A carta",
    mesaBienvenida: "Mesa {mesa}, benvidos.",
    seccionMenus: "Menús",
    pieCartaViva: "Carta viva — pode variar segundo o mercado do día. Consulte ao persoal.",
    categorias: { entrantes: "Entrantes", arroces: "Arroces", pescados: "Peixes", carnes: "Carnes" },
    etiquetaCarta: "Carta",
    etiquetaCategorias: "Categorías da carta",
    sinPlatos: "Non hai pratos nesta categoría.",
    notaPrecios: "Prezos en euros. IVE incluído. Consulte ao persoal sobre alérxenos.",
    aElegirPrimero: "A escoller primeiro",
    aElegirSegundo: "A escoller segundo",
    incluyeLista: "Inclúe",
    incluye: "Inclúe:",
    noIncluye: "Non inclúe:",
    selectorIdioma: "Idioma",
    metaTitulo: "Carta",
    metaDescripcion: "Carta completa do Don Pepe Original: entrantes, arroces, peixes, carnes e menús.",
    reservar: "Reservar",
    whatsappMensaje: "Ola, querería reservar mesa.",
    descubreLocal: "Descobre o local",
  },
  en: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "The menu",
    mesaBienvenida: "Table {mesa} — welcome.",
    seccionMenus: "Set menus",
    pieCartaViva: "Living menu — dishes may change with the day's market. Please ask our staff.",
    categorias: { entrantes: "Starters", arroces: "Rice dishes", pescados: "Fish", carnes: "Meat" },
    etiquetaCarta: "Menu",
    etiquetaCategorias: "Menu categories",
    sinPlatos: "No dishes in this category.",
    notaPrecios: "Prices in euros, VAT included. Please ask our staff about allergens.",
    aElegirPrimero: "First course (choose one)",
    aElegirSegundo: "Second course (choose one)",
    incluyeLista: "Included",
    incluye: "Included:",
    noIncluye: "Not included:",
    selectorIdioma: "Language",
    metaTitulo: "Menu",
    metaDescripcion: "The full menu at Don Pepe Original: starters, rice dishes, fish, meat and set menus.",
    reservar: "Book a table",
    whatsappMensaje: "Hi, I'd like to book a table.",
    descubreLocal: "Discover the place",
  },
  pt: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "A ementa",
    mesaBienvenida: "Mesa {mesa}, bem-vindos.",
    seccionMenus: "Menus",
    pieCartaViva: "Ementa viva — pode variar consoante o mercado do dia. Consulte o pessoal.",
    categorias: { entrantes: "Entradas", arroces: "Arrozes", pescados: "Peixe", carnes: "Carne" },
    etiquetaCarta: "Ementa",
    etiquetaCategorias: "Categorias da ementa",
    sinPlatos: "Não há pratos nesta categoria.",
    notaPrecios: "Preços em euros, IVA incluído. Consulte o pessoal sobre alergénios.",
    aElegirPrimero: "Primeiro prato (à escolha)",
    aElegirSegundo: "Segundo prato (à escolha)",
    incluyeLista: "Inclui",
    incluye: "Inclui:",
    noIncluye: "Não inclui:",
    selectorIdioma: "Idioma",
    metaTitulo: "Ementa",
    metaDescripcion: "A ementa completa do Don Pepe Original: entradas, arrozes, peixe, carne e menus.",
    reservar: "Reservar",
    whatsappMensaje: "Olá, gostaria de reservar mesa.",
    descubreLocal: "Descubra o local",
  },
  de: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Die Speisekarte",
    mesaBienvenida: "Tisch {mesa} — herzlich willkommen.",
    seccionMenus: "Menüs",
    pieCartaViva: "Lebendige Karte — Gerichte können je nach Tagesmarkt wechseln. Fragen Sie unser Personal.",
    categorias: { entrantes: "Vorspeisen", arroces: "Reisgerichte", pescados: "Fisch", carnes: "Fleisch" },
    etiquetaCarta: "Speisekarte",
    etiquetaCategorias: "Kategorien der Speisekarte",
    sinPlatos: "Keine Gerichte in dieser Kategorie.",
    notaPrecios: "Preise in Euro, inkl. MwSt. Fragen Sie unser Personal nach Allergenen.",
    aElegirPrimero: "Vorspeise (zur Auswahl)",
    aElegirSegundo: "Hauptgang (zur Auswahl)",
    incluyeLista: "Inbegriffen",
    incluye: "Inbegriffen:",
    noIncluye: "Nicht inbegriffen:",
    selectorIdioma: "Sprache",
    metaTitulo: "Speisekarte",
    metaDescripcion: "Die vollständige Speisekarte des Don Pepe Original: Vorspeisen, Reisgerichte, Fisch, Fleisch und Menüs.",
    reservar: "Reservieren",
    whatsappMensaje: "Hallo, ich möchte gern einen Tisch reservieren.",
    descubreLocal: "Lokal entdecken",
  },
  fr: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "La carte",
    mesaBienvenida: "Table {mesa}, bienvenue.",
    seccionMenus: "Menus",
    pieCartaViva: "Carte vivante — les plats peuvent varier selon le marché du jour. Demandez au personnel.",
    categorias: { entrantes: "Entrées", arroces: "Riz", pescados: "Poissons", carnes: "Viandes" },
    etiquetaCarta: "Carte",
    etiquetaCategorias: "Catégories de la carte",
    sinPlatos: "Aucun plat dans cette catégorie.",
    notaPrecios: "Prix en euros, TVA comprise. Renseignez-vous auprès du personnel sur les allergènes.",
    aElegirPrimero: "Entrée (au choix)",
    aElegirSegundo: "Plat (au choix)",
    incluyeLista: "Compris",
    incluye: "Compris :",
    noIncluye: "Non compris :",
    selectorIdioma: "Langue",
    metaTitulo: "Carte",
    metaDescripcion: "La carte complète du Don Pepe Original : entrées, riz, poissons, viandes et menus.",
    reservar: "Réserver",
    whatsappMensaje: "Bonjour, je voudrais réserver une table.",
    descubreLocal: "Découvrez le lieu",
  },
  it: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Il menù",
    mesaBienvenida: "Tavolo {mesa}, benvenuti.",
    seccionMenus: "Menù fissi",
    pieCartaViva: "Menù vivo — i piatti possono variare secondo il mercato del giorno. Chieda al personale.",
    categorias: { entrantes: "Antipasti", arroces: "Risotti e paelle", pescados: "Pesce", carnes: "Carne" },
    etiquetaCarta: "Menù",
    etiquetaCategorias: "Categorie del menù",
    sinPlatos: "Nessun piatto in questa categoria.",
    notaPrecios: "Prezzi in euro, IVA inclusa. Chieda al personale per gli allergeni.",
    aElegirPrimero: "Primo (a scelta)",
    aElegirSegundo: "Secondo (a scelta)",
    incluyeLista: "Incluso",
    incluye: "Incluso:",
    noIncluye: "Non incluso:",
    selectorIdioma: "Lingua",
    metaTitulo: "Menù",
    metaDescripcion: "Il menù completo del Don Pepe Original: antipasti, riso, pesce, carne e menù fissi.",
    reservar: "Prenota",
    whatsappMensaje: "Ciao, vorrei prenotare un tavolo.",
    descubreLocal: "Scopri il locale",
  },
};

function esIdioma(v: string | undefined | null): v is Idioma {
  return !!v && (IDIOMAS as readonly string[]).includes(v);
}

/**
 * Ordena las preferencias de `Accept-Language` por su factor q y devuelve el
 * primer idioma que sabemos servir. "pt-BR" cuenta como "pt", "en-GB" como "en".
 */
export function idiomaDesdeCabecera(cabecera: string | null | undefined): Idioma | null {
  if (!cabecera) return null;
  const preferencias = cabecera
    .split(",")
    .map((trozo) => {
      const [etiqueta, ...params] = trozo.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .filter((p) => p.startsWith("q="))
        .map((p) => Number.parseFloat(p.slice(2)))[0];
      return { base: etiqueta.trim().toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 1 };
    })
    .filter((p) => p.base)
    .sort((a, b) => b.q - a.q);

  for (const { base } of preferencias) {
    if (esIdioma(base)) return base;
  }
  return null;
}

/**
 * Prioridad: lo que el visitante eligió a mano (?lang= y luego cookie) manda
 * sobre lo que dice su móvil. Si no sabemos nada, español.
 */
export function elegirIdioma(opciones: {
  parametro?: string | null;
  cookie?: string | null;
  cabecera?: string | null;
}): Idioma {
  if (esIdioma(opciones.parametro)) return opciones.parametro;
  if (esIdioma(opciones.cookie)) return opciones.cookie;
  return idiomaDesdeCabecera(opciones.cabecera) ?? IDIOMA_POR_DEFECTO;
}

/** Sustituye {mesa} en la plantilla de bienvenida. */
export function conMesa(plantilla: string, mesa: string): string {
  return plantilla.replace("{mesa}", mesa);
}

export function textos(idioma: Idioma): Textos {
  return TEXTOS[idioma] ?? TEXTOS[IDIOMA_POR_DEFECTO];
}
