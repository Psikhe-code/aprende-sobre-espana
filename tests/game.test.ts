import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS } from "../src/engine/categories";
import { makeOptions, prepare } from "../src/engine/options";
import { buildRound, rebuild, ROUND_LENGTH } from "../src/engine/round";
import { CAPITALES_AUTONOMICAS } from "../src/engine/territory";

const all = CATEGORIES.flatMap((c) => c.questions().map((q) => ({ ...q, category: c.id })));
const REPS = 30;

/** Preguntas que no pueden llegar a 8 opciones porque su pool es pequeño. */
const POOL_PEQUENO = ["¿Cuál es la isla balear más meridional?"];

describe("opciones", () => {
  for (const n of [4, 6, 8]) {
    it(`con ${n} opciones: la correcta aparece, sin duplicados ni excluidos`, () => {
      for (let r = 0; r < REPS; r++) {
        for (const q0 of all) {
          const q = prepare(q0, n);
          const label = `[${q.category}] ${q.text}`;
          expect(q.options, label).toContain(q.answer);
          expect(new Set(q.options).size, label).toBe(q.options.length);
          for (const x of q.exclude) if (x !== q.answer) expect(q.options, `${label} → ${x}`).not.toContain(x);
          if (!POOL_PEQUENO.includes(q.text)) expect(q.options, label).toHaveLength(n);
        }
      }
    });
  }

  it("con pool, siempre queda al menos una opción aleatoria (no solo trampas)", () => {
    // Las trampas no están en el pool, así que cualquier valor del pool es una opción aleatoria.
    const q = { text: "", answer: "A", type: "t", traps: ["B", "C", "D", "E"], why: "", exclude: [] };
    const pools = { t: ["A", "F", "G", "H", "I"] };
    for (let r = 0; r < 50; r++) {
      const opts = makeOptions(q, 4, Math.random, pools);
      expect(opts.filter((o) => q.traps.includes(o)).length).toBeLessThanOrEqual(2);
    }
  });

  it("en capitales, las capitales autonómicas también salen como incorrectas", () => {
    const qs = CATEGORIES.find((c) => c.id === "capitalesCCAA")!.questions();
    const seen = new Set<string>();
    for (let r = 0; r < 200; r++) {
      for (const q0 of qs) {
        const q = prepare({ ...q0, category: "capitalesCCAA" }, 4);
        q.options.filter((o) => o !== q.answer && CAPITALES_AUTONOMICAS.includes(o)).forEach((o) => seen.add(o));
      }
    }
    expect(seen.size).toBe(new Set(CAPITALES_AUTONOMICAS).size);
  });

  it("Canarias: ninguna de sus dos capitales sale como incorrecta", () => {
    const q0 = CATEGORIES.find((c) => c.id === "capitalesCCAA")!.questions().find((q) => Array.isArray(q.answer))!;
    for (let r = 0; r < 100; r++) {
      const q = prepare({ ...q0, category: "capitalesCCAA" }, 8);
      const capitales = (q0.answer as string[]).filter((c) => q.options.includes(c));
      expect(capitales).toEqual([q.answer]);
    }
  });
});

describe("partidas", () => {
  it(`tienen ${ROUND_LENGTH} preguntas sin repetir`, () => {
    for (let r = 0; r < 300; r++) {
      const round = buildRound({ categories: CATEGORY_IDS });
      expect(round).toHaveLength(ROUND_LENGTH);
      const keys = round.map((q) => q.text + "|" + q.answer);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("solo incluyen las categorías marcadas", () => {
    for (let r = 0; r < 100; r++) {
      const round = buildRound({ categories: ["rios", "banderasCCAA"] });
      for (const q of round) expect(["rios", "banderasCCAA"]).toContain(q.category);
    }
  });

  it("no repiten la misma ciudad como respuesta de capital", () => {
    for (let r = 0; r < 300; r++) {
      const round = buildRound({ categories: ["capitalesProv", "capitalesCCAA"] });
      const answers = round.filter((q) => q.type === "capitalCualquiera").map((q) => q.answer);
      expect(new Set(answers).size).toBe(answers.length);
    }
  });

  it("reparten las preguntas entre categorías (Provincias no acapara)", () => {
    let provincias = 0, total = 0;
    for (let r = 0; r < 300; r++) {
      const round = buildRound({ categories: ["provincias", "rios"] });
      provincias += round.filter((q) => q.category === "provincias").length;
      total += round.length;
    }
    expect(provincias / total).toBeGreaterThan(0.4);
    expect(provincias / total).toBeLessThan(0.6);
  });

  it("el repaso conserva las preguntas y regenera las opciones", () => {
    const round = buildRound({ categories: ["capitalesProv"] });
    const again = rebuild(round.slice(0, 3));
    expect(again.map((q) => q.answer).sort()).toEqual(round.slice(0, 3).map((q) => q.answer).sort());
    for (const q of again) expect(q.options).toContain(q.answer);
  });
});
