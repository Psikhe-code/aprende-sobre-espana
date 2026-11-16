// Geografía: las imágenes de las banderas.

import { banderaByKey } from "../engine/questions";
import type { RoundQuestion } from "../engine/types";
import type { QuestionImage } from "../../../common/engine/types";
import { imageElement } from "../../../common/ui/images";

// Vite convierte cada imagen de src/sections/geografia/data/banderas en un archivo con su URL (no la descarga todavía:
// el navegador la pide cuando se muestra). Para sustituir una bandera basta con reemplazar su archivo.
// SVG en src/sections/geografia/data/banderas/comunidades y src/sections/geografia/data/banderas/provincias.
const files = import.meta.glob<string>("../data/banderas/*/*.svg", { eager: true, query: "?url", import: "default" });

/** URL de una bandera por su clave: código de comunidad ("12") o "p" y código de provincia ("p48"). */
export function banderaUrl(key: string): string | undefined {
  const info = banderaByKey(key);
  if (!info) return undefined;
  return files[`../data/banderas/${key.startsWith("p") ? "provincias" : "comunidades"}/${info.archivo}`];
}

/** Imagen de una bandera, con su texto alternativo (en Créditos, "": el nombre ya está escrito al lado). */
export function banderaImage(key: string, alt: string): HTMLImageElement {
  return imageElement(banderaUrl(key) ?? "", alt);
}

/**
 * La imagen de una pregunta de Geografía: su bandera, si la tiene. Mientras se responde, el texto alternativo
 * es neutro, para que no delate la respuesta; en la lista de fallos ya se sabe de quién es: «Bandera: Cantabria».
 */
export function banderaQuestionImage(q: RoundQuestion): QuestionImage | undefined {
  if (!q.banderaKey) return undefined;
  return {
    src: banderaUrl(q.banderaKey) ?? "",
    alt: q.banderaKey.startsWith("p") ? "Bandera de una provincia" : "Bandera de una comunidad o ciudad autónoma",
    answerAlt: `Bandera: ${q.answer}`
  };
}
