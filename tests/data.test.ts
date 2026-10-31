import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import territorio from "../src/data/territorio.json";
import banderas from "../src/data/banderas.json";
import municipios from "../src/data/municipios.json";
import municipiosSchema from "../src/data/schema/municipios.schema.json";
import territorioSchema from "../src/data/schema/territorio.schema.json";
import banderasSchema from "../src/data/schema/banderas.schema.json";
import { AUTONOMIAS, COMUNIDADES, MUNICIPIOS, PROVINCIAS, provinciasDe, capitalesDe, poolsFor } from "../src/engine/territory";
import { NAME_STYLES } from "../src/engine/types";
import { BANDERAS, BANDERAS_PROVINCIAS } from "../src/engine/questions";

// Comprobaciones del contenido: si alguien edita un JSON y se equivoca, el test dice dónde.

const svgs = (carpeta: string, todos: Record<string, string>) =>
  Object.fromEntries(Object.entries(todos).filter(([f]) => f.includes(`/${carpeta}/`)).map(([f, texto]) => [f.split("/").pop()!, texto]));
const TODOS_LOS_SVG = import.meta.glob("../src/data/banderas/*/*.svg", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
const FLAG_FILES = svgs("comunidades", TODOS_LOS_SVG);
const PROVINCE_FLAG_FILES = svgs("provincias", TODOS_LOS_SVG);

/** Valida un archivo contra su esquema y devuelve los errores en forma legible. */
function schemaErrors(schema: object, data: unknown): string[] {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (validate(data)) return [];
  return (validate.errors ?? []).map((e) => `${e.instancePath || "(raíz)"}: ${e.message}${e.params ? " " + JSON.stringify(e.params) : ""}`);
}

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
    const roto = { comunidades: [{ id: "01", archivo: "andalucia.svg", trampa: ["11"], descripcion: "Descripción de prueba", significado: "Significado de prueba" }], provincias: [] };
    expect(schemaErrors(banderasSchema, roto).length).toBeGreaterThan(0);
  });
});

describe("territorio", () => {
  const codigos = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, "0"));

  it("tiene 17 comunidades, 2 ciudades autónomas y 52 provincias, con códigos INE", () => {
    expect(AUTONOMIAS.map((c) => c.id)).toEqual(codigos(19));
    expect(COMUNIDADES.map((c) => c.id)).toEqual(codigos(17));
    expect(AUTONOMIAS.filter((c) => c.tipo === "ciudad").map((c) => c.nombre.castellano)).toEqual(["Ceuta", "Melilla"]);
    expect(PROVINCIAS.map((p) => p.id)).toEqual(codigos(52));
  });

  for (const style of NAME_STYLES) {
    it(`[${style}] los nombres no se repiten`, () => {
      expect(new Set(AUTONOMIAS.map((c) => c.nombre[style])).size).toBe(19);
      expect(new Set(PROVINCIAS.map((p) => p.nombre[style])).size).toBe(52);
    });

    it(`[${style}] las capitales autonómicas están en el pool de capitales`, () => {
      const pool = poolsFor(style).capitalCualquiera;
      for (const c of COMUNIDADES) for (const cap of capitalesDe(c)) expect(pool, `${c.id} → ${cap[style]}`).toContain(cap[style]);
    });
  }

  it("cada provincia apunta a una comunidad o ciudad que existe, y todas tienen provincias", () => {
    const ids = AUTONOMIAS.map((c) => c.id);
    for (const p of PROVINCIAS) expect(ids, `${p.id} → ${p.comunidad}`).toContain(p.comunidad);
    for (const c of AUTONOMIAS) expect(provinciasDe(c.id).length, c.id).toBeGreaterThan(0);
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
    for (const style of NAME_STYLES) {
      const capitales = new Set(poolsFor(style).capitalCualquiera);
      const vistas = new Set<string>();
      for (const p of PROVINCIAS.filter((x) => x.ciudades)) {
        for (const c of p.ciudades!) {
          expect(capitales.has(c[style]), `${p.id} → ${c[style]}`).toBe(false);
          expect(vistas.has(c[style]), `${p.id} → ${c[style]} repetida`).toBe(false);
          vistas.add(c[style]);
        }
      }
    }
  });

  it("las ciudades trampa de las comunidades solo están donde la capital se llama como la comunidad, y no son capitales", () => {
    const capitales = new Set(poolsFor("castellano").capitalCualquiera);
    for (const c of AUTONOMIAS) {
      const coincide = capitalesDe(c).some((f) => c.nombre.castellano.includes(f.castellano));
      expect(Boolean(c.ciudadesTrampa), `${c.id}: ciudades trampa`).toBe(coincide);
      expect(Boolean(c.trampasCapital), `${c.id}: trampa fija`).toBe(!coincide);
      for (const f of c.ciudadesTrampa ?? []) expect(capitales.has(f.castellano), `${c.id} → ${f.castellano}`).toBe(false);
    }
  });

  it("las trampas fijas de las capitales autonómicas no son su capital ni el nombre exacto de una capital que sea la respuesta", () => {
    for (const c of AUTONOMIAS.filter((x) => x.trampasCapital)) {
      for (const style of NAME_STYLES) {
        const capitales = capitalesDe(c).map((f) => f[style]);
        for (const t of c.trampasCapital!) expect(capitales, `${c.id} → ${t[style]}`).not.toContain(t[style]);
      }
    }
  });

  it("una ciudad que es capital autonómica y de provincia se escribe igual en los dos sitios, en todas sus formas", () => {
    for (const c of COMUNIDADES) {
      for (const cap of capitalesDe(c)) {
        const prov = PROVINCIAS.find((p) => p.capital.castellano === cap.castellano);
        if (prov) expect(cap, `${c.id} → ${cap.castellano}`).toEqual(prov.capital);
      }
    }
  });
});

