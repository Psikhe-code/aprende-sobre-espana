/**
 * @fileoverview La lista de secciones: que los ids no se repitan y que lo que cada sección dice de index.html exista.
 */

import { describe, expect, it } from "vitest";
import { SECTION_LIST, UPCOMING_SECTIONS } from "../src/sections/sections";
import indexHtml from "../index.html?raw";

/** Los id de todos los elementos de index.html. */
const HTML_IDS = new Set([...indexHtml.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

describe("lista de secciones", () => {
  it("no hay dos secciones con el mismo id, tampoco entre las que vendrán", () => {
    const ids = [...SECTION_LIST, ...UPCOMING_SECTIONS].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SECTION_LIST.map((s) => [s.id, s] as const))(
    "%s: sus pantallas y los botones de su inicio existen en index.html",
    (_id, s) => {
      const declared = [s.screens.start, s.screens.settings, ...(s.screens.play ?? []), ...Object.values(s.buttons)];
      expect(declared.filter((id) => !HTML_IDS.has(id))).toEqual([]);
    }
  );

  it("la comprobación de arriba detecta un id con una errata", () => {
    const start = SECTION_LIST[0].screens.start;
    expect(HTML_IDS.has(start)).toBe(true);
    expect(HTML_IDS.has(start + "x")).toBe(false);
  });
});
