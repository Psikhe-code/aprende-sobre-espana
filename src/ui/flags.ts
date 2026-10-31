import { banderaPorClave } from "../engine/questions";

// Vite convierte cada imagen de src/data/banderas en un archivo con su URL.
// Para sustituir una bandera basta con reemplazar su archivo (mismo nombre).
// Comunidades: SVG en src/data/banderas. Provincias: WebP en src/data/banderas/provincias.
const files = import.meta.glob("../data/banderas/**/*.{svg,webp}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

/** URL de una bandera por su clave: código de comunidad ("12") o "p" y código de provincia ("p48"). */
export function flagUrl(clave: string): string | undefined {
  const info = banderaPorClave(clave);
  if (!info) return undefined;
  return files[clave.startsWith("p") ? `../data/banderas/provincias/${info.archivo}` : `../data/banderas/${info.archivo}`];
}

export function flagImage(clave: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = flagUrl(clave) ?? "";
  // Texto alternativo neutro: no puede delatar la respuesta.
  img.alt = clave.startsWith("p") ? "Bandera de una provincia" : "Bandera de una comunidad o ciudad autónoma";
  img.decoding = "async";
  return img;
}
