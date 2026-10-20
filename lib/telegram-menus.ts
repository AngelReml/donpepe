/**
 * Menús del día por botones, en el bot de Telegram.
 *
 * Por qué es un módulo aparte: lib/actions.ts (el esquema de acciones del
 * agente) es un fichero protegido y solo sabe activar/desactivar un menú y
 * cambiar su disponibilidad. Aquí NO se amplía ese esquema: los cambios de
 * menú se construyen, se confirman y se aplican en este fichero, leyendo y
 * escribiendo con las funciones públicas de lib/kv.ts y lib/agotados.ts.
 *
 * Reglas, las mismas que el resto del asistente:
 *  - Activar / desactivar un menú: un toque, sin confirmar, con "Deshacer".
 *  - Cambiar precio, quitar o poner un plato: siempre con confirmación.
 *  - Cada cambio se apunta en el registro con el menú anterior (`prev`), así
 *    que "deshacer" (texto libre) también revierte un cambio de menú.
 *  - Nada aquí toca alérgenos: los menús no tienen ese campo.
 *
 * Además resuelve la relación carta ↔ menú: los platos de un menú son texto
 * suelto, sin enlace con la carta. Al borrar o agotar un plato de la carta,
 * `menusQueLlevan` dice en qué menús aparece con el MISMO nombre (comparación
 * exacta, sin tildes ni mayúsculas: nunca por parecido, para no quitar un
 * plato que no es) y el asistente ofrece quitarlo también de ahí.
 */
import { kvGet, kvSet, kvDel, setMenu, appendLog } from "./kv";
import { menuConReactivacionAutomatica } from "./agotados";
import { parsePrecioEstricto } from "./precio";
import { sendMessage, editMessageText, type TecladoInline } from "./telegram";
import { CATEGORIAS, CATEGORIA_LABELS, type Menu, type MenuDelDia } from "./types";

/* ───────────────────────────── secciones ───────────────────────────── */

export type SeccionMenu = "primeros" | "segundos" | "platos";
const SECCIONES: SeccionMenu[] = ["primeros", "segundos", "platos"];
const COD_SECCION: Record<SeccionMenu, string> = { primeros: "1", segundos: "2", platos: "p" };
const DESDE_COD_SECCION: Record<string, SeccionMenu> = { "1": "primeros", "2": "segundos", p: "platos" };
const ETIQUETA_SECCION: Record<SeccionMenu, string> = {
  primeros: "Primeros",
  segundos: "Segundos",
  platos: "Platos",
};

/** Secciones que usa este menú (las que ya existen en el dato). */
function seccionesDe(m: MenuDelDia): SeccionMenu[] {
  const usadas = SECCIONES.filter((s) => Array.isArray(m[s]));
  // Un menú sin ninguna lista: se le ofrecen primeros y segundos.
  return usadas.length > 0 ? usadas : ["primeros", "segundos"];
}

