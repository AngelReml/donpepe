/**
 * "Agotado con caducidad": el dueño oculta un plato por un tiempo concreto
 * (no para siempre) y vuelve solo, sin que nadie tenga que acordarse.
 *
 * No añade ningún campo a PlatoBase ni toca lib/actions.ts. disable_item /
 * enable_item (sin cambios) siguen siendo los únicos que ponen o quitan
 * `disabled`. Esto es un registro aparte, en su propia clave de KV, que se
 * concilia contra el menú real cada vez que se lee -desde /carta y desde el
 * bot-: si algo ha caducado, se le pone `disabled = false` (el mismo efecto
 * que ya tiene enable_item) y se borra del registro. Sin cron: los crons de
 * Vercel en plan gratuito no bajan de una vez al día, y aquí la duración más
 * corta que se ofrece es de horas.
 */
import { getMenu, setMenu, kvGet, kvSet } from "./kv";
import type { Menu, CategoriaMenu } from "./types";

interface RegistroAgotado {
  category: CategoriaMenu;
  id: string;
  hasta: number; // epoch ms
}

const CLAVE_REGISTRO = "telegram:agotados";
const clavePendiente = (chatId: string) => `telegram:duracion-pendiente:${chatId}`;

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

/**
 * La duración elegida por botón, guardada un instante entre "elige duración"
 * y "toca Confirmar" -un solo valor por chat, se lee y se borra a la vez
 * (efecto "pop"), así nunca queda una duración vieja colgada para el
 * siguiente agotado que se haga.
 */
export async function fijarDuracionPendiente(
  chatId: string,
  valor: { category: CategoriaMenu; id: string; hasta: number } | null,
): Promise<void> {
  await kvSet(clavePendiente(chatId), valor);
}

export async function tomarDuracionPendiente(
  chatId: string,
): Promise<{ category: CategoriaMenu; id: string; hasta: number } | null> {
  const v = await kvGet<{ category: CategoriaMenu; id: string; hasta: number } | null>(clavePendiente(chatId));
  await kvSet(clavePendiente(chatId), null);
  return v ?? null;
}

/** Duraciones cerradas que ofrece el botón. Nada de texto libre. */
export const DURACIONES = {
  "2h": { etiqueta: "⏱ 2 horas", ms: 2 * 60 * 60 * 1000, frase: "Vuelve sola en 2 horas." },
  manana: { etiqueta: "🌙 Hasta mañana (+24 h)", ms: 24 * 60 * 60 * 1000, frase: "Vuelve sola en 24 horas." },
  indef: { etiqueta: "♾️ Indefinido (la reactivo yo)", ms: null as null, frase: "" },
} as const;
export type ClaveDuracion = keyof typeof DURACIONES;
