/**
 * Textos de las páginas legales, en los siete idiomas.
 *
 * Criterio de traducción, el mismo que el resto del proyecto: los nombres
 * propios no se traducen (Don Pepe Original, Rúa Longa, Padrón), y las
 * referencias a normas españolas se dejan con su nombre oficial y se explican,
 * porque una ley española no cambia de nombre por leerla en alemán.
 *
 * FALTA_DATO se conserva como marcador: si algún día falta un dato, se pone
 * literal y sale visible en la web, en lugar de dejar un hueco silencioso.
 */
import type { Idioma } from "./i18n";

export const FALTA_DATO = "[FALTA DATO]";

/**
 * Ampliación de 7 a 18 idiomas (ver lib/i18n.ts): estos 11 NO tienen
 * traducción legal propia todavía. Un texto legal mal traducido es peor que
 * uno ausente, así que de momento heredan el inglés -ya redactado con
 * cuidado, entendible en toda la UE- en vez de una traducción sin revisar
 * por un hablante nativo. Documentado también en el README ("Idiomas —
 * estado de las páginas legales"). Sustituir aquí en cuanto haya traducción
 * revisada.
 */
const SIN_TRADUCCION_LEGAL_PROPIA = ["ca", "eu", "nl", "pl", "cs", "hu", "ko", "ja", "zh", "ru", "ro"] as const;

function conFallbackIngles<T>(
  base: Record<"es" | "gl" | "en" | "pt" | "fr" | "de" | "it", T>,
): Record<Idioma, T> {
  const completo = { ...base } as Record<Idioma, T>;
  for (const idioma of SIN_TRADUCCION_LEGAL_PROPIA) completo[idioma] = base.en;
  return completo;
}

/**
 * Datos del titular. Es un empresario individual, no una sociedad: por eso la
 * ficha identifica a la persona física y su nombre comercial, y no hay
 * "denominación social" ni número de Registro Mercantil, que no proceden.
 *
 * Estos valores no dependen del idioma; sus etiquetas y el régimen, sí.
 */
export const TITULAR = {
  titular: "Antonio Llull Molina",
  nombreComercial: "Don Pepe Original",
  nif: "35013344F",
  domicilio: "Rúa Longa 21, 15900 Padrón, A Coruña, España",
  telefonos: "881 82 97 28 · 696 43 40 42",
  email: "donpepeoriginalpadron@gmail.com",
} as const;

export type ClaveTitular = keyof typeof TITULAR;

/** El régimen es una descripción, así que se traduce. */
export const REGIMEN: Record<Idioma, string> = conFallbackIngles({
  es: "Autónomo (empresario individual)",
  gl: "Autónomo (empresario individual)",
  en: "Self-employed sole trader",
  pt: "Trabalhador independente (empresário em nome individual)",
  de: "Selbstständiger Einzelunternehmer",
  fr: "Travailleur indépendant (entrepreneur individuel)",
  it: "Lavoratore autonomo (imprenditore individuale)",
});

export const ETIQUETAS_TITULAR: Record<Idioma, Record<ClaveTitular | "regimen", string>> = conFallbackIngles({
  es: { titular: "Titular", nombreComercial: "Nombre comercial", nif: "NIF", regimen: "Régimen", domicilio: "Domicilio", telefonos: "Teléfonos", email: "Correo electrónico" },
  gl: { titular: "Titular", nombreComercial: "Nome comercial", nif: "NIF", regimen: "Réxime", domicilio: "Domicilio", telefonos: "Teléfonos", email: "Correo electrónico" },
  en: { titular: "Owner", nombreComercial: "Trading name", nif: "Tax ID (NIF)", regimen: "Legal status", domicilio: "Address", telefonos: "Telephone", email: "Email" },
  pt: { titular: "Titular", nombreComercial: "Nome comercial", nif: "NIF", regimen: "Regime", domicilio: "Morada", telefonos: "Telefones", email: "Correio eletrónico" },
  de: { titular: "Inhaber", nombreComercial: "Geschäftsbezeichnung", nif: "Steuernummer (NIF)", regimen: "Rechtsform", domicilio: "Anschrift", telefonos: "Telefon", email: "E-Mail" },
  fr: { titular: "Titulaire", nombreComercial: "Nom commercial", nif: "Numéro fiscal (NIF)", regimen: "Statut", domicilio: "Adresse", telefonos: "Téléphones", email: "Courriel" },
  it: { titular: "Titolare", nombreComercial: "Nome commerciale", nif: "Codice fiscale (NIF)", regimen: "Regime", domicilio: "Indirizzo", telefonos: "Telefoni", email: "Email" },
});

export interface BloqueLegal {
  h: string;
  /** Párrafos. Un bloque puede no tener ninguno si solo lleva la ficha del titular. */
  p?: string[];
  /** Cuando es true, bajo el encabezado se pinta la ficha de datos del titular. */
  titular?: boolean;
}

export interface PaginaLegal {
  titulo: string;
  entradilla: string;
  actualizado: string;
  bloques: BloqueLegal[];
}

/** Etiquetas de navegación y del pie, por idioma. */
export const ENLACES_LEGALES: Record<Idioma, { aviso: string; privacidad: string; volver: string; actualizado: string }> = conFallbackIngles({
  es: { aviso: "Aviso legal", privacidad: "Política de privacidad", volver: "Volver a la carta", actualizado: "Última actualización" },
  gl: { aviso: "Aviso legal", privacidad: "Política de privacidade", volver: "Volver á carta", actualizado: "Última actualización" },
  en: { aviso: "Legal notice", privacidad: "Privacy policy", volver: "Back to the menu", actualizado: "Last updated" },
  pt: { aviso: "Aviso legal", privacidad: "Política de privacidade", volver: "Voltar à carta", actualizado: "Última atualização" },
  de: { aviso: "Impressum", privacidad: "Datenschutzerklärung", volver: "Zurück zur Speisekarte", actualizado: "Zuletzt aktualisiert" },
  fr: { aviso: "Mentions légales", privacidad: "Politique de confidentialité", volver: "Retour à la carte", actualizado: "Dernière mise à jour" },
  it: { aviso: "Note legali", privacidad: "Informativa sulla privacy", volver: "Torna al menù", actualizado: "Ultimo aggiornamento" },
});

