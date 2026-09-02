import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { sinFragmento } from "@/lib/qr";

export const runtime = "nodejs";

function basicAuthOk(req: NextRequest): boolean {
  const pass = process.env.QR_ADMIN_PASS;
  if (!pass) return false;
  const cookie = req.cookies.get("qr_admin")?.value;
  if (cookie === "1") return true;
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

export async function GET(req: NextRequest) {
  if (!basicAuthOk(req)) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="qr-admin"' },
    });
  }
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "png").toLowerCase();
  const size = Math.max(64, Math.min(4096, Number(url.searchParams.get("size") ?? 1024)));
  const data = url.searchParams.get("data") ?? "";
  if (!data) {
    return new NextResponse("Missing data", { status: 400 });
  }
  // Validamos que sea http(s)
  if (!/^https?:\/\//.test(data)) {
    return new NextResponse("Only http(s) URLs allowed", { status: 400 });
  }
  // Un QR con "#" apunta a algo que el servidor nunca llega a ver: es como
  // se rompieron los carteles ya impresos. Ver lib/qr.ts.
  try {
    sinFragmento(data);
  } catch (e) {
    return new NextResponse((e as Error).message, { status: 400 });
  }

  if (format === "svg") {
    const svg = await QRCode.toString(data, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 4,
    });
    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }
  if (format === "png") {
    const png = await QRCode.toBuffer(data, {
      type: "png",
      errorCorrectionLevel: "H",
      margin: 4,
      width: size,
      color: { dark: "#1a1817", light: "#ffffff" },
    });
    return new NextResponse(new Blob([new Uint8Array(png)]), {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=3600",
      },
    });
  }
  return new NextResponse("Unsupported format", { status: 400 });
}
