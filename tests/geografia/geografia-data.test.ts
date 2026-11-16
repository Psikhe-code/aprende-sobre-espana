import { describe, expect, it } from "vitest";
import { schemaErrors } from "../common/common-schema-errors";
import territorio from "../../src/sections/geografia/data/territorio.json";
import banderas from "../../src/sections/geografia/data/banderas.json";
import municipios from "../../src/sections/geografia/data/municipios.json";
import municipiosSchema from "../../src/sections/geografia/data/schema/municipios.schema.json";
import territorioSchema from "../../src/sections/geografia/data/schema/territorio.schema.json";
import banderasSchema from "../../src/sections/geografia/data/schema/banderas.schema.json";
import { AUTONOMIAS, COMUNIDADES, MUNICIPIOS, PROVINCIAS, provinciasOf, capitalesOf, poolsFor } from "../../src/sections/geografia/engine/geografia-territorio";
import { NAME_FORMS } from "../../src/sections/geografia/engine/geografia-types";
import { AUTONOMIA_BANDERAS, PROVINCIA_BANDERAS } from "../../src/sections/geografia/engine/geografia-questions";

// Comprobaciones del contenido: si alguien edita un JSON y se equivoca, el test dice dónde.

const svgs = (folder: string, all: Record<string, string>) =>
  Object.fromEntries(Object.entries(all).filter(([f]) => f.includes(`/${folder}/`)).map(([f, text]) => [f.split("/").pop()!, text]));