const FECHA: Record<Idioma, string> = conFallbackIngles({
  es: "25 de agosto de 2026",
  gl: "25 de agosto de 2026",
  en: "25 August 2026",
  pt: "25 de agosto de 2026",
  de: "25. August 2026",
  fr: "25 août 2026",
  it: "25 agosto 2026",
});

/* ══════════════════════════ AVISO LEGAL ══════════════════════════ */

export const AVISO_LEGAL: Record<Idioma, PaginaLegal> = conFallbackIngles({
  es: {
    titulo: "Aviso legal",
    entradilla: "Datos identificativos del titular de este sitio web, conforme al artículo 10 de la Ley 34/2002 de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE).",
    actualizado: FECHA.es,
    bloques: [
      { h: "Titular del sitio", titular: true, p: ["Este sitio lo titula Antonio Llull Molina, que opera bajo el nombre comercial Don Pepe Original. Al tratarse de un empresario individual y no de una sociedad, no procede la inscripción en el Registro Mercantil."] },
      { h: "Objeto", p: ["Este sitio es informativo: publica la carta, los menús, el horario y los datos de contacto del restaurante, y permite solicitar una reserva. No es una tienda: no se venden productos ni se cobran pagos a través de la web."] },
      { h: "Condiciones de uso", p: ["Navegar por este sitio le atribuye la condición de usuario e implica aceptar este aviso legal. Se compromete a usar la web conforme a la ley y a no perjudicar su funcionamiento.", "El titular procura mantener la información al día, pero no garantiza que la web esté disponible sin interrupciones ni que esté libre de errores."] },
      { h: "Carta y precios", p: ["Los precios se muestran en euros, con IVA incluido. La carta es viva y puede variar según el mercado del día; lo marcado «S/M» se cobra según precio de mercado.", "La información publicada es orientativa y no constituye una oferta contractual: el precio y la disponibilidad válidos son los del local en el momento del servicio."] },
      { h: "Propiedad intelectual", p: ["Los textos, las fotografías y el diseño de este sitio pertenecen a su titular o se usan con autorización. No se permite reproducirlos ni usarlos con fines comerciales sin permiso escrito."] },
      { h: "Enlaces a terceros", p: ["La web enlaza a servicios de terceros —Google Maps para la ubicación y WhatsApp para las reservas— cuyos contenidos y políticas no dependen del titular."] },
      { h: "Legislación aplicable", p: ["Este sitio se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a derecho."] },
    ],
  },
  gl: {
    titulo: "Aviso legal",
    entradilla: "Datos identificativos do titular deste sitio web, conforme ao artigo 10 da Lei 34/2002 de servizos da sociedade da información e de comercio electrónico (LSSI-CE).",
    actualizado: FECHA.gl,
    bloques: [
      { h: "Titular do sitio", titular: true, p: ["Este sitio titúlao Antonio Llull Molina, que opera baixo o nome comercial Don Pepe Original. Ao tratarse dun empresario individual e non dunha sociedade, non procede a inscrición no Rexistro Mercantil."] },
      { h: "Obxecto", p: ["Este sitio é informativo: publica a carta, os menús, o horario e os datos de contacto do restaurante, e permite solicitar unha reserva. Non é unha tenda: non se venden produtos nin se cobran pagamentos a través da web."] },
      { h: "Condicións de uso", p: ["Navegar por este sitio atribúelle a condición de usuario e implica aceptar este aviso legal. Comprométese a usar a web conforme á lei e a non prexudicar o seu funcionamento.", "O titular procura manter a información ao día, pero non garante que a web estea dispoñible sen interrupcións nin que estea libre de erros."] },
      { h: "Carta e prezos", p: ["Os prezos amósanse en euros, co IVE incluído. A carta é viva e pode variar segundo o mercado do día; o marcado «S/M» cóbrase segundo prezo de mercado.", "A información publicada é orientativa e non constitúe unha oferta contractual: o prezo e a dispoñibilidade válidos son os do local no momento do servizo."] },
      { h: "Propiedade intelectual", p: ["Os textos, as fotografías e o deseño deste sitio pertencen ao seu titular ou úsanse con autorización. Non se permite reproducilos nin usalos con fins comerciais sen permiso escrito."] },
      { h: "Ligazóns a terceiros", p: ["A web liga a servizos de terceiros —Google Maps para a localización e WhatsApp para as reservas— cuxos contidos e políticas non dependen do titular."] },
      { h: "Lexislación aplicable", p: ["Este sitio réxese pola lexislación española. Para calquera controversia serán competentes os xulgados e tribunais que correspondan conforme a dereito."] },
    ],
  },
  en: {
    titulo: "Legal notice",
    entradilla: "Details of the owner of this website, as required by article 10 of Spanish Law 34/2002 on information society services and electronic commerce (LSSI-CE).",
    actualizado: FECHA.en,
    bloques: [
      { h: "Site owner", titular: true, p: ["This site is owned by Antonio Llull Molina, trading under the name Don Pepe Original. As a sole trader rather than a company, registration with the Commercial Registry does not apply."] },
      { h: "Purpose", p: ["This site is informational: it publishes the restaurant's menu, set menus, opening hours and contact details, and lets you request a table. It is not a shop — nothing is sold and no payment is taken through the website."] },
      { h: "Terms of use", p: ["Browsing this site makes you a user and implies acceptance of this legal notice. You agree to use the site lawfully and not to interfere with its operation.", "The owner aims to keep the information current but does not guarantee uninterrupted availability or that the site is free of errors."] },
      { h: "Menu and prices", p: ["Prices are shown in euros, VAT included. The menu is a living one and may change with the day's market; items marked \"S/M\" are charged at market price.", "The information published is indicative and does not constitute a contractual offer: the valid price and availability are those in the restaurant at the time of service."] },
      { h: "Intellectual property", p: ["The texts, photographs and design of this site belong to its owner or are used with permission. They may not be reproduced or used commercially without written consent."] },
      { h: "Third-party links", p: ["The site links to third-party services — Google Maps for directions and WhatsApp for bookings — whose content and policies are outside the owner's control."] },
      { h: "Applicable law", p: ["This site is governed by Spanish law. Any dispute will be heard by the courts having jurisdiction under the applicable rules."] },
    ],
  },
  pt: {
    titulo: "Aviso legal",
    entradilla: "Dados identificativos do titular deste sítio web, conforme o artigo 10 da Lei espanhola 34/2002 de serviços da sociedade da informação e de comércio eletrónico (LSSI-CE).",
    actualizado: FECHA.pt,
    bloques: [
      { h: "Titular do sítio", titular: true, p: ["Este sítio é da titularidade de Antonio Llull Molina, que opera sob o nome comercial Don Pepe Original. Tratando-se de um empresário em nome individual e não de uma sociedade, não há lugar a inscrição no Registo Comercial."] },
      { h: "Objeto", p: ["Este sítio é informativo: publica a carta, os menus, o horário e os contactos do restaurante, e permite pedir uma reserva. Não é uma loja: não se vendem produtos nem se cobram pagamentos através da web."] },
      { h: "Condições de utilização", p: ["Navegar neste sítio atribui-lhe a condição de utilizador e implica aceitar este aviso legal. Compromete-se a usar a web em conformidade com a lei e a não prejudicar o seu funcionamento.", "O titular procura manter a informação atualizada, mas não garante que a web esteja disponível sem interrupções nem livre de erros."] },
      { h: "Carta e preços", p: ["Os preços são apresentados em euros, com IVA incluído. A carta é viva e pode variar consoante o mercado do dia; o que está marcado «S/M» é cobrado ao preço de mercado.", "A informação publicada é indicativa e não constitui uma oferta contratual: o preço e a disponibilidade válidos são os do estabelecimento no momento do serviço."] },
      { h: "Propriedade intelectual", p: ["Os textos, as fotografias e o design deste sítio pertencem ao seu titular ou são usados com autorização. Não é permitida a sua reprodução nem o uso comercial sem autorização escrita."] },
      { h: "Ligações a terceiros", p: ["A web liga a serviços de terceiros — Google Maps para a localização e WhatsApp para as reservas — cujos conteúdos e políticas não dependem do titular."] },
      { h: "Legislação aplicável", p: ["Este sítio rege-se pela legislação espanhola. Para qualquer litígio serão competentes os tribunais que correspondam nos termos da lei."] },
    ],
  },
  de: {
    titulo: "Impressum",
    entradilla: "Angaben zum Betreiber dieser Website gemäß Artikel 10 des spanischen Gesetzes 34/2002 über Dienste der Informationsgesellschaft und den elektronischen Geschäftsverkehr (LSSI-CE).",
    actualizado: FECHA.de,
    bloques: [
      { h: "Betreiber der Website", titular: true, p: ["Betreiber dieser Website ist Antonio Llull Molina, tätig unter der Geschäftsbezeichnung Don Pepe Original. Da es sich um einen Einzelunternehmer und nicht um eine Gesellschaft handelt, entfällt die Eintragung im Handelsregister."] },
      { h: "Zweck", p: ["Diese Website ist informativ: Sie veröffentlicht Speisekarte, Menüs, Öffnungszeiten und Kontaktdaten des Restaurants und ermöglicht eine Tischanfrage. Sie ist kein Shop — es werden keine Waren verkauft und keine Zahlungen über die Website abgewickelt."] },
      { h: "Nutzungsbedingungen", p: ["Mit dem Besuch dieser Website werden Sie zum Nutzer und akzeptieren dieses Impressum. Sie verpflichten sich, die Website rechtmäßig zu nutzen und ihren Betrieb nicht zu beeinträchtigen.", "Der Betreiber bemüht sich, die Informationen aktuell zu halten, garantiert aber weder eine unterbrechungsfreie Verfügbarkeit noch Fehlerfreiheit."] },
      { h: "Speisekarte und Preise", p: ["Die Preise verstehen sich in Euro inklusive Mehrwertsteuer. Die Karte ist lebendig und kann je nach Tagesmarkt wechseln; mit „S/M“ gekennzeichnete Gerichte werden zum Marktpreis berechnet.", "Die veröffentlichten Angaben sind Richtwerte und stellen kein verbindliches Angebot dar: Maßgeblich sind Preis und Verfügbarkeit im Lokal zum Zeitpunkt der Bewirtung."] },
      { h: "Urheberrecht", p: ["Texte, Fotos und Gestaltung dieser Website gehören dem Betreiber oder werden mit Genehmigung verwendet. Vervielfältigung oder kommerzielle Nutzung ohne schriftliche Erlaubnis sind nicht gestattet."] },
      { h: "Links zu Dritten", p: ["Die Website verlinkt auf Dienste Dritter — Google Maps für die Anfahrt und WhatsApp für Reservierungen —, auf deren Inhalte und Richtlinien der Betreiber keinen Einfluss hat."] },
      { h: "Anwendbares Recht", p: ["Für diese Website gilt spanisches Recht. Für Streitigkeiten sind die nach den geltenden Vorschriften zuständigen Gerichte berufen."] },
    ],
  },
  fr: {
    titulo: "Mentions légales",
    entradilla: "Informations sur le titulaire de ce site web, conformément à l'article 10 de la loi espagnole 34/2002 sur les services de la société de l'information et le commerce électronique (LSSI-CE).",
    actualizado: FECHA.fr,
    bloques: [
      { h: "Titulaire du site", titular: true, p: ["Ce site a pour titulaire Antonio Llull Molina, exerçant sous le nom commercial Don Pepe Original. S'agissant d'un entrepreneur individuel et non d'une société, l'immatriculation au registre du commerce ne s'applique pas."] },
      { h: "Objet", p: ["Ce site est informatif : il publie la carte, les menus, les horaires et les coordonnées du restaurant, et permet de demander une table. Ce n'est pas une boutique : aucun produit n'est vendu et aucun paiement n'est encaissé via le site."] },
      { h: "Conditions d'utilisation", p: ["Naviguer sur ce site vous confère la qualité d'utilisateur et implique l'acceptation des présentes mentions. Vous vous engagez à utiliser le site conformément à la loi et à ne pas nuire à son fonctionnement.", "Le titulaire s'efforce de tenir les informations à jour, mais ne garantit ni une disponibilité sans interruption ni l'absence d'erreurs."] },
      { h: "Carte et prix", p: ["Les prix sont indiqués en euros, TVA comprise. La carte est vivante et peut varier selon le marché du jour ; ce qui porte la mention « S/M » est facturé au prix du marché.", "Les informations publiées sont indicatives et ne constituent pas une offre contractuelle : le prix et la disponibilité valables sont ceux de l'établissement au moment du service."] },
      { h: "Propriété intellectuelle", p: ["Les textes, les photographies et le design de ce site appartiennent à son titulaire ou sont utilisés avec autorisation. Leur reproduction ou leur usage commercial sans accord écrit ne sont pas permis."] },
      { h: "Liens vers des tiers", p: ["Le site renvoie à des services tiers — Google Maps pour l'itinéraire et WhatsApp pour les réservations — dont les contenus et les politiques échappent au titulaire."] },
      { h: "Droit applicable", p: ["Ce site est régi par le droit espagnol. Tout litige relèvera des juridictions compétentes selon les règles applicables."] },
    ],
  },
  it: {
    titulo: "Note legali",
    entradilla: "Dati identificativi del titolare di questo sito web, ai sensi dell'articolo 10 della legge spagnola 34/2002 sui servizi della società dell'informazione e sul commercio elettronico (LSSI-CE).",
    actualizado: FECHA.it,
    bloques: [
      { h: "Titolare del sito", titular: true, p: ["Il sito è di titolarità di Antonio Llull Molina, che opera con il nome commerciale Don Pepe Original. Trattandosi di un imprenditore individuale e non di una società, non ricorre l'iscrizione al Registro delle Imprese."] },
      { h: "Oggetto", p: ["Questo sito è informativo: pubblica il menù, i menù fissi, gli orari e i contatti del ristorante e consente di richiedere un tavolo. Non è un negozio: non si vendono prodotti né si incassano pagamenti tramite il sito."] },
      { h: "Condizioni d'uso", p: ["Navigare in questo sito le attribuisce la qualità di utente e comporta l'accettazione delle presenti note legali. Si impegna a usare il sito nel rispetto della legge e a non pregiudicarne il funzionamento.", "Il titolare cerca di mantenere aggiornate le informazioni, ma non garantisce né la disponibilità senza interruzioni né l'assenza di errori."] },
      { h: "Menù e prezzi", p: ["I prezzi sono espressi in euro, IVA inclusa. Il menù è vivo e può variare secondo il mercato del giorno; ciò che è indicato con «S/M» viene addebitato al prezzo di mercato.", "Le informazioni pubblicate sono indicative e non costituiscono un'offerta contrattuale: valgono il prezzo e la disponibilità del locale al momento del servizio."] },
      { h: "Proprietà intellettuale", p: ["I testi, le fotografie e il design di questo sito appartengono al titolare o sono usati con autorizzazione. Non è consentita la riproduzione né l'uso commerciale senza permesso scritto."] },
      { h: "Collegamenti a terzi", p: ["Il sito rimanda a servizi di terzi — Google Maps per la posizione e WhatsApp per le prenotazioni — i cui contenuti e politiche non dipendono dal titolare."] },
      { h: "Legge applicabile", p: ["Questo sito è regolato dalla legge spagnola. Per qualsiasi controversia saranno competenti i tribunali individuati secondo le norme applicabili."] },
    ],
  },
});

