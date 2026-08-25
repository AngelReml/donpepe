import { NextRequest, NextResponse } from "next/server";
import { getProvider, isAllowedNumber } from "@/lib/whatsapp";
import { handleOwnerMessage } from "@/lib/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVAS_TEXT =
  "Este número es solo para gestión interna. Para reservas, llama al 881 82 97 28.";

export async function GET(req: NextRequest) {
  const provider = getProvider();
  const result = await provider.verifyWebhook(req);
  if (result.ok && result.challenge) {
    return new NextResponse(result.challenge, { status: 200 });
  }
  return NextResponse.json({ ok: result.ok });
}

export async function POST(req: NextRequest) {
  const provider = getProvider();
  // El cuerpo se lee crudo una sola vez: la firma se calcula sobre los bytes
  // exactos, así que no se puede volver a serializar el JSON ya parseado.
  const cuerpo = await req.text();
  if (!provider.verificarFirma(req, cuerpo)) {
    // Sin esto bastaba con poner el número del dueño en el cuerpo para que el
    // agente aceptara órdenes y cambiara la carta publicada.
    console.warn("webhook de WhatsApp rechazado: firma ausente o incorrecta");
    return NextResponse.json({ error: "firma no válida" }, { status: 401 });
  }
  let messages;
  try {
    messages = await provider.parseInbound(cuerpo);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  for (const m of messages) {
    if (!isAllowedNumber(m.from)) {
      try {
        await provider.sendText(m.from, RESERVAS_TEXT);
      } catch (e) {
        console.error("send blocked reply failed", e);
      }
      continue;
    }
    try {
      const { reply } = await handleOwnerMessage(m.text, m.from);
      await provider.sendText(m.from, reply);
    } catch (e) {
      console.error("owner message failed", e);
      try {
        await provider.sendText(
          m.from,
          "Ups, ha fallado algo por mi parte. Inténtalo de nuevo en un minuto.",
        );
      } catch {
        // ignore
      }
    }
  }
  return NextResponse.json({ ok: true, processed: messages.length });
}
