/**
 * Modo manual de reseñas (sin API de Google), sin red ni LLM: cargar sin
 * duplicar, cola en orden, aprobar ≠ publicar, y paso a publicada.
 */
delete process.env.RESENAS_DEMO;
import { modoResenas, listReviews } from "../lib/google";
import { cargarManuales, idManual } from "../lib/resenas-manuales";
import {
  refrescarCola,
  siguientePendiente,
  marcarHecha,
  listarAprobadas,
  marcarPublicadas,
  olvidarDecisionesManuales,
  resumen,
} from "../lib/resenas-cola";
import { conFirma } from "../lib/resenas-draft";

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  if (ok) console.log(`  ok   ${nombre}`);
  else {
    fallos++;
    console.error(`  FALLA ${nombre} ${detalle}`);
  }
}

async function main() {
  comprobar("sin API y sin demo = modo manual", modoResenas() === "manual");
  comprobar("sin cargar, no hay reseñas", (await listReviews(new Set())).length === 0);

  const lote = [
    { author: "Ana", rating: 5, text: "Arroz buenísimo", time: "hace 1 semana" },
    { author: "John", rating: 2, text: "Cold fish, slow service", time: "hace 2 semanas" },
    { author: "Luis", rating: 4, text: "", time: "hace 3 días" },
  ];
  const r1 = await cargarManuales(lote);
  comprobar("carga 3 nuevas", r1.nuevas === 3 && r1.total === 3, JSON.stringify(r1));
  const r2 = await cargarManuales([lote[0], { author: "Eva", rating: 3, text: "Normal" }]);
  comprobar("no duplica al recargar", r2.nuevas === 1 && r2.yaEstaban === 1 && r2.total === 4, JSON.stringify(r2));
  comprobar("id estable", idManual(lote[0]) === idManual({ ...lote[0] }));

  await refrescarCola(true);
  const primera = await siguientePendiente();
  comprobar("la cola empieza por la peor", primera?.author === "John", primera?.author);

  await marcarHecha(primera!.id, "aprobada", "Sorry… Don Pepe", {
    textoEs: "Lo sentimos… Don Pepe",
    resena: { author: primera!.author, rating: primera!.rating, time: primera!.time, text: primera!.text },
  });
  const ap = await listarAprobadas();
  comprobar("aprobada queda en la lista para publicar", ap.length === 1 && ap[0].respuesta.startsWith("Sorry"));
  comprobar("aprobada guarda la reseña para encontrarla", ap[0].resena?.author === "John");
  comprobar("aprobada sale de la cola", (await siguientePendiente())?.id !== primera!.id);
  let res = await resumen();
  comprobar("resumen: 1 aprobada, 0 publicadas", res.aprobadas === 1 && res.publicadas === 0, JSON.stringify(res));

  const m = await marcarPublicadas([primera!.id, "manual:inexistente"]);
  comprobar("marca publicada solo la aprobada", m.marcadas === 1 && m.ignoradas.length === 1);
  res = await resumen();
  comprobar("resumen: 0 aprobadas, 1 publicada", res.aprobadas === 0 && res.publicadas === 1, JSON.stringify(res));

  const otra = await siguientePendiente();
  await marcarHecha(otra!.id, "saltada");
  const olvidadas = await olvidarDecisionesManuales();
  comprobar("olvidar no toca las publicadas", olvidadas === 1 && (await resumen()).publicadas === 1);

  comprobar("firma añadida si falta", conFirma("Gracias por venir.").endsWith("\n\nDon Pepe"));
  comprobar("firma no duplicada", conFirma("Gracias.\n\nDon Pepe") === "Gracias.\n\nDon Pepe");

  console.log(fallos === 0 ? "\nTodo correcto.\n" : `\n${fallos} fallo(s).\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
