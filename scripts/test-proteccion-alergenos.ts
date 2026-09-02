/**
 * Blindaje de alérgenos: ninguna acción del bot -ni la de WhatsApp (LLM) ni
 * la de Telegram (botones)- puede modificar un campo de alérgenos, hoy ni el
 * día que se añada. Este test no reescribe lib/actions.ts, lo IMPORTA sin
 * tocarlo y comprueba su comportamiento real, en dos niveles:
 *
 * 1. Estático: ningún tipo de acción del ActionSchema define hoy un campo
 *    llamado alergenos/allergens/alérgenos. Si alguien lo añade, este test
 *    empieza a fallar en ese mismo instante, antes de tocar nada más.
 * 2. Dinámico: se simula un menú donde los platos YA llevan un campo
 *    "alergenos" (como si ese campo ya existiera, cosa que hoy no pasa) y se
 *    aplican todas las acciones reales del esquema sobre él. Si el día de
 *    mañana alguien extiende applyAction para escribir en ese campo desde
 *    cualquier acción, este test lo detecta y falla, sin que nadie tenga que
 *    acordarse de comprobarlo a mano.
 *
 * Se ejecuta con tsx (ver package.json) porque importa TypeScript real, con
 * los mismos imports relativos sin extensión que usa el resto del proyecto.
 *
 *   npm run test:alergenos
 *
 * Forma parte de "npm run build": si esto falla, el despliegue no continúa.
 */
import assert from "node:assert/strict";
import { ActionSchema, applyAction, type Action } from "../lib/actions";
import type { Menu, PlatoBase } from "../lib/types";

const CAMPOS_PROHIBIDOS = [
  "alergeno",
  "alergenos",
  "alérgeno",
  "alérgenos",
  "allergen",
  "allergens",
];

let fallos = 0;
function comprobar(descripcion: string, fn: () => void) {
  try {
    fn();
    console.log(`  OK   ${descripcion}`);
  } catch (e) {
    fallos++;
    console.error(`  FAIL ${descripcion}`);
    console.error(`       ${(e as Error).message}`);
  }
}

/* ────────────────────── 1. Comprobación estática del esquema ────────────────────── */

comprobar("ningún tipo de acción del esquema define un campo de alérgenos", () => {
  for (const opt of ActionSchema.options) {
    const shape = (opt as unknown as { shape: Record<string, unknown> }).shape;
    for (const campo of Object.keys(shape)) {
      const normalizado = campo.toLowerCase();
      assert.ok(
        !CAMPOS_PROHIBIDOS.includes(normalizado),
        `La acción "${(shape.action as { _def: { value: string } })._def.value}" define un campo ` +
          `"${campo}" que coincide con la lista de campos de alérgenos prohibidos. ` +
          `Esto NO puede pasar: revisa lib/anclas... no, revisa el comentario en lib/types.ts junto a PlatoBase.`,
      );
    }
  }
});

/* ─────────────────── 2. Comprobación dinámica contra applyAction real ─────────────────── */

const SENTINEL = Object.freeze(["gluten", "lactosa", "frutos-secos"]);

function menuDePrueba(): Menu {
  const plato = (id: string, nombre: string, precio: number): PlatoBase & { alergenos: string[] } => ({
    id,
    nombre,
    precio,
    // Campo que HOY no existe en PlatoBase -por eso el "as any" más abajo-,
    // simulando el estado futuro que preocupa: el día que exista, ¿alguna
    // acción lo toca?
    alergenos: [...SENTINEL],
  });
  return {
    entrantes: [plato("e1", "Entrante de prueba", 5)],
    arroces: [plato("a1", "Arroz de prueba", 12)],
    pescados: [plato("pescado-dia", "Pescado del día de prueba", 15), plato("p1", "Pescado de prueba", 14)],
    carnes: [plato("c1", "Carne de prueba", 16)],
    menus: [{ id: "m1", nombre: "Menú de prueba", precio: 20, disponibilidad: "mediodía" }],
  } as unknown as Menu;
}

const ACCIONES_DE_PRUEBA: Action[] = [
  { action: "update_price", category: "entrantes", id: "e1", new_price: 9.5 },
  { action: "update_name", category: "arroces", id: "a1", new_name: "Nuevo nombre" },
  { action: "update_special", id: "pescado-dia", nombre: "Rodaballo", precio: 22 },
  { action: "disable_item", category: "carnes", id: "c1" },
  { action: "enable_item", category: "carnes", id: "c1" },
  { action: "add_item", category: "entrantes", nombre: "Plato nuevo de prueba", precio: 7 },
  { action: "remove_item", category: "pescados", id: "p1" },
  { action: "update_hours", schedule: { "0": ["13:00-16:00"] } },
  { action: "update_menu_availability", id: "m1", disponibilidad: "solo cenas" },
  { action: "set_aviso", text: "Aviso de prueba" },
];

for (const action of ACCIONES_DE_PRUEBA) {
  comprobar(`applyAction("${action.action}") no toca los alérgenos de ningún plato`, () => {
    const menu = menuDePrueba();
    const { next } = applyAction(menu, action);
    for (const cat of ["entrantes", "arroces", "pescados", "carnes"] as const) {
      for (const platoNext of next[cat]) {
        const platoPrev = menu[cat].find((p) => p.id === platoNext.id);
        const alergenosNext = (platoNext as unknown as { alergenos?: string[] }).alergenos;
        if (!platoPrev) {
          // Plato nuevo (add_item): no debe llevar alergenos de ningún tipo.
          assert.ok(
            alergenosNext === undefined,
            `El plato nuevo "${platoNext.nombre}" ha aparecido con un campo "alergenos" que nadie le puso.`,
          );
          continue;
        }
        const alergenosPrev = (platoPrev as unknown as { alergenos?: string[] }).alergenos;
        assert.deepStrictEqual(
          alergenosNext,
          alergenosPrev,
          `Los alérgenos de "${platoNext.nombre}" han cambiado tras aplicar "${action.action}": ` +
            `antes ${JSON.stringify(alergenosPrev)}, después ${JSON.stringify(alergenosNext)}.`,
        );
      }
    }
  });
}

comprobar("ActionSchema sigue aceptando SOLO los campos declarados (no hay passthrough)", () => {
  const conCampoExtra = {
    action: "update_price",
    category: "entrantes",
    id: "e1",
    new_price: 10,
    alergenos: ["intento-de-colar-alergenos"],
  };
  const parsed = ActionSchema.parse(conCampoExtra) as Record<string, unknown>;
  assert.ok(
    !("alergenos" in parsed),
    "ActionSchema ha dejado pasar un campo \"alergenos\" que no está declarado en el esquema " +
      "(¿alguien ha puesto .passthrough() en algún z.object?).",
  );
});

console.log("");
if (fallos > 0) {
  console.error(`${fallos} comprobación(es) de protección de alérgenos han FALLADO.`);
  process.exit(1);
}
console.log("Protección de alérgenos: todo correcto.");
