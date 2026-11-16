/**
 * @fileoverview La partida en marcha (aciertos, racha, tiempo, sin límite), los récords y la valoración del resultado.
 */

import { describe, expect, it } from "vitest";
import { ROUND_LENGTH } from "../../src/common/engine/common-round-settings";
import { Round, applyRecord, recordValue, ratingText } from "../../src/common/engine/common-round";
import type { PlayableQuestion } from "../../src/common/engine/common-types";

/** Pregunta de prueba cuya respuesta correcta es `answer`. */
const rq = (id: string, answer: string): PlayableQuestion =>
  ({ id, text: id, answer, options: [answer, "X"], label: "", explanation: "" });
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
  const deck = () => [rq("a", "A"), rq("b", "B"), rq("c", "C")];

  it("al acabarse la baraja se para y, para seguir, se añade otra vuelta", () => {
    const g = new Round(deck(), { unlimited: true });
    expect(g.deckSize).toBe(3);
    for (const givenAnswer of ["A", "X", "C"]) {
      expect(g.endOfDeck).toBe(false);
      g.answer(givenAnswer);
      if (givenAnswer !== "C") g.next();
    }
    expect(g.endOfDeck).toBe(true);
    expect(g.finished).toBe(false);
    expect(g.next()).toBe(false);
    g.append(deck());
    expect(g.endOfDeck).toBe(false);
    expect(g.next()).toBe(true);
    expect(g.index).toBe(3);
    // La racha sigue de una vuelta a otra.
    g.answer("A");
    expect(g.streak).toBe(2);
  });

  it("termina cuando el jugador quiere, y la pregunta sin responder no cuenta", () => {
    const g = new Round(deck(), { unlimited: true });
    g.answer("A"); g.next();
    g.answer("B"); g.next();
    g.stop();
    expect(g.finished).toBe(true);
    expect(() => g.answer("C")).toThrow();
    expect(() => g.append(deck())).toThrow();
    const r = g.result();
    expect(r).toMatchObject({ hits: 2, total: 2, bestStreak: 2, unlimited: true, counts: true });
  });

  it("solo cuenta para el récord si se ha respondido alguna pregunta, y el récord es la mejor racha", () => {
    const empty = new Round(deck(), { unlimited: true });
    empty.stop();
    expect(empty.result().counts).toBe(false);

    const g = new Round(deck(), { unlimited: true });
    g.answer("X"); g.next();
    g.answer("B"); g.next();
    g.answer("C");
    g.stop();
    const r = g.result();
    expect(r.hits).toBe(2);
    expect(r.bestStreak).toBe(2);
    expect(recordValue(r)).toBe(r.bestStreak);
    expect(applyRecord({}, "k", r).records.k).toBe(r.bestStreak);
  });

  it("una partida normal no se puede alargar ni terminar a mitad", () => {
    const g = new Round(deck());
    expect(() => g.append(deck())).toThrow();
    expect(() => g.stop()).toThrow();
    expect(g.endOfDeck).toBe(false);
  });
});

describe("récords", () => {
  const result = (hits: number, counts = true) => ({ hits, total: 10, bestStreak: 0, misses: [], review: false, unlimited: false, counts });

  it("guarda el primer resultado y solo lo cambia si se supera", () => {
    let records: Record<string, number> = {};
    let r = applyRecord(records, "k", result(6));
    expect(r.isNewRecord).toBe(true);
    records = r.records;
    expect(applyRecord(records, "k", result(6)).isNewRecord).toBe(false);
    expect(applyRecord(records, "k", result(5)).record).toBe(6);
    r = applyRecord(records, "k", result(9));
    expect(r.records.k).toBe(9);
  });

  it("no modifica los récords anteriores ni cuenta partidas que no cuentan", () => {
    const records = { k: 4 };
    const r = applyRecord(records, "k", result(10, false));
    expect(r.isNewRecord).toBe(false);
    expect(records).toEqual({ k: 4 });
  });
});

describe("valoración del resultado", () => {
  it("la de la sección, salvo sin ninguna respuesta (una partida sin límite terminada enseguida)", () => {
    const sectionRating = ({ hits, total }: { hits: number; total: number }) => `${hits} de ${total}`;
    expect(ratingText({ hits: 3, total: 10 }, sectionRating)).toBe("3 de 10");
    expect(ratingText({ hits: 0, total: 0 }, sectionRating)).toBe("Sin respuestas");
  });
});
