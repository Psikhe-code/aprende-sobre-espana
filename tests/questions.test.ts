import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../src/engine/categories";
import { makeOptions, prepare } from "../src/engine/options";
import { BANDERAS, BANDERAS_PROVINCIAS, notaAutomatica, notaCapitalProvincia, prepararTexto, provinciasTrampa } from "../src/engine/questions";
import { AUTONOMIAS, AÑO_POBLACION, COMUNIDADES, MUNICIPIOS, PROVINCIAS, autonomia, capitalesDe, deAutonomia, poolsFor, provincia, provinciasDe } from "../src/engine/territory";
import { questionsIn } from "../src/engine/round";
import { NAME_STYLES, type NameStyle, type Question } from "../src/engine/types";

const REPS = 30;
const bank = (style: NameStyle) => CATEGORIES.flatMap((c) => c.questions(style).map((q) => ({ ...q, category: c.id, style })));
const find = (style: NameStyle, id: string) => bank(style).find((q) => q.id === id)!;

for (const style of NAME_STYLES) {
  const all = bank(style);
  const pools = poolsFor(style);

  describe(`[${style}] banco de preguntas`, () => {
    // Estos tests comprueban reglas: cómo se convierten los datos en preguntas.
    // Las expectativas se calculan a partir de los datos, así que cambiar una nota, una trampa
    // o una ciudad en los JSON no obliga a tocar los tests.
    const nombreProv = (id: string) => provincia(id).nombre[style];
    const conTrampas = PROVINCIAS.filter((p) => p.trampas);

    it("comunidades: una capital y una bandera por comunidad y ciudad autónoma", () => {
      expect(questionsIn("capitales", ["comunidad"])).toHaveLength(AUTONOMIAS.length);
      expect(questionsIn("banderas", ["comunidad"])).toHaveLength(AUTONOMIAS.length);
    });

    it("provincias: capitales de las provincias con trampas (cuya capital se llama distinto) y una bandera por cada provincia que la tenga", () => {
      expect(questionsIn("capitales", ["provincia"]).map((q) => q.id)).toEqual(conTrampas.map((p) => `capital-provincia:${p.id}`));
      for (const p of conTrampas) expect(p.nombre.castellano, p.id).not.toBe(p.capital.castellano);
      expect(questionsIn("banderas", ["provincia"]).map((q) => q.id)).toEqual(Object.keys(BANDERAS_PROVINCIAS).sort().map((id) => `bandera-provincia:${id}`));
    });

    it("capitales autonómicas: trampas (capitales de provincia de la comunidad y ciudades trampa), trampa fija y nota", () => {
      for (const c of AUTONOMIAS) {
        const q = find(style, `capital-ccaa:${c.id}`);
        const correctas = capitalesDe(c).map((f) => f[style]);
        const deLaComunidad = c.tipo === "ciudad"
          ? AUTONOMIAS.filter((x) => x.tipo === "ciudad" && x.id !== c.id).flatMap((x) => capitalesDe(x).map((f) => f[style]))
          : provinciasDe(c.id).map((p) => p.capital[style]);
        expect(q.traps, c.id).toEqual([...deLaComunidad, ...(c.ciudadesTrampa ?? []).map((f) => f[style])].filter((x) => !correctas.includes(x)));
        expect(q.forcedTraps, c.id).toEqual(c.trampasCapital?.map((f) => f[style]));
        if (c.notaCapital) expect(q.why, c.id).toBe(prepararTexto(c.notaCapital, style, correctas.join(" y ")));
        if (c.curiosidadCapital) expect(q.fact, c.id).toBe(prepararTexto(c.curiosidadCapital, style, correctas.join(" y ")));
      }
    });

    it("capitales autonómicas sin nota propia: nota automática que dice si también es capital de provincia", () => {
      expect(notaAutomatica(autonomia("02"), "castellano")).toBe("Zaragoza es la capital de Aragón y también de la provincia de Zaragoza.");
      expect(notaAutomatica(autonomia("15"), "oficial")).toBe("Pamplona/Iruña es la capital de la Comunidad Foral de Navarra y también de la provincia de Navarra.");
      for (const c of AUTONOMIAS.filter((x) => !x.notaCapital && capitalesDe(x).length === 1)) {
        expect(find(style, `capital-ccaa:${c.id}`).why, c.id).toBe(notaAutomatica(c, style));
      }
    });

    it("capitales de provincia: enunciado, trampas (provincias cercanas y ciudades propias), nombre de la provincia como trampa fija y nota", () => {
      for (const p of conTrampas) {
        const q = find(style, `capital-provincia:${p.id}`);
        const capital = p.capital[style];
        const trampas = [...p.trampas!.flatMap((id) => [provincia(id).capital, ...(provincia(id).ciudades ?? [])]), ...(p.ciudades ?? [])].map((f) => f[style]);
        expect(q.text, p.id).toBe(`¿Cuál es la capital de la provincia de ${p.nombre[style]}?`);
        expect(q.answer, p.id).toBe(capital);
        expect(q.traps, p.id).toEqual([...new Set(trampas)].filter((x) => x !== capital));
        expect(q.forcedTraps, p.id).toEqual([p.nombre[style]]);
        expect(q.why, p.id).toBe(p.notaCapital ? prepararTexto(p.notaCapital, style, capital) : notaCapitalProvincia(p, style));
        // Mismo lugar que la capital de su comunidad, si coincide: así no salen las dos en una partida.
        expect(q.answerKey, p.id).toBe("ciudad:" + p.capital.castellano);
      }
    });

    it("la nota automática de provincia, para las que no tengan una propia", () => {
      const sinNota = (id: string) => ({ ...provincia(id), notaCapital: undefined });
      expect(notaCapitalProvincia(sinNota("48"), "castellano")).toBe("Bilbao es la capital de la provincia de Vizcaya. La capital del País Vasco es Vitoria.");
      expect(notaCapitalProvincia(sinNota("01"), "castellano")).toBe("Vitoria es la capital de la provincia de Álava y también del País Vasco.");
      expect(notaCapitalProvincia(sinNota("33"), "castellano")).toBe("Oviedo es la capital de la provincia de Asturias. Como es la única provincia de Asturias, también es la capital de la comunidad.");
    });

    it("la trampa fija sale siempre, y una sola, también cuando hay varias para sortear", () => {
      for (const q0 of all.filter((q) => q.forcedTraps)) {
        for (let r = 0; r < 20; r++) {
          expect(prepare(q0, 4, pools).options.filter((o) => q0.forcedTraps!.includes(o)), q0.id).toHaveLength(1);
        }
      }
    });

    it("en cada partida se sortean distintas trampas", () => {
      const q0 = [...all].sort((a, b) => b.traps.length - a.traps.length)[0];
      const vistas = new Set<string>();
      for (let r = 0; r < 300; r++) prepare(q0, 4, pools).options.filter((o) => q0.traps.includes(o)).forEach((o) => vistas.add(o));
      expect([...vistas].sort(), q0.id).toEqual([...q0.traps].sort());
    });

    it("banderas: descripción y significado de los datos, enunciado y trampas", () => {
      for (const c of AUTONOMIAS) {
        const q = find(style, `bandera-ccaa:${c.id}`);
        expect(q.why, c.id).toBe(prepararTexto(BANDERAS[c.id].descripcion, style));
        expect(q.meaning, c.id).toBe(prepararTexto(BANDERAS[c.id].significado, style));
        expect(q.flag, c.id).toBe(c.id);
      }
      for (const [id, b] of Object.entries(BANDERAS_PROVINCIAS)) {
        const q = find(style, `bandera-provincia:${id}`);
        expect(q.text).toBe("¿De qué provincia es esta bandera?");
        expect(q.answer, id).toBe(nombreProv(id));
        expect(q.traps, id).toEqual(b.trampas.map(nombreProv));
        expect(q.why, id).toBe(prepararTexto(b.descripcion, style));
        expect(q.meaning, id).toBe(prepararTexto(b.significado, style));
        expect(q.flag, id).toBe("p" + id);
        expect(q.type, id).toBe("provinciaConBandera");
      }
      expect(pools.provinciaConBandera).toHaveLength(Object.keys(BANDERAS_PROVINCIAS).length);
      // Solo las banderas tienen significado.
      expect(all.filter((q) => q.meaning).every((q) => q.category === "banderas")).toBe(true);
    });

    it("divisiones: las provincias de comunidades con varias provincias, con nota que las nombra todas", () => {
      const conVarias = PROVINCIAS.filter((p) => provinciasDe(p.comunidad).length > 1);
      expect(questionsIn("divisiones", ["comunidad"]).map((q) => q.id)).toEqual(conVarias.map((p) => `provincia-ccaa:${p.id}`));
      expect(questionsIn("divisiones", ["provincia"]).map((q) => q.id)).toEqual(MUNICIPIOS.map((m) => `municipio-provincia:${m.id}`));
      for (const p of conVarias) {
        const q = find(style, `provincia-ccaa:${p.id}`);
        const c = autonomia(p.comunidad);
        expect(q.text, p.id).toBe(`¿De qué comunidad autónoma es la provincia de ${p.nombre[style]}?`);
        expect(q.answer, p.id).toBe(c.nombre[style]);
        expect(q.why, p.id).toMatch(new RegExp(`^La provincia de ${p.nombre[style].replace(/[/()]/g, "\\$&")} es ${deAutonomia(c, style)}, que tiene `));
        for (const x of provinciasDe(c.id)) expect(q.why, `${p.id} → ${x.id}`).toContain(x.nombre[style]);
      }
    });

    it("divisiones: las trampas son las comunidades que lindan con la provincia (si hay al menos dos)", () => {
      for (const p of PROVINCIAS.filter((x) => provinciasDe(x.comunidad).length > 1)) {
        const q = find(style, `provincia-ccaa:${p.id}`);
        const lindan = [...new Set(p.vecinas.map((v) => provincia(v).comunidad))].filter((id) => id !== p.comunidad);
        if (lindan.length >= 2) expect([...q.traps].sort(), p.id).toEqual(lindan.map((id) => autonomia(id).nombre[style]).sort());
        expect(q.traps, p.id).not.toContain(autonomia(p.comunidad).nombre[style]);
        expect(q.traps.length, p.id).toBeGreaterThan(0);
      }
    });

    it("divisiones: Ceuta y Melilla nunca salen como opción (la pregunta dice «comunidad autónoma»)", () => {
      const ciudades = AUTONOMIAS.filter((c) => c.tipo === "ciudad").map((c) => c.nombre[style]);
      for (const q0 of all.filter((q) => q.category === "divisiones" && q.territorio === "comunidad")) {
        for (let r = 0; r < 10; r++) for (const c of ciudades) expect(prepare(q0, 8, pools).options, q0.id).not.toContain(c);
      }
    });

    it("municipios: uno por municipio de municipios.json, con su provincia como respuesta", () => {
      for (const m of MUNICIPIOS) {
        const q = find(style, `municipio-provincia:${m.id}`);
        const p = provincia(m.id.slice(0, 2));
        expect(q.text, m.id).toBe(`¿De qué provincia es el municipio de ${m.nombre[style]}?`);
        expect(q.answer, m.id).toBe(p.nombre[style]);
        expect(q.answerKey, m.id).toBe("provincia:" + p.id);
      }
    });

    it("municipios: las trampas son las provincias vecinas, o las otras provincias sin vecinas (islas, Ceuta y Melilla)", () => {
      const sinVecinas = PROVINCIAS.filter((p) => !p.vecinas.length).map((p) => p.id);
      for (const m of MUNICIPIOS) {
        const p = provincia(m.id.slice(0, 2));
        const esperadas = p.vecinas.length ? p.vecinas : sinVecinas.filter((id) => id !== p.id);
        expect(provinciasTrampa(p), m.id).toEqual(esperadas);
        expect([...find(style, `municipio-provincia:${m.id}`).traps].sort(), m.id).toEqual(esperadas.map(nombreProv).sort());
      }
    });

    it("municipios: la nota dice su puesto (si está entre los tres más poblados) o su motivo, con la población del INE y el año", () => {
      const ordinal: Record<number, string> = { 2: "segundo", 3: "tercer" };
      for (const m of MUNICIPIOS) {
        const p = provincia(m.id.slice(0, 2));
        const n = m.nombre[style];
        const hab = `${m.poblacion.toLocaleString("es-ES")} habitantes (INE, ${AÑO_POBLACION})`;
        const dePr = `de la provincia de ${p.nombre[style]}`;
        const capital = p.capital.oficial === m.nombre.oficial;
        const esperada = autonomia(p.comunidad).tipo === "ciudad" ? `${n} es a la vez municipio, provincia y ciudad autónoma: ${hab}.`
          : m.puesto === 1 && capital ? `${n} es la capital y el municipio más poblado ${dePr}: ${hab}.`
          : m.puesto === 1 ? `${n} es el municipio más poblado ${dePr}, más incluso que la capital, ${p.capital[style]}: ${hab}.`
          : m.puesto <= 3 && capital ? `${n} es la capital ${dePr} y su ${ordinal[m.puesto]} municipio más poblado: ${hab}.`
          : m.puesto <= 3 ? `${n} es el ${ordinal[m.puesto]} municipio más poblado ${dePr}: ${hab}.`
          : `${n} tiene ${hab} y no está entre los tres municipios más poblados ${dePr}, pero es muy conocido: ${prepararTexto(m.motivo!, style)}.`;
        expect(find(style, `municipio-provincia:${m.id}`).why, m.id).toBe(esperada);
      }
      // Los miles se separan con punto, como se escribe en español.
      expect((293837).toLocaleString("es-ES")).toBe("293.837");
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
        if (q.type) {
          expect(pools[q.type], `${q.id} → tipo ${q.type}`).toBeDefined();
          for (const a of answers) expect(pools[q.type], `${q.id} → ${a}`).toContain(a);
          for (const t of q.traps) expect(pools[q.type], `${q.id} → trampa ${t}`).toContain(t);
        }
        for (const a of answers) expect(q.traps, q.id).not.toContain(a);
        expect(new Set(q.traps).size, q.id).toBe(q.traps.length);
        expect(q.why.length, q.id).toBeGreaterThan(10);
        expect(q.why, q.id).not.toContain("{");
        for (const texto of [q.fact, q.meaning]) {
          if (texto === undefined) continue;
          expect(texto.length, q.id).toBeGreaterThan(10);
          expect(texto, q.id).not.toContain("{");
        }
      }
    });

    it("solo las capitales tienen curiosidad", () => {
      expect(all.filter((q) => q.fact).every((q) => q.category === "capitales")).toBe(true);
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
            for (const o of q.options) if (!q.forcedTraps?.includes(o)) expect(pools[q.type!], `${q.id} → ${o}`).toContain(o);
            if (q.forcedTraps) expect(q.options.filter((o) => q.forcedTraps!.includes(o)), `${q.id} → trampa fija`).toHaveLength(1);
            for (const x of q.exclude) if (x !== q.answer) expect(q.options, `${q.id} → ${x}`).not.toContain(x);
          }
        }
      });
    }

    it("las capitales autonómicas y las de Ceuta y Melilla también salen como incorrectas", () => {
      const qs = all.filter((q) => q.category === "capitales");
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

    it("Ceuta y Melilla: su capital es la propia ciudad", () => {
      for (const c of AUTONOMIAS.filter((x) => x.tipo === "ciudad")) {
        expect(find(style, `capital-ccaa:${c.id}`).answer, c.id).toBe(c.nombre[style]);
      }
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

describe("preparación de los textos de las notas", () => {
  it("quita los espacios sobrantes al principio, al final y junto a los saltos de línea", () => {
    expect(prepararTexto(" Primera línea. \n Segunda línea.\t\nTercera. ", "castellano")).toBe("Primera línea.\nSegunda línea.\nTercera.");
  });

  it("sustituye las marcas según la forma, y deja tal cual una provincia que no existe", () => {
    const t = "{provincia:20}, {provincia.capital:20}, {capital} y {provincia:99}";
    expect(prepararTexto(t, "oficial", "Vitoria-Gasteiz")).toBe("Gipuzkoa, Donostia/San Sebastián, Vitoria-Gasteiz y {provincia:99}");
    expect(prepararTexto(t, "castellano", "Vitoria")).toBe("Guipúzcoa, San Sebastián, Vitoria y {provincia:99}");
  });
});

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

  it("las trampas fijas salen siempre y cuentan dentro del máximo: sigue quedando un hueco al azar", () => {
    const q = synthetic({ traps: ["B", "C", "D", "E"], forcedTraps: ["Z"] });
    for (let r = 0; r < 50; r++) {
      const opts = makeOptions(q, 4, { t: ["A", "F", "G", "H", "I"] });
      expect(opts).toContain("Z");
      expect(opts.filter((o) => ["B", "C", "D", "E", "Z"].includes(o)).length).toBe(2);
      expect(opts.filter((o) => ["F", "G", "H", "I"].includes(o)).length).toBe(1);
    }
  });

  it("si hay varias trampas fijas, sale una sola, sorteada", () => {
    const q = synthetic({ traps: ["B", "C"], forcedTraps: ["Y", "Z"] });
    const vistas = new Set<string>();
    for (let r = 0; r < 100; r++) {
      const fijas = makeOptions(q, 4, { t: ["A", "F", "G", "H"] }).filter((o) => o === "Y" || o === "Z");
      expect(fijas).toHaveLength(1);
      vistas.add(fijas[0]);
    }
    expect([...vistas].sort()).toEqual(["Y", "Z"]);
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
