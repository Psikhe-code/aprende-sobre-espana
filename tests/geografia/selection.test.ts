import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "../../src/sections/geografia/engine/categories";
import { questionsIn, OPTION_COUNTS } from "../../src/sections/geografia/engine/round-questions";
import { ROUND_LENGTH, ROUND_LENGTHS, TIME_LIMITS, type RoundLength } from "../../src/common/engine/round-settings";
import { roundSettings, recordKey, canPlay, selectionKey } from "../../src/sections/geografia/engine/selection";
import { loadState, type SavedState } from "../../src/common/engine/storage";
import { NAME_FORMS, TERRITORIOS } from "../../src/sections/geografia/engine/types";
import { geografiaMode } from "../../src/sections/geografia/ui/mode";
import { questionCount } from "../../src/sections/geografia/engine/round-questions";
import { geografiaRating } from "../../src/sections/geografia/engine/rating";

// Lo que se deduce de las opciones marcadas en Geografía (la selección): si se puede jugar, con qué ajustes
// y con qué clave se guarda el récord. Las reglas, como están en CLAUDE.md.

const base = (): SavedState => loadState(); // las opciones por defecto (en los tests no hay nada guardado)

/** Regla de «Preguntas por partida»: 25, 50 y 100, solo si hay al menos esas; 10 y sin límite, siempre que haya alguna. */
const fits = (roundLength: RoundLength, available: number) => available > 0 && (roundLength === "sinLimite" || roundLength === ROUND_LENGTH || available >= roundLength);

describe("selección de geografía", () => {
  it("con las opciones por defecto se puede jugar", () => {
    expect(canPlay(base())).toBe(true);
  });

  it("sin ninguna categoría, forma de los nombres o territorio marcados, no se puede jugar", () => {
    for (const emptyChoice of [{ selected: [] }, { names: [] }, { territorios: [] }]) {
      expect(canPlay({ ...base(), ...emptyChoice }), JSON.stringify(emptyChoice)).toBe(false);
    }
  });

  it("solo se puede jugar si la selección tiene preguntas y caben las elegidas por partida", () => {
    for (const cat of CATEGORY_IDS) for (const t of TERRITORIOS) for (const roundLength of ROUND_LENGTHS) {
      const s = { ...base(), selected: [cat], territorios: [t], longitud: roundLength };
      expect(canPlay(s), `${cat} · ${t} · ${roundLength}`).toBe(fits(roundLength, questionsIn(cat, [t]).length));
    }
  });

  it("la partida se prepara con lo marcado", () => {
    const s = { ...base(), selected: [CATEGORY_IDS[0]], names: [NAME_FORMS[0]], territorios: [TERRITORIOS[0]], opciones: OPTION_COUNTS[1], longitud: ROUND_LENGTHS[1] };
    expect(roundSettings(s)).toEqual({ categories: s.selected, nameForms: s.names, territorios: s.territorios, optionCount: s.opciones, roundLength: s.longitud });
  });

  it("lo que da a la partida común: cada partida tiene el número de preguntas elegido (sin límite, todas) y las opciones elegidas", () => {
    const tested: RoundLength[] = [];
    for (const roundLength of ROUND_LENGTHS) {
      const s = { ...base(), longitud: roundLength, opciones: OPTION_COUNTS[1] };
      if (!canPlay(s)) continue;
      const mode = geografiaMode(s);
      const questions = mode.buildRound();
      expect(questions, String(roundLength)).toHaveLength(mode.roundSize());
      expect(mode.roundSize(), String(roundLength)).toBe(roundLength === "sinLimite" ? questionCount(s.selected, s.territorios) : roundLength);
      expect(questions.every((q) => q.options.length === OPTION_COUNTS[1]), String(roundLength)).toBe(true);
      tested.push(roundLength);
    }
    expect(tested).toEqual([...ROUND_LENGTHS]);
  });

  it("lo que da a la partida común: cada pregunta de bandera lleva su imagen, sin delatar la respuesta; las demás, ninguna", () => {
    const flags = { ...base(), selected: ["banderas"], longitud: "sinLimite" as const };
    const mode = geografiaMode(flags);
    const round = mode.buildRound();
    expect(round).toHaveLength(questionCount(["banderas"], flags.territorios));
    for (const q of [...round, ...mode.buildReviewRound(round.slice(0, 3)), ...mode.reshuffleRound(round[0].id)]) {
      expect(q.image?.src, q.id).toMatch(/\.svg|^data:image\/svg/);
      expect(q.image?.alt, q.id).toMatch(/^Bandera de una (provincia|comunidad o ciudad autónoma)$/);
      expect(q.image?.answerAlt, q.id).toBe(`Bandera: ${q.answer}`);
    }
    const others = geografiaMode({ ...base(), selected: ["capitales", "divisiones"], longitud: "sinLimite" }).buildRound();
    expect(others.filter((q) => q.image).map((q) => q.id)).toEqual([]);
  });

  it("valoración del resultado: las del atlas", () => {
    const v = (hits: number) => geografiaRating({ hits, total: 10 });
    expect(v(10)).toBe("Mapa completo");
    expect(v(8)).toBe("Gran nivel");
    expect(v(5)).toBe("Buen rumbo");
    expect(v(4)).toBe("Toca repasar el atlas");
  });

  it("la partida preparada deja de valer si cambia algo que decide las preguntas, pero no si cambia el tiempo", () => {
    const s = base();
    const changes: Partial<SavedState>[] = [
      { selected: [CATEGORY_IDS[0]] }, { names: [NAME_FORMS[0]] }, { territorios: [TERRITORIOS[0]] },
      { opciones: OPTION_COUNTS[2] }, { longitud: "sinLimite" }
    ];
    for (const c of changes) expect(selectionKey({ ...s, ...c }), JSON.stringify(c)).not.toBe(selectionKey(s));
    for (const timeLimit of TIME_LIMITS) expect(selectionKey({ ...s, tiempo: timeLimit })).toBe(selectionKey(s));
  });

  it("los récords van aparte por categorías, territorio, dificultad, preguntas y tiempo, pero no por la forma de los nombres", () => {
    const s = base();
    const changes: Partial<SavedState>[] = [
      { selected: [CATEGORY_IDS[0]] }, { territorios: [TERRITORIOS[0]] }, { opciones: OPTION_COUNTS[2] },
      { longitud: "sinLimite" }, { tiempo: TIME_LIMITS.find((t) => t !== s.tiempo)! }
    ];
    for (const c of changes) expect(recordKey({ ...s, ...c }), JSON.stringify(c)).not.toBe(recordKey(s));
    expect(recordKey({ ...s, names: [NAME_FORMS[0]] })).toBe(recordKey(s));
  });
});
