import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/sitio";
import { sinFragmento } from "@/lib/qr";

export const runtime = "nodejs";

/**
 * Cartel de mesa: UN solo QR, grande, listo para imprimir y pegar.
 *
 * Distinto de /api/qr/pdf, que saca una plancha de 6 QRs pequeños por hoja para
 * recortar y numerar mesa a mesa. Este es el que el dueño manda a imprimir.
 *
 * Todo en negro sobre blanco a propósito: la mayoría de los bares imprimen en
 * una láser normal, y un QR con color de marca pierde contraste en escala de
 * grises. La corrección de errores va en "H", la más alta, para que siga
 * leyéndose con una mancha de aceite encima.
 *
 * Las tipografías son las estándar del PDF, no Cormorant e Inter: las de la
 * casa están en woff2 y pdf-lib solo incrusta TTF/OTF. Times evoca la serif de
 * la marca sin añadir una dependencia para convertir formatos.
 *
 *   /api/qr/cartel                → A5, carta general
 *   /api/qr/cartel?formato=a4     → A4
 *   /api/qr/cartel?mesa=7         → apunta a /carta?mesa=7
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

/** A5 y A4 vertical, en puntos PostScript (72 pt = 1 pulgada). */
const FORMATOS = {
  a5: { w: 420, h: 595 },
  a4: { w: 595, h: 842 },
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
  const { w: pageW, h: pageH } = FORMATOS[clave === "a4" ? "a4" : "a5"];

  const base = (url.searchParams.get("site") ?? SITE_URL).replace(/\/+$/, "");
  const mesaCruda = url.searchParams.get("mesa");
  const mesa = mesaCruda ? mesaCruda.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) : "";
  const destino = mesa ? `${base}/carta?mesa=${encodeURIComponent(mesa)}` : `${base}/carta`;
  // Un QR con "#" apunta a algo que el servidor nunca ve: es exactamente
  // como se rompieron los carteles ya impresos. Ver lib/qr.ts.
  try {
    sinFragmento(destino);
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageW, pageH]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const negro = rgb(0, 0, 0);
  const gris = rgb(0.42, 0.42, 0.42);
  const centrar = (texto: string, fuente: typeof serif, tam: number) =>
    (pageW - fuente.widthOfTextAtSize(texto, tam)) / 2;

  /* ── El QR: manda el tamaño, todo lo demás se coloca alrededor ── */
  // 62 % del ancho de página: ~9,2 cm en A5 y ~13 cm en A4. A 40 cm de
  // distancia, que es lo que hay del borde de la mesa, sobra de largo.
  const qrLado = Math.round(pageW * 0.62);
  const png = await QRCode.toBuffer(destino, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 1400,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const img = await pdf.embedPng(png);
  const qrX = (pageW - qrLado) / 2;
  const qrY = pageH * 0.5 - qrLado * 0.42;

  /* ── Marca, arriba ── */
  const nombre = "DON PEPE ORIGINAL";
  const tamNombre = Math.round(pageW * 0.062);
  page.drawText(nombre, {
    x: centrar(nombre, serif, tamNombre),
    y: pageH - pageH * 0.13,
    size: tamNombre,
    font: serif,
    color: negro,
  });

  const sitio = "RÚA LONGA 21 · PADRÓN";
  const tamSitio = Math.round(pageW * 0.021);
  page.drawText(sitio, {
    x: centrar(sitio, sans, tamSitio),
    y: pageH - pageH * 0.165,
    size: tamSitio,
    font: sans,
    color: gris,
  });

  // Filete fino bajo la marca
  page.drawRectangle({
    x: pageW * 0.32,
    y: pageH - pageH * 0.2,
    width: pageW * 0.36,
    height: 0.8,
    color: negro,
  });

  /* ── El QR ── */
  page.drawImage(img, { x: qrX, y: qrY, width: qrLado, height: qrLado });
  // Marco: ayuda a recortar y da borde limpio si se pega sobre madera
  page.drawRectangle({
    x: qrX - 10,
    y: qrY - 10,
    width: qrLado + 20,
    height: qrLado + 20,
    borderColor: negro,
    borderWidth: 1,
  });

  /* ── La llamada a la acción ── */
  const invita = mesa ? `Escanea para ver la carta · Mesa ${mesa}` : "Escanea para ver la carta";
  const tamInvita = Math.round(pageW * 0.046);
  page.drawText(invita, {
    x: centrar(invita, sansBold, tamInvita),
    y: qrY - 52,
    size: tamInvita,
    font: sansBold,
    color: negro,
  });

  const legible = destino.replace(/^https?:\/\//, "");
  const tamLegible = Math.round(pageW * 0.026);
  page.drawText(legible, {
    x: centrar(legible, sans, tamLegible),
    y: qrY - 52 - tamInvita - 10,
    size: tamLegible,
    font: sans,
    color: gris,
  });

  const bytes = await pdf.save();
  const nombreFichero = mesa
    ? `don-pepe-carta-qr-mesa-${mesa}-${clave === "a4" ? "a4" : "a5"}.pdf`
    : `don-pepe-carta-qr-${clave === "a4" ? "a4" : "a5"}.pdf`;

  return new NextResponse(new Blob([new Uint8Array(bytes)]), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${nombreFichero}"`,
      "cache-control": "private, no-store",
    },
  });
}
