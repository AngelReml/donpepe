import { cookies } from "next/headers";
import { QRAdmin } from "@/components/QRAdmin";
import { loginAction, logoutAction } from "./actions";
import { SITE_URL } from "@/lib/sitio";

export const dynamic = "force-dynamic";
export const metadata = { title: "QR Admin", robots: { index: false, follow: false } };

export default function QRPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const pass = process.env.QR_ADMIN_PASS ?? "";

  if (!pass) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl text-white">QR admin no configurado</h1>
        <p className="mt-3 text-carbon-300">
          Define la variable <code className="rounded bg-carbon-800 px-1">QR_ADMIN_PASS</code>{" "}
          en el entorno para acceder a esta página.
        </p>
      </main>
    );
  }

  const isAuthed = cookies().get("qr_admin")?.value === "1";

  if (!isAuthed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl text-white">Acceso QR</h1>
        {searchParams?.error ? (
          <p className="mt-3 rounded border border-brasa-700/60 bg-brasa-900/40 px-3 py-2 text-sm text-brasa-100">
            Contraseña incorrecta.
          </p>
        ) : null}
        <form action={loginAction} className="mt-6 space-y-3 rounded-lg border border-carbon-800 bg-carbon-900 p-5">
          <label htmlFor="p" className="block text-sm text-carbon-200">
            Contraseña
          </label>
          <input
            id="p"
            name="p"
            type="password"
            className="w-full rounded-md border border-carbon-700 bg-carbon-800 px-3 py-2 text-white"
            autoFocus
            required
          />
          <button
            type="submit"
            className="rounded-md bg-brasa-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brasa-600"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const site = SITE_URL;

  return (
    <>
      <form action={logoutAction} className="fixed right-4 top-4 z-10">
        <button
          type="submit"
          className="rounded-md border border-carbon-700 bg-carbon-800/80 px-3 py-1.5 text-xs text-carbon-200 hover:border-brasa-700 hover:text-white"
        >
          Salir
        </button>
      </form>
      <QRAdmin siteBase={site} />
    </>
  );
}
