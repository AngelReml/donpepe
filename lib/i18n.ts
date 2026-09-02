/**
 * Idiomas de la carta: 18, ampliado desde los 7 originales sin reescribir la
 * infraestructura (mismo elegirIdioma, mismo glosario gallego de
 * lib/traducir.ts, mismo patrón de TEXTOS). Coreano, japonés y chino son
 * prioritarios -es el público al que el dueño dice que peor atiende-, y
 * catalán es obligatorio. Los nombres de los platos SÍ se traducen desde
 * esta fase (ver data/nombres-platos.i18n.json): antes solo se traducía la
 * descripción.
 *
 * Padrón está en el Camino Portugués, y eso ya marcaba los 7 primeros.
 */
export const IDIOMAS = [
  "es", "gl", "en", "pt", "fr", "de", "it", "ca", "eu", "nl",
  "pl", "cs", "hu", "ko", "ja", "zh", "ru", "ro",
] as const;
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
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ca: "Català",
  eu: "Euskara",
  nl: "Nederlands",
  pl: "Polski",
  cs: "Čeština",
  hu: "Magyar",
  ko: "한국어",
  ja: "日本語",
  zh: "简体中文",
  ru: "Русский",
  ro: "Română",
};

/** Etiqueta corta del selector. */
export const CODIGO_IDIOMA: Record<Idioma, string> = {
  es: "ES", gl: "GL", en: "EN", pt: "PT", fr: "FR", de: "DE", it: "IT",
  ca: "CA", eu: "EU", nl: "NL", pl: "PL", cs: "CS", hu: "HU",
  ko: "KO", ja: "JA", zh: "ZH", ru: "RU", ro: "RO",
};

