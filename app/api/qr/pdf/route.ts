import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/sitio";
import { sinFragmento } from "@/lib/qr";

export const runtime = "nodejs";

function authOk(req: NextRequest): boolean {
  const pass = process.env.QR_ADMIN_PASS;
  if (!pass) return false;
  if (req.cookies.get("qr_admin")?.value === "1") return true;
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
      const [, p] = decoded.split(":");
      if (p === pass) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function buildUrl(site: string, mesa?: number) {
  const base = site.replace(/\/+$/, "");
  const url = mesa ? `${base}/carta?mesa=${encodeURIComponent(String(mesa))}` : `${base}/carta`;
  // Un QR con "#" apunta a algo que el servidor nunca ve: es como se
  // rompieron los carteles ya impresos. Ver lib/qr.ts.
  return sinFragmento(url);
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="qr-admin"' },
    });
  }
  const url = new URL(req.url);
  const site = url.searchParams.get("site") ?? SITE_URL;
  const count = Math.max(1, Math.min(60, Number(url.searchParams.get("count") ?? 12)));

  try {
    sinFragmento(site);
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);

  // A4 portrait: 595 x 842 pt
  const pageW = 595;
  const pageH = 842;
  // 3 cols x 2 filas = 6 QRs por hoja
  const cols = 3;
  const rows = 2;
  const perPage = cols * rows;
  const cellW = pageW / cols;
  const cellH = pageH / rows;
  const qrSize = Math.min(cellW, cellH) * 0.55;
  const margin = 14;

  for (let page = 0; page < Math.ceil(count / perPage); page++) {
    const pdfPage = pdf.addPage([pageW, pageH]);
    const first = page * perPage;
    const last = Math.min(count, first + perPage);
    for (let i = 0; i < perPage; i++) {
      const idx = first + i;
      if (idx >= last) break;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * cellW + cellW / 2;
      const cy = pageH - (row * cellH + cellH / 2);
      const isGeneral = idx === 0 && page === 0 && !url.searchParams.get("generalOnly");
      const target = isGeneral ? buildUrl(site) : buildUrl(site, idx);
      const png = await QRCode.toBuffer(target, {
        type: "png",
        errorCorrectionLevel: "H",
        margin: 2,
        width: 512,
        color: { dark: "#1a1817", light: "#ffffff" },
      });
      const img = await pdf.embedPng(png);
      pdfPage.drawImage(img, {
        x: cx - qrSize / 2,
        y: cy + 8,
        width: qrSize,
        height: qrSize,
      });
      const label = isGeneral ? "Carta general" : `Mesa ${idx}`;
      const titleSize = 14;
      const subSize = 8;
      pdfPage.drawText(label, {
        x: cx - font.widthOfTextAtSize(label, titleSize) / 2,
        y: cy - 14,
        size: titleSize,
        font,
        color: rgb(0.1, 0.09, 0.09),
      });
      pdfPage.drawText(target, {
        x: cx - fontReg.widthOfTextAtSize(target, subSize) / 2,
        y: cy - 28,
        size: subSize,
        font: fontReg,
        color: rgb(0.4, 0.38, 0.36),
      });
      // recuadro suave
      pdfPage.drawRectangle({
        x: col * cellW + margin / 2,
        y: pageH - (row * cellH) - cellH + margin / 2,
        width: cellW - margin,
        height: cellH - margin,
        borderColor: rgb(0.85, 0.82, 0.78),
        borderWidth: 0.5,
      });
    }
    // footer
    pdfPage.drawText("Don Pepe Original · Padrón", {
      x: pageW / 2 - font.widthOfTextAtSize("Don Pepe Original · Padrón", 9) / 2,
      y: 14,
      size: 9,
      font: fontReg,
      color: rgb(0.55, 0.52, 0.48),
    });
  }

  const bytes = await pdf.save();
  return new NextResponse(new Blob([new Uint8Array(bytes)]), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="don-pepe-qrs.pdf"',
      "cache-control": "private, no-store",
    },
  });
}
