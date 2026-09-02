export type CategoriaMenu = "entrantes" | "arroces" | "pescados" | "carnes";

export interface PlatoBase {
  id: string;
  nombre: string;
  precio?: number;
  precio_texto?: string;
  nota?: string;
  /** frase corta de sala; es la que se traduce al idioma del visitante */
  descripcion?: string;
  /**
   * Ruta de la foto del plato, servida desde /public (p. ej. "/img/pulpo.jpg").
   * Vive en el DATO y no en el código a propósito: cambiar la foto de un plato
   * es editar este campo, sin desplegar. Un plato sin este campo no ofrece
   * foto — ni marcador de posición ni hueco.
   */
  imagen?: string;
  /** cuando el dueño lo desactiva "hasta nueva orden" */
  disabled?: boolean;
  // ⚠️ ALÉRGENOS: si añades aquí un campo de alérgenos (alergenos, allergens,
  // alérgenos...), para o revisa antes scripts/test-proteccion-alergenos.ts
  // y la lista PROHIBIDOS que lee de ahí. Ese test comprueba, contra el
  // ActionSchema y el applyAction reales (sin tocarlos), que ninguna acción
  // del bot -ni WhatsApp ni Telegram- puede escribir en un campo de
  // alérgenos. Un campo nuevo sin pasar por esa revisión es exactamente el
  // hueco por el que un bot podría acabar "traduciendo" o inventando un
  // alérgeno: un riesgo sanitario real, no cosmético.
}

export interface MenuDelDia {
  id: string;
  nombre: string;
  precio: number;
  disponibilidad: string;
  primeros?: string[];
  segundos?: string[];
  platos?: string[];
  incluye?: string;
  no_incluye?: string;
  disabled?: boolean;
}

export interface Menu {
  entrantes: PlatoBase[];
  arroces: PlatoBase[];
  pescados: PlatoBase[];
  carnes: PlatoBase[];
  menus: MenuDelDia[];
  /** horas en formato "HH:mm-HH:mm" por día, lunes=0 … domingo=6 */
  horario?: Record<number, string[]>;
  /** aviso corto que se muestra encima de la carta */
  aviso?: string;
}

export const CATEGORIAS: CategoriaMenu[] = ["entrantes", "arroces", "pescados", "carnes"];

export const CATEGORIA_LABELS: Record<CategoriaMenu, string> = {
  entrantes: "Entrantes",
  arroces: "Arroces",
  pescados: "Pescados",
  carnes: "Carnes",
};