const ALL_SVGS = import.meta.glob("../../src/sections/geografia/data/banderas/*/*.svg", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
const FLAG_FILES = svgs("comunidades", ALL_SVGS);
const PROVINCE_FLAG_FILES = svgs("provincias", ALL_SVGS);

describe("formato de los archivos", () => {
  it("territorio.json cumple su esquema", () => {
    expect(schemaErrors(territorioSchema, territorio).join("\n")).toBe("");
  });
  it("banderas.json cumple su esquema", () => {
    expect(schemaErrors(banderasSchema, banderas).join("\n")).toBe("");
  });
  it("municipios.json cumple su esquema", () => {
    expect(schemaErrors(municipiosSchema, municipios).join("\n")).toBe("");
  });
  it("el esquema detecta un campo mal escrito", () => {
    // Prueba de que la validación funciona: "trampa" en vez de "trampas".
    const broken = { comunidades: [{ id: "01", archivo: "andalucia.svg", trampa: ["11"], descripcion: "Descripción de prueba", significado: "Significado de prueba" }], provincias: [] };
    expect(schemaErrors(banderasSchema, broken).length).toBeGreaterThan(0);
  });
});

describe("territorio", () => {
  const codes = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, "0"));

  it("tiene 17 comunidades, 2 ciudades autónomas y 52 provincias, con códigos INE", () => {
    expect(AUTONOMIAS.map((c) => c.id)).toEqual(codes(19));
    expect(COMUNIDADES.map((c) => c.id)).toEqual(codes(17));
    expect(AUTONOMIAS.filter((c) => c.tipo === "ciudad").map((c) => c.nombre.castellano)).toEqual(["Ceuta", "Melilla"]);
    expect(PROVINCIAS.map((p) => p.id)).toEqual(codes(52));
  });

  for (const nameForm of NAME_FORMS) {
    it(`[${nameForm}] los nombres no se repiten`, () => {
      expect(new Set(AUTONOMIAS.map((c) => c.nombre[nameForm])).size).toBe(19);
      expect(new Set(PROVINCIAS.map((p) => p.nombre[nameForm])).size).toBe(52);
    });

    it(`[${nameForm}] las capitales autonómicas están en el pool de capitales`, () => {
      const pool = poolsFor(nameForm).anyCapital;
      for (const c of COMUNIDADES) for (const cap of capitalesOf(c)) expect(pool, `${c.id} → ${cap[nameForm]}`).toContain(cap[nameForm]);
    });
  }

  it("cada provincia apunta a una comunidad o ciudad que existe, y todas tienen provincias", () => {
    const ids = AUTONOMIAS.map((c) => c.id);
    for (const p of PROVINCIAS) expect(ids, `${p.id} → ${p.comunidad}`).toContain(p.comunidad);
    for (const c of AUTONOMIAS) expect(provinciasOf(c.id).length, c.id).toBeGreaterThan(0);
  });

  it("las provincias vecinas existen, son recíprocas y no hay ninguna en las islas, Ceuta ni Melilla", () => {
    const ids = PROVINCIAS.map((p) => p.id);
    for (const p of PROVINCIAS) {
      for (const v of p.vecinas) {
        expect(ids, `${p.id} → ${v}`).toContain(v);
        expect(v, `${p.id} es vecina de sí misma`).not.toBe(p.id);
        expect(PROVINCIAS.find((x) => x.id === v)!.vecinas, `${v} no tiene a ${p.id}`).toContain(p.id);
      }
    }
    for (const id of ["07", "35", "38", "51", "52"]) expect(PROVINCIAS.find((p) => p.id === id)!.vecinas, id).toEqual([]);
    expect(PROVINCIAS.find((p) => p.id === "33")!.vecinas).toEqual(["24", "27", "39"]);
  });

  it("las trampas de provincia solo están en provincias cuya capital se llama distinto, y apuntan a otras provincias", () => {
    const ids = PROVINCIAS.map((p) => p.id);
    for (const p of PROVINCIAS.filter((x) => x.trampas)) {
      expect(p.nombre.castellano, p.id).not.toBe(p.capital.castellano);
      for (const id of p.trampas!) {
        expect(ids, `${p.id} → ${id}`).toContain(id);
        expect(id, `${p.id} se pone a sí misma de trampa`).not.toBe(p.id);
      }
    }
    // Las notas solo tienen sentido en provincias con pregunta de capital.
    for (const p of PROVINCIAS.filter((x) => !x.trampas)) expect(p.notaCapital, p.id).toBeUndefined();
  });

  it("las ciudades de las provincias no son capitales ni se repiten", () => {
    for (const nameForm of NAME_FORMS) {
      const capitales = new Set(poolsFor(nameForm).anyCapital);
      const seenIds = new Set<string>();
      for (const p of PROVINCIAS.filter((x) => x.ciudades)) {
        for (const c of p.ciudades!) {
          expect(capitales.has(c[nameForm]), `${p.id} → ${c[nameForm]}`).toBe(false);
          expect(seenIds.has(c[nameForm]), `${p.id} → ${c[nameForm]} repetida`).toBe(false);
          seenIds.add(c[nameForm]);
        }
      }
    }
  });

  it("las ciudades trampa de las comunidades solo están donde la capital se llama como la comunidad, y no son capitales", () => {
    const capitales = new Set(poolsFor("castellano").anyCapital);
    for (const c of AUTONOMIAS) {
      const matches = capitalesOf(c).some((f) => c.nombre.castellano.includes(f.castellano));
      expect(Boolean(c.ciudadesTrampa), `${c.id}: ciudades trampa`).toBe(matches);
      expect(Boolean(c.trampasCapital), `${c.id}: trampa fija`).toBe(!matches);
      for (const f of c.ciudadesTrampa ?? []) expect(capitales.has(f.castellano), `${c.id} → ${f.castellano}`).toBe(false);
    }
  });

  it("las trampas fijas de las capitales autonómicas no son su capital ni el nombre exacto de una capital que sea la respuesta", () => {
    for (const c of AUTONOMIAS.filter((x) => x.trampasCapital)) {
      for (const nameForm of NAME_FORMS) {
        const capitales = capitalesOf(c).map((f) => f[nameForm]);
        for (const t of c.trampasCapital!) expect(capitales, `${c.id} → ${t[nameForm]}`).not.toContain(t[nameForm]);
      }
    }
  });

  it("una ciudad que es capital autonómica y de provincia se escribe igual en los dos sitios, en todas sus formas", () => {
    for (const c of COMUNIDADES) {
      for (const cap of capitalesOf(c)) {
        const prov = PROVINCIAS.find((p) => p.capital.castellano === cap.castellano);
        if (prov) expect(cap, `${c.id} → ${cap.castellano}`).toEqual(prov.capital);
      }
    }
  });
});

