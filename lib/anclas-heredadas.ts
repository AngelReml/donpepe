/**
 * Anclas (#fragmento) de versiones anteriores de la web, cuando la home era
 * una sola página larga y "la carta" era una sección suya (`#carta`) en vez
 * de una ruta propia.
 *
 * Por qué existe esto: hay carteles con QR ya impresos y plastificados en
 * las mesas del local que codifican `https://donpepeoriginal.es/#carta`. Un
 * fragmento nunca se envía al servidor —el navegador se lo queda para sí—,
 * así que ningún middleware ni redirect del lado del servidor puede verlo ni
 * arreglarlo. La única forma de interceptarlo es en el cliente, leyendo
 * `location.hash` después de cargar. Ver el script `beforeInteractive` en
 * `app/layout.tsx`, que usa este mapa.
 *
 * Se obtuvo revisando TODO el historial de git de app/page.tsx,
 * components/Hero.tsx, components/SiteSections.tsx y public/inicio.html
 * (ningún fichero se ha borrado nunca en este repo, así que ese historial es
 * completo): los únicos anclas que alguna vez tuvieron un enlace real son
 * #carta, #historia, #contacto, #horarios y #top. El resto de claves de aquí
 * abajo (menu, menús, reservas, horario, local) son variantes razonables que
 * pudo llevar una tanda de carteles anterior a este repositorio, de la que no
 * queda rastro en git: añadirlas no cuesta nada y cubre ese hueco.
 *
 * IMPORTANTE: no borres ni vacíes este mapa mientras existan carteles físicos
 * en circulación con estas anclas. Ver README, sección "QR para las mesas".
 * Si aparece una tanda de carteles nueva con un ancla que no esté aquí,
 * añádela: es la única acción necesaria para soportarla.
 */
export const ANCLAS_HEREDADAS: Record<string, string> = {
  // La carta. Es la que de verdad está en circulación, confirmada en un
  // móvil real a partir de un cartel plastificado ya repartido.
  carta: "/carta",
  menu: "/carta",
  menus: "/carta",
  "menú": "/carta",
  reservas: "/carta",

  // Secciones que siguen viviendo, sin cambios, en el escaparate (/local):
  // el ancla sigue apuntando al mismo sitio de siempre, solo que ahora ese
  // sitio no es la home sino /local.
  historia: "/local#historia",
  horario: "/local#horarios",
  horarios: "/local#horarios",
  contacto: "/local#contacto",
  local: "/local",

  // El logo/"volver arriba" de la one-page antigua. La home de hoy es la
  // carta, así que es donde debe caer.
  top: "/carta",
};