/** `lang` completo para el atributo del documento y los hreflang. */
export const ETIQUETA_HTML: Record<Idioma, string> = {
  es: "es-ES", gl: "gl-ES", en: "en", pt: "pt", fr: "fr", de: "de", it: "it",
  ca: "ca", eu: "eu", nl: "nl", pl: "pl", cs: "cs", hu: "hu",
  ko: "ko", ja: "ja", zh: "zh-Hans", ru: "ru", ro: "ro",
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
  ca: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "La carta",
    mesaBienvenida: "Taula {mesa}, benvinguts.",
    seccionMenus: "Menús",
    pieCartaViva: "Carta viva — pot variar segons el mercat del dia. Consulti el personal.",
    categorias: { entrantes: "Entrants", arroces: "Arrossos", pescados: "Peixos", carnes: "Carns" },
    etiquetaCarta: "Carta",
    etiquetaCategorias: "Categories de la carta",
    sinPlatos: "No hi ha plats en aquesta categoria.",
    notaPrecios: "Preus en euros. IVA inclòs. Consulti el personal sobre al·lèrgens.",
    aElegirPrimero: "A triar primer",
    aElegirSegundo: "A triar segon",
    incluyeLista: "Inclou",
    incluye: "Inclou:",
    noIncluye: "No inclou:",
    selectorIdioma: "Idioma",
    metaTitulo: "Carta",
    metaDescripcion: "Carta completa de Don Pepe Original: entrants, arrossos, peixos, carns i menús.",
    reservar: "Reservar",
    whatsappMensaje: "Hola, voldria reservar taula.",
    descubreLocal: "Descobreix el local",
  },
  eu: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Karta",
    mesaBienvenida: "{mesa} mahaia, ongi etorri.",
    seccionMenus: "Menuak",
    pieCartaViva: "Karta bizia — eguneko merkatuaren arabera alda daiteke. Galdetu langileei.",
    categorias: { entrantes: "Aperitiboak", arroces: "Arrozak", pescados: "Arrainak", carnes: "Haragiak" },
    etiquetaCarta: "Karta",
    etiquetaCategorias: "Kartaren kategoriak",
    sinPlatos: "Ez dago platerik kategoria honetan.",
    notaPrecios: "Prezioak eurotan. BEZ barne. Galdetu langileei alergenoez.",
    aElegirPrimero: "Lehena aukeratzeko",
    aElegirSegundo: "Bigarrena aukeratzeko",
    incluyeLista: "Barne",
    incluye: "Barne:",
    noIncluye: "Kanpo:",
    selectorIdioma: "Hizkuntza",
    metaTitulo: "Karta",
    metaDescripcion: "Don Pepe Originalen karta osoa: aperitiboak, arrozak, arrainak, haragiak eta menuak.",
    reservar: "Erreserbatu",
    whatsappMensaje: "Kaixo, mahaia erreserbatu nahi nuke.",
    descubreLocal: "Ezagutu lokala",
  },
  nl: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "De kaart",
    mesaBienvenida: "Tafel {mesa}, welkom.",
    seccionMenus: "Menu's",
    pieCartaViva: "Levende kaart — kan variëren afhankelijk van de dagmarkt. Vraag het personeel.",
    categorias: { entrantes: "Voorgerechten", arroces: "Rijstgerechten", pescados: "Vis", carnes: "Vlees" },
    etiquetaCarta: "Kaart",
    etiquetaCategorias: "Categorieën van de kaart",
    sinPlatos: "Geen gerechten in deze categorie.",
    notaPrecios: "Prijzen in euro's, btw inbegrepen. Vraag het personeel naar allergenen.",
    aElegirPrimero: "Voorgerecht (naar keuze)",
    aElegirSegundo: "Hoofdgerecht (naar keuze)",
    incluyeLista: "Inbegrepen",
    incluye: "Inbegrepen:",
    noIncluye: "Niet inbegrepen:",
    selectorIdioma: "Taal",
    metaTitulo: "Kaart",
    metaDescripcion: "De volledige kaart van Don Pepe Original: voorgerechten, rijstgerechten, vis, vlees en menu's.",
    reservar: "Reserveren",
    whatsappMensaje: "Hallo, ik zou graag een tafel reserveren.",
    descubreLocal: "Ontdek de zaak",
  },
  pl: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Menu",
    mesaBienvenida: "Stolik {mesa}, witamy.",
    seccionMenus: "Zestawy",
    pieCartaViva: "Menu żywe — może się zmieniać w zależności od dziennych dostaw. Proszę zapytać personel.",
    categorias: { entrantes: "Przystawki", arroces: "Dania ryżowe", pescados: "Ryby", carnes: "Mięsa" },
    etiquetaCarta: "Menu",
    etiquetaCategorias: "Kategorie menu",
    sinPlatos: "Brak dań w tej kategorii.",
    notaPrecios: "Ceny w euro, z VAT. Proszę zapytać personel o alergeny.",
    aElegirPrimero: "Danie pierwsze (do wyboru)",
    aElegirSegundo: "Danie drugie (do wyboru)",
    incluyeLista: "W cenie",
    incluye: "W cenie:",
    noIncluye: "Nie wliczone:",
    selectorIdioma: "Język",
    metaTitulo: "Menu",
    metaDescripcion: "Pełne menu Don Pepe Original: przystawki, dania ryżowe, ryby, mięsa i zestawy.",
    reservar: "Zarezerwuj",
    whatsappMensaje: "Cześć, chciałbym zarezerwować stolik.",
    descubreLocal: "Poznaj lokal",
  },
  cs: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Jídelní lístek",
    mesaBienvenida: "Stůl {mesa}, vítejte.",
    seccionMenus: "Menu",
    pieCartaViva: "Živý jídelní lístek — může se měnit podle denní nabídky trhu. Zeptejte se personálu.",
    categorias: { entrantes: "Předkrmy", arroces: "Rýžová jídla", pescados: "Ryby", carnes: "Maso" },
    etiquetaCarta: "Jídelní lístek",
    etiquetaCategorias: "Kategorie jídelního lístku",
    sinPlatos: "V této kategorii nejsou žádná jídla.",
    notaPrecios: "Ceny v eurech, včetně DPH. Na alergeny se zeptejte personálu.",
    aElegirPrimero: "První chod (na výběr)",
    aElegirSegundo: "Druhý chod (na výběr)",
    incluyeLista: "Zahrnuje",
    incluye: "Zahrnuje:",
    noIncluye: "Nezahrnuje:",
    selectorIdioma: "Jazyk",
    metaTitulo: "Jídelní lístek",
    metaDescripcion: "Kompletní jídelní lístek Don Pepe Original: předkrmy, rýžová jídla, ryby, maso a menu.",
    reservar: "Rezervovat",
    whatsappMensaje: "Dobrý den, chtěl bych si rezervovat stůl.",
    descubreLocal: "Poznejte podnik",
  },
  hu: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Étlap",
    mesaBienvenida: "{mesa}. asztal, üdvözöljük.",
    seccionMenus: "Menük",
    pieCartaViva: "Élő étlap — a napi piaci kínálattól függően változhat. Kérdezze meg a személyzetet.",
    categorias: { entrantes: "Előételek", arroces: "Rizottók", pescados: "Halak", carnes: "Húsok" },
    etiquetaCarta: "Étlap",
    etiquetaCategorias: "Az étlap kategóriái",
    sinPlatos: "Nincs étel ebben a kategóriában.",
    notaPrecios: "Az árak euróban értendők, áfával. Az allergénekről kérdezze a személyzetet.",
    aElegirPrimero: "Első fogás (választható)",
    aElegirSegundo: "Második fogás (választható)",
    incluyeLista: "Tartalmazza",
    incluye: "Tartalmazza:",
    noIncluye: "Nem tartalmazza:",
    selectorIdioma: "Nyelv",
    metaTitulo: "Étlap",
    metaDescripcion: "A Don Pepe Original teljes étlapja: előételek, rizottók, halak, húsok és menük.",
    reservar: "Asztalfoglalás",
    whatsappMensaje: "Üdvözlöm, szeretnék asztalt foglalni.",
    descubreLocal: "Ismerje meg az éttermet",
  },
  ko: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "메뉴",
    mesaBienvenida: "{mesa}번 테이블, 환영합니다.",
    seccionMenus: "세트 메뉴",
    pieCartaViva: "메뉴는 그날그날 시장 상황에 따라 바뀔 수 있습니다. 직원에게 문의해 주세요.",
    categorias: { entrantes: "전채요리", arroces: "쌀 요리", pescados: "생선요리", carnes: "고기요리" },
    etiquetaCarta: "메뉴",
    etiquetaCategorias: "메뉴 카테고리",
    sinPlatos: "이 카테고리에는 요리가 없습니다.",
    notaPrecios: "가격은 유로화이며 부가세가 포함되어 있습니다. 알레르기 유발 성분은 직원에게 문의해 주세요.",
    aElegirPrimero: "첫 번째 코스 (택1)",
    aElegirSegundo: "두 번째 코스 (택1)",
    incluyeLista: "포함",
    incluye: "포함:",
    noIncluye: "불포함:",
    selectorIdioma: "언어",
    metaTitulo: "메뉴",
    metaDescripcion: "돈 페페 오리지널의 전체 메뉴: 전채요리, 쌀 요리, 생선요리, 고기요리, 세트 메뉴.",
    reservar: "예약하기",
    whatsappMensaje: "안녕하세요, 테이블을 예약하고 싶습니다.",
    descubreLocal: "레스토랑 둘러보기",
  },
  ja: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "メニュー",
    mesaBienvenida: "{mesa}番テーブル、ようこそ。",
    seccionMenus: "セットメニュー",
    pieCartaViva: "生きたメニュー — その日の仕入れ状況により内容が変わることがあります。スタッフにお尋ねください。",
    categorias: { entrantes: "前菜", arroces: "米料理", pescados: "魚料理", carnes: "肉料理" },
    etiquetaCarta: "メニュー",
    etiquetaCategorias: "メニューのカテゴリー",
    sinPlatos: "このカテゴリーには料理がありません。",
    notaPrecios: "価格はユーロ表示、税込みです。アレルギー物質についてはスタッフにお尋ねください。",
    aElegirPrimero: "前菜（お選びください）",
    aElegirSegundo: "メイン（お選びください）",
    incluyeLista: "内容",
    incluye: "内容:",
    noIncluye: "含まれないもの:",
    selectorIdioma: "言語",
    metaTitulo: "メニュー",
    metaDescripcion: "ドン・ペペ・オリジナルの全メニュー：前菜、米料理、魚料理、肉料理、セットメニュー。",
    reservar: "予約する",
    whatsappMensaje: "こんにちは、テーブルを予約したいのですが。",
    descubreLocal: "お店を見る",
  },
  zh: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "菜单",
    mesaBienvenida: "{mesa}号桌，欢迎光临。",
    seccionMenus: "套餐",
    pieCartaViva: "菜单会根据当日市场供应情况有所调整，详情请咨询服务员。",
    categorias: { entrantes: "前菜", arroces: "米饭料理", pescados: "海鲜", carnes: "肉类" },
    etiquetaCarta: "菜单",
    etiquetaCategorias: "菜单分类",
    sinPlatos: "此分类暂无菜品。",
    notaPrecios: "价格以欧元计，含增值税。过敏原信息请咨询服务员。",
    aElegirPrimero: "第一道菜（可选）",
    aElegirSegundo: "第二道菜（可选）",
    incluyeLista: "含",
    incluye: "含：",
    noIncluye: "不含：",
    selectorIdioma: "语言",
    metaTitulo: "菜单",
    metaDescripcion: "Don Pepe Original 完整菜单：前菜、米饭料理、海鲜、肉类及套餐。",
    reservar: "预订",
    whatsappMensaje: "您好，我想预订一张桌子。",
    descubreLocal: "了解餐厅",
  },
  ru: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Меню",
    mesaBienvenida: "Столик {mesa}, добро пожаловать.",
    seccionMenus: "Комплексные меню",
    pieCartaViva: "Живое меню — может меняться в зависимости от дневного рынка. Уточните у персонала.",
    categorias: { entrantes: "Закуски", arroces: "Рисовые блюда", pescados: "Рыба", carnes: "Мясо" },
    etiquetaCarta: "Меню",
    etiquetaCategorias: "Категории меню",
    sinPlatos: "В этой категории блюд нет.",
    notaPrecios: "Цены указаны в евро, включая НДС. Об аллергенах уточняйте у персонала.",
    aElegirPrimero: "Первое блюдо (на выбор)",
    aElegirSegundo: "Второе блюдо (на выбор)",
    incluyeLista: "Включено",
    incluye: "Включено:",
    noIncluye: "Не включено:",
    selectorIdioma: "Язык",
    metaTitulo: "Меню",
    metaDescripcion: "Полное меню Don Pepe Original: закуски, рисовые блюда, рыба, мясо и комплексные меню.",
    reservar: "Забронировать",
    whatsappMensaje: "Здравствуйте, хотел бы забронировать столик.",
    descubreLocal: "Узнать о заведении",
  },
  ro: {
    marca: "Don Pepe Original · Padrón",
    tituloCarta: "Meniul",
    mesaBienvenida: "Masa {mesa}, bine ați venit.",
    seccionMenus: "Meniuri fixe",
    pieCartaViva: "Meniu viu — poate varia în funcție de piața zilei. Întrebați personalul.",
    categorias: { entrantes: "Aperitive", arroces: "Preparate cu orez", pescados: "Pește", carnes: "Carne" },
    etiquetaCarta: "Meniu",
    etiquetaCategorias: "Categoriile meniului",
    sinPlatos: "Nu există preparate în această categorie.",
    notaPrecios: "Prețuri în euro, TVA inclus. Întrebați personalul despre alergeni.",
    aElegirPrimero: "Fel întâi (la alegere)",
    aElegirSegundo: "Fel doi (la alegere)",
    incluyeLista: "Include",
    incluye: "Include:",
    noIncluye: "Nu include:",
    selectorIdioma: "Limbă",
    metaTitulo: "Meniu",
    metaDescripcion: "Meniul complet Don Pepe Original: aperitive, preparate cu orez, pește, carne și meniuri fixe.",
    reservar: "Rezervă",
    whatsappMensaje: "Bună ziua, aș dori să rezerv o masă.",
    descubreLocal: "Descoperă localul",
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
