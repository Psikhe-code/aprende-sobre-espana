import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "../src/engine/categories";
import { buildRound, rebuild, ROUND_LENGTH } from "../src/engine/round";
import { poolsFor } from "../src/engine/territory";
import { loadState } from "../src/engine/storage";
import { GameSession, applyRecord } from "../src/engine/game";
import type { RoundQuestion } from "../src/engine/types";

/** Pregunta de prueba cuya respuesta correcta es `answer`. */
const rq = (id: string, answer: string): RoundQuestion =>
  ({ id, text: id, answer, answerKey: id, type: null, traps: [], why: "", exclude: [], aliases: [], category: "c", style: "castellano", options: [answer, "X"] });
const tenQuestions = () => Array.from({ length: ROUND_LENGTH }, (_, i) => rq("q" + i, "A"));

describe("partidas: elección de preguntas", () => {
  it(`tienen ${ROUND_LENGTH} preguntas sin repetir`, () => {
    for (let r = 0; r < 300; r++) {
      const round = buildRound({ categories: CATEGORY_IDS });
      expect(round).toHaveLength(ROUND_LENGTH);
      expect(new Set(round.map((q) => q.id)).size).toBe(ROUND_LENGTH);
    }
  });

  it("solo incluyen las categorías marcadas", () => {
    for (let r = 0; r < 50; r++) {
      for (const q of buildRound({ categories: ["banderasCCAA"] })) expect(q.category).toBe("banderasCCAA");
    }
  });

  it("no repiten el mismo lugar como respuesta, aunque salga con otro nombre", () => {
    for (let r = 0; r < 300; r++) {
      const round = buildRound({ categories: CATEGORY_IDS });
      expect(new Set(round.map((q) => q.answerKey)).size).toBe(round.length);
    }
  });

  it("con las dos formas marcadas, se sortea por pregunta y cada pregunta va entera en su forma", () => {
    const seen = new Set<string>();
    for (let r = 0; r < 100; r++) {
      for (const q of buildRound({ categories: CATEGORY_IDS, names: ["oficial", "castellano"] })) {
        seen.add(q.style);
        const pool = poolsFor(q.style)[q.type!];
        for (const o of q.options) expect(pool, `${q.id} [${q.style}] → ${o}`).toContain(o);
      }
    }
    expect([...seen].sort()).toEqual(["castellano", "oficial"]);
  });

  it("sin ninguna forma marcada, no se puede jugar", () => {
    expect(() => buildRound({ categories: CATEGORY_IDS, names: [] })).toThrow();
  });

  it("con una sola forma marcada, todas las preguntas van en esa forma", () => {
    for (const only of ["oficial", "castellano"] as const) {
      for (let r = 0; r < 30; r++) {
        for (const q of buildRound({ categories: CATEGORY_IDS, names: [only] })) expect(q.style).toBe(only);
      }
    }
  });

  it("por defecto están marcadas todas las formas, la oficial primero", () => {
    expect(loadState().names).toEqual(["oficial", "castellano"]);
  });

  it("reparten las preguntas entre las categorías", () => {
    let flags = 0, total = 0;
    for (let r = 0; r < 300; r++) {
      const round = buildRound({ categories: CATEGORY_IDS });
      flags += round.filter((q) => q.category === "banderasCCAA").length;
      total += round.length;
    }
    expect(flags / total).toBeGreaterThan(0.4);
    expect(flags / total).toBeLessThan(0.6);
  });

  it("el repaso conserva las preguntas y regenera las opciones", () => {
    const round = buildRound({ categories: CATEGORY_IDS });
    const again = rebuild(round.slice(0, 3));
    expect(again.map((q) => q.id).sort()).toEqual(round.slice(0, 3).map((q) => q.id).sort());
    for (const q of again) expect(q.options).toContain(q.answer);
    expect(again.map((q) => q.style).sort()).toEqual(round.slice(0, 3).map((q) => q.style).sort());
  });
});

describe("partidas: desarrollo", () => {
  it("cuenta aciertos, racha y mejor racha", () => {
    const g = new GameSession(tenQuestions());
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
    const g = new GameSession(tenQuestions());
    g.answer("A"); g.next();
    g.answer("A"); g.next();
    expect(g.streak).toBe(2);
    g.answer("X");
    expect(g.streak).toBe(0);
  });

  it("no deja responder dos veces ni avanzar sin responder", () => {
    const g = new GameSession(tenQuestions());
    expect(() => g.next()).toThrow();
    g.answer("A");
    expect(() => g.answer("A")).toThrow();
  });

  it("termina en la última pregunta", () => {
    const g = new GameSession([rq("a", "A"), rq("b", "B")]);
    g.answer("A");
    expect(g.finished).toBe(false);
    expect(g.next()).toBe(true);
    g.answer("B");
    expect(g.finished).toBe(true);
    expect(g.next()).toBe(false);
  });

  it("solo cuenta para récords una partida normal y completa", () => {
    const play = (g: GameSession) => { do g.answer("A"); while (g.next()); return g.result(); };
    expect(play(new GameSession(tenQuestions())).counts).toBe(true);
    expect(play(new GameSession(tenQuestions(), { review: true })).counts).toBe(false);
    expect(play(new GameSession(tenQuestions().slice(0, 3))).counts).toBe(false);
  });
});

describe("récords", () => {
  const result = (hits: number, counts = true) => ({ hits, total: 10, bestStreak: 0, misses: [], review: false, counts });

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
