import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../src/engine/categories";
import { makeOptions, prepare } from "../src/engine/options";
import { AUTONOMIAS, COMUNIDADES, capitalesDe, poolsFor } from "../src/engine/territory";
import { NAME_STYLES, type NameStyle, type Question } from "../src/engine/types";

const REPS = 30;
const bank = (style: NameStyle) => CATEGORIES.flatMap((c) => c.questions(style).map((q) => ({ ...q, category: c.id, style })));
const find = (style: NameStyle, id: string) => bank(style).find((q) => q.id === id)!;

for (const style of NAME_STYLES) {
  const all = bank(style);
  const pools = poolsFor(style);

  describe(`[${style}] banco de preguntas`, () => {
    it("19 capitales y 19 banderas (17 comunidades y 2 ciudades autónomas)", () => {
      expect(CATEGORIES.find((c) => c.id === "capitalesCCAA")!.questions(style)).toHaveLength(19);
      expect(CATEGORIES.find((c) => c.id === "banderasCCAA")!.questions(style)).toHaveLength(19);
    });

    it("los identificadores son únicos", () => {
      const ids = all.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("cada pregunta es coherente: tipo existente, respuesta y trampas en su pool, en la misma forma", () => {
      for (const q of all) {
        const answers = ([] as string[]).concat(q.answer);
        expect(([] as string[]).concat(q.answerKey), q.id).toHaveLength(answers.length);
        if (q.type) {
          expect(pools[q.type], `${q.id} → tipo ${q.type}`).toBeDefined();
          for (const a of answers) expect(pools[q.type], `${q.id} → ${a}`).toContain(a);
          for (const t of q.traps) expect(pools[q.type], `${q.id} → trampa ${t}`).toContain(t);
        }
        for (const a of answers) expect(q.traps, q.id).not.toContain(a);
        expect(new Set(q.traps).size, q.id).toBe(q.traps.length);
        expect(q.why.length, q.id).toBeGreaterThan(10);
        expect(q.why, q.id).not.toContain("{");
        if (q.fact !== undefined) {
          expect(q.fact.length, q.id).toBeGreaterThan(10);
          expect(q.fact, q.id).not.toContain("{");
        }
      }
    });

    it("las capitales sin nota propia tienen una automática que dice si también son capital de provincia", () => {
      expect(find(style, "capital-ccaa:02").why).toBe("Zaragoza es la capital de Aragón y también de la provincia de Zaragoza.");
      expect(find(style, "capital-ccaa:13").why).toBe("Madrid es la capital de la Comunidad de Madrid y también de la provincia de Madrid.");
      const navarra = find(style, "capital-ccaa:15");
      expect(navarra.why).toContain(style === "oficial" ? "Pamplona/Iruña es la capital de la Comunidad Foral" : "Pamplona es la capital de Navarra");
    });

    it("las notas y curiosidades sustituyen {capital} por el nombre en la forma de la pregunta", () => {
      const vasco = find(style, "capital-ccaa:16");
      expect(vasco.why).toContain(style === "oficial" ? "eligió Vitoria-Gasteiz" : "eligió Vitoria como");
      expect(find(style, "capital-ccaa:10").fact).toMatch(style === "oficial" ? /^València fue/ : /^Valencia fue/);
    });

    it("cada curiosidad de los datos llega a su pregunta de capital, y las banderas no tienen", () => {
      // Se compara con territorio.json, así que no hay que tocar el test al añadir o quitar curiosidades.
      for (const c of AUTONOMIAS) {
        expect(Boolean(find(style, `capital-ccaa:${c.id}`).fact), c.id).toBe(Boolean(c.curiosidadCapital));
      }
      expect(all.filter((q) => q.fact).every((q) => q.category === "capitalesCCAA")).toBe(true);
    });
  });

  describe(`[${style}] opciones`, () => {
    for (const n of [4, 6, 8]) {
      it(`con ${n} opciones: la correcta aparece, sin duplicados ni excluidos, todas en la misma forma`, () => {
        for (let r = 0; r < REPS; r++) {
          for (const q0 of all) {
            const q = prepare(q0, n, pools);
            expect(q.options, q.id).toHaveLength(n);
            expect(q.options, q.id).toContain(q.answer);
            expect(new Set(q.options).size, q.id).toBe(n);
            for (const o of q.options) expect(pools[q.type!], `${q.id} → ${o}`).toContain(o);
            for (const x of q.exclude) if (x !== q.answer) expect(q.options, `${q.id} → ${x}`).not.toContain(x);
          }
        }
      });
    }

    it("las capitales autonómicas y las de Ceuta y Melilla también salen como incorrectas", () => {
      const qs = all.filter((q) => q.category === "capitalesCCAA");
      const capitales = [...COMUNIDADES.flatMap((c) => capitalesDe(c).map((f) => f[style])), "Ceuta", "Melilla"];
      const seen = new Set<string>();
      for (let r = 0; r < 300; r++) {
        for (const q0 of qs) {
          const q = prepare(q0, 4, pools);
          q.options.filter((o) => o !== q.answer && capitales.includes(o)).forEach((o) => seen.add(o));
        }
      }
      expect([...seen].sort()).toEqual([...new Set(capitales)].sort());
    });

    it("Ceuta y Melilla: su capital es la propia ciudad, y la otra ciudad es la trampa", () => {
      const ceuta = find(style, "capital-ccaa:18");
      expect(ceuta.text).toBe("¿Cuál es la capital de Ceuta?");
      expect(ceuta.answer).toBe("Ceuta");
      expect(ceuta.traps).toEqual(["Melilla"]);
      expect(ceuta.why).toContain("ciudad autónoma");
      expect(find(style, "capital-ccaa:19").traps).toEqual(["Ceuta"]);
    });

    it("Canarias: ninguna de sus dos capitales sale como incorrecta", () => {
      const q0 = find(style, "capital-ccaa:05");
      expect(Array.isArray(q0.answer)).toBe(true);
      for (let r = 0; r < 100; r++) {
        const q = prepare(q0, 8, pools);
        expect((q0.answer as string[]).filter((c) => q.options.includes(c))).toEqual([q.answer]);
      }
    });
  });
}

describe("formas de los nombres", () => {
  it("castellano usa la forma española y oficial la denominación oficial", () => {
    expect(find("castellano", "capital-ccaa:16").answer).toBe("Vitoria");
    expect(find("oficial", "capital-ccaa:16").answer).toBe("Vitoria-Gasteiz");
    expect(find("castellano", "bandera-ccaa:04").answer).toBe("Islas Baleares");
    expect(find("oficial", "bandera-ccaa:04").answer).toBe("Illes Balears");
    expect(poolsFor("castellano").capitalCualquiera).toContain("Gerona");
    expect(poolsFor("oficial").capitalCualquiera).toContain("Girona");
    expect(find("castellano", "capital-ccaa:04").text).toBe("¿Cuál es la capital de las Islas Baleares?");
    expect(find("oficial", "capital-ccaa:03").text).toBe("¿Cuál es la capital del Principado de Asturias?");
  });

  it("la misma pregunta tiene el mismo identificador y el mismo lugar como respuesta en todas las formas", () => {
    const [a, b] = NAME_STYLES.map(bank);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a.map((q) => q.answerKey)).toEqual(b.map((q) => q.answerKey));
  });

  it("al responder se muestra la otra forma, solo si es distinta", () => {
    expect(find("oficial", "capital-ccaa:16").aliases).toEqual(["Vitoria-Gasteiz · en castellano, Vitoria"]);
    expect(find("castellano", "bandera-ccaa:04").aliases).toEqual(["Islas Baleares · nombre oficial: Illes Balears"]);
    expect(find("castellano", "capital-ccaa:10").aliases).toEqual([
      "Comunidad Valenciana · nombre oficial: Comunitat Valenciana",
      "Valencia · nombre oficial: València"
    ]);
    expect(find("castellano", "capital-ccaa:07").aliases).toEqual([]);
    expect(find("oficial", "bandera-ccaa:01").aliases).toEqual([]);
  });
});

describe("reglas de las opciones (con datos de prueba)", () => {
  const synthetic = (over: Partial<Question>): Question & { answer: string } =>
    ({ id: "x", text: "", answer: "A", answerKey: "a", type: "t", traps: [], why: "", exclude: [], aliases: [], ...over }) as Question & { answer: string };

  it("con pool, como mucho n-2 trampas: siempre queda una opción aleatoria", () => {
    const q = synthetic({ traps: ["B", "C", "D", "E"] });
    for (let r = 0; r < 50; r++) {
      expect(makeOptions(q, 4, { t: ["A", "F", "G", "H", "I"] }).filter((o) => q.traps.includes(o)).length).toBeLessThanOrEqual(2);
    }
  });

  it("sin pool, todas las incorrectas salen de las trampas", () => {
    const q = synthetic({ type: null, traps: ["B", "C", "D", "E", "F"] });
    for (let r = 0; r < 20; r++) {
      const opts = makeOptions(q, 4, {});
      expect(opts).toHaveLength(4);
      for (const o of opts) expect(["A", ...q.traps]).toContain(o);
    }
  });

  it("tipo numérico: las incorrectas son números del rango", () => {
    const q = synthetic({ answer: "17", type: "num", range: [12, 22] });
    for (let r = 0; r < 20; r++) {
      for (const o of makeOptions(q, 6, {})) {
        expect(Number(o)).toBeGreaterThanOrEqual(12);
        expect(Number(o)).toBeLessThanOrEqual(22);
      }
    }
  });
});
