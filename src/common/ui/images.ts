// Imágenes de las preguntas: dibujarlas y descargarlas por adelantado. Valen para cualquier sección;
// qué imagen lleva cada pregunta lo decide la sección.

/** Una imagen. Con `alt` vacío, el lector de pantalla no la lee (cuando lo que muestra ya está escrito al lado). */
export function imageElement(src: string, alt: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.decoding = "async";
  return img;
}

// Imágenes pedidas por adelantado. Se guardan aquí para que el navegador no las descarte antes de terminar.
const preloaded = new Map<string, HTMLImageElement>();

/**
 * Descarga y prepara una imagen antes de que haga falta (la de la pregunta siguiente),
 * para que aparezca al instante al pasar de pregunta, aunque la conexión sea lenta.
 */
export function preloadImage(src: string): void {
  if (!src || preloaded.has(src)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  // decode() también la dibuja por adelantado: las imágenes detalladas (los escudos) tardan un poco en dibujarse.
  img.decode?.().catch(() => {});
  preloaded.set(src, img);
}
