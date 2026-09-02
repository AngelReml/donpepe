/**
 * El asistente de botones de Telegram.
 *
 * Dos familias de gesto, con reglas distintas a propósito:
 *
 * 1. Agotar / reactivar (interruptor de un toque, /agotado): gesto de bar
 *    lleno, varias veces al día. NO pide confirmación -se aplica al
 *    instante y el aviso trae un botón de deshacer-. Escribe directamente
 *    con setMenu (lib/agotados.ts), sin pasar por handleOwnerMessage.
 *
 * 2. Alta de plato, cambio de precio, borrado definitivo: gestos raros,
 *    con más que perder si se hacen sin querer. SIGUEN exigiendo
 *    confirmación previa, sin excepción. Construyen el Action a mano, con
 *    los mismos tipos que ya usa el LLM de WhatsApp, y lo dejan pendiente
 *    con las funciones YA EXISTENTES de lib/actions.ts y lib/pending.ts -no
 *    se reescribe nada de eso, se importa tal cual-. La confirmación
 *    (botones "Confirmar"/"Cancelar") la resuelve
 *    app/api/telegram/webhook/route.ts llamando a
 *    lib/orchestrator.ts:handleOwnerMessage con "sí"/"no", exactamente la
 *    misma función que usa WhatsApp.
 *
 * Para estas últimas, nunca se llama a applyAction ni a setMenu
 * directamente: solo se deja la acción pendiente. Quien la aplica de
 * verdad es siempre handleOwnerMessage.
 */
import { kvGet, kvSet, kvDel } from "./kv";
import { ActionSchema, describeAction, type Action } from "./actions";
import { setPending } from "./pending";
import { CATEGORIAS, CATEGORIA_LABELS, type CategoriaMenu, type PlatoBase } from "./types";
import { parsePrecioEstricto } from "./precio";
import { sendMessage, editMessageText, type TecladoInline } from "./telegram";
import {
  menuConReactivacionAutomatica,
  alternarDisponibilidad,
  marcarCaducidad,
  DURACIONES,
  type ClaveDuracion,
} from "./agotados";

const CODIGO: Record<CategoriaMenu, string> = { entrantes: "e", arroces: "a", pescados: "p", carnes: "c" };
const DESDE_CODIGO: Record<string, CategoriaMenu> = Object.fromEntries(
  CATEGORIAS.map((c) => [CODIGO[c], c]),
) as Record<string, CategoriaMenu>;

function formatearFechaMadrid(ms: number): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

/* ─────────────────── estado del asistente, en KV ─────────────────── */
/* (solo para alta de plato / cambio de precio: los únicos pasos que piden
   texto libre. Agotar/reactivar no usan estado: son un solo toque.) */

interface EstadoAsistente {
  paso: "alta_nombre" | "alta_precio" | "alta_nota" | "cambiar_precio";
  categoria: CategoriaMenu;
  nombre?: string;
  precio?: number;
  id?: string; // solo para "cambiar_precio"
}

const PREFIJO_ESTADO = "telegram:wizard";
const clave = (chatId: string) => `${PREFIJO_ESTADO}:${chatId}`;

async function getEstado(chatId: string): Promise<EstadoAsistente | null> {
  return kvGet<EstadoAsistente>(clave(chatId));
}
async function setEstado(chatId: string, estado: EstadoAsistente): Promise<void> {
  await kvSet(clave(chatId), estado);
}
async function limpiarEstado(chatId: string): Promise<void> {
  await kvDel(clave(chatId));
}

/* ─────────────────────────── teclados ─────────────────────────── */

export function tecladoConfirmar(): TecladoInline {
  return {
    inline_keyboard: [[
      { text: "✅ Confirmar", callback_data: "conf:yes" },
      { text: "❌ Cancelar", callback_data: "conf:no" },
    ]],
  };
}