describe("textos de las notas", () => {
  const texts = [
    ...AUTONOMIAS.flatMap((c) => [["notaCapital", c.id, c.notaCapital], ["curiosidadCapital", c.id, c.curiosidadCapital]]),
    ...PROVINCIAS.flatMap((p) => [["notaCapital de provincia", p.id, p.notaCapital], ["curiosidad de provincia", p.id, p.curiosidad]]),
    ...Object.entries(AUTONOMIA_BANDERAS).flatMap(([id, b]) => [["descripcion de bandera", id, b.descripcion], ["significado de bandera", id, b.significado]]),
    ...Object.entries(PROVINCIA_BANDERAS).flatMap(([id, b]) => [["descripcion de bandera de provincia", id, b.descripcion], ["significado de bandera de provincia", id, b.significado]]),
    ...MUNICIPIOS.map((m) => ["curiosidad de municipio", m.id, m.curiosidad])
  ].filter(([, , t]) => t) as [string, string, string][];
  const where = (field: string, id: string, t: string) => `${field} de ${id}: «${t.slice(0, 40)}…»`;

  // Los espacios junto a los saltos de línea (\n) y al principio o al final sí se permiten:
  // el juego los quita al mostrar el texto (prepareText), así que no hace falta cuidarlos al editar.
  it("no tienen espacios dobles dentro de una frase", () => {
    for (const [field, id, t] of texts) {
      for (const line of t.split("\n")) expect(line.trim(), where(field, id, t)).not.toMatch(/ {2}/);
    }
  });

  it("las marcas entre llaves son válidas y apuntan a provincias y municipios que existen", () => {
    const provincias = new Set(PROVINCIAS.map((p) => p.id));
    const municipios = new Set(MUNICIPIOS.map((m) => m.id));
    for (const [field, id, t] of texts) {
      for (const [mark] of t.matchAll(/\{[^}]*\}/g)) {
        const m = mark.match(/^\{provincia(?:\.capital)?:(\d{2})\}$/);
        const mun = mark.match(/^\{municipio:(\d{5})\}$/);
        const isValid = m ? provincias.has(m[1]) : mun ? municipios.has(mun[1]) : mark === "{capital}" && field.includes("Capital");
        expect(isValid, `${where(field, id, t)} → ${mark}`).toBe(true);
      }
      // Llaves sueltas, sin cerrar o sin abrir.
      expect(t.replace(/\{[^{}]*\}/g, ""), where(field, id, t)).not.toMatch(/[{}]/);
    }
  });
});