describe("textos de las notas", () => {
  const textos = [
    ...AUTONOMIAS.flatMap((c) => [["notaCapital", c.id, c.notaCapital], ["curiosidadCapital", c.id, c.curiosidadCapital]]),
    ...PROVINCIAS.map((p) => ["notaCapital de provincia", p.id, p.notaCapital]),
    ...Object.entries(BANDERAS).flatMap(([id, b]) => [["descripcion de bandera", id, b.descripcion], ["significado de bandera", id, b.significado]]),
    ...Object.entries(BANDERAS_PROVINCIAS).flatMap(([id, b]) => [["descripcion de bandera de provincia", id, b.descripcion], ["significado de bandera de provincia", id, b.significado]]),
    ...MUNICIPIOS.map((m) => ["curiosidad de municipio", m.id, m.curiosidad])
  ].filter(([, , t]) => t) as [string, string, string][];
  const donde = (campo: string, id: string, t: string) => `${campo} de ${id}: «${t.slice(0, 40)}…»`;

  // Los espacios junto a los saltos de línea (\n) y al principio o al final sí se permiten:
  // el juego los quita al mostrar el texto (prepararTexto), así que no hace falta cuidarlos al editar.
  it("no tienen espacios dobles dentro de una frase", () => {
    for (const [campo, id, t] of textos) {
      for (const linea of t.split("\n")) expect(linea.trim(), donde(campo, id, t)).not.toMatch(/ {2}/);
    }
  });

  it("las marcas entre llaves son válidas y apuntan a provincias que existen", () => {
    const provincias = new Set(PROVINCIAS.map((p) => p.id));
    for (const [campo, id, t] of textos) {
      for (const [marca] of t.matchAll(/\{[^}]*\}/g)) {
        const m = marca.match(/^\{provincia(?:\.capital)?:(\d{2})\}$/);
        const valida = m ? provincias.has(m[1]) : marca === "{capital}" && campo.includes("Capital");
        expect(valida, `${donde(campo, id, t)} → ${marca}`).toBe(true);
      }
      // Llaves sueltas, sin cerrar o sin abrir.
      expect(t.replace(/\{[^{}]*\}/g, ""), donde(campo, id, t)).not.toMatch(/[{}]/);
    }
  });
});

