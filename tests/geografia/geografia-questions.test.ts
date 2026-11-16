/**
 * @fileoverview Las preguntas de Geografía: enunciados, respuestas, trampas y notas de cada categoría.
 */

import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../src/sections/geografia/engine/geografia-categories";
import { makeOptions, prepare } from "../../src/sections/geografia/engine/geografia-options";
import { AUTONOMIA_BANDERAS, PROVINCIA_BANDERAS, autonomiaCapitalWhy, provinciaCapitalWhy, prepareText, trapProvinciaIds } from "../../src/sections/geografia/engine/geografia-questions";
import { AUTONOMIAS, POPULATION_YEAR, COMUNIDADES, MUNICIPIOS, PROVINCIAS, autonomia, capitalesOf, deAutonomiaText, poolsFor, provincia, provinciasOf } from "../../src/sections/geografia/engine/geografia-territorio";
import { questionsIn } from "../../src/sections/geografia/engine/geografia-round-questions";
import { NAME_FORMS, type NameForm, type Question } from "../../src/sections/geografia/engine/geografia-types";

const REPS = 30;
const bank = (nameForm: NameForm) => CATEGORIES.flatMap((c) => c.questions(nameForm).map((q) => ({ ...q, category: c.id, nameForm })));
const find = (nameForm: NameForm, id: string) => bank(nameForm).find((q) => q.id === id)!;