function tecladoRaiz(): TecladoInline {
  return {
    inline_keyboard: [
      [{ text: "🔀 Agotar / reactivar (rápido)", callback_data: "w:agotados" }],
      [{ text: "➕ Añadir plato nuevo", callback_data: "w:new:root" }],
      [{ text: "🍽 Gestionar precio o borrar un plato", callback_data: "w:manage:root" }],
    ],
  };
}

function tecladoCategorias(prefijo: "w:new" | "w:manage"): TecladoInline {
  return {
    inline_keyboard: CATEGORIAS.map((c) => [
      { text: CATEGORIA_LABELS[c], callback_data: `${prefijo}:${CODIGO[c]}` },
    ]),
  };
}

function etiquetaPlato(p: PlatoBase): string {
  const precio = typeof p.precio === "number" ? `${p.precio.toFixed(2)} €` : (p.precio_texto ?? "—");
  return `${p.disabled ? "🚫 " : ""}${p.nombre} — ${precio}`;
}

function tecladoPlatos(cat: CategoriaMenu, platos: PlatoBase[]): TecladoInline {
  const cod = CODIGO[cat];
  return {
    inline_keyboard: [
      ...platos.map((p, idx) => [{ text: etiquetaPlato(p), callback_data: `w:pick:${cod}:${idx}` }]),
      [{ text: "⬅️ Volver", callback_data: "w:manage:root" }],
    ],
  };
}

function tecladoAcciones(cat: CategoriaMenu, idx: number, plato: PlatoBase): TecladoInline {
  const cod = CODIGO[cat];
  return {
    inline_keyboard: [
      [
        plato.disabled
          ? { text: "✅ Reactivar (un toque)", callback_data: `w:toggle:${cod}:${idx}` }
          : { text: "🚫 Agotar (un toque)", callback_data: `w:toggle:${cod}:${idx}` },
      ],
      [{ text: "💰 Cambiar precio", callback_data: `w:act:price:${cod}:${idx}` }],
      [{ text: "🗑 Eliminar definitivamente", callback_data: `w:act:remove:${cod}:${idx}` }],
      [{ text: "⬅️ Volver a la lista", callback_data: `w:manage:${cod}` }],
    ],
  };
}

function tecladoNota(): TecladoInline {
  return { inline_keyboard: [[{ text: "Sin nota", callback_data: "w:skip_nota" }]] };
}

/** Tras agotar: caducidad opcional (nunca obligatoria) + deshacer. */
function tecladoTrasAgotar(cat: CategoriaMenu, idx: number): TecladoInline {
  const cod = CODIGO[cat];
  return {
    inline_keyboard: [
      [{ text: DURACIONES.manana.etiqueta, callback_data: `w:cad:${cod}:${idx}:manana` }],
      [{ text: DURACIONES["2h"].etiqueta, callback_data: `w:cad:${cod}:${idx}:2h` }],
      [{ text: "↩️ Deshacer", callback_data: `w:toggle:${cod}:${idx}` }],
    ],
  };
}
function tecladoDeshacer(cat: CategoriaMenu, idx: number): TecladoInline {
  const cod = CODIGO[cat];
  return { inline_keyboard: [[{ text: "↩️ Deshacer", callback_data: `w:toggle:${cod}:${idx}` }]] };
}

/* ──────────────────────── entradas del webhook ──────────────────────── */

export async function mostrarMenuPrincipal(chatId: string): Promise<void> {
  await limpiarEstado(chatId);
  await sendMessage(chatId, "¿Qué quieres hacer con la carta?", tecladoRaiz());
}

/**
 * /agotado: TODOS los platos en una sola pantalla, sin navegar por
 * categoría, agotados arriba del todo -es la pantalla que se usa con prisa
 * y el bar lleno-. Cada botón alterna ese plato al tocarlo.
 */
