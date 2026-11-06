import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS } from "../src/engine/categories";
import {
  buildRound, rebuild, reshuffle, roundSize, questionCount, questionsIn, lengthFits, OPTION_COUNTS, ROUND_LENGTH, ROUND_LENGTHS
} from "../src/engine/round";
import { PROVINCIAS, poolsFor } from "../src/engine/territory";
import { BANDERAS_PROVINCIAS } from "../src/engine/questions";
import { comboKey, loadState, STORAGE_KEY } from "../src/engine/storage";
import { GameSession, applyRecord, recordValue } from "../src/engine/game";
import { NAME_STYLES, type RoundQuestion } from "../src/engine/types";

/** Pregunta de prueba cuya respuesta correcta es `answer`. */
const rq = (id: string, answer: string): RoundQuestion =>
  ({ id, text: id, answer, answerKey: id, type: null, traps: [], why: "", exclude: [], aliases: [], territorio: "comunidad", category: "c", style: "castellano", options: [answer, "X"] });
/** Preguntas de capital de provincia que hay en los datos (las provincias con trampas). */
const CAPITALES_PROVINCIA = PROVINCIAS.filter((p) => p.trampas).length;
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
    // Una selección que solo da para 8 preguntas cuenta si la partida tiene esas 8.
    expect(play(new GameSession(tenQuestions().slice(0, 8), { expected: 8 })).counts).toBe(true);
  });
});

describe("se acaba el tiempo", () => {
  it("cuenta como fallo sin respuesta: rompe la racha y queda entre los fallos", () => {
    const g = new GameSession([rq("a", "A"), rq("b", "B"), rq("c", "C")], { expected: 3 });
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
    const g = new GameSession(baraja(), { unlimited: true });
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
    const g = new GameSession(baraja(), { unlimited: true });
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
    const vacia = new GameSession(baraja(), { unlimited: true });
    vacia.stop();
    expect(vacia.result().counts).toBe(false);

    const g = new GameSession(baraja(), { unlimited: true });
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
    const g = new GameSession(baraja());
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

describe("guardado", () => {
  const conGuardado = (datos: unknown, fn: () => void) => {
    const almacen = new Map([[STORAGE_KEY, JSON.stringify(datos)]]);
    const previo = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => almacen.get(k) ?? null,
      setItem: (k: string, v: string) => { almacen.set(k, v); }
    };
    try { fn(); } finally { (globalThis as { localStorage?: unknown }).localStorage = previo; }
  };

  it("por defecto están marcados los dos territorios", () => {
    expect(loadState().territorios).toEqual(["comunidad", "provincia"]);
  });

  it("la clave del récord incluye las categorías, los territorios, la dificultad y el número de preguntas (si no son los de por defecto)", () => {
    expect(comboKey(["banderas", "capitales"], ["provincia", "comunidad"])).toBe("capitales+banderas/comunidad+provincia");
    expect(comboKey(["capitales"], ["comunidad"])).toBe("capitales/comunidad");
    expect(comboKey(["capitales"], ["comunidad"], 4)).toBe("capitales/comunidad");
    expect(comboKey(["capitales"], ["comunidad"], 8)).toBe("capitales/comunidad/8");
    expect(comboKey(["capitales"], ["comunidad"], 4, 10)).toBe("capitales/comunidad");
    expect(comboKey(["capitales"], ["comunidad"], 4, 25)).toBe("capitales/comunidad/25preguntas");
    expect(comboKey(["capitales"], ["comunidad"], 8, 100)).toBe("capitales/comunidad/8/100preguntas");
    expect(comboKey(["capitales"], ["comunidad"], 6, "sinLimite")).toBe("capitales/comunidad/6/sinlimite");
    // El tiempo: sin tiempo no se escribe (los récords de antes eran sin tiempo); con tiempo, en segundos.
    expect(comboKey(["capitales"], ["comunidad"], 4, 10, "sinTiempo")).toBe("capitales/comunidad");
    expect(comboKey(["capitales"], ["comunidad"], 4, 10, 60)).toBe("capitales/comunidad/60s");
    expect(comboKey(["capitales"], ["comunidad"], 8, 25, 10)).toBe("capitales/comunidad/8/25preguntas/10s");
  });

  it("por defecto, 1 minuto por pregunta, y se recuerda el tiempo elegido", () => {
    expect(loadState().tiempo).toBe(60);
    conGuardado({ tiempo: 10 }, () => expect(loadState().tiempo).toBe(10));
    conGuardado({ tiempo: "sinTiempo" }, () => expect(loadState().tiempo).toBe("sinTiempo"));
    conGuardado({ tiempo: 45 }, () => expect(loadState().tiempo).toBe(60));
  });

  it("por defecto, 10 preguntas por partida, y se recuerda el número elegido", () => {
    expect(loadState().longitud).toBe(10);
    conGuardado({ longitud: 50 }, () => expect(loadState().longitud).toBe(50));
    conGuardado({ longitud: "sinLimite" }, () => expect(loadState().longitud).toBe("sinLimite"));
    conGuardado({ longitud: 30 }, () => expect(loadState().longitud).toBe(10));
  });

  it("la dificultad por defecto es 4 opciones, y se recuerda la elegida", () => {
    expect(loadState().opciones).toBe(4);
    conGuardado({ opciones: 8 }, () => expect(loadState().opciones).toBe(8));
    conGuardado({ opciones: 5 }, () => expect(loadState().opciones).toBe(4));
  });

  it("convierte lo guardado con los nombres antiguos de categoría, sin perder selección ni récords", () => {
    conGuardado({
      selected: ["banderasCCAA"], known: ["capitalesCCAA", "banderasCCAA"], names: ["oficial"],
      best: { "capitalesCCAA+banderasCCAA": 8, banderasCCAA: 6 }
    }, () => {
      const s = loadState();
      // «divisiones» no existía cuando se guardó, así que se marca sola, como toda categoría nueva.
      expect(s.selected).toEqual(["banderas", "divisiones"]);
      expect(s.names).toEqual(["oficial"]);
      expect(s.best).toEqual({ "capitales+banderas/comunidad": 8, "banderas/comunidad": 6 });
    });
  });
});
