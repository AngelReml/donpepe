import { z } from "zod";
import { CATEGORIAS } from "./types";

/** Acciones estructuradas que el agente WhatsApp emite a partir del habla libre. */
export const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_price"),
    category: z.enum(CATEGORIAS as [string, ...string[]]),
    id: z.string(),
    new_price: z.number().positive(),
  }),
  z.object({
    action: z.literal("update_name"),
    category: z.enum(CATEGORIAS as [string, ...string[]]),
    id: z.string(),
    new_name: z.string().min(1),
  }),
  z.object({
    action: z.literal("update_special"),
    id: z.string(),
    nombre: z.string().min(1).optional(),
    precio: z.number().positive().optional(),
    precio_texto: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal("disable_item"),
    category: z.enum(CATEGORIAS as [string, ...string[]]),
    id: z.string(),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("enable_item"),
    category: z.enum(CATEGORIAS as [string, ...string[]]),
    id: z.string(),
  }),
  z.object({
    action: z.literal("add_item"),
    category: z.enum(CATEGORIAS as [string, ...string[]]),
    nombre: z.string().min(1),
    precio: z.number().positive(),
    nota: z.string().optional(),
  }),
  z.object({
    action: z.literal("remove_item"),
    category: z.enum(CATEGORIAS as [string, ...string[]]),
    id: z.string(),
  }),
  z.object({
    action: z.literal("update_hours"),
    schedule: z.record(z.string(), z.array(z.string())),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_menu_availability"),
    id: z.string(),
    disponibilidad: z.string().min(1).optional(),
    disabled: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("set_aviso"),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal("clarify"),
    question: z.string().min(1),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;

/** Marcador legible para el tipo de un campo, usado al describir el esquema. */
function marcador(def: z.ZodTypeAny): string {
  const inner = ((def as unknown as { _def?: { innerType?: z.ZodTypeAny } })._def?.innerType ?? def) as z.ZodTypeAny;
  const tipo = (inner as unknown as { _def: { typeName: string; values?: string[] } })._def;
  switch (tipo.typeName) {
    case "ZodString": return '"<texto>"';
    case "ZodNumber": return "<número>";
    case "ZodBoolean": return "<true|false>";
    case "ZodEnum": return `"<${(tipo.values ?? []).join("|")}>"`;
    case "ZodArray": return "[…]";
    case "ZodRecord": return "{…}";
    default: return "<valor>";
  }
}

/**
 * Describe el formato JSON de cada acción leyendo el propio ActionSchema.
 * El prompt del agente inyecta este texto, así que al añadir una acción nueva
 * al esquema el prompt se actualiza solo: no pueden desincronizarse.
 */
export function buildActionFormatBlock(): string {
  return ActionSchema.options
    .map((opt) => {
      const shape = (opt as z.ZodObject<z.ZodRawShape>).shape;
      const nombre = (shape.action as z.ZodLiteral<string>)._def.value;
      const obligatorios: string[] = [];
      const opcionales: string[] = [];
      for (const [campo, def] of Object.entries(shape)) {
        if (campo === "action") continue;
        const par = `"${campo}":${marcador(def as z.ZodTypeAny)}`;
        ((def as z.ZodTypeAny).isOptional() ? opcionales : obligatorios).push(par);
      }
      const linea = `{"action":"${nombre}"${obligatorios.length ? "," + obligatorios.join(",") : ""}}`;
      return opcionales.length ? `${linea}\n    opcionales: ${opcionales.join(", ")}` : linea;
    })
    .join("\n");
}

/** Texto que verá el dueño en WhatsApp antes de confirmar. */
export function describeAction(action: Action, menu: import("./types").Menu): string {
  const findPlato = (cat: string, id: string) => {
    const arr = (menu as any)[cat];
    if (!Array.isArray(arr)) return undefined;
    return arr.find((p: any) => p.id === id);
  };

  switch (action.action) {
    case "update_price": {
      const p = findPlato(action.category, action.id);
      if (!p) return `Plato ${action.id} no encontrado en ${action.category}.`;
      const prev = typeof p.precio === "number" ? p.precio.toFixed(2) + " €" : "—";
      return `Cambiar "${p.nombre}" de ${prev} a ${action.new_price.toFixed(2)} €.`;
    }
    case "update_name": {
      const p = findPlato(action.category, action.id);
      if (!p) return `Plato ${action.id} no encontrado en ${action.category}.`;
      return `Renombrar "${p.nombre}" a "${action.new_name}".`;
    }
    case "update_special": {
      const p = menu.pescados.find((x) => x.id === action.id) ?? menu.entrantes.find((x) => x.id === action.id);
      const prev = p?.nombre ?? "Pescado del día";
      const parts: string[] = [];
      if (action.nombre) parts.push(`"${prev}" → "${action.nombre}"`);
      if (typeof action.precio === "number") parts.push(`precio ${action.precio.toFixed(2)} €`);
      if (action.precio_texto) parts.push(`precio "${action.precio_texto}"`);
      return `Actualizar especial: ${parts.join(", ")}.`;
    }
    case "disable_item": {
      const p = findPlato(action.category, action.id);
      if (!p) return `Plato ${action.id} no encontrado en ${action.category}.`;
      return `Ocultar "${p.nombre}" de la carta${action.reason ? ` (${action.reason})` : ""}.`;
    }
    case "enable_item": {
      const p = findPlato(action.category, action.id);
      if (!p) return `Plato ${action.id} no encontrado en ${action.category}.`;
      return `Volver a mostrar "${p.nombre}" en la carta.`;
    }
    case "add_item": {
      return `Añadir "${action.nombre}" a ${action.category} por ${action.precio.toFixed(2)} €${action.nota ? ` (${action.nota})` : ""}.`;
    }
    case "remove_item": {
      const p = findPlato(action.category, action.id);
      if (!p) return `Plato ${action.id} no encontrado en ${action.category}.`;
      return `Eliminar "${p.nombre}" de la carta.`;
    }
    case "update_hours": {
      return `Actualizar horario: ${JSON.stringify(action.schedule)}${action.note ? ` (${action.note})` : ""}.`;
    }
    case "update_menu_availability": {
      const m = menu.menus.find((x) => x.id === action.id);
      if (!m) return `Menú ${action.id} no encontrado.`;
      const parts: string[] = [`"${m.nombre}"`];
      if (action.disponibilidad) parts.push(`disponibilidad: ${action.disponibilidad}`);
      if (typeof action.disabled === "boolean") parts.push(action.disabled ? "desactivado" : "activado");
      return `Actualizar menú: ${parts.join(", ")}.`;
    }
    case "set_aviso": {
      return `Cambiar aviso de la carta a: "${action.text}".`;
    }
    case "clarify":
      return action.question;
  }
}

/** Aplica una acción sobre el menú y devuelve { prev, next, summary }. */
export function applyAction(
  menu: import("./types").Menu,
  action: Action,
): { prev: import("./types").Menu; next: import("./types").Menu; summary: string } {
  const prev = JSON.parse(JSON.stringify(menu)) as import("./types").Menu;
  const next = prev;

  switch (action.action) {
    case "update_price": {
      const arr = (next as any)[action.category] as Array<{ id: string; precio?: number; precio_texto?: string }>;
      const p = arr.find((x) => x.id === action.id);
      if (!p) throw new Error(`Plato no encontrado: ${action.category}/${action.id}`);
      p.precio = action.new_price;
      delete p.precio_texto;
      break;
    }
    case "update_name": {
      const arr = (next as any)[action.category] as Array<{ id: string; nombre: string }>;
      const p = arr.find((x) => x.id === action.id);
      if (!p) throw new Error(`Plato no encontrado: ${action.category}/${action.id}`);
      p.nombre = action.new_name;
      break;
    }
    case "update_special": {
      // Intentamos primero en pescados (caso "pescado del día"), luego en entrantes.
      let p = next.pescados.find((x) => x.id === action.id);
      if (!p) p = next.entrantes.find((x) => x.id === action.id);
      if (!p) throw new Error(`Especial no encontrado: ${action.id}`);
      if (action.nombre) p.nombre = action.nombre;
      if (typeof action.precio === "number") {
        p.precio = action.precio;
        delete p.precio_texto;
      }
      if (action.precio_texto) {
        p.precio_texto = action.precio_texto;
        delete p.precio;
      }
      break;
    }
    case "disable_item": {
      const arr = (next as any)[action.category] as Array<{ id: string; disabled?: boolean }>;
      const p = arr.find((x) => x.id === action.id);
      if (!p) throw new Error(`Plato no encontrado: ${action.category}/${action.id}`);
      p.disabled = true;
      break;
    }
    case "enable_item": {
      const arr = (next as any)[action.category] as Array<{ id: string; disabled?: boolean }>;
      const p = arr.find((x) => x.id === action.id);
      if (!p) throw new Error(`Plato no encontrado: ${action.category}/${action.id}`);
      p.disabled = false;
      break;
    }
    case "add_item": {
      const arr = (next as any)[action.category] as Array<any>;
      const id = action.nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      if (arr.find((x) => x.id === id)) throw new Error(`Ya existe un plato con id "${id}" en ${action.category}.`);
      arr.push({
        id,
        nombre: action.nombre,
        precio: action.precio,
        ...(action.nota ? { nota: action.nota } : {}),
      });
      break;
    }
    case "remove_item": {
      const arr = (next as any)[action.category] as Array<{ id: string }>;
      const idx = arr.findIndex((x) => x.id === action.id);
      if (idx === -1) throw new Error(`Plato no encontrado: ${action.category}/${action.id}`);
      arr.splice(idx, 1);
      break;
    }
    case "update_hours": {
      next.horario = action.schedule as any;
      break;
    }
    case "update_menu_availability": {
      const m = next.menus.find((x) => x.id === action.id);
      if (!m) throw new Error(`Menú no encontrado: ${action.id}`);
      if (typeof action.disponibilidad === "string") m.disponibilidad = action.disponibilidad;
      if (typeof action.disabled === "boolean") m.disabled = action.disabled;
      break;
    }
    case "set_aviso": {
      next.aviso = action.text;
      break;
    }
    case "clarify": {
      throw new Error("clarify no se aplica al menú");
    }
  }

  return { prev, next, summary: describeAction(action, prev) };
}
