/**
 * Proveedor WhatsApp: Meta Cloud por defecto, Twilio como alternativa.
 * El agente NO depende de qué proveedor haya: ambos exponen
 * { parseInbound, sendText, verifyWebhook }.
 */
import crypto from "node:crypto";

export type InboundMessage = {
  from: string; // E.164 sin '+'
  text: string;
  id: string;
};

export interface WhatsappProvider {
  parseInbound(cuerpo: string): Promise<InboundMessage[]>;
  sendText(to: string, text: string): Promise<void>;
  verifyWebhook(req: Request): Promise<{ ok: boolean; challenge?: string }>;
  /**
   * ¿Viene de verdad del proveedor? El remitente que trae el cuerpo (`from`)
   * no prueba nada: lo escribe quien llama. Sin esto, cualquiera que acierte
   * la URL puede hacerse pasar por el dueño y reescribir la carta.
   */
  verificarFirma(req: Request, cuerpo: string): boolean;
}

/** Compara sin filtrar por tiempo y sin reventar si las longitudes difieren. */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

class MetaCloudProvider implements WhatsappProvider {
  verificarFirma(req: Request, cuerpo: string): boolean {
    const secreto = process.env.WHATSAPP_APP_SECRET;
    // Falla cerrada: sin secreto configurado no se acepta ningún mensaje.
    if (!secreto) return false;
    const recibida = req.headers.get("x-hub-signature-256") ?? "";
    const esperada =
      "sha256=" + crypto.createHmac("sha256", secreto).update(cuerpo, "utf8").digest("hex");
    return igualesEnTiempoConstante(recibida, esperada);
  }

  async parseInbound(cuerpo: string): Promise<InboundMessage[]> {
    const body = JSON.parse(cuerpo) as any;
    const entries: any[] = body?.entry ?? [];
    const out: InboundMessage[] = [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const messages = value.messages ?? [];
        const phoneId = value.metadata?.phone_number_id;
        for (const m of messages) {
          if (m.type !== "text") continue;
          out.push({
            from: String(m.from),
            id: String(m.id),
            text: String(m.text?.body ?? "").trim(),
          });
        }
        // ack
        void phoneId;
      }
    }
    return out;
  }

  async sendText(to: string, text: string): Promise<void> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) throw new Error("Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID.");
    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text.slice(0, 4096) },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Meta Cloud send ${res.status}: ${t}`);
    }
  }

  async verifyWebhook(req: Request): Promise<{ ok: boolean; challenge?: string }> {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") ?? undefined;
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return { ok: true, challenge };
    }
    return { ok: false };
  }
}

class TwilioProvider implements WhatsappProvider {
  verificarFirma(req: Request, cuerpo: string): boolean {
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!token) return false;
    // Twilio firma la URL pública exacta seguida de los campos ordenados por
    // clave. Detrás del proxy de Vercel, req.url no siempre es esa URL, así
    // que se puede fijar a mano con TWILIO_WEBHOOK_URL.
    const url = process.env.TWILIO_WEBHOOK_URL || req.url;
    const params = new URLSearchParams(cuerpo);
    let base = url;
    for (const clave of [...new Set(params.keys())].sort()) {
      for (const valor of params.getAll(clave)) base += clave + valor;
    }
    const esperada = crypto.createHmac("sha1", token).update(Buffer.from(base, "utf8")).digest("base64");
    return igualesEnTiempoConstante(req.headers.get("x-twilio-signature") ?? "", esperada);
  }

  async parseInbound(cuerpo: string): Promise<InboundMessage[]> {
    // Twilio envía application/x-www-form-urlencoded
    const form = new URLSearchParams(cuerpo);
    const from = String(form.get("From") ?? "");
    const body = String(form.get("Body") ?? "").trim();
    const id = String(form.get("MessageSid") ?? crypto.randomBytes(6).toString("hex"));
    const fromDigits = from.replace(/^whatsapp:\+/, "").replace(/\D/g, "");
    if (!fromDigits || !body) return [];
    return [{ from: fromDigits, id, text: body }];
  }

  async sendText(to: string, text: string): Promise<void> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!sid || !token || !from) throw new Error("Faltan credenciales Twilio.");
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams();
    params.set("From", from);
    params.set("To", `whatsapp:+${to}`);
    params.set("Body", text.slice(0, 1600));
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Twilio send ${res.status}: ${t}`);
    }
  }

  async verifyWebhook(req: Request): Promise<{ ok: boolean; challenge?: string }> {
    // Twilio no usa challenge: la verificación es por firma en producción.
    return { ok: true };
  }
}

export function getProvider(): WhatsappProvider {
  const p = (process.env.WHATSAPP_PROVIDER ?? "meta").toLowerCase();
  return p === "twilio" ? new TwilioProvider() : new MetaCloudProvider();
}

export function isAllowedNumber(from: string): boolean {
  const allowed = (process.env.WHATSAPP_ALLOWED_NUMBERS ?? "")
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean);
  const normalized = from.replace(/\D/g, "");
  return allowed.includes(normalized);
}