describe("banderas", () => {
  it("hay una por comunidad y ciudad autónoma, en orden de código INE, y su archivo existe", () => {
    expect(banderas.comunidades.map((b) => b.id)).toEqual(AUTONOMIAS.map((c) => c.id));
    for (const b of banderas.comunidades) expect(Object.keys(FLAG_FILES), `${b.id} → ${b.archivo}`).toContain(b.archivo);
  });

  it("cada bandera dice de dónde sale, y las que piden atribución tienen autor", () => {
    for (const [id, b] of Object.entries(AUTONOMIA_BANDERAS)) {
      expect(b.fuente.url, id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (b.fuente.licencia.startsWith("CC BY")) {
        expect(b.fuente.autor, `${id} → autor`).toBeTruthy();
        expect(b.fuente.licenciaUrl, `${id} → enlace a la licencia`).toBeTruthy();
      }
    }
  });

  it("las trampas existen y son distintas de la propia", () => {
    const ids = AUTONOMIAS.map((c) => c.id);
    for (const [id, b] of Object.entries(AUTONOMIA_BANDERAS)) {
      for (const t of b.trampas) expect(ids, `${id} → trampa ${t}`).toContain(t);
      expect(b.trampas, id).not.toContain(id);
    }
  });
});

describe("banderas de provincia", () => {
  it("van en orden de código INE de provincia, sin repetirse, son provincias que existen y su imagen existe", () => {
    const ids = banderas.provincias.map((b) => b.id);
    expect(ids).toEqual([...new Set(ids)].sort());
    const provincias = PROVINCIAS.map((p) => p.id);
    for (const b of banderas.provincias) {
      expect(provincias, b.id).toContain(b.id);
      expect(Object.keys(PROVINCE_FLAG_FILES), `${b.id} → ${b.archivo}`).toContain(b.archivo);
    }
  });

  it("no hay banderas de provincias que forman ellas solas una comunidad (repetirían la de la comunidad)", () => {
    for (const id of Object.keys(PROVINCIA_BANDERAS)) {
      expect(provinciasOf(PROVINCIAS.find((p) => p.id === id)!.comunidad).length, id).toBeGreaterThan(1);
    }
  });

  it("las trampas son otras provincias con bandera", () => {
    const ids = Object.keys(PROVINCIA_BANDERAS);
    for (const [id, b] of Object.entries(PROVINCIA_BANDERAS)) {
      for (const t of b.trampas) expect(ids, `${id} → trampa ${t}`).toContain(t);
      expect(b.trampas, id).not.toContain(id);
    }
  });

  it("todas dicen de dónde salen, con autor y licencia", () => {
    for (const [id, b] of Object.entries(PROVINCIA_BANDERAS)) {
      expect(b.fuente.autor, `${id} → autor`).toBeTruthy();
      expect(b.fuente.licenciaUrl, `${id} → licencia`).toBeTruthy();
    }
  });
});

describe("imágenes de las banderas", () => {
  it("cada SVG de las carpetas corresponde a una bandera de banderas.json (no sobran archivos)", () => {
    expect(Object.keys(FLAG_FILES).sort()).toEqual(banderas.comunidades.map((b) => b.archivo).sort());
    expect(Object.keys(PROVINCE_FLAG_FILES).sort()).toEqual(banderas.provincias.map((b) => b.archivo).sort());
  });

  it("están limpias con SVGO: en una sola línea y sin datos del programa de dibujo", () => {
    // Si falla con una bandera nueva: npm run limpiar-bandera -- src/sections/geografia/data/banderas/<carpeta>/<archivo>.svg
    for (const [file, text] of Object.entries({ ...FLAG_FILES, ...PROVINCE_FLAG_FILES })) {
      expect(text.trim(), file).not.toMatch(/\n|<metadata|<!--|inkscape:|sodipodi:|xmlns:rdf/);
    }
  });
});

describe("municipios", () => {
  const ofProvincia = (id: string) => MUNICIPIOS.filter((m) => m.id.startsWith(id));

  it("van en orden de código INE, sin repetirse, y son de provincias que existen", () => {
    const ids = MUNICIPIOS.map((m) => m.id);
    expect(ids).toEqual([...new Set(ids)].sort());
    const provincias = PROVINCIAS.map((p) => p.id);
    for (const m of MUNICIPIOS) expect(provincias, m.id).toContain(m.id.slice(0, 2));
  });

  it("están los tres más poblados de cada provincia (puestos 1, 2 y 3), y la capital", () => {
    for (const p of PROVINCIAS) {
      const ranks = ofProvincia(p.id).map((m) => m.puesto).filter((n) => n <= 3).sort();
      // Ceuta y Melilla tienen un solo municipio.
      expect(ranks, p.id).toEqual(AUTONOMIAS.find((c) => c.id === p.comunidad)!.tipo === "ciudad" ? [1] : [1, 2, 3]);
      // La capital, con las mismas formas del nombre que en territorio.json.
      expect(ofProvincia(p.id).filter((m) => m.nombre.oficial === p.capital.oficial).map((m) => m.nombre), p.id).toEqual([p.capital]);
    }
  });

  it("los que no están entre los tres más poblados llevan una curiosidad que explica por qué están en el juego", () => {
    for (const m of MUNICIPIOS.filter((x) => x.puesto > 3)) expect(m.curiosidad, `${m.id} ${m.nombre.oficial} (puesto ${m.puesto})`).toBeTruthy();
  });

  it("el puesto concuerda con la población: en cada provincia, a más puesto, menos habitantes", () => {
    for (const p of PROVINCIAS) {
      const order = ofProvincia(p.id).sort((a, b) => a.puesto - b.puesto);
      for (let i = 1; i < order.length; i++) expect(order[i].poblacion, order[i].id).toBeLessThan(order[i - 1].poblacion);
    }
  });

  it("los que se llaman igual que otro municipio lo apuntan con una provincia distinta que existe", () => {
    const provincias = PROVINCIAS.map((p) => p.id);
    for (const m of MUNICIPIOS) {
      for (const x of m.mismoNombre ?? []) {
        expect(provincias, `${m.id} → ${x.id}`).toContain(x.id.slice(0, 2));
        expect(x.id.slice(0, 2), `${m.id} → ${x.id}`).not.toBe(m.id.slice(0, 2));
      }
    }
  });

  for (const nameForm of NAME_FORMS) {
    it(`[${nameForm}] los nombres no se repiten (la pregunta sería ambigua)`, () => {
      const names = MUNICIPIOS.map((m) => m.nombre[nameForm]);
      expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
    });
  }
});

