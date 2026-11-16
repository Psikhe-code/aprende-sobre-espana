// La partida en marcha (aciertos, racha, tiempo, sin límite), los récords y la valoración del resultado.

import { describe, expect, it } from "vitest";
import { ROUND_LENGTH } from "../../src/common/engine/round-settings";
import { CCSE_APTO_RATIO, Round, applyRecord, recordValue, rating } from "../../src/common/engine/round";
import { APROBADO_SIMULACRO, PREGUNTAS_SIMULACRO } from "../../src/sections/ccse/engine/simulacro";
import { type RoundQuestion } from "../../src/sections/geografia/engine/types";

/** Pregunta de prueba cuya respuesta correcta es `answer`. */
const rq = (id: string, answer: string): RoundQuestion =>
  ({ id, text: id, answer, answerKey: id, pool: null, trapOptions: [], why: "", exclude: [], aliases: [], territorio: "comunidad", category: "c", nameForm: "castellano", options: [answer, "X"], label: "" });
const tenQuestions = () => Array.from({ length: ROUND_LENGTH }, (_, i) => rq("q" + i, "A"));

describe("partidas: desarrollo", () => {
  it("cuenta aciertos, racha y mejor racha", () => {
    const g = new Round(tenQuestions());
    const plan = [true, true, false, true, true, true, false, true, false, true];
    for (const ok of plan) {
      g.answer(ok ? "A" : "X");
      g.next();
    }
    const r = g.result();
    expect(r.hits).toBe(7);
    expect(r.bestStreak).toBe(3);
    expect(r.misses.map((m) => m.question.id)).toEqual(["q2", "q6", "q8"]);
    expect(r.misses[0].given).toBe("X");
    expect(g.finished).toBe(true);
  });

  it("la racha vuelve a cero al fallar", () => {
    const g = new Round(tenQuestions());
    g.answer("A"); g.next();
    g.answer("A"); g.next();
    expect(g.streak).toBe(2);
    g.answer("X");
    expect(g.streak).toBe(0);
  });

  it("no deja responder dos veces ni avanzar sin responder", () => {
    const g = new Round(tenQuestions());
    expect(() => g.next()).toThrow();
    g.answer("A");
    expect(() => g.answer("A")).toThrow();
  });

  it("termina en la última pregunta", () => {
    const g = new Round([rq("a", "A"), rq("b", "B")]);
    g.answer("A");
    expect(g.finished).toBe(false);
    expect(g.next()).toBe(true);
    g.answer("B");
    expect(g.finished).toBe(true);
    expect(g.next()).toBe(false);
  });

  it("solo cuenta para récords una partida normal y completa", () => {
    const play = (g: Round) => { do g.answer("A"); while (g.next()); return g.result(); };
    expect(play(new Round(tenQuestions())).counts).toBe(true);
    expect(play(new Round(tenQuestions(), { review: true })).counts).toBe(false);
    expect(play(new Round(tenQuestions().slice(0, 3))).counts).toBe(false);
    // Una selección que solo da para 8 preguntas cuenta si la partida tiene esas 8.
    expect(play(new Round(tenQuestions().slice(0, 8), { expected: 8 })).counts).toBe(true);
  });
});

describe("se acaba el tiempo", () => {
  it("cuenta como fallo sin respuesta: rompe la racha y queda entre los fallos", () => {
    const g = new Round([rq("a", "A"), rq("b", "B"), rq("c", "C")], { expected: 3 });
    g.answer("A"); g.next();
    const r = g.timeout();
    expect(r).toEqual({ correct: false, answer: "B", given: null });
    expect(g.streak).toBe(0);
    expect(() => g.timeout()).toThrow();
    expect(() => g.answer("B")).toThrow();
    g.next();
    g.answer("C");
    const res = g.result();
    expect(res).toMatchObject({ hits: 2, total: 3, counts: true });
    expect(res.misses).toEqual([{ question: g.questions[1], given: null }]);
  });
});

