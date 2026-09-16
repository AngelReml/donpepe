/**
 * Prueba del ciclo de reseñas en modo simulación, sin red y sin LLM.
 * Verifica lo que no puede fallar en silencio: el mapeo de estrellas, el
 * filtrado de las ya respondidas, el orden de la cola y el marcado.
 */
import { parseStarRating, listReviews, isSimulated } from "../lib/google";
import { refrescarCola, siguientePendiente, marcarHecha, contarPendientes, resumen } from "../lib/resenas-cola";

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  if (ok) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLA ${nombre} ${detalle}`);
  }
}

async function main() {
  console.log("\nEstrellas (Google las manda como palabra, no como número)");
  comprobar('"FIVE" -> 5', parseStarRating("FIVE") === 5);
  comprobar('"ONE" -> 1', parseStarRating("ONE") === 1);
  comprobar('"three" -> 3', parseStarRating("three") === 3);
  comprobar("4 -> 4", parseStarRating(4) === 4);
  comprobar("basura -> 0", parseStarRating("PATATA") === 0);

  console.log("\nModo");
  comprobar("simulación activa", isSimulated() === true);

  console.log("\nCola");
  const todas = await listReviews(new Set());
  comprobar("no cuela la ya respondida", !todas.some((r) => r.id === "sample-5"));

  await refrescarCola(true);
  const primera = await siguientePendiente();
  comprobar("empieza por la peor", primera?.rating === 2, `(rating=${primera?.rating})`);

  const antes = await contarPendientes();
  await marcarHecha(primera!.id, "publicada", "respuesta de prueba");
  const despues = await contarPendientes();
  comprobar("publicar la saca de la cola", despues === antes - 1, `(${antes} -> ${despues})`);

  const segunda = await siguientePendiente();
  comprobar("la siguiente no repite", segunda?.id !== primera?.id);
  comprobar("y sigue el orden por estrellas", (segunda?.rating ?? 0) >= (primera?.rating ?? 0));

  await marcarHecha(segunda!.id, "saltada");
  const r = await resumen();
  comprobar("el resumen cuadra", r.publicadas === 1 && r.saltadas === 1, JSON.stringify(r));

  console.log(fallos === 0 ? "\nTodo correcto.\n" : `\n${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