for (const nameForm of NAME_FORMS) {
  const all = bank(nameForm);
  const pools = poolsFor(nameForm);

  describe(`[${nameForm}] banco de preguntas`, () => {
    // Estos tests comprueban reglas: cómo se convierten los datos en preguntas.
    // Las expectativas se calculan a partir de los datos, así que cambiar una nota, una trampa
    // o una ciudad en los JSON no obliga a tocar los tests.
    const provinciaName = (id: string) => provincia(id).nombre[nameForm];
    const withTrapOptions = PROVINCIAS.filter((p) => p.trampas);

    it("comunidades: una capital y una bandera por comunidad y ciudad autónoma", () => {
      expect(questionsIn("capitales", ["comunidad"])).toHaveLength(AUTONOMIAS.length);
      expect(questionsIn("banderas", ["comunidad"])).toHaveLength(AUTONOMIAS.length);
    });

    it("provincias: capitales de las provincias con trampas (cuya capital se llama distinto) y una bandera por cada provincia que la tenga", () => {
      expect(questionsIn("capitales", ["provincia"]).map((q) => q.id)).toEqual(withTrapOptions.map((p) => `capital-provincia:${p.id}`));
      for (const p of withTrapOptions) expect(p.nombre.castellano, p.id).not.toBe(p.capital.castellano);
      expect(questionsIn("banderas", ["provincia"]).map((q) => q.id)).toEqual(Object.keys(PROVINCIA_BANDERAS).sort().map((id) => `bandera-provincia:${id}`));
    });

    it("capitales autonómicas: trampas (capitales de provincia de la comunidad y ciudades trampa), trampa fija y nota", () => {
      for (const c of AUTONOMIAS) {
        const q = find(nameForm, `capital-ccaa:${c.id}`);
        const correctAnswers = capitalesOf(c).map((f) => f[nameForm]);
        const ofComunidad = c.tipo === "ciudad"
          ? AUTONOMIAS.filter((x) => x.tipo === "ciudad" && x.id !== c.id).flatMap((x) => capitalesOf(x).map((f) => f[nameForm]))
          : provinciasOf(c.id).map((p) => p.capital[nameForm]);
        expect(q.trapOptions, c.id).toEqual([...ofComunidad, ...(c.ciudadesTrampa ?? []).map((f) => f[nameForm])].filter((x) => !correctAnswers.includes(x)));
        expect(q.fixedTrapOptions, c.id).toEqual(c.trampasCapital?.map((f) => f[nameForm]));
        if (c.notaCapital) expect(q.why, c.id).toBe(prepareText(c.notaCapital, nameForm, correctAnswers.join(" y ")));
        if (c.curiosidadCapital) expect(q.fact, c.id).toBe(prepareText(c.curiosidadCapital, nameForm, correctAnswers.join(" y ")));
      }
    });

    it("capitales autonómicas sin nota propia: nota automática que dice si también es capital de provincia", () => {
      expect(autonomiaCapitalWhy(autonomia("02"), "castellano")).toBe("Zaragoza es la capital de Aragón y también de la provincia de Zaragoza.");
      expect(autonomiaCapitalWhy(autonomia("15"), "oficial")).toBe("Pamplona/Iruña es la capital de la Comunidad Foral de Navarra y también de la provincia de Navarra.");
      for (const c of AUTONOMIAS.filter((x) => !x.notaCapital && capitalesOf(x).length === 1)) {
        expect(find(nameForm, `capital-ccaa:${c.id}`).why, c.id).toBe(autonomiaCapitalWhy(c, nameForm));
      }
    });

    it("capitales de provincia: enunciado, trampas (provincias cercanas y ciudades propias), nombre de la provincia como trampa fija y nota", () => {
      for (const p of withTrapOptions) {
        const q = find(nameForm, `capital-provincia:${p.id}`);
        const capital = p.capital[nameForm];
        const trapOptions = [...p.trampas!.flatMap((id) => [provincia(id).capital, ...(provincia(id).ciudades ?? [])]), ...(p.ciudades ?? [])].map((f) => f[nameForm]);
        expect(q.text, p.id).toBe(`¿Cuál es la capital de la provincia de ${p.nombre[nameForm]}?`);
        expect(q.answer, p.id).toBe(capital);
        expect(q.trapOptions, p.id).toEqual([...new Set(trapOptions)].filter((x) => x !== capital));
        expect(q.fixedTrapOptions, p.id).toEqual([p.nombre[nameForm]]);
        expect(q.why, p.id).toBe(p.notaCapital ? prepareText(p.notaCapital, nameForm, capital) : provinciaCapitalWhy(p, nameForm));
        // Mismo lugar que la capital de su comunidad, si coincide (Oviedo).
        expect(q.answerKey, p.id).toBe("ciudad:" + p.capital.castellano);
      }
    });

    it("la nota automática de provincia, para las que no tengan una propia", () => {
      const withoutWhy = (id: string) => ({ ...provincia(id), notaCapital: undefined });
      expect(provinciaCapitalWhy(withoutWhy("48"), "castellano")).toBe("Bilbao es la capital de la provincia de Vizcaya. La capital del País Vasco es Vitoria.");
      expect(provinciaCapitalWhy(withoutWhy("01"), "castellano")).toBe("Vitoria es la capital de la provincia de Álava y también del País Vasco.");
      expect(provinciaCapitalWhy(withoutWhy("33"), "castellano")).toBe("Oviedo es la capital de la provincia de Asturias. Como es la única provincia de Asturias, también es la capital de la comunidad.");
    });

    it("la trampa fija sale siempre, y una sola, también cuando hay varias para sortear", () => {
      for (const q0 of all.filter((q) => q.fixedTrapOptions)) {
        for (let r = 0; r < 20; r++) {
          expect(prepare(q0, 4, pools).options.filter((o) => q0.fixedTrapOptions!.includes(o)), q0.id).toHaveLength(1);
        }
      }
    });

    it("en cada partida se sortean distintas trampas", () => {
      const q0 = [...all].sort((a, b) => b.trapOptions.length - a.trapOptions.length)[0];
      const seenIds = new Set<string>();
      for (let r = 0; r < 300; r++) prepare(q0, 4, pools).options.filter((o) => q0.trapOptions.includes(o)).forEach((o) => seenIds.add(o));
      expect([...seenIds].sort(), q0.id).toEqual([...q0.trapOptions].sort());
    });

    it("banderas: descripción y significado de los datos, enunciado y trampas", () => {
      for (const c of AUTONOMIAS) {
        const q = find(nameForm, `bandera-ccaa:${c.id}`);
        expect(q.why, c.id).toBe(prepareText(AUTONOMIA_BANDERAS[c.id].descripcion, nameForm));
        expect(q.meaning, c.id).toBe(prepareText(AUTONOMIA_BANDERAS[c.id].significado, nameForm));
        expect(q.banderaKey, c.id).toBe(c.id);
      }
      for (const [id, b] of Object.entries(PROVINCIA_BANDERAS)) {
        const q = find(nameForm, `bandera-provincia:${id}`);
        expect(q.text).toBe("¿De qué provincia es esta bandera?");
        expect(q.answer, id).toBe(provinciaName(id));
        expect(q.trapOptions, id).toEqual(b.trampas.map(provinciaName));
        expect(q.why, id).toBe(prepareText(b.descripcion, nameForm));
        expect(q.meaning, id).toBe(prepareText(b.significado, nameForm));
        expect(q.banderaKey, id).toBe("p" + id);
        expect(q.pool, id).toBe("provinciaWithBandera");
      }
      expect(pools.provinciaWithBandera).toHaveLength(Object.keys(PROVINCIA_BANDERAS).length);
      // Solo las banderas tienen significado.
      expect(all.filter((q) => q.meaning).every((q) => q.category === "banderas")).toBe(true);
    });

    it("divisiones: las provincias de comunidades con varias provincias, con nota que las nombra todas", () => {
      const withSeveral = PROVINCIAS.filter((p) => provinciasOf(p.comunidad).length > 1);
      expect(questionsIn("divisiones", ["comunidad"]).map((q) => q.id)).toEqual(withSeveral.map((p) => `provincia-ccaa:${p.id}`));
      expect(questionsIn("divisiones", ["provincia"]).map((q) => q.id)).toEqual(MUNICIPIOS.map((m) => `municipio-provincia:${m.id}`));
      for (const p of withSeveral) {
        const q = find(nameForm, `provincia-ccaa:${p.id}`);
        const c = autonomia(p.comunidad);
        expect(q.text, p.id).toBe(`¿De qué comunidad autónoma es la provincia de ${p.nombre[nameForm]}?`);
        expect(q.answer, p.id).toBe(c.nombre[nameForm]);
        expect(q.why, p.id).toMatch(new RegExp(`^La provincia de ${p.nombre[nameForm].replace(/[/()]/g, "\\$&")} es ${deAutonomiaText(c, nameForm)}, que tiene `));
        for (const x of provinciasOf(c.id)) expect(q.why, `${p.id} → ${x.id}`).toContain(x.nombre[nameForm]);
        // La curiosidad de la provincia, si la tiene, sale en esta pregunta.
        expect(q.fact, p.id).toBe(p.curiosidad ? prepareText(p.curiosidad, nameForm) : undefined);
      }
    });

    it("divisiones: las trampas son las comunidades que lindan con la provincia (si hay al menos dos)", () => {
      for (const p of PROVINCIAS.filter((x) => provinciasOf(x.comunidad).length > 1)) {
        const q = find(nameForm, `provincia-ccaa:${p.id}`);
        const neighborIds = [...new Set(p.vecinas.map((v) => provincia(v).comunidad))].filter((id) => id !== p.comunidad);
        if (neighborIds.length >= 2) expect([...q.trapOptions].sort(), p.id).toEqual(neighborIds.map((id) => autonomia(id).nombre[nameForm]).sort());
        expect(q.trapOptions, p.id).not.toContain(autonomia(p.comunidad).nombre[nameForm]);
        expect(q.trapOptions.length, p.id).toBeGreaterThan(0);
      }
    });

    it("divisiones: Ceuta y Melilla nunca salen como opción (la pregunta dice «comunidad autónoma»)", () => {
      const ciudades = AUTONOMIAS.filter((c) => c.tipo === "ciudad").map((c) => c.nombre[nameForm]);
      for (const q0 of all.filter((q) => q.category === "divisiones" && q.territorio === "comunidad")) {
        for (let r = 0; r < 10; r++) for (const c of ciudades) expect(prepare(q0, 8, pools).options, q0.id).not.toContain(c);
      }
    });

    it("municipios: uno por municipio de municipios.json, con su provincia como respuesta", () => {
      for (const m of MUNICIPIOS) {
        const q = find(nameForm, `municipio-provincia:${m.id}`);
        const p = provincia(m.id.slice(0, 2));
        expect(q.text, m.id).toBe(`¿De qué provincia es el municipio de ${m.nombre[nameForm]}?`);
        expect(q.answer, m.id).toBe(p.nombre[nameForm]);
        expect(q.answerKey, m.id).toBe("provincia:" + p.id);
      }
    });

    it("municipios: las trampas son las provincias vecinas, o las otras provincias sin vecinas (islas, Ceuta y Melilla)", () => {
      const withoutVecinas = PROVINCIAS.filter((p) => !p.vecinas.length).map((p) => p.id);
      for (const m of MUNICIPIOS) {
        const p = provincia(m.id.slice(0, 2));
        const expected = p.vecinas.length ? p.vecinas : withoutVecinas.filter((id) => id !== p.id);
        expect(trapProvinciaIds(p), m.id).toEqual(expected);
        expect([...find(nameForm, `municipio-provincia:${m.id}`).trapOptions].sort(), m.id).toEqual(expected.map(provinciaName).sort());
      }
    });

    it("municipios: la nota dice su puesto (si está entre los tres más poblados) y su población, con el año del INE; la curiosidad va aparte", () => {
      const ordinal: Record<number, string> = { 2: "segundo", 3: "tercer" };
      for (const m of MUNICIPIOS) {
        const p = provincia(m.id.slice(0, 2));
        const n = m.nombre[nameForm];
        const population = `${m.poblacion.toLocaleString("es-ES")} habitantes (INE, ${POPULATION_YEAR})`;
        const ofProvincia = `de la provincia de ${p.nombre[nameForm]}`;
        const capital = p.capital.oficial === m.nombre.oficial;
        const expectedText = autonomia(p.comunidad).tipo === "ciudad" ? `${n} es a la vez municipio, provincia y ciudad autónoma: ${population}.`
          : m.puesto === 1 && capital ? `${n} es la capital y el municipio más poblado ${ofProvincia}: ${population}.`
          : m.puesto === 1 ? `${n} es el municipio más poblado ${ofProvincia}, más incluso que la capital, ${p.capital[nameForm]}: ${population}.`
          : m.puesto <= 3 && capital ? `${n} es la capital ${ofProvincia} y su ${ordinal[m.puesto]} municipio más poblado: ${population}.`
          : m.puesto <= 3 ? `${n} es el ${ordinal[m.puesto]} municipio más poblado ${ofProvincia}: ${population}.`
          : `${n} tiene ${population} y no está entre los tres municipios más poblados ${ofProvincia}.`;
        const others = (m.mismoNombre ?? []).map((x) =>
          `En la provincia de ${provinciaName(x.id.slice(0, 2))} hay otro municipio que también se llama ${m.nombre.oficial}, con ${x.poblacion.toLocaleString("es-ES")} habitantes.`);
        const q = find(nameForm, `municipio-provincia:${m.id}`);
        expect(q.why, m.id).toBe([expectedText, others.join(" ")].filter(Boolean).join("\n"));
        expect(q.fact, m.id).toBe(m.curiosidad ? prepareText(m.curiosidad, nameForm) : undefined);
      }
      // Los miles se separan con punto, como se escribe en español.
      expect((293837).toLocaleString("es-ES")).toBe("293.837");
    });

    it("municipios con el mismo nombre en otra provincia: esa provincia nunca sale como opción", () => {
      const withSameName = MUNICIPIOS.filter((m) => m.mismoNombre);
      for (const m of withSameName) {
        const q = all.find((x) => x.id === `municipio-provincia:${m.id}`)!;
        const otherForms = m.mismoNombre!.map((x) => provinciaName(x.id.slice(0, 2)));
        expect([...q.exclude].sort(), m.id).toEqual([...otherForms].sort());
        for (let r = 0; r < REPS; r++) for (const o of otherForms) expect(prepare(q, 8, pools).options, m.id).not.toContain(o);
      }
    });

    it("cada pregunta dice su territorio: las de provincia son las de capital, bandera y municipios de provincia", () => {
      for (const q of all) expect(q.territorio, q.id).toBe(/^((capital|bandera)-provincia|municipio-provincia):/.test(q.id) ? "provincia" : "comunidad");
    });

    it("los identificadores son únicos", () => {
      const ids = all.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("cada pregunta es coherente: tipo existente, respuesta y trampas en su pool, en la misma forma", () => {
      for (const q of all) {
        const answers = ([] as string[]).concat(q.answer);
        expect(([] as string[]).concat(q.answerKey), q.id).toHaveLength(answers.length);
        if (q.pool) {
          expect(pools[q.pool], `${q.id} → tipo ${q.pool}`).toBeDefined();
          for (const a of answers) expect(pools[q.pool], `${q.id} → ${a}`).toContain(a);
          for (const t of q.trapOptions) expect(pools[q.pool], `${q.id} → trampa ${t}`).toContain(t);
        }
        for (const a of answers) expect(q.trapOptions, q.id).not.toContain(a);
        expect(new Set(q.trapOptions).size, q.id).toBe(q.trapOptions.length);
        expect(q.why.length, q.id).toBeGreaterThan(10);
        expect(q.why, q.id).not.toContain("{");
        for (const text of [q.fact, q.meaning]) {
          if (text === undefined) continue;
          expect(text.length, q.id).toBeGreaterThan(10);
          expect(text, q.id).not.toContain("{");
        }
      }
    });

    it("solo las capitales, las provincias y los municipios tienen curiosidad", () => {
      expect(all.filter((q) => q.fact).every((q) => q.category === "capitales" || /^(municipio-provincia|provincia-ccaa):/.test(q.id))).toBe(true);
    });
  });

  describe(`[${nameForm}] opciones`, () => {
    for (const n of [4, 6, 8]) {
      it(`con ${n} opciones: la correcta aparece, sin duplicados ni excluidos, todas en la misma forma`, () => {
        for (let r = 0; r < REPS; r++) {
          for (const q0 of all) {
            const q = prepare(q0, n, pools);
            expect(q.options, q.id).toHaveLength(n);
            expect(q.options, q.id).toContain(q.answer);
            expect(new Set(q.options).size, q.id).toBe(n);
            for (const o of q.options) if (!q.fixedTrapOptions?.includes(o)) expect(pools[q.pool!], `${q.id} → ${o}`).toContain(o);
            if (q.fixedTrapOptions) expect(q.options.filter((o) => q.fixedTrapOptions!.includes(o)), `${q.id} → trampa fija`).toHaveLength(1);
            for (const x of q.exclude) if (x !== q.answer) expect(q.options, `${q.id} → ${x}`).not.toContain(x);
          }
        }
      });
    }

    it("las capitales autonómicas y las de Ceuta y Melilla también salen como incorrectas", () => {
      const qs = all.filter((q) => q.category === "capitales");
      const capitales = [...COMUNIDADES.flatMap((c) => capitalesOf(c).map((f) => f[nameForm])), "Ceuta", "Melilla"];
      const seen = new Set<string>();
      for (let r = 0; r < 300; r++) {
        for (const q0 of qs) {
          const q = prepare(q0, 4, pools);
          q.options.filter((o) => o !== q.answer && capitales.includes(o)).forEach((o) => seen.add(o));
        }
      }
      expect([...seen].sort()).toEqual([...new Set(capitales)].sort());
    });

    it("Ceuta y Melilla: su capital es la propia ciudad", () => {
      for (const c of AUTONOMIAS.filter((x) => x.tipo === "ciudad")) {
        expect(find(nameForm, `capital-ccaa:${c.id}`).answer, c.id).toBe(c.nombre[nameForm]);
      }
    });

    it("Canarias: ninguna de sus dos capitales sale como incorrecta", () => {
      const q0 = find(nameForm, "capital-ccaa:05");
      expect(Array.isArray(q0.answer)).toBe(true);
      for (let r = 0; r < 100; r++) {
        const q = prepare(q0, 8, pools);
        expect((q0.answer as string[]).filter((c) => q.options.includes(c))).toEqual([q.answer]);
      }
    });
  });
}

describe("preparación de los textos de las notas", () => {
  it("quita los espacios sobrantes al principio, al final y junto a los saltos de línea", () => {
    expect(prepareText(" Primera línea. \n Segunda línea.\t\nTercera. ", "castellano")).toBe("Primera línea.\nSegunda línea.\nTercera.");
  });

  it("sustituye las marcas según la forma, y deja tal cual una provincia que no existe", () => {
    const t = "{provincia:20}, {provincia.capital:20}, {capital} y {provincia:99}";
    expect(prepareText(t, "oficial", "Vitoria-Gasteiz")).toBe("Gipuzkoa, Donostia/San Sebastián, Vitoria-Gasteiz y {provincia:99}");
    expect(prepareText(t, "castellano", "Vitoria")).toBe("Guipúzcoa, San Sebastián, Vitoria y {provincia:99}");
  });

  it("sustituye los municipios según la forma, y deja tal cual uno que no está en municipios.json", () => {
    const m = MUNICIPIOS.find((x) => x.nombre.oficial !== x.nombre.castellano)!;
    for (const nameForm of NAME_FORMS) {
      expect(prepareText(`{municipio:${m.id}} y {municipio:99999}`, nameForm)).toBe(`${m.nombre[nameForm]} y {municipio:99999}`);
    }
  });
});

describe("formas de los nombres", () => {
  it("castellano usa la forma española y oficial la denominación oficial", () => {
    expect(find("castellano", "capital-ccaa:16").answer).toBe("Vitoria");
    expect(find("oficial", "capital-ccaa:16").answer).toBe("Vitoria-Gasteiz");
    expect(find("castellano", "bandera-ccaa:04").answer).toBe("Islas Baleares");
    expect(find("oficial", "bandera-ccaa:04").answer).toBe("Illes Balears");
    expect(poolsFor("castellano").anyCapital).toContain("Gerona");
    expect(poolsFor("oficial").anyCapital).toContain("Girona");
    expect(find("castellano", "capital-ccaa:04").text).toBe("¿Cuál es la capital de las Islas Baleares?");
    expect(find("oficial", "capital-ccaa:03").text).toBe("¿Cuál es la capital del Principado de Asturias?");
  });

  it("la misma pregunta tiene el mismo identificador y el mismo lugar como respuesta en todas las formas", () => {
    const [a, b] = NAME_FORMS.map(bank);
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
    ({ id: "x", text: "", answer: "A", answerKey: "a", pool: "t", trapOptions: [], why: "", exclude: [], aliases: [], ...over }) as Question & { answer: string };

  it("con pool, como mucho n-2 trampas: siempre queda una opción aleatoria", () => {
    const q = synthetic({ trapOptions: ["B", "C", "D", "E"] });
    for (let r = 0; r < 50; r++) {
      expect(makeOptions(q, 4, { t: ["A", "F", "G", "H", "I"] }).filter((o) => q.trapOptions.includes(o)).length).toBeLessThanOrEqual(2);
    }
  });

  it("las trampas fijas salen siempre y cuentan dentro del máximo: sigue quedando un hueco al azar", () => {
    const q = synthetic({ trapOptions: ["B", "C", "D", "E"], fixedTrapOptions: ["Z"] });
    for (let r = 0; r < 50; r++) {
      const opts = makeOptions(q, 4, { t: ["A", "F", "G", "H", "I"] });
      expect(opts).toContain("Z");
      expect(opts.filter((o) => ["B", "C", "D", "E", "Z"].includes(o)).length).toBe(2);
      expect(opts.filter((o) => ["F", "G", "H", "I"].includes(o)).length).toBe(1);
    }
  });

  it("si hay varias trampas fijas, sale una sola, sorteada", () => {
    const q = synthetic({ trapOptions: ["B", "C"], fixedTrapOptions: ["Y", "Z"] });
    const seenIds = new Set<string>();
    for (let r = 0; r < 100; r++) {
      const fixedCandidates = makeOptions(q, 4, { t: ["A", "F", "G", "H"] }).filter((o) => o === "Y" || o === "Z");
      expect(fixedCandidates).toHaveLength(1);
      seenIds.add(fixedCandidates[0]);
    }
    expect([...seenIds].sort()).toEqual(["Y", "Z"]);
  });

  it("sin pool, todas las incorrectas salen de las trampas", () => {
    const q = synthetic({ pool: null, trapOptions: ["B", "C", "D", "E", "F"] });
    for (let r = 0; r < 20; r++) {
      const opts = makeOptions(q, 4, {});
      expect(opts).toHaveLength(4);
      for (const o of opts) expect(["A", ...q.trapOptions]).toContain(o);
    }
  });

  it("tipo numérico: las incorrectas son números del rango", () => {
    const q = synthetic({ answer: "17", pool: "num", range: [12, 22] });
    for (let r = 0; r < 20; r++) {
      for (const o of makeOptions(q, 6, {})) {
        expect(Number(o)).toBeGreaterThanOrEqual(12);
        expect(Number(o)).toBeLessThanOrEqual(22);
      }
    }
  });
});
