export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brasa-300">
        Don Pepe Original
      </p>
      <h1 className="mt-4 font-display text-4xl text-white">No encontramos esa página</h1>
      <p className="mt-3 text-carbon-300">
        Vuelve a la carta o llámanos al 881 82 97 28 y te ayudamos.
      </p>
      <a
        href="/"
        className="mt-6 rounded-full bg-brasa-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brasa-600"
      >
        Ir al inicio
      </a>
    </main>
  );
}
