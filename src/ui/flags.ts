import { BANDERAS } from "../engine/questions";

// Vite convierte cada SVG de src/data/banderas en un archivo con su URL.
// Para sustituir una bandera basta con reemplazar su archivo (mismo nombre).
const files = import.meta.glob("../data/banderas/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

export function flagUrl(comunidad: string): string | undefined {
  const info = BANDERAS[comunidad];
  return info ? files[`../data/banderas/${info.archivo}`] : undefined;
}

export function flagImage(comunidad: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = flagUrl(comunidad) ?? "";
  img.alt = "Bandera de una comunidad autónoma";
  img.decoding = "async";
  return img;
}
