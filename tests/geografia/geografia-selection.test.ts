import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "../../src/sections/geografia/engine/geografia-categories";
import { questionsIn, OPTION_COUNTS } from "../../src/sections/geografia/engine/geografia-round-questions";
import { QUESTION_COUNTS, TIME_LIMITS, type QuestionCount } from "../../src/common/engine/common-round-settings";
import { roundParams, recordKey, canPlay, selectionKey } from "../../src/sections/geografia/engine/geografia-selection";
import type { SavedState } from "../../src/common/engine/common-storage";
import { loadGeografiaSettings, type GeografiaSettings } from "../../src/sections/geografia/engine/geografia-settings";
import { NAME_FORMS, TERRITORIOS } from "../../src/sections/geografia/engine/geografia-types";
import { geografiaMode } from "../../src/sections/geografia/ui/geografia-mode";
import { countAvailableQuestions } from "../../src/sections/geografia/engine/geografia-round-questions";
import { geografiaRating } from "../../src/sections/geografia/engine/geografia-rating";

// Lo que se deduce de las opciones marcadas en Geografía (la selección): si se puede jugar, con qué ajustes
// y con qué clave se guarda el récord. Las reglas, como están en CLAUDE.md.

/** Las opciones por defecto (las de alguien que nunca ha cambiado nada). */
const base = (): GeografiaSettings => loadGeografiaSettings(undefined);
/** Lo guardado de alguien con estas opciones de Geografía, para pedirle a la sección su modo. */
const stateWith = (g: GeografiaSettings): SavedState => ({ section: "geografia", records: {}, settings: { geografia: g } });


