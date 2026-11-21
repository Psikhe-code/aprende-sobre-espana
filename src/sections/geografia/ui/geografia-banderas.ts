/**
 * @fileoverview Geografía: las imágenes de las banderas.
 */

import { banderaByKey } from "../engine/geografia-questions";
import type { RoundQuestion } from "../engine/geografia-types";
import type { QuestionImage } from "../../../common/engine/common-types";
import { imageElement, type ImageSize } from "../../../common/ui/common-images";

// Vite convierte cada imagen de src/sections/geografia/data/banderas en un archivo con su URL (no la descarga todavía:
// el navegador la pide cuando se muestra). Para sustituir una bandera basta con reemplazar su archivo.
// SVG en src/sections/geografia/data/banderas/comunidades y src/sections/geografia/data/banderas/provincias.
const files = import.meta.glob<string>("../data/banderas/*/*.svg", { eager: true, query: "?url", import: "default" });
// El ancho y el alto de cada una, leídos de su archivo al construir el juego (ver image-size-plugin.ts):
// con ellos se reserva el hueco de la bandera antes de que llegue.
const sizes = import.meta.glob<ImageSize>("../data/banderas/*/*.svg", { eager: true, query: "?dimensions", import: "default" });

/** Ruta de una bandera dentro de la carpeta de datos, por su clave: código de comunidad ("12") o "p" y código de provincia ("p48"). */
function banderaPath(key: string): string | undefined {
  const info = banderaByKey(key);
  return info && `../data/banderas/${key.startsWith("p") ? "provincias" : "comunidades"}/${info.archivo}`;
}

/** URL de una bandera por su clave. */
export function banderaUrl(key: string): string | undefined {
  const path = banderaPath(key);
  return path ? files[path] : undefined;
}

/** Ancho y alto de una bandera por su clave. */
export function banderaSize(key: string): ImageSize | undefined {
  const path = banderaPath(key);
  return path ? sizes[path] : undefined;
}

/** Imagen de una bandera, con su texto alternativo (en Créditos, "": el nombre ya está escrito al lado). */
export function banderaImage(key: string, alt: string): HTMLImageElement {
  return imageElement(banderaUrl(key) ?? "", alt, banderaSize(key));
}

/**
 * La imagen de una pregunta de Geografía: su bandera, si la tiene. Mientras se responde, el texto alternativo
 * es neutro, para que no delate la respuesta; en la lista de fallos ya se sabe de quién es: «Bandera: Cantabria».
 */
export function banderaQuestionImage(q: RoundQuestion): QuestionImage | undefined {
  if (!q.banderaKey) return undefined;
  // Toda bandera tiene su tamaño (si Vite no lo leyera, fallaría la construcción); el 3:2 es solo por si acaso.
  const size = banderaSize(q.banderaKey) ?? { width: 3, height: 2 };
  return {
    src: banderaUrl(q.banderaKey) ?? "",
    width: size.width,
    height: size.height,
    alt: q.banderaKey.startsWith("p") ? "Bandera de una provincia" : "Bandera de una comunidad o ciudad autónoma",
    answerAlt: `Bandera: ${q.correctAnswer}`
  };
}
