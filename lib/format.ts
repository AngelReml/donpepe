export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/** "20,00 €" o "S/M" si el plato tiene precio_texto */
export function formatPlatoPrecio(plato: { precio?: number; precio_texto?: string }): string {
  if (plato.precio_texto) return plato.precio_texto;
  if (typeof plato.precio === "number") return formatPrice(plato.precio);
  return "";
}
