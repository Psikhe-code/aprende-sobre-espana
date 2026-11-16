import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "../../src/sections/geografia/engine/categories";
import { questionsIn, OPTION_COUNTS } from "../../src/sections/geografia/engine/round-questions";
import { ROUND_LENGTH, ROUND_LENGTHS, TIME_LIMITS, type RoundLength } from "../../src/common/engine/round-settings";
import { roundSettings, recordKey, canPlay, selectionKey } from "../../src/sections/geografia/engine/selection";
import { loadState, type SavedState } from "../../src/common/engine/storage";
import { NAME_FORMS, TERRITORIOS } from "../../src/sections/geografia/engine/types";

// Lo que se deduce de las opciones marcadas en Geografía (la selección): si se puede jugar, con qué ajustes
// y con qué clave se guarda el récord. Las reglas, como están en CLAUDE.md.

const base = (): SavedState => loadState(); // las opciones por defecto (en los tests no hay nada guardado)

/** Regla de «Preguntas por partida»: 25, 50 y 100, solo si hay al menos esas; 10 y sin límite, siempre que haya alguna. */
const cabe = (longitud: RoundLength, hay: number) => hay > 0 && (longitud === "sinLimite" || longitud === ROUND_LENGTH || hay >= longitud);

describe("selección de geografía", () => {
  it("con las opciones por defecto se puede jugar", () => {
    expect(canPlay(base())).toBe(true);
  });

  it("sin ninguna categoría, forma de los nombres o territorio marcados, no se puede jugar", () => {
    for (const vacio of [{ selected: [] }, { names: [] }, { territorios: [] }]) {
      expect(canPlay({ ...base(), ...vacio }), JSON.stringify(vacio)).toBe(false);
    }
  });

  it("solo se puede jugar si la selección tiene preguntas y caben las elegidas por partida", () => {
    for (const cat of CATEGORY_IDS) for (const t of TERRITORIOS) for (const longitud of ROUND_LENGTHS) {
      const s = { ...base(), selected: [cat], territorios: [t], longitud };
      expect(canPlay(s), `${cat} · ${t} · ${longitud}`).toBe(cabe(longitud, questionsIn(cat, [t]).length));
    }
  });

  it("la partida se prepara con lo marcado", () => {
    const s = { ...base(), selected: [CATEGORY_IDS[0]], names: [NAME_FORMS[0]], territorios: [TERRITORIOS[0]], opciones: OPTION_COUNTS[1], longitud: ROUND_LENGTHS[1] };
    expect(roundSettings(s)).toEqual({ categories: s.selected, nameForms: s.names, territorios: s.territorios, optionCount: s.opciones, roundLength: s.longitud });
  });

  it("la partida preparada deja de valer si cambia algo que decide las preguntas, pero no si cambia el tiempo", () => {
    const s = base();
    const cambios: Partial<SavedState>[] = [
      { selected: [CATEGORY_IDS[0]] }, { names: [NAME_FORMS[0]] }, { territorios: [TERRITORIOS[0]] },
      { opciones: OPTION_COUNTS[2] }, { longitud: "sinLimite" }
    ];
    for (const c of cambios) expect(selectionKey({ ...s, ...c }), JSON.stringify(c)).not.toBe(selectionKey(s));
    for (const tiempo of TIME_LIMITS) expect(selectionKey({ ...s, tiempo })).toBe(selectionKey(s));
  });

  it("los récords van aparte por categorías, territorio, dificultad, preguntas y tiempo, pero no por la forma de los nombres", () => {
    const s = base();
    const cambios: Partial<SavedState>[] = [
      { selected: [CATEGORY_IDS[0]] }, { territorios: [TERRITORIOS[0]] }, { opciones: OPTION_COUNTS[2] },
      { longitud: "sinLimite" }, { tiempo: TIME_LIMITS.find((t) => t !== s.tiempo)! }
    ];
    for (const c of cambios) expect(recordKey({ ...s, ...c }), JSON.stringify(c)).not.toBe(recordKey(s));
    expect(recordKey({ ...s, names: [NAME_FORMS[0]] })).toBe(recordKey(s));
  });
});
