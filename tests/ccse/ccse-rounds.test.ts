import { describe, expect, it, vi } from "vitest";
import {
  CCSE_QUESTIONS, TAREAS, questionCountFits, tareaName, reshuffleRound, buildRound, tareaQuestions, buildReviewRound, countRoundQuestions, tarea, tareasWithQuestions
} from "../../src/sections/ccse/engine/ccse-questions";
import { DEFAULT_QUESTION_COUNT, QUESTION_COUNTS, type QuestionCount } from "../../src/common/engine/common-round-settings";
import { canPlay } from "../../src/sections/ccse/engine/ccse-selection";
import { ccseMode } from "../../src/sections/ccse/ui/ccse-mode";
import { CCSE_APTO_RATIO, ccseRating } from "../../src/sections/ccse/engine/ccse-rating";
import { SIMULACRO_APTO_HITS, SIMULACRO_QUESTION_COUNT } from "../../src/sections/ccse/engine/ccse-simulacro-rules";
import type { SavedState } from "../../src/common/engine/common-storage";
import { loadCcseSettings, type CcseSettings } from "../../src/sections/ccse/engine/ccse-settings";
import { recordKey } from "../../src/sections/ccse/engine/ccse-selection";

/** Lo guardado de alguien con estas opciones del examen, para pedirle a la sección su modo. */
const stateWith = (c: CcseSettings): SavedState => ({ section: "ccse", records: {}, settings: { ccse: c } });

// Examen de nacionalidad: partidas y guardado, con datos de prueba (ccse-test-data.ts) en vez de la
// plantilla real, que se va rellenando poco a poco. Las reglas de los datos reales, en ccse-data.test.ts.

vi.mock("../../src/sections/ccse/data/ccse.json", async () => ({ default: (await import("./ccse-test-data")).ccseTestData() }));

const ALL_TAREAS = TAREAS.map((t) => t.numero);

describe("examen de nacionalidad: datos de prueba", () => {
  it("se usan los de prueba: tareas 1 y 2 con preguntas, y también de verdadero o falso y sin nota", () => {
    expect(tareasWithQuestions()).toEqual([1, 2]);
    expect(CCSE_QUESTIONS.some((p) => p.options.length === 2 && p.fixedOrder)).toBe(true);
    expect(CCSE_QUESTIONS.some((p) => !p.explanation)).toBe(true);
  });
});

describe("examen de nacionalidad: partidas", () => {
  it("cada pregunta lleva encima el nombre de su tarea, también en el repaso", () => {
    const roundQuestions = buildRound({ tareas: ALL_TAREAS, questionCount: "sinLimite" });
    for (const q of [...roundQuestions, ...buildReviewRound(roundQuestions)]) expect(q.label, q.id).toBe(tareaName(tarea(q.tarea)!));
    expect(tareaName(TAREAS[0])).toBe(`Tarea ${TAREAS[0].numero} · ${TAREAS[0].nombre}`);
  });

  it("solo salen preguntas de las tareas marcadas, sin repetir, con el número de preguntas elegido", () => {
    for (const tareas of [tareasWithQuestions(), ALL_TAREAS, [1]]) {
      for (const questionCount of QUESTION_COUNTS) {
        const available = tareaQuestions(tareas).length;
        if (!available) continue;
        const roundQuestions = buildRound({ tareas, questionCount: questionCount });
        expect(roundQuestions).toHaveLength(countRoundQuestions(tareas, questionCount));
        expect(new Set(roundQuestions.map((q) => q.id)).size).toBe(roundQuestions.length);
        for (const q of roundQuestions) expect(tareas).toContain(q.tarea);
      }
    }
  });

  it("cada pregunta sale con sus opciones (barajadas) y su respuesta, su nota y sus fuentes", () => {
    for (let r = 0; r < 20; r++) {
      for (const q of buildRound({ tareas: ALL_TAREAS, questionCount: "sinLimite" })) {
        const p = CCSE_QUESTIONS.find((x) => x.id === q.id)!;
        expect([...q.options].sort()).toEqual([...p.options].sort());
        if (p.fixedOrder) expect(q.options).toEqual(p.options);
        expect(q.correctAnswer).toBe(p.correctAnswer);
        expect(q.text).toBe(p.text);
        expect(q.explanation).toBe(p.explanation);
        expect(q.sources).toEqual(p.sources);
      }
    }
  });

  it("las opciones se barajan: la respuesta no sale siempre en el mismo sitio", () => {
    const positions = new Set<number>();
    for (let r = 0; r < 50; r++) for (const q of buildRound({ tareas: ALL_TAREAS })) positions.add(q.options.indexOf(q.correctAnswer));
    expect(positions.size).toBeGreaterThan(1);
  });

  it("25, 50 y 100 preguntas solo se pueden elegir si hay al menos esas; 10 y sin límite, siempre", () => {
    for (const tareas of [[1], ALL_TAREAS, []]) {
      const available = tareaQuestions(tareas).length;
      for (const questionCount of QUESTION_COUNTS) {
        expect(questionCountFits(questionCount, tareas)).toBe(questionCount === "sinLimite" || questionCount === DEFAULT_QUESTION_COUNT || available >= questionCount);
      }
    }
  });

  it("otra vuelta tiene todas las preguntas y no empieza por la última que salió", () => {
    for (let r = 0; r < 50; r++) {
      const first = buildRound({ tareas: ALL_TAREAS, questionCount: "sinLimite" });
      const last = first[first.length - 1].id;
      const other = reshuffleRound({ tareas: ALL_TAREAS }, last);
      expect(other.map((q) => q.id).sort()).toEqual(first.map((q) => q.id).sort());
      expect(other[0].id).not.toBe(last);
    }
  });

  it("el repaso de fallos repite las mismas preguntas, en el mismo orden", () => {
    const misses = buildRound({ tareas: ALL_TAREAS }).slice(0, 3);
    expect(buildReviewRound(misses).map((q) => q.id)).toEqual(misses.map((q) => q.id));
  });

  it("la clave del récord empieza por «ccse/», con las tareas en orden, el número de preguntas y el tiempo", () => {
    const c = loadCcseSettings(undefined);
    expect(recordKey({ ...c, tareas: [2, 1] })).toBe("ccse/1+2/10preguntas/60s");
    expect(recordKey({ ...c, tareas: [1, 3], questionCount: "sinLimite", timeLimit: "sinTiempo" })).toBe("ccse/1+3/sinlimite/sintiempo");
  });
});