export async function mostrarPantallaAgotados(chatId: string): Promise<void> {
  await limpiarEstado(chatId);
  const menu = await menuConReactivacionAutomatica();
  const todos: Array<{ cat: CategoriaMenu; idx: number; plato: PlatoBase }> = [];
  for (const cat of CATEGORIAS) {
    menu[cat].forEach((plato, idx) => todos.push({ cat, idx, plato }));
  }
  if (todos.length === 0) {
    await sendMessage(chatId, "No hay platos en la carta todavía.");
    return;
  }
  // Agotados primero; Array.prototype.sort es estable (ES2019+), así que
  // dentro de cada grupo se conserva el orden de categoría/carta.
  todos.sort((a, b) => Number(Boolean(b.plato.disabled)) - Number(Boolean(a.plato.disabled)));
  const filas = todos.map(({ cat, idx, plato }) => [
    { text: `${plato.disabled ? "🚫" : "✅"} ${plato.nombre}`, callback_data: `w:toggle:${CODIGO[cat]}:${idx}` },
  ]);
  await sendMessage(chatId, "Toca un plato para agotarlo o devolverlo a la carta:", { inline_keyboard: filas });
}

/**
 * Un mensaje de texto normal, cuando el asistente está esperando un dato
 * concreto (nombre, precio, nota). Devuelve true si lo ha consumido -en ese
 * caso el webhook NO debe pasárselo también al intérprete de lenguaje libre-.
 */
export async function manejarTextoAsistente(chatId: string, texto: string): Promise<boolean> {
  const estado = await getEstado(chatId);
  if (!estado) return false;

  if (/^\/?cancelar$/i.test(texto.trim())) {
    await limpiarEstado(chatId);
    await sendMessage(chatId, "Cancelado. No he tocado nada.");
    return true;
  }

  switch (estado.paso) {
    case "alta_nombre": {
      const nombre = texto.trim();
      if (!nombre) {
        await sendMessage(chatId, "Necesito un nombre para el plato. ¿Cómo se llama?");
        return true;
      }
      await setEstado(chatId, { ...estado, paso: "alta_precio", nombre });
      await sendMessage(chatId, `Nombre: "${nombre}". ¿Precio? (ej: 12,50)`);
      return true;
    }
    case "alta_precio": {
      const r = parsePrecioEstricto(texto);
      if (!r.ok) {
        await sendMessage(chatId, r.motivo!);
        return true; // se queda en el mismo paso, vuelve a preguntar
      }
      await setEstado(chatId, { ...estado, paso: "alta_nota", precio: r.valor });
      await sendMessage(chatId, "¿Alguna nota para la carta? Escríbela, o pulsa \"Sin nota\".", tecladoNota());
      return true;
    }
    case "alta_nota": {
      await finalizarAlta(chatId, estado, texto.trim() || undefined);
      return true;
    }
    case "cambiar_precio": {
      const r = parsePrecioEstricto(texto);
      if (!r.ok) {
        await sendMessage(chatId, r.motivo!);
        return true;
      }
      await finalizarCambioPrecio(chatId, estado, r.valor!);
      return true;
    }
  }
}

async function finalizarAlta(chatId: string, estado: EstadoAsistente, nota: string | undefined): Promise<void> {
  const action: Action = ActionSchema.parse({
    action: "add_item",
    category: estado.categoria,
    nombre: estado.nombre,
    precio: estado.precio,
    ...(nota ? { nota } : {}),
  });
  // El estado del asistente se limpia ANTES de intentar avisar por Telegram:
  // el paso del asistente ya ha terminado (la acción ya está construida y
  // validada) en cuanto llegamos aquí, así que un fallo de red al mandar el
  // aviso de confirmación no puede dejar al dueño "atascado" en un paso que
  // ya no existe.
  await limpiarEstado(chatId);
  await dejarPendienteYPreguntar(chatId, action);
}

async function finalizarCambioPrecio(chatId: string, estado: EstadoAsistente, nuevoPrecio: number): Promise<void> {
  const action: Action = ActionSchema.parse({
    action: "update_price",
    category: estado.categoria,
    id: estado.id,
    new_price: nuevoPrecio,
  });
  await limpiarEstado(chatId);
  await dejarPendienteYPreguntar(chatId, action);
}