/** Compara nombres sin tildes, mayúsculas ni espacios de más. */
export function normalizarNombre(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Menús que llevan un plato con exactamente ese nombre, y en qué sección. */
export function menusQueLlevan(
  menu: Menu,
  nombrePlato: string,
): Array<{ menuId: string; menuNombre: string; seccion: SeccionMenu }> {
  const objetivo = normalizarNombre(nombrePlato);
  const out: Array<{ menuId: string; menuNombre: string; seccion: SeccionMenu }> = [];
  for (const m of menu.menus) {
    for (const s of SECCIONES) {
      const lista = m[s];
      if (Array.isArray(lista) && lista.some((p) => normalizarNombre(p) === objetivo)) {
        out.push({ menuId: m.id, menuNombre: m.nombre, seccion: s });
      }
    }
  }
  return out;
}

/** Texto corto para avisar: "Menú 2 (segundos), Churrasco a Reventar". */
export function describirApariciones(ap: ReturnType<typeof menusQueLlevan>): string {
  return ap.map((a) => `${a.menuNombre} (${ETIQUETA_SECCION[a.seccion].toLowerCase()})`).join(", ");
}

/* ─────────────────────── estado y pendiente, en KV ─────────────────────── */

interface EstadoMenus {
  paso: "precio" | "anadir_texto";
  menuId: string;
  seccion?: SeccionMenu;
}

type CambioMenu =
  | { tipo: "precio"; menuId: string; precio: number }
  | { tipo: "quitar"; menuId: string; seccion: SeccionMenu; nombre: string }
  | { tipo: "anadir"; menuId: string; seccion: SeccionMenu; nombre: string }
  | { tipo: "quitar_de_todos"; nombre: string };

const claveEstado = (chatId: string) => `telegram:menus:estado:${chatId}`;
const clavePendiente = (chatId: string) => `telegram:menus:pendiente:${chatId}`;

async function getEstado(chatId: string) {
  return kvGet<EstadoMenus>(claveEstado(chatId));
}
async function setEstado(chatId: string, e: EstadoMenus) {
  await kvSet(claveEstado(chatId), e);
}
export async function limpiarEstadoMenus(chatId: string): Promise<void> {
  await kvDel(claveEstado(chatId));
}

/* ─────────────────────────── aplicar cambios ─────────────────────────── */

function precioTexto(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function resumen(c: CambioMenu, menu: Menu): string {
  const nombreMenu = (id: string) => menu.menus.find((m) => m.id === id)?.nombre ?? id;
  switch (c.tipo) {
    case "precio":
      return `Poner "${nombreMenu(c.menuId)}" a ${precioTexto(c.precio)}`;
    case "quitar":
      return `Quitar "${c.nombre}" de ${ETIQUETA_SECCION[c.seccion].toLowerCase()} del ${nombreMenu(c.menuId)}`;
    case "anadir":
      return `Añadir "${c.nombre}" a ${ETIQUETA_SECCION[c.seccion].toLowerCase()} del ${nombreMenu(c.menuId)}`;
    case "quitar_de_todos":
      return `Quitar "${c.nombre}" de todos los menús donde aparece`;
  }
}

/**
 * Aplica un cambio sobre el menú leído en ese momento. Devuelve el texto
 * para el dueño. Lee siempre el dato fresco: si entre pregunta y
 * confirmación algo ha cambiado (el plato ya no está, etc.), lo dice en vez
 * de escribir a ciegas.
 */
export async function aplicarCambio(chatId: string, c: CambioMenu): Promise<string> {
  const menu = await menuConReactivacionAutomatica();
  const prev: Menu = JSON.parse(JSON.stringify(menu));
  const texto = resumen(c, menu);

  if (c.tipo === "quitar_de_todos") {
    const objetivo = normalizarNombre(c.nombre);
    let quitados = 0;
    for (const m of menu.menus) {
      for (const s of SECCIONES) {
        const lista = m[s];
        if (!Array.isArray(lista)) continue;
        const filtrada = lista.filter((p) => normalizarNombre(p) !== objetivo);
        quitados += lista.length - filtrada.length;
        m[s] = filtrada;
      }
    }
    if (quitados === 0) return `"${c.nombre}" ya no aparece en ningún menú.`;
  } else {
    const m = menu.menus.find((x) => x.id === c.menuId);
    if (!m) return "Ese menú ya no existe. Escribe /plato para empezar de nuevo.";

    if (c.tipo === "precio") {
      m.precio = c.precio;
    } else if (c.tipo === "quitar") {
      const lista = m[c.seccion] ?? [];
      const idx = lista.findIndex((p) => p === c.nombre);
      if (idx === -1) return `"${c.nombre}" ya no está en ese menú.`;
      lista.splice(idx, 1);
      m[c.seccion] = lista;
    } else {
      const lista = m[c.seccion] ?? [];
      if (lista.some((p) => normalizarNombre(p) === normalizarNombre(c.nombre))) {
        return `"${c.nombre}" ya estaba en ${ETIQUETA_SECCION[c.seccion].toLowerCase()} del ${m.nombre}.`;
      }
      lista.push(c.nombre);
      m[c.seccion] = lista;
    }
  }

  await setMenu(menu);
  await appendLog({
    ts: new Date().toISOString(),
    from: `telegram:${chatId}`,
    kind: "menu",
    action: { action: "menu_del_dia", cambio: c },
    summary: `${texto} (Telegram, botones)`,
    prev,
  });
  return `✅ Hecho: ${texto}.\n\nSi te has equivocado, escribe "deshacer".`;
}

async function dejarPendiente(chatId: string, c: CambioMenu): Promise<string> {
  const menu = await menuConReactivacionAutomatica();
  await kvSet(clavePendiente(chatId), c);
  return `Voy a: ${resumen(c, menu)}.\n\n¿Confirmas?`;
}

/** Usado desde el asistente de la carta para ofrecer "quitar también de los menús". */
export async function prepararQuitarDeMenus(chatId: string, nombrePlato: string): Promise<void> {
  await kvSet(clavePendiente(chatId), { tipo: "quitar_de_todos", nombre: nombrePlato } satisfies CambioMenu);
}

const TECLADO_CONFIRMAR: TecladoInline = {
  inline_keyboard: [[
    { text: "✅ Confirmar", callback_data: "m:ok" },
    { text: "❌ Cancelar", callback_data: "m:no" },
  ]],
};

/* ─────────────────────────────── teclados ─────────────────────────────── */

function etiquetaMenu(m: MenuDelDia): string {
  return `${m.disabled ? "🚫 " : ""}${m.nombre} — ${precioTexto(m.precio)}`;
}

function tecladoLista(menu: Menu): TecladoInline {
  return {
    inline_keyboard: [
      ...menu.menus.map((m, i) => [{ text: etiquetaMenu(m), callback_data: `m:pick:${i}` }]),
      [{ text: "⬅️ Volver", callback_data: "m:back" }],
    ],
  };
}

function fichaMenu(m: MenuDelDia): string {
  const lineas = [`📋 ${m.nombre} — ${precioTexto(m.precio)}${m.disabled ? "  (🚫 desactivado, no sale en la web)" : ""}`];
  if (m.disponibilidad) lineas.push(m.disponibilidad);
  for (const s of seccionesDe(m)) {
    const lista = m[s] ?? [];
    lineas.push("", `${ETIQUETA_SECCION[s]}:`, ...(lista.length ? lista.map((p) => `· ${p}`) : ["(vacío)"]));
  }
  if (m.incluye) lineas.push("", `Incluye: ${m.incluye}`);
  return lineas.join("\n");
}

function tecladoFicha(i: number, m: MenuDelDia): TecladoInline {
  return {
    inline_keyboard: [
      [{ text: "💰 Cambiar precio", callback_data: `m:price:${i}` }],
      [{ text: "➕ Poner un plato", callback_data: `m:add:${i}` }],
      [{ text: "➖ Quitar un plato", callback_data: `m:del:${i}` }],
      [
        m.disabled
          ? { text: "✅ Activar el menú (un toque)", callback_data: `m:tog:${i}` }
          : { text: "🚫 Desactivar el menú (un toque)", callback_data: `m:tog:${i}` },
      ],
      [{ text: "⬅️ Volver a los menús", callback_data: "m:root" }],
    ],
  };
}

/* ─────────────────────────── entradas públicas ─────────────────────────── */

/**
 * Texto libre cuando este asistente espera un dato (precio o nombre de
 * plato). Devuelve true si lo ha consumido.
 */
export async function manejarTextoMenus(chatId: string, texto: string): Promise<boolean> {
  const estado = await getEstado(chatId);
  if (!estado) return false;

  if (/^\/?cancelar$/i.test(texto.trim())) {
    await limpiarEstadoMenus(chatId);
    await sendMessage(chatId, "Cancelado. No he tocado nada.");
    return true;
  }

  if (estado.paso === "precio") {
    const r = parsePrecioEstricto(texto);
    if (!r.ok) {
      await sendMessage(chatId, r.motivo!);
      return true;
    }
    await limpiarEstadoMenus(chatId);
    await sendMessage(chatId, await dejarPendiente(chatId, { tipo: "precio", menuId: estado.menuId, precio: r.valor! }), TECLADO_CONFIRMAR);
    return true;
  }

  // anadir_texto
  const nombre = texto.trim();
  if (!nombre || !estado.seccion) {
    await sendMessage(chatId, "Necesito el nombre del plato. Escríbelo, o escribe cancelar.");
    return true;
  }
  if (nombre.length > 80) {
    await sendMessage(chatId, "Ese nombre es muy largo para la carta. Escríbelo más corto.");
    return true;
  }
  await limpiarEstadoMenus(chatId);
  await sendMessage(
    chatId,
    await dejarPendiente(chatId, { tipo: "anadir", menuId: estado.menuId, seccion: estado.seccion, nombre }),
    TECLADO_CONFIRMAR,
  );
  return true;
}

/** Callbacks "m:…". Devuelve {consumido:true} si eran de este módulo. */
export async function manejarCallbackMenus(
  chatId: string,
  messageId: number | undefined,
  data: string,
  volverAlPrincipal: () => Promise<void>,
): Promise<{ consumido: boolean }> {
  if (!data.startsWith("m:")) return { consumido: false };

  const editar = (texto: string, teclado?: TecladoInline) =>
    messageId ? editMessageText(chatId, messageId, texto, teclado) : sendMessage(chatId, texto, teclado);
  const p = data.split(":");

  if (data === "m:back") {
    await limpiarEstadoMenus(chatId);
    await volverAlPrincipal();
    return { consumido: true };
  }

  if (data === "m:ok" || data === "m:no") {
    const pendiente = await kvGet<CambioMenu>(clavePendiente(chatId));
    await kvDel(clavePendiente(chatId));
    if (!pendiente) {
      await editar("Esto ya no está activo. Escribe /plato para empezar de nuevo.", { inline_keyboard: [] });
      return { consumido: true };
    }
    if (data === "m:no") {
      await editar("Cancelado. No he tocado nada.", { inline_keyboard: [] });
      return { consumido: true };
    }
    await editar(await aplicarCambio(chatId, pendiente), { inline_keyboard: [] });
    return { consumido: true };
  }

  const menu = await menuConReactivacionAutomatica();

  if (data === "m:root") {
    await limpiarEstadoMenus(chatId);
    if (menu.menus.length === 0) {
      await editar("No hay menús en la carta.");
      return { consumido: true };
    }
    await editar("¿Qué menú quieres cambiar?", tecladoLista(menu));
    return { consumido: true };
  }

  const i = Number(p[2]);
  const m = Number.isInteger(i) ? menu.menus[i] : undefined;
  if (!m) {
    await editar("Los menús han cambiado mientras elegías. Vuelve a intentarlo.", tecladoLista(menu));
    return { consumido: true };
  }

  switch (p[1]) {
    case "pick": {
      await limpiarEstadoMenus(chatId);
      await editar(fichaMenu(m), tecladoFicha(i, m));
      return { consumido: true };
    }
    case "tog": {
      // Un toque, como agotar un plato: sin confirmar, con deshacer.
      const prev: Menu = JSON.parse(JSON.stringify(menu));
      m.disabled = !m.disabled;
      await setMenu(menu);
      await appendLog({
        ts: new Date().toISOString(),
        from: `telegram:${chatId}`,
        kind: "menu",
        action: { action: "menu_del_dia", cambio: { tipo: m.disabled ? "desactivar" : "activar", menuId: m.id } },
        summary: `${m.disabled ? "Desactivado" : "Activado"} "${m.nombre}" (Telegram, botones)`,
        prev,
      });
      await editar(
        m.disabled ? `🚫 "${m.nombre}" desactivado: ya no sale en la web.` : `✅ "${m.nombre}" activado: vuelve a salir en la web.`,
        { inline_keyboard: [[{ text: "↩️ Deshacer", callback_data: `m:tog:${i}` }], [{ text: "⬅️ Volver al menú", callback_data: `m:pick:${i}` }]] },
      );
      return { consumido: true };
    }
    case "price": {
      await setEstado(chatId, { paso: "precio", menuId: m.id });
      await editar(`Precio nuevo para "${m.nombre}" (ahora: ${precioTexto(m.precio)}). Escríbelo (ej: 16 o 16,50).`);
      return { consumido: true };
    }
    case "del": {
      // m:del:i → elegir plato; m:del:i:s:j → confirmar ese plato
      const s = DESDE_COD_SECCION[p[3] ?? ""];
      const j = Number(p[4]);
      if (s && Number.isInteger(j)) {
        const nombre = (m[s] ?? [])[j];
        if (!nombre) {
          await editar("El menú ha cambiado mientras elegías. Vuelve a intentarlo.", tecladoFicha(i, m));
          return { consumido: true };
        }
        await editar(await dejarPendiente(chatId, { tipo: "quitar", menuId: m.id, seccion: s, nombre }), TECLADO_CONFIRMAR);
        return { consumido: true };
      }
      const filas = seccionesDe(m).flatMap((sec) =>
        (m[sec] ?? []).map((nombre, idx) => [
          { text: `${ETIQUETA_SECCION[sec]}: ${nombre}`, callback_data: `m:del:${i}:${COD_SECCION[sec]}:${idx}` },
        ]),
      );
      if (filas.length === 0) {
        await editar(`"${m.nombre}" no tiene platos que quitar.`, tecladoFicha(i, m));
        return { consumido: true };
      }
      await editar(`¿Qué plato quitas del ${m.nombre}?`, {
        inline_keyboard: [...filas, [{ text: "⬅️ Volver", callback_data: `m:pick:${i}` }]],
      });
      return { consumido: true };
    }
    case "add": {
      // m:add:i → elegir sección; m:add:i:s → elegir de dónde sale el plato;
      // m:add:i:s:c → platos de esa categoría de la carta; m:add:i:s:c:k → confirmar
      const s = DESDE_COD_SECCION[p[3] ?? ""];
      if (!s) {
        const secs = seccionesDe(m);
        if (secs.length === 1) {
          // Un menú de una sola lista (p. ej. el churrasco): directo a elegir plato.
          return manejarCallbackMenus(chatId, messageId, `m:add:${i}:${COD_SECCION[secs[0]]}`, volverAlPrincipal);
        }
        await editar(`¿Dónde va el plato nuevo del ${m.nombre}?`, {
          inline_keyboard: [
            ...secs.map((sec) => [{ text: ETIQUETA_SECCION[sec], callback_data: `m:add:${i}:${COD_SECCION[sec]}` }]),
            [{ text: "⬅️ Volver", callback_data: `m:pick:${i}` }],
          ],
        });
        return { consumido: true };
      }
      const catCod = p[4];
      if (catCod === undefined) {
        await editar(`${ETIQUETA_SECCION[s]} del ${m.nombre}: elige un plato de la carta o escríbelo tú.`, {
          inline_keyboard: [
            ...CATEGORIAS.map((c, ci) => [{ text: `De la carta: ${CATEGORIA_LABELS[c]}`, callback_data: `m:add:${i}:${p[3]}:${ci}` }]),
            [{ text: "✏️ Escribirlo yo", callback_data: `m:add:${i}:${p[3]}:w` }],
            [{ text: "⬅️ Volver", callback_data: `m:pick:${i}` }],
          ],
        });
        return { consumido: true };
      }
      if (catCod === "w") {
        await setEstado(chatId, { paso: "anadir_texto", menuId: m.id, seccion: s });
        await editar(`Escribe el nombre del plato para ${ETIQUETA_SECCION[s].toLowerCase()} del ${m.nombre}.`);
        return { consumido: true };
      }
      const cat = CATEGORIAS[Number(catCod)];
      if (!cat) return { consumido: true };
      const platos = menu[cat];
      const k = Number(p[5]);
      if (Number.isInteger(k)) {
        const plato = platos[k];
        if (!plato) {
          await editar("La carta ha cambiado mientras elegías. Vuelve a intentarlo.", tecladoFicha(i, m));
          return { consumido: true };
        }
        await editar(
          await dejarPendiente(chatId, { tipo: "anadir", menuId: m.id, seccion: s, nombre: plato.nombre }),
          TECLADO_CONFIRMAR,
        );
        return { consumido: true };
      }
      if (platos.length === 0) {
        await editar(`No hay platos en ${CATEGORIA_LABELS[cat]}.`, tecladoFicha(i, m));
        return { consumido: true };
      }
      await editar(`${CATEGORIA_LABELS[cat]} — ¿cuál pones en ${ETIQUETA_SECCION[s].toLowerCase()}?`, {
        inline_keyboard: [
          ...platos.map((pl, k2) => [{ text: pl.nombre, callback_data: `m:add:${i}:${p[3]}:${catCod}:${k2}` }]),
          [{ text: "⬅️ Volver", callback_data: `m:add:${i}:${p[3]}` }],
        ],
      });
      return { consumido: true };
    }
  }

  return { consumido: true };
}