describe("examen de nacionalidad: lo que da a la partida común", () => {
  it("cada partida tiene el número de preguntas elegido (sin límite, todas), así que cuenta para el récord", () => {
    const tested: QuestionCount[] = [];
    for (const n of QUESTION_COUNTS) {
      const s = loadCcseSettings(undefined);
      s.questionCount = n;
      if (!canPlay(s)) continue;
      const mode = ccseMode(stateWith(s));
      expect(mode.buildRound(), String(n)).toHaveLength(n === "sinLimite" ? tareaQuestions(s.tareas).length : n);
      tested.push(n);
    }
    // Que no pase sin comprobar nada: con los datos de prueba caben al menos 10, 25 y sin límite.
    expect(tested).toEqual(expect.arrayContaining([10, 25, "sinLimite"]));
  });
});

describe("examen de nacionalidad: valoración del resultado", () => {
  it("con el aprobado de la prueba real como referencia (el mismo que el simulacro)", () => {
    expect(CCSE_APTO_RATIO).toBe(SIMULACRO_APTO_HITS / SIMULACRO_QUESTION_COUNT);
    const v = (hits: number) => ccseRating({ hits, total: 25 });
    expect(v(25)).toBe("Pleno");
    expect(v(20)).toBe("Gran nivel");
    expect(v(15)).toBe("Por encima del aprobado");
    expect(v(14)).toBe("Toca repasar");
  });
});

describe("examen de nacionalidad: si se puede jugar", () => {
  it("con las opciones por defecto, sí; sin ninguna tarea marcada, no", () => {
    const s = loadCcseSettings(undefined);
    expect(canPlay(s)).toBe(true);
    expect(canPlay({ ...s, tareas: [] })).toBe(false);
  });

  it("solo si las tareas marcadas tienen preguntas y caben las elegidas (25, 50 y 100, solo si hay al menos esas)", () => {
    const s = loadCcseSettings(undefined);
    for (const t of ALL_TAREAS) for (const questionCount of QUESTION_COUNTS) {
      const available = tareaQuestions([t]).length;
      const fits = available > 0 && (questionCount === "sinLimite" || questionCount === DEFAULT_QUESTION_COUNT || available >= questionCount);
      expect(canPlay({ ...s, tareas: [t], questionCount: questionCount }), `tarea ${t} · ${questionCount}`).toBe(fits);
    }
  });
});

describe("examen de nacionalidad: opciones guardadas", () => {
  it("por defecto, todas las tareas con preguntas, 10 preguntas y 1 minuto; y se recuerda lo elegido", () => {
    expect(loadCcseSettings(undefined)).toEqual({ tareas: tareasWithQuestions(), knownTareas: tareasWithQuestions(), questionCount: 10, timeLimit: 60 });
    expect(loadCcseSettings({ tareas: [1], knownTareas: [1, 2], questionCount: "sinLimite", timeLimit: 10 }))
      .toMatchObject({ tareas: [1], questionCount: "sinLimite", timeLimit: 10 });
    // Tareas sin preguntas o que no existen no se quedan marcadas; si no queda ninguna, vuelven las de por defecto.
    expect(loadCcseSettings({ tareas: [9, 4], knownTareas: [1, 2] }).tareas).toEqual(tareasWithQuestions());
    // Lo que no vale, por defecto.
    expect(loadCcseSettings({ questionCount: 30, timeLimit: 45 })).toMatchObject({ questionCount: 10, timeLimit: 60 });
  });

  it("una tarea que recibe sus primeras preguntas se marca sola", () => {
    // Guardado cuando solo la Tarea 1 tenía preguntas: la 2 es nueva.
    expect(loadCcseSettings({ tareas: [1], knownTareas: [1] }).tareas).toEqual([1, 2]);
    // Guardado cuando aún no había ninguna.
    expect(loadCcseSettings({ tareas: [], knownTareas: [] }).tareas).toEqual([1, 2]);
  });
});