async function dejarPendienteYPreguntar(chatId: string, action: Action): Promise<void> {
  const menu = await menuConReactivacionAutomatica();
  const summary = describeAction(action, menu);
  await setPending(chatId, { action, summary, context: "menu" });
  await sendMessage(chatId, `Voy a: ${summary}\n\n¿Confirmas?`, tecladoConfirmar());
}

/** Devuelve {consumido:true} si el callback_data era de este asistente ("w:..."). */
export async function manejarCallback(
  chatId: string,
  messageId: number | undefined,
  data: string,
): Promise<{ consumido: boolean }> {
  if (!data.startsWith("w:")) return { consumido: false };

  const editar = (texto: string, teclado?: TecladoInline) =>
    messageId ? editMessageText(chatId, messageId, texto, teclado) : sendMessage(chatId, texto, teclado);

  if (data === "w:agotados") {
    await mostrarPantallaAgotados(chatId);
    return { consumido: true };
  }
  if (data === "w:new:root") {
    await limpiarEstado(chatId);
    await editar("¿En qué categoría va el plato nuevo?", tecladoCategorias("w:new"));
    return { consumido: true };
  }
  if (data === "w:manage:root") {
    await limpiarEstado(chatId);
    await editar("¿Qué categoría quieres gestionar?", tecladoCategorias("w:manage"));
    return { consumido: true };
  }
  if (data === "w:cancel") {
    await limpiarEstado(chatId);
    await editar("Cancelado. No he tocado nada.");
    return { consumido: true };
  }
  if (data === "w:skip_nota") {
    const estado = await getEstado(chatId);
    if (!estado || estado.paso !== "alta_nota") {
      await editar("Esto ya no está activo. Escribe /plato para empezar de nuevo.");
      return { consumido: true };
    }
    await finalizarAlta(chatId, estado, undefined);
    return { consumido: true };
  }

  const partes = data.split(":"); // ["w","agotados"|"new"|"manage"|"pick"|"toggle"|"cad"|"act", ...]

  // Interruptor de un toque: sin confirmación, se aplica ya. Sirve tanto
  // para "primer toque" (agota o reactiva) como para "Deshacer" (vuelve a
  // invertir), y es el mismo botón desde /agotado y desde la ficha de un
  // plato -un único camino, un único mental model-.
  if (partes[1] === "toggle" && partes[2] && partes[3] !== undefined) {
    const cat = DESDE_CODIGO[partes[2]];
    const idx = Number(partes[3]);
    if (!cat || !Number.isInteger(idx)) return { consumido: true };
    const menu = await menuConReactivacionAutomatica();
    const platoRef = menu[cat][idx];
    if (!platoRef) {
      await editar("La carta ha cambiado. Escribe /agotado para volver a intentarlo.");
      return { consumido: true };
    }
    const resultado = await alternarDisponibilidad(chatId, cat, platoRef.id);
    if (!resultado) {
      await editar("Ese plato ya no existe.");
      return { consumido: true };
    }
    if (resultado.ahoraDisabled) {
      await editar(
        `🚫 "${resultado.nombre}" agotado. No vuelve a la carta hasta que lo reactives, salvo que le pongas un plazo:`,
        tecladoTrasAgotar(cat, idx),
      );
    } else {
      await editar(`✅ "${resultado.nombre}" de vuelta en la carta.`, tecladoDeshacer(cat, idx));
    }
    return { consumido: true };
  }

  // Caducidad opcional, ofrecida DESPUÉS de agotar (nunca antes, nunca obligatoria).
  if (partes[1] === "cad" && partes[2] && partes[3] !== undefined && partes[4]) {
    const cat = DESDE_CODIGO[partes[2]];
    const idx = Number(partes[3]);
    const claveDuracion = partes[4] as ClaveDuracion;
    if (!cat || !Number.isInteger(idx) || !(claveDuracion in DURACIONES)) return { consumido: true };
    const menu = await menuConReactivacionAutomatica();
    const plato = menu[cat][idx];
    if (!plato) {
      await editar("La carta ha cambiado. Escribe /agotado para volver a intentarlo.");
      return { consumido: true };
    }
    if (!plato.disabled) {
      await editar(`"${plato.nombre}" ya está activo: no hace falta ponerle plazo.`, tecladoDeshacer(cat, idx));
      return { consumido: true };
    }
    const duracion = DURACIONES[claveDuracion];
    const hasta = Date.now() + duracion.ms;
    await marcarCaducidad(cat, plato.id, hasta);
    await editar(
      `🚫 "${plato.nombre}" agotado. ${duracion.frase} (${formatearFechaMadrid(hasta)}).`,
      tecladoDeshacer(cat, idx),
    );
    return { consumido: true };
  }

  if (partes[1] === "new" && partes[2]) {
    const cat = DESDE_CODIGO[partes[2]];
    if (!cat) return { consumido: true };
    await setEstado(chatId, { paso: "alta_nombre", categoria: cat });
    await editar(`Categoría: ${CATEGORIA_LABELS[cat]}. ¿Cómo se llama el plato nuevo? Escríbelo.`);
    return { consumido: true };
  }
  if (partes[1] === "manage" && partes[2]) {
    const cat = DESDE_CODIGO[partes[2]];
    if (!cat) return { consumido: true };
    const menu = await menuConReactivacionAutomatica();
    const platos = menu[cat];
    if (platos.length === 0) {
      await editar(`No hay platos en ${CATEGORIA_LABELS[cat]}.`, tecladoCategorias("w:manage"));
      return { consumido: true };
    }
    await editar(`${CATEGORIA_LABELS[cat]} — elige un plato:`, tecladoPlatos(cat, platos));
    return { consumido: true };
  }
  if (partes[1] === "pick" && partes[2] && partes[3] !== undefined) {
    const cat = DESDE_CODIGO[partes[2]];
    const idx = Number(partes[3]);
    if (!cat || !Number.isInteger(idx)) return { consumido: true };
    const menu = await menuConReactivacionAutomatica();
    const plato = menu[cat][idx];
    if (!plato) {
      await editar("La carta ha cambiado mientras elegías. Vuelve a intentarlo.", tecladoCategorias("w:manage"));
      return { consumido: true };
    }
    await editar(`"${plato.nombre}" — ${etiquetaPlato(plato).replace(/^🚫 /, "")}`, tecladoAcciones(cat, idx, plato));
    return { consumido: true };
  }
  if (partes[1] === "act" && partes[2] && partes[3] && partes[4] !== undefined) {
    const tipo = partes[2]; // remove | price (enable/disable ahora son "toggle", ver arriba)
    const cat = DESDE_CODIGO[partes[3]];
    const idx = Number(partes[4]);
    if (!cat || !Number.isInteger(idx)) return { consumido: true };
    const menu = await menuConReactivacionAutomatica();
    const plato = menu[cat][idx];
    if (!plato) {
      await editar("La carta ha cambiado mientras elegías. Vuelve a intentarlo.", tecladoCategorias("w:manage"));
      return { consumido: true };
    }
    if (tipo === "price") {
      await setEstado(chatId, { paso: "cambiar_precio", categoria: cat, id: plato.id });
      const actual = typeof plato.precio === "number" ? `${plato.precio.toFixed(2)} €` : (plato.precio_texto ?? "—");
      await editar(`Precio nuevo para "${plato.nombre}" (ahora: ${actual}). Escríbelo (ej: 12,50).`);
      return { consumido: true };
    }
    if (tipo !== "remove") return { consumido: true };
    const action = ActionSchema.parse({ action: "remove_item", category: cat, id: plato.id });
    const summary = describeAction(action, menu);
    await setPending(chatId, { action, summary, context: "menu" });
    await editar(`Voy a: ${summary}\n\n¿Confirmas?`, tecladoConfirmar());
    return { consumido: true };
  }

  return { consumido: true }; // empezaba por "w:" pero no reconocido: lo damos por gestionado, no lo pasamos al LLM
}
