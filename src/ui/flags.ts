import { BANDERAS } from "../engine/questions";

// Vite convierte cada SVG de src/data/banderas en un archivo con su URL.
// Para sustituir una bandera basta con reemplazar su archivo (mismo nombre).
const files = import.meta.glob("../data/banderas/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

/** URL de la bandera de una comunidad o ciudad autónoma, por su código INE. */
export function flagUrl(comunidadId: string): string | undefined {
  const info = BANDERAS[comunidadId];
  return info ? files[`../data/banderas/${info.archivo}`] : undefined;
}

export function flagImage(comunidadId: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = flagUrl(comunidadId) ?? "";
  // Texto alternativo neutro: no puede delatar la respuesta.
  img.alt = "Bandera de una comunidad o ciudad autónoma";
  img.decoding = "async";
  return img;
}