describe("partidas sin límite", () => {
  const baraja = () => [rq("a", "A"), rq("b", "B"), rq("c", "C")];

  it("al acabarse la baraja se para y, para seguir, se añade otra vuelta", () => {
    const g = new Round(baraja(), { unlimited: true });
    expect(g.deckSize).toBe(3);
    for (const respuesta of ["A", "X", "C"]) {
      expect(g.endOfDeck).toBe(false);
      g.answer(respuesta);
      if (respuesta !== "C") g.next();
    }
    expect(g.endOfDeck).toBe(true);
    expect(g.finished).toBe(false);
    expect(g.next()).toBe(false);
    g.append(baraja());
    expect(g.endOfDeck).toBe(false);
    expect(g.next()).toBe(true);
    expect(g.index).toBe(3);
    // La racha sigue de una vuelta a otra.
    g.answer("A");
    expect(g.streak).toBe(2);
  });

  it("termina cuando el jugador quiere, y la pregunta sin responder no cuenta", () => {
    const g = new Round(baraja(), { unlimited: true });
    g.answer("A"); g.next();
    g.answer("B"); g.next();
    g.stop();
    expect(g.finished).toBe(true);
    expect(() => g.answer("C")).toThrow();
    expect(() => g.append(baraja())).toThrow();
    const r = g.result();
    expect(r).toMatchObject({ hits: 2, total: 2, bestStreak: 2, unlimited: true, counts: true });
  });

  it("solo cuenta para el récord si se ha respondido alguna pregunta, y el récord es la mejor racha", () => {
    const vacia = new Round(baraja(), { unlimited: true });
    vacia.stop();
    expect(vacia.result().counts).toBe(false);

    const g = new Round(baraja(), { unlimited: true });
    g.answer("X"); g.next();
    g.answer("B"); g.next();
    g.answer("C");
    g.stop();
    const r = g.result();
    expect(r.hits).toBe(2);
    expect(r.bestStreak).toBe(2);
    expect(recordValue(r)).toBe(r.bestStreak);
    expect(applyRecord({}, "k", r).best.k).toBe(r.bestStreak);
  });

  it("una partida normal no se puede alargar ni terminar a mitad", () => {
    const g = new Round(baraja());
    expect(() => g.append(baraja())).toThrow();
    expect(() => g.stop()).toThrow();
    expect(g.endOfDeck).toBe(false);
  });
});

describe("récords", () => {
  const result = (hits: number, counts = true) => ({ hits, total: 10, bestStreak: 0, misses: [], review: false, unlimited: false, counts });

  it("guarda el primer resultado y solo lo cambia si se supera", () => {
    let best: Record<string, number> = {};
    let r = applyRecord(best, "k", result(6));
    expect(r.isNewRecord).toBe(true);
    best = r.best;
    expect(applyRecord(best, "k", result(6)).isNewRecord).toBe(false);
    expect(applyRecord(best, "k", result(5)).record).toBe(6);
    r = applyRecord(best, "k", result(9));
    expect(r.best.k).toBe(9);
  });

  it("no modifica los récords anteriores ni cuenta partidas que no cuentan", () => {
    const best = { k: 4 };
    const r = applyRecord(best, "k", result(10, false));
    expect(r.isNewRecord).toBe(false);
    expect(best).toEqual({ k: 4 });
  });
});

describe("valoración del resultado", () => {
  it("en el examen, con el aprobado de la prueba real como referencia (el mismo que el simulacro)", () => {
    expect(CCSE_APTO_RATIO).toBe(APROBADO_SIMULACRO / PREGUNTAS_SIMULACRO);
    const v = (hits: number) => rating({ hits, total: 25 }, "ccse");
    expect(v(25)).toBe("Pleno");
    expect(v(20)).toBe("Gran nivel");
    expect(v(15)).toBe("Por encima del aprobado");
    expect(v(14)).toBe("Toca repasar");
  });

  it("en geografía, las del atlas", () => {
    const v = (hits: number) => rating({ hits, total: 10 }, "geografia");
    expect(v(10)).toBe("Mapa completo");
    expect(v(8)).toBe("Gran nivel");
    expect(v(5)).toBe("Buen rumbo");
    expect(v(4)).toBe("Toca repasar el atlas");
  });

  it("sin ninguna respuesta (una partida sin límite terminada enseguida)", () => {
    for (const s of ["ccse", "geografia"] as const) expect(rating({ hits: 0, total: 0 }, s)).toBe("Sin respuestas");
  });
});

