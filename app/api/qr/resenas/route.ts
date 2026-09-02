import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { sinFragmento } from "@/lib/qr";
import { GOOGLE_REVIEWS_URL } from "@/lib/resenas";

export const runtime = "nodejs";

/**
 * Cartelito de reseñas para plastificar en la barra. Reutiliza la misma
 * protección de lib/qr.ts que ya usa /api/qr/cartel: si algún día
 * GOOGLE_REVIEWS_URL lleva un "#" (un enlace roto, o alguien pegó el sitio
 * equivocado), esto falla con un mensaje claro en vez de imprimir un QR que
 * no lleva a ningún sitio.
 *
 * Sobrio a propósito: "¿Qué tal ha ido?" arriba, QR grande y centrado,
 * nombre del local abajo. Nada de relleno.
 *
 *   /api/qr/resenas               → A5
 *   /api/qr/resenas?formato=a6    → A6
 */

function authOk(req: NextRequest): boolean {
  const pass = process.env.QR_ADMIN_PASS;
  if (!pass) return false;
  if (req.cookies.get("qr_admin")?.value === "1") return true;
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [, p] = Buffer.from(header.slice(6), "base64").toString("utf-8").split(":");
      if (p === pass) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

/** A5 y A6 vertical, en puntos PostScript (72 pt = 1 pulgada). */
const FORMATOS = {
  a5: { w: 420, h: 595 },
  a6: { w: 298, h: 420 },
} as const;

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="qr-admin"' },
    });
  }

  const url = new URL(req.url);
  const clave = (url.searchParams.get("formato") ?? "a5").toLowerCase();
  const { w: pageW, h: pageH } = FORMATOS[clave === "a6" ? "a6" : "a5"];

  let destino: string;
  try {
    destino = sinFragmento(GOOGLE_REVIEWS_URL);
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }
  if (!/^https?:\/\//.test(destino)) {
    return new NextResponse(
      `GOOGLE_REVIEWS_URL todavía no está rellenada (lib/resenas.ts): "${destino}"`,
      { status: 400 },
    );
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageW, pageH]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  const negro = rgb(0, 0, 0);
  const gris = rgb(0.42, 0.42, 0.42);
  const centrar = (texto: string, fuente: typeof serif, tam: number) =>
    (pageW - fuente.widthOfTextAtSize(texto, tam)) / 2;

  const titulo = "¿Qué tal ha ido?";
  const tamTitulo = Math.round(pageW * 0.09);
  page.drawText(titulo, {
    x: centrar(titulo, serif, tamTitulo),
    y: pageH - pageH * 0.14,
    size: tamTitulo,
    font: serif,
    color: negro,
  });

  const subtitulo = "Dos líneas nos ayudan mucho.";
  const tamSubtitulo = Math.round(pageW * 0.032);
  page.drawText(subtitulo, {
    x: centrar(subtitulo, sans, tamSubtitulo),
    y: pageH - pageH * 0.14 - tamTitulo - 10,
    size: tamSubtitulo,
    font: sans,
    color: gris,
  });

  const qrLado = Math.round(pageW * 0.6);
  const png = await QRCode.toBuffer(destino, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 1200,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const img = await pdf.embedPng(png);
  const qrX = (pageW - qrLado) / 2;
  const qrY = pageH * 0.5 - qrLado * 0.45;
  page.drawImage(img, { x: qrX, y: qrY, width: qrLado, height: qrLado });
  page.drawRectangle({
    x: qrX - 10,
    y: qrY - 10,
    width: qrLado + 20,
    height: qrLado + 20,
    borderColor: negro,
    borderWidth: 1,
  });

  const nombre = "DON PEPE ORIGINAL";
  const tamNombre = Math.round(pageW * 0.055);
  page.drawText(nombre, {
    x: centrar(nombre, serif, tamNombre),
    y: qrY - 40,
    size: tamNombre,
    font: serif,
    color: negro,
  });

  const pie = "Rúa Longa 21 · Padrón";
  const tamPie = Math.round(pageW * 0.028);
  page.drawText(pie, {
    x: centrar(pie, sans, tamPie),
    y: qrY - 40 - tamNombre - 12,
    size: tamPie,
    font: sans,
    color: gris,
  });

  const bytes = await pdf.save();
  return new NextResponse(new Blob([new Uint8Array(bytes)]), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="don-pepe-resenas-${clave === "a6" ? "a6" : "a5"}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
