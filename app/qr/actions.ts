"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData): Promise<void> {
  const pass = process.env.QR_ADMIN_PASS;
  const provided = String(formData.get("p") ?? "");
  if (!pass) redirect("/qr?error=1");
  if (provided !== pass) redirect("/qr?error=1");
  cookies().set("qr_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/qr",
    maxAge: 60 * 60 * 8,
  });
  redirect("/qr");
}

export async function logoutAction(): Promise<void> {
  cookies().delete("qr_admin");
  redirect("/qr");
}
