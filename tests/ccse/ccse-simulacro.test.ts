import { describe, expect, it, vi } from "vitest";
import { CCSE_QUESTIONS } from "../../src/sections/ccse/engine/ccse-questions";
import {
  SIMULACRO_APTO_HITS, SIMULACRO_RECORD_KEY, SIMULACRO_QUESTION_COUNT, SIMULACRO_DISTRIBUTION, Simulacro, applySimulacroRecord,
  simulacroQuestions, canDoSimulacro
} from "../../src/sections/ccse/engine/ccse-simulacro";

// Simulacro del examen, con datos de prueba que tienen preguntas en las cinco tareas (ccse-test-data.ts).
// Que los datos reales permiten hacerlo se comprueba en ccse-data.test.ts.

vi.mock("../../src/sections/ccse/data/ccse.json", async () => ({ default: (await import("./ccse-test-data")).ccseSimulacroTestData() }));

/** Un simulacro respondido: en las preguntas de `bien`, la respuesta correcta; en `sinResponder`, nada; en las demás, una equivocada. */
function answeredSimulacro(correctCount: number, unansweredCount = 0) {
  const s = new Simulacro(simulacroQuestions());
  s.questions.forEach((q, j) => {
    s.goTo(j);
    if (j < correctCount) s.answer(q.answer);
    else if (j < s.total - unansweredCount) s.answer(q.options.find((o) => o !== q.answer)!);
  });
  return s;
}

describe("simulacro: preguntas", () => {
  it("el reparto suma las 25 preguntas del examen, y el aprobado son 15", () => {
    expect(SIMULACRO_QUESTION_COUNT).toBe(25);
    expect(SIMULACRO_APTO_HITS).toBe(15);
    expect(SIMULACRO_DISTRIBUTION.map((r) => r.tarea)).toEqual([1, 2, 3, 4, 5]);
  });

  it("salen las de cada tarea según el reparto, por orden de tareas y sin repetir ninguna", () => {
    for (let r = 0; r < 30; r++) {
      const questions = simulacroQuestions();
      expect(questions).toHaveLength(SIMULACRO_QUESTION_COUNT);
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
      const expected = SIMULACRO_DISTRIBUTION.flatMap((x) => Array(x.questionCount).fill(x.tarea));
      expect(questions.map((q) => q.tarea)).toEqual(expected);
    }
  });

  it("cada pregunta, con las opciones y la respuesta de los datos", () => {
    for (const q of simulacroQuestions()) {
      const p = CCSE_QUESTIONS.find((x) => x.id === q.id)!;
      expect([...q.options].sort()).toEqual([...p.options].sort());
      expect(q.answer).toBe(p.answer);
      expect(q.explanation).toBe(p.explanation);
    }
  });

  it("no se puede hacer si alguna tarea tiene menos preguntas de las que pide el reparto", () => {
    expect(canDoSimulacro()).toBe(true);
    for (const r of SIMULACRO_DISTRIBUTION) {
      const ofTarea = CCSE_QUESTIONS.filter((p) => p.tarea === r.tarea);
      const withOneLess = CCSE_QUESTIONS.filter((p) => p !== ofTarea[0] || ofTarea.length > r.questionCount);
      const tooFew = [...CCSE_QUESTIONS.filter((p) => p.tarea !== r.tarea), ...ofTarea.slice(0, r.questionCount - 1)];
      expect(canDoSimulacro(tooFew)).toBe(false);
      expect(canDoSimulacro(withOneLess)).toBe(true);
    }
  });
});

describe("simulacro: respuestas y entrega", () => {
  it("se puede ir y volver entre las preguntas y cambiar la respuesta hasta entregar", () => {
    const s = new Simulacro(simulacroQuestions());
    expect(s.index).toBe(0);
    expect(s.unansweredCount).toBe(s.total);
    const [a, b] = s.current.options;
    s.answer(a);
    s.goTo(5);
    expect(s.index).toBe(5);
    s.goTo(0);
    expect(s.answers[0]).toBe(a);
    s.answer(b);
    expect(s.answers[0]).toBe(b);
    expect(s.answeredCount).toBe(1);
    // Fuera de las preguntas no se va a ningún sitio, y una opción que no es de la pregunta no vale.
    s.goTo(-1);
    s.goTo(s.total);
    expect(s.index).toBe(0);
    s.answer("No es una opción");
    expect(s.answers[0]).toBe(b);
  });

  it("al entregar cuenta los aciertos, y lo que no se ha respondido es un fallo", () => {
    const s = answeredSimulacro(12, 3);
    const r = s.submit();
    expect(r.hits).toBe(12);
    expect(r.total).toBe(SIMULACRO_QUESTION_COUNT);
    expect(r.misses).toHaveLength(SIMULACRO_QUESTION_COUNT - 12);
    expect(r.misses.filter((f) => f.given === null)).toHaveLength(3);
    for (const f of r.misses) expect(f.given).not.toBe(f.question.answer);
    // Los fallos, en el orden del examen.
    expect(r.misses.map((f) => f.question.id)).toEqual(s.questions.slice(12).map((q) => q.id));
  });

  it("apto con 15 aciertos o más", () => {
    expect(answeredSimulacro(SIMULACRO_APTO_HITS - 1).submit().apto).toBe(false);
    expect(answeredSimulacro(SIMULACRO_APTO_HITS).submit().apto).toBe(true);
    expect(answeredSimulacro(SIMULACRO_QUESTION_COUNT).submit()).toMatchObject({ apto: true, hits: SIMULACRO_QUESTION_COUNT, misses: [] });
    expect(answeredSimulacro(0, SIMULACRO_QUESTION_COUNT).submit()).toMatchObject({ apto: false, hits: 0 });
  });

  it("da los aciertos de cada tarea", () => {
    const r = answeredSimulacro(SIMULACRO_QUESTION_COUNT).submit();
    expect(r.byTarea).toEqual(SIMULACRO_DISTRIBUTION.map((x) => ({ tarea: x.tarea, hits: x.questionCount, total: x.questionCount })));
    const s = answeredSimulacro(11); // las 10 de la Tarea 1 y la primera de la Tarea 2
    const t = s.submit().byTarea;
    expect(t[0]).toEqual({ tarea: 1, hits: 10, total: 10 });
    expect(t[1]).toEqual({ tarea: 2, hits: 1, total: 3 });
    expect(t.slice(2).every((x) => x.hits === 0)).toBe(true);
  });

  it("después de entregar ya no se pueden cambiar las respuestas, y entregar otra vez da lo mismo", () => {
    const s = answeredSimulacro(20);
    const r = s.submit();
    s.goTo(0);
    s.answer(s.current.options.find((o) => o !== s.current.answer)!);
    expect(s.answers[0]).toBe(s.current.answer);
    expect(s.submit()).toBe(r);
    expect(s.submitted).toBe(true);
  });
});

describe("simulacro: mejor resultado", () => {
  it("se apunta solo si mejora el anterior, con su propia clave", () => {
    let records: Record<string, number> = { "ccse/1": 9 };
    let a = applySimulacroRecord(records, 16);
    expect(a).toMatchObject({ isNewRecord: true, record: 16 });
    records = a.records;
    expect(records).toEqual({ "ccse/1": 9, [SIMULACRO_RECORD_KEY]: 16 });
    a = applySimulacroRecord(records, 14);
    expect(a).toMatchObject({ isNewRecord: false, record: 16, records });
    expect(applySimulacroRecord(records, 18).records[SIMULACRO_RECORD_KEY]).toBe(18);
  });
});