describe("selección de geografía", () => {
  it("por defecto: todas las categorías, las dos formas de los nombres, los dos territorios, 4 opciones, 10 preguntas y 1 minuto", () => {
    expect(base()).toEqual({
      selectedCategories: CATEGORY_IDS, knownCategories: CATEGORY_IDS, selectedNameForms: NAME_FORMS, selectedTerritorios: TERRITORIOS,
      selectedOptionCount: 4, selectedQuestionCount: 10, selectedTimeLimit: 60
    });
  });

  it("se recuerda lo elegido, y lo que no vale se cambia por lo de por defecto", () => {
    const saved = { selectedCategories: ["banderas"], knownCategories: CATEGORY_IDS, selectedNameForms: ["oficial"], selectedTerritorios: ["provincia"], selectedOptionCount: 8, selectedQuestionCount: "sinLimite", selectedTimeLimit: "sinTiempo" };
    expect(loadGeografiaSettings(saved)).toEqual(saved);
    const wrong = loadGeografiaSettings({ selectedCategories: ["rios"], selectedNameForms: [], selectedTerritorios: "comunidad", selectedOptionCount: 5, selectedQuestionCount: 30, selectedTimeLimit: 45 });
    expect(wrong).toEqual(base());
  });

  it("una categoría nueva (que no existía la última vez) se marca sola; las que se desmarcaron, no", () => {
    const [first, ...others] = CATEGORY_IDS;
    expect(loadGeografiaSettings({ selectedCategories: [first], knownCategories: [first, others[0]] }).selectedCategories)
      .toEqual([first, ...others.slice(1)]);
  });

  it("con las opciones por defecto se puede jugar", () => {
    expect(canPlay(base())).toBe(true);
  });

  it("sin ninguna categoría, forma de los nombres o territorio marcados, no se puede jugar", () => {
    for (const emptyChoice of [{ selectedCategories: [] }, { selectedNameForms: [] }, { selectedTerritorios: [] }]) {
      expect(canPlay({ ...base(), ...emptyChoice }), JSON.stringify(emptyChoice)).toBe(false);
    }
  });

  it("solo se puede jugar si la selección tiene alguna pregunta, sea cual sea el número de preguntas elegido", () => {
    for (const cat of CATEGORY_IDS) for (const t of TERRITORIOS) for (const questionCount of QUESTION_COUNTS) {
      const s = { ...base(), selectedCategories: [cat], selectedTerritorios: [t], selectedQuestionCount: questionCount };
      expect(canPlay(s), `${cat} · ${t} · ${questionCount}`).toBe(questionsIn(cat, [t]).length > 0);
    }
  });

  it("la partida se prepara con lo marcado", () => {
    const s = { ...base(), selectedCategories: [CATEGORY_IDS[0]], selectedNameForms: [NAME_FORMS[0]], selectedTerritorios: [TERRITORIOS[0]], selectedOptionCount: OPTION_COUNTS[1], selectedQuestionCount: QUESTION_COUNTS[1] };
    expect(roundParams(s)).toEqual({
      categories: s.selectedCategories, nameForms: s.selectedNameForms, territorios: s.selectedTerritorios,
      optionCount: s.selectedOptionCount, questionCount: s.selectedQuestionCount
    });
  });

  it("lo que da a la partida común: cada partida tiene el número de preguntas elegido (sin límite, todas) y las opciones elegidas", () => {
    const tested: QuestionCount[] = [];
    for (const questionCount of QUESTION_COUNTS) {
      const s = { ...base(), selectedQuestionCount: questionCount, selectedOptionCount: OPTION_COUNTS[1] };
      if (!canPlay(s)) continue;
      const mode = geografiaMode(stateWith(s));
      const questions = mode.buildRound();
      expect(questions, String(questionCount)).toHaveLength(questionCount === "sinLimite" ? countAvailableQuestions(s.selectedCategories, s.selectedTerritorios) : questionCount);
      expect(questions.every((q) => q.options.length === OPTION_COUNTS[1]), String(questionCount)).toBe(true);
      tested.push(questionCount);
    }
    expect(tested).toEqual([...QUESTION_COUNTS]);
  });

  it("lo que da a la partida común: cada pregunta de bandera lleva su imagen, sin delatar la respuesta; las demás, ninguna", () => {
    const flags = { ...base(), selectedCategories: ["banderas"], selectedQuestionCount: "sinLimite" as const };
    const mode = geografiaMode(stateWith(flags));
    const round = mode.buildRound();
    expect(round).toHaveLength(countAvailableQuestions(["banderas"], flags.selectedTerritorios));
    for (const q of [...round, ...mode.buildReviewRound(round.slice(0, 3)), ...mode.reshuffleRound(round[0].id)]) {
      expect(q.image?.src, q.id).toMatch(/\.svg|^data:image\/svg/);
      expect(q.image?.alt, q.id).toMatch(/^Bandera de una (provincia|comunidad o ciudad autónoma)$/);
      expect(q.image?.answerAlt, q.id).toBe(`Bandera: ${q.correctAnswer}`);
      // Con su tamaño, para reservar su hueco (que coincide con el de su SVG se comprueba en geografia-data.test.ts).
      expect(q.image?.width, q.id).toBeGreaterThan(0);
      expect(q.image?.height, q.id).toBeGreaterThan(0);
    }
    const others = geografiaMode(stateWith({ ...base(), selectedCategories: ["capitales", "divisiones"], selectedQuestionCount: "sinLimite" })).buildRound();
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
    const changes: Partial<GeografiaSettings>[] = [
      { selectedCategories: [CATEGORY_IDS[0]] }, { selectedNameForms: [NAME_FORMS[0]] }, { selectedTerritorios: [TERRITORIOS[0]] },
      { selectedOptionCount: OPTION_COUNTS[2] }, { selectedQuestionCount: "sinLimite" }
    ];
    for (const c of changes) expect(selectionKey({ ...s, ...c }), JSON.stringify(c)).not.toBe(selectionKey(s));
    for (const timeLimit of TIME_LIMITS) expect(selectionKey({ ...s, selectedTimeLimit: timeLimit })).toBe(selectionKey(s));
  });

  it("la clave del récord: «geografia/», las categorías y los territorios en su orden, y la dificultad, las preguntas y el tiempo", () => {
    const g = { ...base(), selectedCategories: ["banderas", "capitales"], selectedTerritorios: ["provincia", "comunidad"] as GeografiaSettings["selectedTerritorios"] };
    expect(recordKey(g)).toBe("geografia/capitales+banderas/comunidad+provincia/4opciones/10preguntas/60s");
  });

  it("los récords van aparte por categorías, territorio, dificultad, preguntas y tiempo, pero no por la forma de los nombres", () => {
    const s = base();
    const changes: Partial<GeografiaSettings>[] = [
      { selectedCategories: [CATEGORY_IDS[0]] }, { selectedTerritorios: [TERRITORIOS[0]] }, { selectedOptionCount: OPTION_COUNTS[2] },
      { selectedQuestionCount: "sinLimite" }, { selectedTimeLimit: TIME_LIMITS.find((t) => t !== s.selectedTimeLimit)! }
    ];
    for (const c of changes) expect(recordKey({ ...s, ...c }), JSON.stringify(c)).not.toBe(recordKey(s));
    expect(recordKey({ ...s, selectedNameForms: [NAME_FORMS[0]] })).toBe(recordKey(s));
  });
});
