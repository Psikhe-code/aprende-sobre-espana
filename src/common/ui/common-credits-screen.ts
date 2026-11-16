/**
 * @fileoverview Pantalla de Créditos, una por sección: cada una enseña lo suyo (en Geografía, el autor y la licencia
 * de cada bandera; en el Examen, de dónde salen las preguntas) y lo que es de todo el juego (las tipografías).
 */

import type { SectionDefinition } from "./common-section";
import { $ } from "./common-dom";

export function renderCredits(section: SectionDefinition): void {
  // Los bloques con data-section son de una sección; los demás, de todas.
  for (const block of document.querySelectorAll<HTMLElement>("#credits [data-section]")) {
    block.hidden = block.dataset.section !== section.id;
  }
  $("credits").setAttribute("aria-label", section.creditsName);
  section.renderCredits?.();
}
