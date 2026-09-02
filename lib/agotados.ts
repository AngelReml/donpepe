/**
 * Interruptor de un toque: agotar y reactivar un plato son gestos rápidos,
 * de bar lleno, que se hacen varias veces al día -no una alta, no un cambio
 * de precio-. Por eso NO piden confirmación previa (corrección de diseño
 * explícita): se aplican al instante y el aviso posterior trae un botón de
 * deshacer. La caducidad ("vuelve mañana" / "vuelve en 2 horas") es
 * opcional y se ofrece DESPUÉS de agotar, nunca antes ni obligatoria.
 *
 * No añade ningún campo a PlatoBase ni toca lib/actions.ts. El efecto sobre
 * el plato (`disabled = true/false`) es el mismo, exactamente, que ya
 * produce disable_item/enable_item -solo que aquí se escribe directamente
 * con setMenu (ya exportado por lib/kv.ts, sin tocar ese fichero) porque
 * pasar por handleOwnerMessage obligaría a confirmar, que es justo lo que
 * esta pantalla no quiere-. Queda registrado con appendLog (también
 * reutilizado, sin tocar) para que "deshacer último cambio" por WhatsApp
 * también lo vea si hiciera falta.
 *
 * La caducidad vive en su propio registro de KV, aparte de PlatoBase, y se
 * concilia cada vez que se lee el menú -desde /carta (clientes) y desde el
 * bot (dueño)-, sin cron: los crons de Vercel en plan gratuito no bajan de
 * una vez al día, y aquí la duración más corta es de horas.
 */
import { getMenu, setMenu, appendLog, kvGet, kvSet } from "./kv";
import type { Menu, CategoriaMenu, PlatoBase } from "./types";

interface RegistroAgotado {
  category: CategoriaMenu;
  id: string;
  hasta: number; // epoch ms
}

const CLAVE_REGISTRO = "telegram:agotados";

async function leerRegistro(): Promise<Record<string, RegistroAgotado>> {
  return (await kvGet<Record<string, RegistroAgotado>>(CLAVE_REGISTRO)) ?? {};
}

function claveItem(category: CategoriaMenu, id: string): string {
  return `${category}:${id}`;
}

export async function marcarCaducidad(category: CategoriaMenu, id: string, hasta: number): Promise<void> {
  const reg = await leerRegistro();
  reg[claveItem(category, id)] = { category, id, hasta };
  await kvSet(CLAVE_REGISTRO, reg);
}

/** Sin problema si no había ninguna: limpieza idempotente. */
export async function quitarCaducidad(category: CategoriaMenu, id: string): Promise<void> {
  const reg = await leerRegistro();
  if (claveItem(category, id) in reg) {
    delete reg[claveItem(category, id)];
    await kvSet(CLAVE_REGISTRO, reg);
  }
}

/**
 * Se llama en vez de getMenu() en cualquier sitio donde importe que el menú
 * esté al día: /carta y el bot. Si nada ha caducado, es un getMenu() normal
 * más una lectura barata del registro.
 */
export async function menuConReactivacionAutomatica(): Promise<Menu> {
  const registro = await leerRegistro();
  const claves = Object.keys(registro);
  const ahora = Date.now();
  const caducados = claves.filter((k) => registro[k].hasta <= ahora);
  if (caducados.length === 0) return getMenu();

  const menu = await getMenu();
  for (const clave of caducados) {
    const { category, id } = registro[clave];
    const arr = menu[category] as Array<{ id: string; disabled?: boolean }>;
    const item = arr.find((p) => p.id === id);
    if (item) item.disabled = false;
    delete registro[clave];
  }
  await setMenu(menu);
  await kvSet(CLAVE_REGISTRO, registro);
  return menu;
}

/** Duraciones cerradas, ofrecidas SOLO después de agotar. Nada de texto libre. */
export const DURACIONES = {
  manana: { etiqueta: "🌙 Vuelve mañana", ms: 24 * 60 * 60 * 1000, frase: "Vuelve sola mañana." },
  "2h": { etiqueta: "⏱ Vuelve en 2 horas", ms: 2 * 60 * 60 * 1000, frase: "Vuelve sola en 2 horas." },
} as const;
export type ClaveDuracion = keyof typeof DURACIONES;

export interface ResultadoAlternar {
  category: CategoriaMenu;
  id: string;
  nombre: string;
  ahoraDisabled: boolean;
}

/**
 * El interruptor en sí: lee el estado real (ya reconciliado), lo invierte,
 * escribe, y si acaba de REACTIVARSE quita cualquier caducidad vieja que
 * pudiera quedar colgada (ya no tiene sentido). Se puede llamar dos veces
 * seguidas sobre el mismo plato para deshacer: la segunda vuelve a invertir.
 */
export async function alternarDisponibilidad(
  chatId: string,
  category: CategoriaMenu,
  id: string,
): Promise<ResultadoAlternar | null> {
  const menu = await menuConReactivacionAutomatica();
  const arr = menu[category] as PlatoBase[];
  const item = arr.find((p) => p.id === id);
  if (!item) return null;

  item.disabled = !item.disabled;
  await setMenu(menu);
  if (!item.disabled) await quitarCaducidad(category, id);

  await appendLog({
    ts: new Date().toISOString(),
    from: `telegram:${chatId}`,
    kind: "menu",
    action: { action: item.disabled ? "disable_item" : "enable_item", category, id },
    summary: `${item.disabled ? "Agotado" : "Reactivado"} "${item.nombre}" (interruptor de un toque, Telegram)`,
  });

  return { category, id, nombre: item.nombre, ahoraDisabled: item.disabled };
}
