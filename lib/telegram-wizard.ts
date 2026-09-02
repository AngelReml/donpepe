/**
 * El asistente de botones de Telegram: categoría -> plato -> acción -> (precio
 * si toca) -> confirmar. "El dueño toca, no teclea", salvo en los dos campos
 * que no pueden ser un botón porque no existen todavía (nombre y precio de un
 * plato nuevo, o el precio nuevo de uno existente).
 *
 * Construye el Action a mano, con los mismos tipos que ya usa el LLM de
 * WhatsApp, y lo deja pendiente con las funciones YA EXISTENTES de
 * lib/actions.ts y lib/pending.ts -no se reescribe nada de eso, se importa
 * tal cual-. La confirmación (botones "Confirmar"/"Cancelar") la resuelve el
 * propio app/api/telegram/webhook/route.ts llamando a
 * lib/orchestrator.ts:handleOwnerMessage con "sí"/"no", exactamente la misma
 * función que usa WhatsApp.
 *
 * Nunca llama a applyAction ni a setMenu directamente: solo deja acciones
 * pendientes. Quien las aplica de verdad es siempre handleOwnerMessage.
 *
 * "Agotar" pide antes cuánto tiempo (2h / mañana / indefinido, ver
 * lib/agotados.ts): el disable_item que se deja pendiente es el de siempre,
 * sin cambios; la duración se guarda aparte y app/api/telegram/webhook/
 * route.ts la convierte en una caducidad real solo si el dueño confirma.
 */
import { kvGet, kvSet, kvDel } from "./kv";
import { ActionSchema, describeAction, type Action } from "./actions";
import { setPending } from "./pending";
import { CATEGORIAS, CATEGORIA_LABELS, type CategoriaMenu, type PlatoBase } from "./types";
import { parsePrecioEstricto } from "./precio";
import { sendMessage, editMessageText, type TecladoInline } from "./telegram";
import { menuConReactivacionAutomatica, fijarDuracionPendiente, DURACIONES, type ClaveDuracion } from "./agotados";

const CODIGO: Record<CategoriaMenu, string> = { entrantes: "e", arroces: "a", pescados: "p", carnes: "c" };
const DESDE_CODIGO: Record<string, CategoriaMenu> = Object.fromEntries(
  CATEGORIAS.map((c) => [CODIGO[c], c]),
) as Record<string, CategoriaMenu>;

/* ─────────────────── estado del asistente, en KV ─────────────────── */

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
      [{ text: "➕ Añadir plato nuevo", callback_data: "w:new:root" }],
      [{ text: "🍽 Gestionar un plato existente", callback_data: "w:manage:root" }],
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
  const filas: TecladoInline["inline_keyboard"] = [];
  filas.push([
    plato.disabled
      ? { text: "✅ Reactivar (vuelve a la carta)", callback_data: `w:act:enable:${cod}:${idx}` }
      : { text: "🚫 Agotar (elegir cuánto tiempo)", callback_data: `w:agotar:${cod}:${idx}` },
  ]);
  filas.push([{ text: "💰 Cambiar precio", callback_data: `w:act:price:${cod}:${idx}` }]);
  filas.push([{ text: "🗑 Eliminar definitivamente", callback_data: `w:act:remove:${cod}:${idx}` }]);
  filas.push([{ text: "⬅️ Volver a la lista", callback_data: `w:manage:${cod}` }]);
  return { inline_keyboard: filas };
}

function tecladoNota(): TecladoInline {
  return { inline_keyboard: [[{ text: "Sin nota", callback_data: "w:skip_nota" }]] };
}

/** Duraciones cerradas para "agotar": ver DURACIONES en lib/agotados.ts. */
function tecladoDuracion(cat: CategoriaMenu, idx: number): TecladoInline {
  const cod = CODIGO[cat];
  return {
    inline_keyboard: [
      ...(Object.keys(DURACIONES) as ClaveDuracion[]).map((k) => [
        { text: DURACIONES[k].etiqueta, callback_data: `w:agotarpor:${cod}:${idx}:${k}` },
      ]),
      [{ text: "⬅️ Volver", callback_data: `w:pick:${cod}:${idx}` }],
    ],
  };
}

/* ──────────────────────── entradas del webhook ──────────────────────── */

export async function mostrarMenuPrincipal(chatId: string): Promise<void> {
  await limpiarEstado(chatId);
  await sendMessage(
    chatId,
    "¿Qué quieres hacer con la carta?",
    tecladoRaiz(),
  );
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

  const partes = data.split(":"); // ["w","new"|"manage"|"pick"|"act", ...]
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
  if (partes[1] === "agotar" && partes[2] && partes[3] !== undefined) {
    const cat = DESDE_CODIGO[partes[2]];
    const idx = Number(partes[3]);
    if (!cat || !Number.isInteger(idx)) return { consumido: true };
    const menu = await menuConReactivacionAutomatica();
    const plato = menu[cat][idx];
    if (!plato) {
      await editar("La carta ha cambiado mientras elegías. Vuelve a intentarlo.", tecladoCategorias("w:manage"));
      return { consumido: true };
    }
    await editar(`¿Por cuánto tiempo ocultamos "${plato.nombre}"?`, tecladoDuracion(cat, idx));
    return { consumido: true };
  }
  if (partes[1] === "agotarpor" && partes[2] && partes[3] !== undefined && partes[4]) {
    const cat = DESDE_CODIGO[partes[2]];
    const idx = Number(partes[3]);
    const claveDuracion = partes[4] as ClaveDuracion;
    if (!cat || !Number.isInteger(idx) || !(claveDuracion in DURACIONES)) return { consumido: true };
    const menu = await menuConReactivacionAutomatica();
    const plato = menu[cat][idx];
    if (!plato) {
      await editar("La carta ha cambiado mientras elegías. Vuelve a intentarlo.", tecladoCategorias("w:manage"));
      return { consumido: true };
    }
    const duracion = DURACIONES[claveDuracion];
    // Se guarda AHORA (elegida) pero solo se aplica de verdad -marcarCaducidad-
    // si el dueño confirma: eso lo resuelve app/api/telegram/webhook/route.ts
    // justo después de que handleOwnerMessage aplique el disable_item.
    await fijarDuracionPendiente(
      chatId,
      duracion.ms === null ? null : { category: cat, id: plato.id, hasta: Date.now() + duracion.ms },
    );
    const action = ActionSchema.parse({ action: "disable_item", category: cat, id: plato.id });
    const summary = describeAction(action, menu) + (duracion.frase ? ` ${duracion.frase}` : "");
    await setPending(chatId, { action, summary, context: "menu" });
    await editar(`Voy a: ${summary}\n\n¿Confirmas?`, tecladoConfirmar());
    return { consumido: true };
  }
  if (partes[1] === "act" && partes[2] && partes[3] && partes[4] !== undefined) {
    const tipo = partes[2]; // enable | remove | price
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
    const accion: Record<string, "enable_item" | "remove_item"> = {
      enable: "enable_item",
      remove: "remove_item",
    };
    const nombreAccion = accion[tipo];
    if (!nombreAccion) return { consumido: true };
    const action = ActionSchema.parse({ action: nombreAccion, category: cat, id: plato.id });
    const summary = describeAction(action, menu);
    await setPending(chatId, { action, summary, context: "menu" });
    await editar(`Voy a: ${summary}\n\n¿Confirmas?`, tecladoConfirmar());
    return { consumido: true };
  }

  return { consumido: true }; // empezaba por "w:" pero no reconocido: lo damos por gestionado, no lo pasamos al LLM
}
