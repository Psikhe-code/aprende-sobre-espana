// Cómo se eligen y se preparan las preguntas de una partida de Geografía.

import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS, categoryById } from "../../src/sections/geografia/engine/categories";
import { buildRound, rebuild, reshuffle, roundSize, questionCount, questionsIn, lengthFits, OPTION_COUNTS } from "../../src/sections/geografia/engine/round-questions";
import { ROUND_LENGTH, ROUND_LENGTHS } from "../../src/common/engine/round-settings";
import { PROVINCIAS, poolsFor } from "../../src/sections/geografia/engine/territorio";
import { BANDERAS_PROVINCIAS } from "../../src/sections/geografia/engine/questions";
import { loadState } from "../../src/common/engine/storage";
import { NAME_STYLES } from "../../src/sections/geografia/engine/types";

/** Preguntas de capital de provincia que hay en los datos (las provincias con trampas). */
const CAPITALES_PROVINCIA = PROVINCIAS.filter((p) => p.trampas).length;

describe("partidas: elección de preguntas", () => {
  it("cada pregunta lleva encima la etiqueta de su categoría y su territorio, también en el repaso y al barajar otra vez", () => {
    const todas = buildRound({ categories: CATEGORY_IDS, length: "sinLimite" });
    for (const q of [...todas, ...rebuild(todas), ...reshuffle({ categories: CATEGORY_IDS }, todas[0].id)]) {
      expect(q.label, q.id).toBe(categoryById(q.category)!.labels[q.territorio]);
      expect(q.label, q.id).not.toBe("");
    }
  });

  it(`tienen ${ROUND_LENGTH} preguntas sin repetir`, () => {
    for (let r = 0; r < 300; r++) {
      const round = buildRound({ categories: CATEGORY_IDS });
      expect(round).toHaveLength(ROUND_LENGTH);
      expect(new Set(round.map((q) => q.id)).size).toBe(ROUND_LENGTH);
    }
  });

  it("solo incluyen las categorías marcadas", () => {
    for (let r = 0; r < 50; r++) {
      for (const q of buildRound({ categories: ["banderas"] })) expect(q.category).toBe("banderas");
    }
  });

  it("en cada número de preguntas, tienen esas preguntas sin repetir ninguna", () => {
    for (const length of ROUND_LENGTHS) {
      for (let r = 0; r < 20; r++) {
        const round = buildRound({ categories: CATEGORY_IDS, length });
        expect(round, String(length)).toHaveLength(length === "sinLimite" ? questionCount(CATEGORY_IDS) : length);
        expect(new Set(round.map((q) => q.id)).size, String(length)).toBe(round.length);
      }
    }
  });

  it("sí pueden repetir el mismo lugar como respuesta en preguntas distintas", () => {
    // Todas las de Divisiones de provincias: hay muchos más municipios que provincias.
    const round = buildRound({ categories: ["divisiones"], territorios: ["provincia"], length: "sinLimite" });
    expect(round).toHaveLength(questionsIn("divisiones", ["provincia"]).length);
    expect(new Set(round.map((q) => q.answerKey)).size).toBeLessThan(round.length);
  });

  it("con las dos formas marcadas, se sortea por pregunta y cada pregunta va entera en su forma", () => {
    const seen = new Set<string>();
    for (let r = 0; r < 100; r++) {
      for (const q of buildRound({ categories: CATEGORY_IDS, names: ["oficial", "castellano"] })) {
        seen.add(q.style);
        const pool = poolsFor(q.style)[q.type!];
        for (const o of q.options) if (!q.forcedTraps?.includes(o)) expect(pool, `${q.id} [${q.style}] → ${o}`).toContain(o);
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
    const cuenta: Record<string, number> = {};
    let total = 0;
    for (let r = 0; r < 300; r++) {
      for (const q of buildRound({ categories: CATEGORY_IDS })) cuenta[q.category] = (cuenta[q.category] ?? 0) + 1;
      total += ROUND_LENGTH;
    }
    // Se sortea primero la categoría: cada una sale más o menos en la misma proporción.
    for (const id of CATEGORY_IDS) {
      expect(cuenta[id] / total, id).toBeGreaterThan(1 / CATEGORY_IDS.length - 0.08);
      expect(cuenta[id] / total, id).toBeLessThan(1 / CATEGORY_IDS.length + 0.08);
    }
  });

  it("cada dificultad da su número de opciones, y la trampa fija sigue saliendo", () => {
    for (const n of OPTION_COUNTS) {
      for (let r = 0; r < 30; r++) {
        for (const q of buildRound({ categories: CATEGORY_IDS, options: n })) {
          expect(q.options, q.id).toHaveLength(n);
          if (q.forcedTraps) expect(q.options.filter((o) => q.forcedTraps!.includes(o)), q.id).toHaveLength(1);
        }
      }
    }
  });

  it("solo salen preguntas de los territorios marcados", () => {
    for (let r = 0; r < 100; r++) {
      for (const q of buildRound({ categories: CATEGORY_IDS, territorios: ["comunidad"] })) expect(q.territorio).toBe("comunidad");
      const provincias = buildRound({ categories: CATEGORY_IDS, territorios: ["provincia"] });
      for (const q of provincias) expect(q.territorio).toBe("provincia");
      expect(provincias).toHaveLength(ROUND_LENGTH);
      // Solo capitales de provincia: hay menos de 10, así que la partida tiene las que haya.
      expect(buildRound({ categories: ["capitales"], territorios: ["provincia"] })).toHaveLength(CAPITALES_PROVINCIA);
    }
  });

  it("calcula cuántas preguntas tendrá la partida según la selección", () => {
    expect(roundSize(CATEGORY_IDS)).toBe(ROUND_LENGTH);
    expect(roundSize(["capitales"], ["provincia"])).toBe(Math.min(ROUND_LENGTH, CAPITALES_PROVINCIA));
    expect(roundSize(["banderas"], ["provincia"])).toBe(Math.min(ROUND_LENGTH, Object.keys(BANDERAS_PROVINCIAS).length));
    expect(roundSize(["divisiones"], ["provincia"])).toBe(ROUND_LENGTH);
    // Las preguntas que hay son las distintas de la selección; sin límite, una vuelta entera.
    const todas = new Set(CATEGORY_IDS.flatMap((id) => questionsIn(id).map((q) => q.id))).size;
    expect(questionCount(CATEGORY_IDS)).toBe(todas);
    expect(roundSize(CATEGORY_IDS, undefined, "sinLimite")).toBe(todas);
    expect(roundSize(CATEGORY_IDS, undefined, 100)).toBe(Math.min(100, todas));
  });

  it("25, 50 y 100 preguntas solo se pueden elegir si la selección tiene al menos esas; 10 y sin límite, siempre", () => {
    for (const categorias of [["capitales"], ["banderas"], ["divisiones"], CATEGORY_IDS]) {
      for (const territorios of [["comunidad"], ["provincia"], ["comunidad", "provincia"]] as const) {
        const hay = questionCount(categorias, [...territorios]);
        for (const length of ROUND_LENGTHS) {
          const esperado = length === "sinLimite" || length === ROUND_LENGTH || hay >= length;
          expect(lengthFits(length, categorias, [...territorios]), `${categorias} ${territorios} ${length}`).toBe(esperado);
        }
      }
    }
  });

  it("otra vuelta a la baraja tiene todas las preguntas, y no empieza por la última que salió", () => {
    const ajustes = { categories: ["capitales"], territorios: ["provincia" as const] };
    for (let r = 0; r < 100; r++) {
      const primera = buildRound({ ...ajustes, length: "sinLimite" });
      const ultima = primera[primera.length - 1].id;
      const otra = reshuffle(ajustes, ultima);
      expect(otra.map((q) => q.id).sort()).toEqual(primera.map((q) => q.id).sort());
      expect(otra[0].id).not.toBe(ultima);
    }
  });

  it("las preguntas y los pools se generan una sola vez por forma, y jugar partidas no los cambia", () => {
    for (const c of CATEGORIES) {
      for (const style of NAME_STYLES) expect(c.questions(style)).toBe(c.questions(style));
    }
    for (const style of NAME_STYLES) expect(poolsFor(style)).toBe(poolsFor(style));
    const banco = () => JSON.stringify([CATEGORIES.map((c) => NAME_STYLES.map((s) => c.questions(s))), NAME_STYLES.map(poolsFor)]);
    const antes = banco();
    for (let r = 0; r < 50; r++) {
      const round = buildRound({ categories: CATEGORY_IDS, options: 8 });
      rebuild(round, { options: 6 });
      reshuffle({ categories: CATEGORY_IDS }, round[0].id);
    }
    expect(banco()).toBe(antes);
  });

  it("el repaso conserva las preguntas y regenera las opciones", () => {
    const round = buildRound({ categories: CATEGORY_IDS });
    const again = rebuild(round.slice(0, 3));
    expect(again.map((q) => q.id).sort()).toEqual(round.slice(0, 3).map((q) => q.id).sort());
    for (const q of again) expect(q.options).toContain(q.answer);
    expect(again.map((q) => q.style).sort()).toEqual(round.slice(0, 3).map((q) => q.style).sort());
  });
});

