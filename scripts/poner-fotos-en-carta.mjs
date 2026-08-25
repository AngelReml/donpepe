/**
 * Añade el campo `imagen` a los platos del menú que vive en KV.
 *
 * La carta que se sirve NO sale de data/menu.json: `getMenu()` lee primero
 * `menu:current` en KV y solo cae a la semilla si no hay nada. Así que tocar la
 * semilla no cambia la web; hay que escribir en KV una vez.
 *
 * A partir de ahí, cambiar la foto de un plato es editar ese campo. Este script
 * es idempotente y NO pisa una imagen que ya esté puesta salvo con --forzar.
 *
 *   node scripts/poner-fotos-en-carta.mjs            # muestra qué haría
 *   node scripts/poner-fotos-en-carta.mjs --escribir # lo aplica
 *   node scripts/poner-fotos-en-carta.mjs --escribir --forzar
 *
 * Las rutas salen de data/fotos-plato.json: id de plato -> ruta en /public.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const CLAVE = "menu:current";
const CATEGORIAS = ["entrantes", "arroces", "pescados", "carnes"];
const escribir = process.argv.includes("--escribir");
const forzar = process.argv.includes("--forzar");

/* ─── credenciales ─────────────────────────────────────────── */
function cargarEnvLocal() {
  const f = path.join(RAIZ, ".env.local");
  if (!existsSync(f)) return;
  for (const linea of readFileSync(f, "utf-8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
cargarEnvLocal();

const URL_KV = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;
if (!URL_KV || !TOKEN) {
  console.error("Faltan KV_REST_API_URL / KV_REST_API_TOKEN (mira .env.local).");
  process.exit(1);
}

async function kv(comando) {
  const res = await fetch(URL_KV, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(comando),
  });
  if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
  const { result, error } = await res.json();
  if (error) throw new Error(`KV: ${error}`);
  return result;
}

/* ─── el mapa id -> foto ───────────────────────────────────── */
const mapa = JSON.parse(readFileSync(path.join(RAIZ, "data", "fotos-plato.json"), "utf-8"));
delete mapa._comentario;

for (const [id, ruta] of Object.entries(mapa)) {
  if (!existsSync(path.join(RAIZ, "public", ruta))) {
    console.error(`El fichero de "${id}" no existe: public${ruta}`);
    process.exit(1);
  }
}

/* ─── leer, enriquecer, comprobar, escribir ────────────────── */
const crudo = await kv(["GET", CLAVE]);
if (!crudo) {
  console.error(`No hay nada en ${CLAVE}: la carta viva no existe todavía.`);
  process.exit(1);
}
const menu = typeof crudo === "string" ? JSON.parse(crudo) : crudo;

const copia = path.join(RAIZ, "data", `menu.kv-antes.json`);
writeFileSync(copia, JSON.stringify(menu, null, 2) + "\n", "utf-8");
console.log(`copia de seguridad de la carta viva -> ${path.relative(RAIZ, copia)}\n`);

const antes = JSON.stringify(menu);
const siguiente = JSON.parse(antes);

let puestas = 0, yaTenian = 0;
const sinFoto = [];
for (const cat of CATEGORIAS) {
  for (const p of siguiente[cat] ?? []) {
    const ruta = mapa[p.id];
    if (!ruta) { sinFoto.push(`${cat}/${p.id} (${p.nombre})`); continue; }
    if (p.imagen && !forzar) { yaTenian++; continue; }
    p.imagen = ruta;
    puestas++;
  }
}

/* La comprobación que importa: lo ÚNICO que puede haber cambiado es `imagen`. */
const soloImagen = (a, b) => {
  const limpiar = (m) => {
    const c = JSON.parse(JSON.stringify(m));
    for (const cat of CATEGORIAS) for (const p of c[cat] ?? []) delete p.imagen;
    return JSON.stringify(c);
  };
  return limpiar(a) === limpiar(b);
};
if (!soloImagen(JSON.parse(antes), siguiente)) {
  console.error("ABORTADO: el menú cambiaría en algo más que el campo `imagen`.");
  process.exit(1);
}

console.log(`  platos que reciben imagen : ${puestas}`);
console.log(`  ya la tenían (sin tocar)  : ${yaTenian}`);
console.log(`  sin foto en el mapa       : ${sinFoto.length}`);
sinFoto.forEach((s) => console.log(`      · ${s}`));
console.log(`  resto del menú            : intacto (comprobado)\n`);

if (!escribir) {
  console.log("Ensayo. Vuelve a lanzarlo con --escribir para aplicarlo.");
  process.exit(0);
}

await kv(["SET", CLAVE, JSON.stringify(siguiente)]);
console.log("Escrito en KV.");