/* ═══════════════════════ POLÍTICA DE PRIVACIDAD ═══════════════════════ */

export const PRIVACIDAD: Record<Idioma, PaginaLegal> = conFallbackIngles({
  es: {
    titulo: "Política de privacidad",
    entradilla: "Cómo se tratan los datos que facilita al pedir una reserva, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).",
    actualizado: FECHA.es,
    bloques: [
      { h: "Responsable del tratamiento", titular: true, p: ["El responsable del tratamiento es Antonio Llull Molina, que opera bajo el nombre comercial Don Pepe Original. Para ejercer sus derechos puede escribir a donpepeoriginalpadron@gmail.com o dirigirse al domicilio indicado."] },
      { h: "Cómo funciona el formulario de reserva", p: ["Conviene explicarlo con precisión, porque no es lo habitual: esta web no guarda sus datos en ningún servidor. El formulario no envía nada por sí mismo. Lo que hace es redactar un mensaje con lo que usted ha escrito y abrir WhatsApp en su propio dispositivo, con ese mensaje ya preparado.", "Hasta que usted no pulsa «enviar» dentro de WhatsApp, no sale ningún dato de su teléfono. A partir de ahí el mensaje viaja por WhatsApp y llega al teléfono del restaurante, igual que si nos escribiera usted directamente.", "No existe base de datos de reservas, ni copia en la web, ni registro en el servidor."] },
      { h: "Qué datos se recogen y para qué", p: ["El mensaje incluye: nombre, teléfono, número de comensales, fecha, hora y, si la escribe, una nota (por ejemplo terraza o trona).", "La única finalidad es gestionar y confirmar su reserva. No se usan con fines publicitarios ni se ceden a terceros."] },
      { h: "Base jurídica", p: ["El tratamiento se apoya en su consentimiento, que presta al marcar la casilla del formulario y enviar el mensaje, y en la aplicación de medidas precontractuales a petición suya, que es la reserva."] },
      { h: "Cuánto tiempo se conservan", p: ["El mensaje permanece en la conversación de WhatsApp del restaurante hasta que se borra. Las conversaciones se eliminan cuando dejan de ser necesarias para la gestión de reservas."] },
      { h: "Destinatarios", p: ["El canal es WhatsApp, operado por Meta Platforms Ireland Ltd. Al usarlo, sus datos se tratan también conforme a las condiciones de WhatsApp. No se comunican datos a ningún otro tercero."] },
      { h: "Sus derechos", p: ["Puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a donpepeoriginalpadron@gmail.com o llamando al 881 82 97 28, indicando cuál desea ejercer.", "Para suprimir una reserva ya enviada basta con pedirlo por ese mismo WhatsApp: se borra la conversación.", "Si considera que sus datos no se han tratado correctamente, puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es)."] },
      { h: "Almacenamiento en su navegador y recursos externos", p: ["Esta web no usa cookies de analítica, de publicidad ni de seguimiento, y no emplea almacenamiento local del navegador.", "La única cookie que puede guardarse es «dp_idioma», y solo si usted elige un idioma a mano en el selector de la carta: guarda el código del idioma durante 30 días para no volver a preguntárselo. Es una cookie técnica de preferencia del usuario, exenta del consentimiento previo del artículo 22.2 de la LSSI-CE. Por eso esta web no muestra banner de cookies. Puede borrarla desde la configuración de su navegador.", "La web no carga nada desde dominios de terceros: las tipografías y las librerías de animación se sirven desde este mismo sitio. Al navegar por él, su dirección IP no se comunica a ninguna empresa ajena."] },
    ],
  },
  gl: {
    titulo: "Política de privacidade",
    entradilla: "Como se tratan os datos que facilita ao pedir unha reserva, conforme ao Regulamento (UE) 2016/679 (RXPD) e á Lei Orgánica 3/2018 (LOPDGDD).",
    actualizado: FECHA.gl,
    bloques: [
      { h: "Responsable do tratamento", titular: true, p: ["O responsable do tratamento é Antonio Llull Molina, que opera baixo o nome comercial Don Pepe Original. Para exercer os seus dereitos pode escribir a donpepeoriginalpadron@gmail.com ou dirixirse ao domicilio indicado."] },
      { h: "Como funciona o formulario de reserva", p: ["Convén explicalo con precisión, porque non é o habitual: esta web non garda os seus datos en ningún servidor. O formulario non envía nada por si mesmo. O que fai é redactar unha mensaxe co que vostede escribiu e abrir WhatsApp no seu propio dispositivo, con esa mensaxe xa preparada.", "Ata que vostede non preme «enviar» dentro de WhatsApp, non sae ningún dato do seu teléfono. A partir de aí a mensaxe viaxa por WhatsApp e chega ao teléfono do restaurante, igual que se nos escribise directamente.", "Non existe base de datos de reservas, nin copia na web, nin rexistro no servidor."] },
      { h: "Que datos se recollen e para que", p: ["A mensaxe inclúe: nome, teléfono, número de comensais, data, hora e, se a escribe, unha nota (por exemplo terraza ou trona).", "A única finalidade é xestionar e confirmar a súa reserva. Non se usan con fins publicitarios nin se ceden a terceiros."] },
      { h: "Base xurídica", p: ["O tratamento apóiase no seu consentimento, que presta ao marcar a caixa do formulario e enviar a mensaxe, e na aplicación de medidas precontractuais a petición súa, que é a reserva."] },
      { h: "Canto tempo se conservan", p: ["A mensaxe permanece na conversa de WhatsApp do restaurante ata que se borra. As conversas elimínanse cando deixan de ser necesarias para a xestión de reservas."] },
      { h: "Destinatarios", p: ["A canle é WhatsApp, operado por Meta Platforms Ireland Ltd. Ao usalo, os seus datos trátanse tamén conforme ás condicións de WhatsApp. Non se comunican datos a ningún outro terceiro."] },
      { h: "Os seus dereitos", p: ["Pode exercer os dereitos de acceso, rectificación, supresión, oposición, limitación do tratamento e portabilidade escribindo a donpepeoriginalpadron@gmail.com ou chamando ao 881 82 97 28, indicando cal desexa exercer.", "Para suprimir unha reserva xa enviada abonda con pedilo por ese mesmo WhatsApp: bórrase a conversa.", "Se considera que os seus datos non se trataron correctamente, pode reclamar ante a Axencia Española de Protección de Datos (www.aepd.es)."] },
      { h: "Almacenamento no seu navegador e recursos externos", p: ["Esta web non usa cookies de analítica, de publicidade nin de seguimento, e non emprega almacenamento local do navegador.", "A única cookie que se pode gardar é «dp_idioma», e só se vostede escolle un idioma a man no selector da carta: garda o código do idioma durante 30 días para non volver preguntarllo. É unha cookie técnica de preferencia do usuario, exenta do consentimento previo do artigo 22.2 da LSSI-CE. Por iso esta web non amosa banner de cookies. Pode borrala desde a configuración do seu navegador.", "A web non carga nada desde dominios de terceiros: as tipografías e as librarías de animación sérvense desde este mesmo sitio. Ao navegar por el, o seu enderezo IP non se comunica a ningunha empresa allea."] },
    ],
  },
  en: {
    titulo: "Privacy policy",
    entradilla: "How the data you provide when requesting a table is handled, under Regulation (EU) 2016/679 (GDPR) and Spanish Organic Law 3/2018 (LOPDGDD).",
    actualizado: FECHA.en,
    bloques: [
      { h: "Data controller", titular: true, p: ["The data controller is Antonio Llull Molina, trading under the name Don Pepe Original. To exercise your rights, write to donpepeoriginalpadron@gmail.com or to the address given above."] },
      { h: "How the booking form actually works", p: ["This is worth spelling out, because it is not the usual arrangement: this website does not store your data on any server. The form does not send anything by itself. What it does is compose a message from what you typed and open WhatsApp on your own device with that message ready.", "Until you press send inside WhatsApp, no data leaves your phone. From that point the message travels through WhatsApp and arrives on the restaurant's phone, exactly as if you had written to us yourself.", "There is no bookings database, no copy on the website and no record on the server."] },
      { h: "What is collected and why", p: ["The message contains: name, phone number, number of guests, date, time and, if you write one, a note (a terrace table or a high chair, for example).", "The sole purpose is to arrange and confirm your booking. It is not used for advertising and is not passed to third parties."] },
      { h: "Legal basis", p: ["Processing rests on your consent, given by ticking the box on the form and sending the message, and on steps taken at your request prior to entering into an agreement — the booking itself."] },
      { h: "How long it is kept", p: ["The message stays in the restaurant's WhatsApp conversation until it is deleted. Conversations are removed once they are no longer needed to manage bookings."] },
      { h: "Recipients", p: ["The channel is WhatsApp, operated by Meta Platforms Ireland Ltd. In using it, your data is also handled under WhatsApp's own terms. No data is passed to any other third party."] },
      { h: "Your rights", p: ["You may exercise your rights of access, rectification, erasure, objection, restriction of processing and portability by writing to donpepeoriginalpadron@gmail.com or calling +34 881 82 97 28, stating which right you wish to exercise.", "To erase a booking you have already sent, simply ask on that same WhatsApp thread and the conversation is deleted.", "If you believe your data has not been handled properly, you may complain to the Spanish Data Protection Agency (www.aepd.es)."] },
      { h: "Browser storage and external resources", p: ["This site uses no analytics, advertising or tracking cookies, and no browser local storage.", "The only cookie that may be stored is \"dp_idioma\", and only if you pick a language by hand in the menu's language selector: it keeps the language code for 30 days so you are not asked again. It is a technical user-preference cookie, exempt from prior consent under article 22.2 of the LSSI-CE. That is why this site shows no cookie banner. You can delete it from your browser settings.", "The site loads nothing from third-party domains: the typefaces and animation libraries are served from this site itself. Browsing it discloses your IP address to no outside company."] },
    ],
  },
  pt: {
    titulo: "Política de privacidade",
    entradilla: "Como são tratados os dados que fornece ao pedir uma reserva, ao abrigo do Regulamento (UE) 2016/679 (RGPD) e da Lei Orgânica espanhola 3/2018 (LOPDGDD).",
    actualizado: FECHA.pt,
    bloques: [
      { h: "Responsável pelo tratamento", titular: true, p: ["O responsável pelo tratamento é Antonio Llull Molina, que opera sob o nome comercial Don Pepe Original. Para exercer os seus direitos pode escrever para donpepeoriginalpadron@gmail.com ou dirigir-se à morada indicada."] },
      { h: "Como funciona o formulário de reserva", p: ["Convém explicá-lo com precisão, porque não é o habitual: este sítio não guarda os seus dados em nenhum servidor. O formulário não envia nada por si próprio. O que faz é redigir uma mensagem com o que escreveu e abrir o WhatsApp no seu próprio dispositivo, com essa mensagem já preparada.", "Até carregar em «enviar» dentro do WhatsApp, nenhum dado sai do seu telemóvel. A partir daí a mensagem viaja pelo WhatsApp e chega ao telemóvel do restaurante, tal como se nos escrevesse diretamente.", "Não existe base de dados de reservas, nem cópia no sítio, nem registo no servidor."] },
      { h: "Que dados se recolhem e para quê", p: ["A mensagem inclui: nome, telefone, número de pessoas, data, hora e, se a escrever, uma nota (por exemplo esplanada ou cadeira de bebé).", "A única finalidade é gerir e confirmar a sua reserva. Não são usados para publicidade nem cedidos a terceiros."] },
      { h: "Fundamento jurídico", p: ["O tratamento assenta no seu consentimento, prestado ao assinalar a caixa do formulário e enviar a mensagem, e em diligências pré-contratuais a seu pedido, que é a reserva."] },
      { h: "Durante quanto tempo se conservam", p: ["A mensagem permanece na conversa de WhatsApp do restaurante até ser apagada. As conversas são eliminadas quando deixam de ser necessárias para a gestão de reservas."] },
      { h: "Destinatários", p: ["O canal é o WhatsApp, operado pela Meta Platforms Ireland Ltd. Ao usá-lo, os seus dados são também tratados nos termos do WhatsApp. Não se comunicam dados a nenhum outro terceiro."] },
      { h: "Os seus direitos", p: ["Pode exercer os direitos de acesso, retificação, apagamento, oposição, limitação do tratamento e portabilidade escrevendo para donpepeoriginalpadron@gmail.com ou ligando para +34 881 82 97 28, indicando qual pretende exercer.", "Para apagar uma reserva já enviada basta pedi-lo nessa mesma conversa de WhatsApp: a conversa é eliminada.", "Se considerar que os seus dados não foram tratados corretamente, pode reclamar junto da Agência Espanhola de Proteção de Dados (www.aepd.es)."] },
      { h: "Armazenamento no seu navegador e recursos externos", p: ["Este sítio não usa cookies de análise, publicidade ou rastreio, nem armazenamento local do navegador.", "A única cookie que pode ser guardada é «dp_idioma», e apenas se escolher um idioma manualmente no seletor da carta: guarda o código do idioma durante 30 dias para não voltar a perguntar. É uma cookie técnica de preferência do utilizador, isenta do consentimento prévio do artigo 22.2 da LSSI-CE. Por isso este sítio não apresenta banner de cookies. Pode apagá-la nas definições do seu navegador.", "O sítio não carrega nada a partir de domínios de terceiros: as tipografias e as bibliotecas de animação são servidas a partir deste mesmo sítio. Ao navegar, o seu endereço IP não é comunicado a nenhuma empresa externa."] },
    ],
  },
  de: {
    titulo: "Datenschutzerklärung",
    entradilla: "Wie die Daten verarbeitet werden, die Sie bei einer Tischanfrage angeben — gemäß Verordnung (EU) 2016/679 (DSGVO) und dem spanischen Organgesetz 3/2018 (LOPDGDD).",
    actualizado: FECHA.de,
    bloques: [
      { h: "Verantwortlicher", titular: true, p: ["Verantwortlicher ist Antonio Llull Molina, tätig unter der Geschäftsbezeichnung Don Pepe Original. Zur Ausübung Ihrer Rechte schreiben Sie an donpepeoriginalpadron@gmail.com oder an die oben genannte Anschrift."] },
      { h: "Wie das Reservierungsformular tatsächlich funktioniert", p: ["Das gehört genau erklärt, denn es ist nicht der Regelfall: Diese Website speichert Ihre Daten auf keinem Server. Das Formular versendet von sich aus nichts. Es verfasst eine Nachricht aus Ihren Eingaben und öffnet WhatsApp auf Ihrem eigenen Gerät, mit dieser Nachricht bereits fertig.", "Solange Sie in WhatsApp nicht auf Senden tippen, verlässt kein Datum Ihr Telefon. Danach läuft die Nachricht über WhatsApp und landet auf dem Telefon des Restaurants — genau so, als hätten Sie uns selbst geschrieben.", "Es gibt keine Reservierungsdatenbank, keine Kopie auf der Website und keinen Eintrag auf dem Server."] },
      { h: "Welche Daten und wozu", p: ["Die Nachricht enthält: Name, Telefonnummer, Personenzahl, Datum, Uhrzeit und, sofern Sie eine schreiben, eine Anmerkung (etwa Terrasse oder Hochstuhl).", "Einziger Zweck ist die Bearbeitung und Bestätigung Ihrer Reservierung. Es erfolgt keine Werbenutzung und keine Weitergabe an Dritte."] },
      { h: "Rechtsgrundlage", p: ["Die Verarbeitung stützt sich auf Ihre Einwilligung, die Sie mit dem Ankreuzen des Kästchens und dem Absenden der Nachricht erteilen, sowie auf vorvertragliche Maßnahmen auf Ihre Anfrage hin — die Reservierung."] },
      { h: "Speicherdauer", p: ["Die Nachricht bleibt im WhatsApp-Verlauf des Restaurants, bis sie gelöscht wird. Verläufe werden entfernt, sobald sie für die Reservierungsverwaltung nicht mehr erforderlich sind."] },
      { h: "Empfänger", p: ["Der Kanal ist WhatsApp, betrieben von Meta Platforms Ireland Ltd. Bei der Nutzung werden Ihre Daten auch nach den Bedingungen von WhatsApp verarbeitet. An sonstige Dritte werden keine Daten weitergegeben."] },
      { h: "Ihre Rechte", p: ["Sie können Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung der Verarbeitung und Datenübertragbarkeit geltend machen — per E-Mail an donpepeoriginalpadron@gmail.com oder telefonisch unter +34 881 82 97 28, unter Angabe des gewünschten Rechts.", "Um eine bereits gesendete Reservierung zu löschen, genügt eine Bitte im selben WhatsApp-Verlauf: Der Verlauf wird gelöscht.", "Wenn Sie meinen, Ihre Daten seien nicht ordnungsgemäß verarbeitet worden, können Sie sich bei der spanischen Datenschutzbehörde beschweren (www.aepd.es)."] },
      { h: "Speicherung im Browser und externe Ressourcen", p: ["Diese Website verwendet keine Analyse-, Werbe- oder Tracking-Cookies und keinen lokalen Browser-Speicher.", "Das einzige Cookie, das gesetzt werden kann, ist „dp_idioma“, und nur wenn Sie im Sprachwähler der Speisekarte selbst eine Sprache wählen: Es merkt sich den Sprachcode 30 Tage lang, damit Sie nicht erneut gefragt werden. Es ist ein technisches Cookie zur Nutzerpräferenz und nach Artikel 22.2 LSSI-CE von der vorherigen Einwilligung befreit. Deshalb zeigt diese Website kein Cookie-Banner. Sie können es in den Browsereinstellungen löschen.", "Die Website lädt nichts von fremden Domains: Schriften und Animationsbibliotheken werden von dieser Seite selbst ausgeliefert. Beim Besuch wird Ihre IP-Adresse an kein fremdes Unternehmen übermittelt."] },
    ],
  },
  fr: {
    titulo: "Politique de confidentialité",
    entradilla: "Comment sont traitées les données que vous fournissez en demandant une table, au titre du règlement (UE) 2016/679 (RGPD) et de la loi organique espagnole 3/2018 (LOPDGDD).",
    actualizado: FECHA.fr,
    bloques: [
      { h: "Responsable du traitement", titular: true, p: ["Le responsable du traitement est Antonio Llull Molina, exerçant sous le nom commercial Don Pepe Original. Pour exercer vos droits, écrivez à donpepeoriginalpadron@gmail.com ou à l'adresse indiquée ci-dessus."] },
      { h: "Comment fonctionne réellement le formulaire de réservation", p: ["Cela mérite d'être précisé, car ce n'est pas l'usage courant : ce site ne conserve vos données sur aucun serveur. Le formulaire n'envoie rien de lui-même. Il rédige un message à partir de ce que vous avez saisi et ouvre WhatsApp sur votre propre appareil, ce message déjà prêt.", "Tant que vous n'appuyez pas sur envoyer dans WhatsApp, aucune donnée ne quitte votre téléphone. Ensuite le message transite par WhatsApp et arrive sur le téléphone du restaurant, exactement comme si vous nous écriviez vous-même.", "Il n'existe ni base de données de réservations, ni copie sur le site, ni enregistrement sur le serveur."] },
      { h: "Quelles données et pour quoi faire", p: ["Le message contient : nom, téléphone, nombre de convives, date, heure et, si vous en écrivez une, une note (terrasse ou chaise haute, par exemple).", "La seule finalité est de gérer et de confirmer votre réservation. Aucune utilisation publicitaire, aucune cession à des tiers."] },
      { h: "Base légale", p: ["Le traitement repose sur votre consentement, donné en cochant la case du formulaire et en envoyant le message, ainsi que sur des mesures précontractuelles prises à votre demande, à savoir la réservation."] },
      { h: "Durée de conservation", p: ["Le message reste dans la conversation WhatsApp du restaurant jusqu'à sa suppression. Les conversations sont effacées lorsqu'elles ne sont plus nécessaires à la gestion des réservations."] },
      { h: "Destinataires", p: ["Le canal est WhatsApp, exploité par Meta Platforms Ireland Ltd. En l'utilisant, vos données sont aussi traitées selon les conditions de WhatsApp. Aucune donnée n'est communiquée à un autre tiers."] },
      { h: "Vos droits", p: ["Vous pouvez exercer vos droits d'accès, de rectification, d'effacement, d'opposition, de limitation du traitement et de portabilité en écrivant à donpepeoriginalpadron@gmail.com ou en appelant le +34 881 82 97 28, en précisant le droit invoqué.", "Pour effacer une réservation déjà envoyée, il suffit de le demander dans cette même conversation WhatsApp : la conversation est supprimée.", "Si vous estimez que vos données n'ont pas été traitées correctement, vous pouvez saisir l'Agence espagnole de protection des données (www.aepd.es)."] },
      { h: "Stockage dans votre navigateur et ressources externes", p: ["Ce site n'utilise ni cookies de mesure d'audience, ni de publicité, ni de suivi, et n'emploie pas le stockage local du navigateur.", "Le seul cookie susceptible d'être enregistré est « dp_idioma », et uniquement si vous choisissez une langue à la main dans le sélecteur de la carte : il conserve le code de langue pendant 30 jours pour ne pas vous le redemander. C'est un cookie technique de préférence utilisateur, exempté du consentement préalable au titre de l'article 22.2 de la LSSI-CE. C'est pourquoi ce site n'affiche pas de bandeau cookies. Vous pouvez le supprimer depuis les réglages de votre navigateur.", "Le site ne charge rien depuis des domaines tiers : les polices et les bibliothèques d'animation sont servies depuis ce site même. En y naviguant, votre adresse IP n'est communiquée à aucune entreprise extérieure."] },
    ],
  },
  it: {
    titulo: "Informativa sulla privacy",
    entradilla: "Come vengono trattati i dati che fornisce prenotando un tavolo, ai sensi del Regolamento (UE) 2016/679 (GDPR) e della legge organica spagnola 3/2018 (LOPDGDD).",
    actualizado: FECHA.it,
    bloques: [
      { h: "Titolare del trattamento", titular: true, p: ["Il titolare del trattamento è Antonio Llull Molina, che opera con il nome commerciale Don Pepe Original. Per esercitare i suoi diritti può scrivere a donpepeoriginalpadron@gmail.com o all'indirizzo sopra indicato."] },
      { h: "Come funziona davvero il modulo di prenotazione", p: ["Vale la pena spiegarlo con precisione, perché non è la prassi: questo sito non conserva i suoi dati su alcun server. Il modulo non invia nulla da solo. Compone un messaggio con quanto ha scritto e apre WhatsApp sul suo dispositivo, con quel messaggio già pronto.", "Finché non preme invia dentro WhatsApp, nessun dato lascia il suo telefono. Da lì il messaggio viaggia su WhatsApp e arriva al telefono del ristorante, esattamente come se ci scrivesse lei stesso.", "Non esiste alcun archivio di prenotazioni, né copia sul sito, né registrazione sul server."] },
      { h: "Quali dati e a quale scopo", p: ["Il messaggio contiene: nome, telefono, numero di persone, data, ora e, se la scrive, una nota (per esempio dehors o seggiolone).", "L'unica finalità è gestire e confermare la sua prenotazione. Non vengono usati per pubblicità né ceduti a terzi."] },
      { h: "Base giuridica", p: ["Il trattamento si fonda sul suo consenso, prestato spuntando la casella del modulo e inviando il messaggio, e su misure precontrattuali adottate su sua richiesta, ossia la prenotazione."] },
      { h: "Per quanto tempo si conservano", p: ["Il messaggio resta nella conversazione WhatsApp del ristorante finché non viene cancellato. Le conversazioni si eliminano quando non servono più alla gestione delle prenotazioni."] },
      { h: "Destinatari", p: ["Il canale è WhatsApp, gestito da Meta Platforms Ireland Ltd. Usandolo, i suoi dati sono trattati anche secondo le condizioni di WhatsApp. Nessun dato viene comunicato ad altri terzi."] },
      { h: "I suoi diritti", p: ["Può esercitare i diritti di accesso, rettifica, cancellazione, opposizione, limitazione del trattamento e portabilità scrivendo a donpepeoriginalpadron@gmail.com o telefonando al +34 881 82 97 28, indicando quale intende esercitare.", "Per cancellare una prenotazione già inviata basta chiederlo nella stessa conversazione WhatsApp: la conversazione viene eliminata.", "Se ritiene che i suoi dati non siano stati trattati correttamente, può rivolgersi all'Agenzia spagnola per la protezione dei dati (www.aepd.es)."] },
      { h: "Archiviazione nel browser e risorse esterne", p: ["Questo sito non usa cookie di analisi, pubblicità o tracciamento, né l'archiviazione locale del browser.", "L'unico cookie che può essere salvato è «dp_idioma», e solo se sceglie a mano una lingua nel selettore del menù: conserva il codice della lingua per 30 giorni per non chiederglielo di nuovo. È un cookie tecnico di preferenza dell'utente, esente dal consenso preventivo previsto dall'articolo 22.2 della LSSI-CE. Per questo il sito non mostra alcun banner sui cookie. Può cancellarlo dalle impostazioni del browser.", "Il sito non carica nulla da domini di terzi: i caratteri tipografici e le librerie di animazione sono serviti da questo stesso sito. Navigandolo, il suo indirizzo IP non viene comunicato ad alcuna azienda esterna."] },
    ],
  },
});