describe("banderas", () => {
  it("hay una por comunidad y ciudad autónoma, en orden de código INE, y su archivo existe", () => {
    expect(banderas.comunidades.map((b) => b.id)).toEqual(AUTONOMIAS.map((c) => c.id));
    for (const b of banderas.comunidades) expect(Object.keys(FLAG_FILES), `${b.id} → ${b.archivo}`).toContain(b.archivo);
  });

  it("cada bandera dice de dónde sale, y las que piden atribución tienen autor", () => {
    for (const [id, b] of Object.entries(BANDERAS)) {
      expect(b.fuente.url, id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (b.fuente.licencia.startsWith("CC BY")) {
        expect(b.fuente.autor, `${id} → autor`).toBeTruthy();
        expect(b.fuente.licenciaUrl, `${id} → enlace a la licencia`).toBeTruthy();
      }
    }
  });

  it("las trampas existen y son distintas de la propia", () => {
    const ids = AUTONOMIAS.map((c) => c.id);
    for (const [id, b] of Object.entries(BANDERAS)) {
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
    for (const id of Object.keys(BANDERAS_PROVINCIAS)) {
      expect(provinciasDe(PROVINCIAS.find((p) => p.id === id)!.comunidad).length, id).toBeGreaterThan(1);
    }
  });

  it("las trampas son otras provincias con bandera", () => {
    const ids = Object.keys(BANDERAS_PROVINCIAS);
    for (const [id, b] of Object.entries(BANDERAS_PROVINCIAS)) {
      for (const t of b.trampas) expect(ids, `${id} → trampa ${t}`).toContain(t);
      expect(b.trampas, id).not.toContain(id);
    }
  });

  it("todas dicen de dónde salen, con autor y licencia", () => {
    for (const [id, b] of Object.entries(BANDERAS_PROVINCIAS)) {
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
    // Si falla con una bandera nueva: npm run limpiar-bandera -- src/data/banderas/<carpeta>/<archivo>.svg
    for (const [archivo, texto] of Object.entries({ ...FLAG_FILES, ...PROVINCE_FLAG_FILES })) {
      expect(texto.trim(), archivo).not.toMatch(/\n|<metadata|<!--|inkscape:|sodipodi:|xmlns:rdf/);
    }
  });
});

describe("municipios", () => {
  const deProvincia = (id: string) => MUNICIPIOS.filter((m) => m.id.startsWith(id));

  it("van en orden de código INE, sin repetirse, y son de provincias que existen", () => {
    const ids = MUNICIPIOS.map((m) => m.id);
    expect(ids).toEqual([...new Set(ids)].sort());
    const provincias = PROVINCIAS.map((p) => p.id);
    for (const m of MUNICIPIOS) expect(provincias, m.id).toContain(m.id.slice(0, 2));
  });

  it("están los tres más poblados de cada provincia (puestos 1, 2 y 3), y la capital", () => {
    for (const p of PROVINCIAS) {
      const puestos = deProvincia(p.id).map((m) => m.puesto).filter((n) => n <= 3).sort();
      // Ceuta y Melilla tienen un solo municipio.
      expect(puestos, p.id).toEqual(AUTONOMIAS.find((c) => c.id === p.comunidad)!.tipo === "ciudad" ? [1] : [1, 2, 3]);
      // La capital, con las mismas formas del nombre que en territorio.json.
      expect(deProvincia(p.id).filter((m) => m.nombre.oficial === p.capital.oficial).map((m) => m.nombre), p.id).toEqual([p.capital]);
    }
  });

  it("los que no están entre los tres más poblados llevan una curiosidad que explica por qué están en el juego", () => {
    for (const m of MUNICIPIOS.filter((x) => x.puesto > 3)) expect(m.curiosidad, `${m.id} ${m.nombre.oficial} (puesto ${m.puesto})`).toBeTruthy();
  });

  it("el puesto concuerda con la población: en cada provincia, a más puesto, menos habitantes", () => {
    for (const p of PROVINCIAS) {
      const orden = deProvincia(p.id).sort((a, b) => a.puesto - b.puesto);
      for (let i = 1; i < orden.length; i++) expect(orden[i].poblacion, orden[i].id).toBeLessThan(orden[i - 1].poblacion);
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

  for (const style of NAME_STYLES) {
    it(`[${style}] los nombres no se repiten (la pregunta sería ambigua)`, () => {
      const nombres = MUNICIPIOS.map((m) => m.nombre[style]);
      expect(nombres.filter((n, i) => nombres.indexOf(n) !== i)).toEqual([]);
    });
  }
});

