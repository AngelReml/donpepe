/**
 * Prueba de los menús del día por Telegram, sin red (KV en memoria,
 * menú de semilla data/menu.json). Verifica lo que no puede fallar en
 * silencio: qué menús llevan un plato, y que cada cambio escribe lo que dice
 * y deja el menú anterior en el registro para poder deshacer.
 */
import { menusQueLlevan, normalizarNombre, aplicarCambio } from "../lib/telegram-menus";
import { getMenu, getLastLog } from "../lib/kv";
import type { Menu } from "../lib/types";

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  if (ok) console.log(`  ok   ${nombre}`);
  else {
    fallos++;
    console.error(`  FALLA ${nombre} ${detalle}`);
  }
}

async function main() {
  const inicial = await getMenu();
  const m1 = inicial.menus.find((m) => m.id === "menu-1");
  const m2 = inicial.menus.find((m) => m.id === "menu-2");
  if (!m1 || !m2) throw new Error("el menú de semilla no tiene menu-1 / menu-2");
  const precioOriginalMenu1 = m1.precio; // el dato en memoria se muta: guardar el valor, no la referencia
  const carnesOriginales = JSON.stringify(inicial.carnes);

  console.log("\nNombres");
  comprobar("ignora tildes y mayúsculas", normalizarNombre("  Merluza A LA   gallega ") === normalizarNombre("merluza a la gallega"));
  comprobar("no confunde parecidos", normalizarNombre("Gambón a la plancha") !== normalizarNombre("Gambones a la plancha"));

  console.log("\nQué menús llevan un plato");
  const merluza = menusQueLlevan(inicial, "Merluza a la gallega");
  comprobar("merluza sale en menú 1 y 2", merluza.length === 2, JSON.stringify(merluza));
  comprobar("navajas solo en menú 2", menusQueLlevan(inicial, "navajas").map((a) => a.menuId).join() === "menu-2");
  comprobar("plato inexistente en ninguno", menusQueLlevan(inicial, "Chuletón").length === 0);

  console.log("\nCambios");
  await aplicarCambio("test", { tipo: "precio", menuId: "menu-1", precio: 16 });
  let menu = await getMenu();
  comprobar("precio del menú 1 a 16", menu.menus.find((m) => m.id === "menu-1")?.precio === 16);
  const log1 = await getLastLog<{ kind: string; prev?: Menu }>();
  comprobar("registro con kind=menu y menú anterior", log1?.kind === "menu" && log1?.prev?.menus.find((m) => m.id === "menu-1")?.precio === precioOriginalMenu1);

  await aplicarCambio("test", { tipo: "anadir", menuId: "menu-2", seccion: "segundos", nombre: "Churrasco" });
  menu = await getMenu();
  comprobar("añade churrasco a segundos del menú 2", menu.menus.find((m) => m.id === "menu-2")?.segundos?.includes("Churrasco") === true);
  const repetido = await aplicarCambio("test", { tipo: "anadir", menuId: "menu-2", seccion: "segundos", nombre: "churrasco" });
  comprobar("no duplica un plato que ya está", repetido.includes("ya estaba"));

  await aplicarCambio("test", { tipo: "quitar", menuId: "menu-2", seccion: "primeros", nombre: "Navajas" });
  menu = await getMenu();
  comprobar("quita navajas del menú 2", !menu.menus.find((m) => m.id === "menu-2")?.primeros?.includes("Navajas"));
  const yaNo = await aplicarCambio("test", { tipo: "quitar", menuId: "menu-2", seccion: "primeros", nombre: "Navajas" });
  comprobar("quitar lo que ya no está no rompe nada", yaNo.includes("ya no está"));

  await aplicarCambio("test", { tipo: "quitar_de_todos", nombre: "merluza a la gallega" });
  menu = await getMenu();
  comprobar("quita la merluza de todos los menús", menusQueLlevan(menu, "Merluza a la gallega").length === 0);
  comprobar("no toca otros platos", menu.menus.find((m) => m.id === "menu-1")?.segundos?.includes("Raxo") === true);
  comprobar("la carta no cambia", JSON.stringify(menu.carnes) === carnesOriginales);

  console.log(fallos ? `\n${fallos} comprobaciones FALLAN.` : "\nTodo correcto.");
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
