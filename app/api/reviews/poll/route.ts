import { NextRequest, NextResponse } from "next/server";
import { isKvLive } from "@/lib/kv";
import { isSimulated } from "@/lib/google";
import { refrescarCola, contarPendientes, getBorrador } from "@/lib/resenas-cola";
import { mostrarSiguienteResena } from "@/lib/resenas-telegram";
import { sendMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next.js cachea las respuestas de fetch, y el cliente de KV usa fetch por
// debajo: sin esto el cron podría trabajar sobre una cola vieja.
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/**
 * Cron diario (vercel.json). Refresca la cola de reseñas y, si hay algo
 * pendiente, le manda al dueño la peor por Telegram con la respuesta ya
 * redactada y los cuatro botones. Una sola reseña por aviso: el resto las
 * va viendo él con /resenas cuando quiera.
 *
 * Antes esto salía por WhatsApp. El canal es ahora Telegram, que es donde
 * vive el bot y donde no hace falta plantilla aprobada por Meta.
 */
function chatDelDueno(): string | null {
  const permitidos = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);
  return permitidos[0] ?? null;
}

export async function GET(req: NextRequest) {
  // Vercel añade `Authorization: Bearer $CRON_SECRET` a las llamadas del cron.
  // Falla cerrada: esta ruta gasta LLM y, con Google activado, deja preparada
  // una respuesta pública. Sin secreto configurado no se ejecuta, en lugar de
  // quedar abierta a cualquiera que acierte la URL.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("/api/reviews/poll sin CRON_SECRET: petición rechazada");
    return new NextResponse("Forbidden", { status: 403 });
  }
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${cronSecret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const chatId = chatDelDueno();
  if (!chatId) {
    return NextResponse.json(
      { ok: false, reason: "TELEGRAM_ALLOWED_CHAT_IDS vacío" },
      { status: 400 },
    );
  }

  try {
    await refrescarCola(true);
    const pendientes = await contarPendientes();

    if (pendientes === 0) {
      return NextResponse.json({
        ok: true,
        simulated: isSimulated(),
        kvLive: isKvLive(),
        pendientes: 0,
        avisado: false,
      });
    }

    // Si ya hay un borrador esperando respuesta suya, no le mandamos otro
    // encima: sería empezar el día con dos reseñas a medias.
    const enCurso = await getBorrador(chatId);
    if (enCurso) {
      return NextResponse.json({
        ok: true,
        simulated: isSimulated(),
        pendientes,
        avisado: false,
        motivo: "ya hay un borrador en curso",
      });
    }

    if (pendientes > 1) {
      await sendMessage(
        chatId,
        `Tienes ${pendientes} reseñas sin responder. Empezamos por la que más pesa:`,
      );
    }
    await mostrarSiguienteResena(chatId);

    return NextResponse.json({
      ok: true,
      simulated: isSimulated(),
      kvLive: isKvLive(),
      pendientes,
      avisado: true,
    });
  } catch (e) {
    console.error("/api/reviews/poll falló", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
