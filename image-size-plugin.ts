/**
 * @fileoverview Complemento de Vite que da el tamaño de una imagen sin descargarla: al importar una imagen con
 * `?dimensions`, Vite lee el archivo al construir el juego y escribe en el código su ancho y su alto.
 * Sirve para reservar el hueco de la imagen de una pregunta antes de que llegue, con su proporción.
 */

import { imageSizeFromFile } from "image-size/fromFile";
import type { Plugin } from "vite";

const QUERY = "?dimensions";

export function imageSizePlugin(): Plugin {
  return {
    name: "image-size",
    // Va antes que el resto, para que no lo trate como una imagen normal (que daría su dirección).
    enforce: "pre",
    async load(id) {
      if (!id.endsWith(QUERY)) return null;
      const file = id.slice(0, -QUERY.length);
      // image-size lee el ancho y el alto de la cabecera: en un SVG, de width y height o, si no están, del viewBox.
      // Si no los encuentra, falla la construcción con el nombre del archivo, en vez de dejar una imagen sin hueco.
      const { width, height } = await imageSizeFromFile(file);
      if (!width || !height) throw new Error(`No se sabe el tamaño de la imagen ${file}`);
      return `export default ${JSON.stringify({ width, height })};`;
    }
  };
}
