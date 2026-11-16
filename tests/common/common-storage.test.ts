/**
 * @fileoverview Lo que se guarda en el dispositivo: lo de por defecto, lo que se descarta al cargar y las opciones de
 * cada sección.
 */

import { describe, expect, it } from "vitest";
import { loadState, saveState, sectionSettings, STORAGE_KEY } from "../../src/common/engine/common-storage";
import { recordKeyEnding } from "../../src/common/engine/common-round-settings";

/** Hace como si en el dispositivo estuviera guardado `data` (o un texto, tal cual) mientras se ejecuta `fn`. */
function withSavedData(data: unknown, fn: (store: Map<string, string>) => void) {
  const store = new Map([[STORAGE_KEY, typeof data === "string" ? data : JSON.stringify(data)]]);
  const previous = (globalThis as { localStorage?: unknown }).localStorage;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); }
  };
  try { fn(store); } finally { (globalThis as { localStorage?: unknown }).localStorage = previous; }
}

describe("guardado", () => {
  it("la primera vez, sin sección elegida, sin récords y sin opciones guardadas", () => {
    expect(loadState()).toEqual({ section: null, records: {}, settings: {} });
  });

  it("se recuerdan la sección, los récords y las opciones", () => {
    const saved = { section: "ccse", records: { "ccse/1/10preguntas/60s": 7 }, settings: { ccse: { tareas: [1] } } };
    withSavedData(saved, () => expect(loadState()).toEqual(saved));
  });

  it("se descarta lo que no tiene la forma esperada: un récord que no es un número, una sección que no es un texto", () => {
    withSavedData({ section: 3, records: { a: 5, b: "5", c: { x: 1 }, d: null }, settings: [1, 2] }, () =>
      expect(loadState()).toEqual({ section: null, records: { a: 5 }, settings: {} }));
    withSavedData("esto no es JSON", () => expect(loadState()).toEqual({ section: null, records: {}, settings: {} }));
    withSavedData(null, () => expect(loadState()).toEqual({ section: null, records: {}, settings: {} }));
  });

  it("lo guardado con el formato de antes no se convierte: se empieza de cero", () => {
    withSavedData({ seccion: "ccse", best: { "capitales/comunidad": 8 }, selected: ["banderas"], ccse: { tareas: [1] } }, () =>
      expect(loadState()).toEqual({ section: null, records: {}, settings: {} }));
  });

  it("al guardar, se guarda todo, y al volver a cargar sale lo mismo", () => {
    withSavedData({}, (store) => {
      const s = loadState();
      s.section = "geografia";
      s.records["geografia/x"] = 9;
      s.settings.geografia = { categories: ["capitales"] };
      saveState(s);
      expect(JSON.parse(store.get(STORAGE_KEY)!)).toEqual(s);
      expect(loadState()).toEqual(s);
    });
  });
});

describe("opciones de cada sección", () => {
  const load = (raw: unknown) => ({ n: typeof raw === "object" && raw !== null && "n" in raw && typeof raw.n === "number" ? raw.n : 1 });

  it("se comprueban con el `load` de la sección: lo que falta o no vale, por defecto", () => {
    expect(sectionSettings(loadState(), "x", load)).toEqual({ n: 1 });
    withSavedData({ settings: { x: { n: 5 } } }, () => expect(sectionSettings(loadState(), "x", load)).toEqual({ n: 5 }));
    withSavedData({ settings: { x: { n: "5" } } }, () => expect(sectionSettings(loadState(), "x", load)).toEqual({ n: 1 }));
  });

  it("se comprueban una sola vez: después se devuelven las mismas, y lo que se cambia en ellas se guarda", () => {
    withSavedData({}, (store) => {
      const s = loadState();
      const first = sectionSettings(s, "x", load);
      first.n = 7;
      expect(sectionSettings(s, "x", load)).toBe(first);
      saveState(s);
      expect(JSON.parse(store.get(STORAGE_KEY)!).settings.x).toEqual({ n: 7 });
    });
  });
});

describe("clave del récord", () => {
  it("su final, igual en todas las secciones: el número de preguntas y el tiempo, siempre escritos", () => {
    expect(recordKeyEnding(10, 60)).toBe("/10preguntas/60s");
    expect(recordKeyEnding(25, 10)).toBe("/25preguntas/10s");
    expect(recordKeyEnding("sinLimite", "sinTiempo")).toBe("/sinlimite/sintiempo");
  });
});
