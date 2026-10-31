import { banderaPorClave } from "../engine/questions";

// Vite convierte cada imagen de src/data/banderas en un archivo con su URL (no la descarga todavía:
// el navegador la pide cuando se muestra). Para sustituir una bandera basta con reemplazar su archivo.
// SVG en src/data/banderas/comunidades y src/data/banderas/provincias.
const files = import.meta.glob("../data/banderas/*/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

/** URL de una bandera por su clave: código de comunidad ("12") o "p" y código de provincia ("p48"). */
export function flagUrl(clave: string): string | undefined {
  const info = banderaPorClave(clave);
  if (!info) return undefined;
  return files[`../data/banderas/${clave.startsWith("p") ? "provincias" : "comunidades"}/${info.archivo}`];
}

export function flagImage(clave: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = flagUrl(clave) ?? "";
  // Texto alternativo neutro: no puede delatar la respuesta.
  img.alt = clave.startsWith("p") ? "Bandera de una provincia" : "Bandera de una comunidad o ciudad autónoma";
  img.decoding = "async";
  return img;
}

// Banderas pedidas por adelantado. Se guardan aquí para que el navegador no las descarte antes de terminar.
const precargadas = new Map<string, HTMLImageElement>();

/**
 * Descarga y prepara una bandera antes de que haga falta (la de la pregunta siguiente),
 * para que aparezca al instante al pasar de pregunta, aunque la conexión sea lenta.
 */
export function precargarBandera(clave: string): void {
  const url = flagUrl(clave);
  if (!url || precargadas.has(url)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  // decode() también la dibuja por adelantado: los escudos detallados tardan un poco en dibujarse.
  img.decode?.().catch(() => {});
  precargadas.set(url, img);
}

