import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../src/engine/categories";
import { makeOptions, prepare } from "../src/engine/options";
import { BANDERAS, notaCapitalProvincia, prepararTexto } from "../src/engine/questions";
import { AUTONOMIAS, COMUNIDADES, PROVINCIAS, capitalesDe, poolsFor } from "../src/engine/territory";
import { questionsIn } from "../src/engine/round";
import { NAME_STYLES, type NameStyle, type Question } from "../src/engine/types";

const REPS = 30;
const bank = (style: NameStyle) => CATEGORIES.flatMap((c) => c.questions(style).map((q) => ({ ...q, category: c.id, style })));
const find = (style: NameStyle, id: string) => bank(style).find((q) => q.id === id)!;

for (const style of NAME_STYLES) {
  const all = bank(style);
  const pools = poolsFor(style);

  describe(`[${style}] banco de preguntas`, () => {
    it("comunidades: 19 capitales y 19 banderas (17 comunidades y 2 ciudades autónomas)", () => {
      expect(questionsIn("capitales", ["comunidad"])).toHaveLength(19);
      expect(questionsIn("banderas", ["comunidad"])).toHaveLength(19);
    });

    it("provincias: capitales solo de las 8 provincias cuya capital se llama distinto; banderas, ninguna todavía", () => {
      const provincias = questionsIn("capitales", ["provincia"]);
      expect(provincias.map((q) => q.id)).toEqual(["01", "07", "20", "26", "31", "33", "39", "48"].map((id) => `capital-provincia:${id}`));
      for (const q of provincias) {
        const p = PROVINCIAS.find((x) => `capital-provincia:${x.id}` === q.id)!;
        expect(p.nombre.castellano, q.id).not.toBe(p.capital.castellano);
      }
      expect(questionsIn("banderas", ["provincia"])).toHaveLength(0);
    });

    it("capitales de provincia: enunciado, trampas (capitales que se confunden y ciudades de la provincia) y nota", () => {
      const asturias = find(style, "capital-provincia:33");
      expect(asturias.text).toBe("¿Cuál es la capital de la provincia de Asturias?");
      expect(asturias.answer).toBe("Oviedo");
      expect(asturias.traps).toEqual(["Santander", "Torrelavega", "Santillana del Mar", "Laredo", "Comillas", "León", "Ponferrada", "Astorga",
        "Lugo", style === "oficial" ? "A Coruña" : "La Coruña", "Ferrol", "Gijón", "Avilés", "Llanes", "Mieres"]);
      expect(asturias.why).toBe("En 1833 casi todas las provincias tomaron el nombre de su capital, y esta se llamó «provincia de Oviedo». En 1983 recuperó el nombre de Asturias.\nGijón es la ciudad más poblada de Asturias, más que Oviedo.");
      // Mismo lugar que la pregunta de la comunidad: no salen las dos en una partida.
      expect(asturias.answerKey).toBe(find(style, "capital-ccaa:03").answerKey);
      const vizcaya = find(style, "capital-provincia:48");
      expect(vizcaya.text).toBe(style === "oficial" ? "¿Cuál es la capital de la provincia de Bizkaia?" : "¿Cuál es la capital de la provincia de Vizcaya?");
      // Las ciudades vascas salen en todas las provincias vascas.
      for (const c of style === "oficial" ? ["Vitoria-Gasteiz", "Laguardia", "Donostia/San Sebastián", "Irun", "Hondarribia", "Barakaldo", "Gernika-Lumo"]
        : ["Vitoria", "Laguardia", "San Sebastián", "Irún", "Fuenterrabía", "Baracaldo", "Guernica"]) {
        if (c !== vizcaya.answer) expect(vizcaya.traps, c).toContain(c);
      }
      expect(find(style, "capital-provincia:20").traps).toContain(style === "oficial" ? "Gernika-Lumo" : "Guernica");
      expect(vizcaya.why).toContain(style === "oficial" ? "pero Bizkaia conservó" : "pero Vizcaya conservó");
      expect(vizcaya.why).toContain("\nBilbao es su ciudad más poblada");
    });

    it("en las capitales de provincia sale siempre el nombre de la provincia como trampa", () => {
      for (const q0 of all.filter((q) => q.id.startsWith("capital-provincia:"))) {
        const p = PROVINCIAS.find((x) => `capital-provincia:${x.id}` === q0.id)!;
        expect(q0.forcedTraps, q0.id).toEqual([p.nombre[style]]);
        for (let r = 0; r < 20; r++) expect(prepare(q0, 4, pools).options, q0.id).toContain(p.nombre[style]);
      }
    });

    it("en las capitales autonómicas sale siempre una trampa con el nombre de la comunidad o parecido", () => {
      const esperadas: Record<string, string[]> = {
        "01": ["Andalucía"], "02": ["Aragón", "Jaca"], "03": ["Asturias"], "04": ["Mallorca"], "05": ["Gran Canaria", "Tenerife"],
        "06": ["Cantabria"], "07": ["León"], "08": ["La Mancha"], "09": ["Cataluña"], "11": ["Extremadura"], "12": ["Galicia"],
        "15": ["Navarra"], "16": ["Euskadi"], "17": ["Rioja"]
      };
      for (const c of AUTONOMIAS) {
        const q0 = find(style, `capital-ccaa:${c.id}`);
        expect(q0.forcedTraps, c.id).toEqual(esperadas[c.id]);
        if (!esperadas[c.id]) continue;
        for (let r = 0; r < 20; r++) {
          expect(prepare(q0, 4, pools).options.filter((o) => esperadas[c.id].includes(o)), c.id).toHaveLength(1);
        }
      }
    });

    it("en cada partida se sortean distintas trampas de provincia", () => {
      const q0 = find(style, "capital-provincia:33");
      const vistas = new Set<string>();
      for (let r = 0; r < 200; r++) prepare(q0, 4, pools).options.filter((o) => q0.traps.includes(o)).forEach((o) => vistas.add(o));
      expect([...vistas].sort()).toEqual([...q0.traps].sort());
    });

    it("la nota automática de provincia, para las que no tengan una propia", () => {
      const p = (id: string) => ({ ...PROVINCIAS.find((x) => x.id === id)!, notaCapital: undefined });
      expect(notaCapitalProvincia(p("48"), "castellano")).toBe("Bilbao es la capital de la provincia de Vizcaya. La capital del País Vasco es Vitoria.");
      expect(notaCapitalProvincia(p("01"), "castellano")).toBe("Vitoria es la capital de la provincia de Álava y también del País Vasco.");
      expect(notaCapitalProvincia(p("33"), "castellano")).toBe("Oviedo es la capital de la provincia de Asturias. Como es la única provincia de Asturias, también es la capital de la comunidad.");
    });

    it("cada pregunta dice su territorio: las de provincia son solo las de capital de provincia", () => {
      for (const q of all) expect(q.territorio, q.id).toBe(q.id.startsWith("capital-provincia:") ? "provincia" : "comunidad");
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

    it("las marcas de provincia salen en la forma de la pregunta, en capitales y en banderas", () => {
      const oficial = style === "oficial";
      expect(find(style, "capital-ccaa:12").why).toContain(oficial ? "y A Coruña había sido" : "y La Coruña había sido");
      expect(find(style, "bandera-ccaa:12").meaning).toContain(oficial ? "del puerto de A Coruña:" : "del puerto de La Coruña:");
      const vasco = find(style, "capital-ccaa:16").why;
      expect(vasco).toContain(oficial ? "La Diputación de Araba/Álava" : "La Diputación de Álava");
      expect(vasco).toContain(oficial ? "entre Bilbao y Donostia/San Sebastián." : "entre Bilbao y San Sebastián.");
      expect(find(style, "bandera-ccaa:16").meaning).toContain(oficial ? "bandera de Bizkaia," : "bandera de Vizcaya,");
    });

    it("las banderas muestran su descripción y, aparte, su significado; las capitales no tienen significado", () => {
      for (const c of AUTONOMIAS) {
        const q = find(style, `bandera-ccaa:${c.id}`);
        expect(q.why, c.id).toBe(BANDERAS[c.id].descripcion.trim());
        expect(q.meaning, c.id).toBeTruthy();
        expect(find(style, `capital-ccaa:${c.id}`).meaning, c.id).toBeUndefined();
      }
    });

    it("cada curiosidad de los datos llega a su pregunta de capital, y las banderas no tienen", () => {
      // Se compara con territorio.json, así que no hay que tocar el test al añadir o quitar curiosidades.
      for (const c of AUTONOMIAS) {
        expect(Boolean(find(style, `capital-ccaa:${c.id}`).fact), c.id).toBe(Boolean(c.curiosidadCapital));
      }
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
