import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import territorio from "../src/data/territorio.json";
import banderas from "../src/data/banderas.json";
import banderasTexto from "../src/data/banderas.json?raw";
import territorioSchema from "../src/data/schema/territorio.schema.json";
import banderasSchema from "../src/data/schema/banderas.schema.json";
import { AUTONOMIAS, COMUNIDADES, PROVINCIAS, provinciasDe, capitalesDe, poolsFor } from "../src/engine/territory";
import { NAME_STYLES } from "../src/engine/types";
import { BANDERAS } from "../src/engine/questions";

// Comprobaciones del contenido: si alguien edita un JSON y se equivoca, el test dice dónde.

const FLAG_FILES = Object.keys(import.meta.glob("../src/data/banderas/*.svg")).map((f) => f.split("/").pop());

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
  it("el esquema detecta un campo mal escrito", () => {
    // Prueba de que la validación funciona: "trampa" en vez de "trampas".
    const roto = { "01": { archivo: "andalucia.svg", trampa: ["11"], descripcion: "Descripción de prueba", significado: "Significado de prueba" } };
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

  it("las trampas de provincia solo están en provincias cuya capital se llama distinto, y apuntan a otras provincias", () => {
    const ids = PROVINCIAS.map((p) => p.id);
    for (const p of PROVINCIAS.filter((x) => x.trampas)) {
      expect(p.nombre.castellano, p.id).not.toBe(p.capital.castellano);
      for (const id of p.trampas!) {
        expect(ids, `${p.id} → ${id}`).toContain(id);
        expect(id, `${p.id} se pone a sí misma de trampa`).not.toBe(p.id);
      }
    }
    // Ciudades y notas solo tienen sentido en provincias con pregunta de capital.
    for (const p of PROVINCIAS.filter((x) => !x.trampas)) expect(p.ciudades ?? p.notaCapital, p.id).toBeUndefined();
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
    ...Object.entries(BANDERAS).flatMap(([id, b]) => [["descripcion de bandera", id, b.descripcion], ["significado de bandera", id, b.significado]])
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
    // El orden se lee del texto del archivo: al cargarlo, JavaScript reordena las claves
    // que parecen números ("10"…"19" pasarían delante de "01"…"09").
    const enArchivo = [...banderasTexto.matchAll(/^  "(\d{2})":/gm)].map((m) => m[1]);
    expect(enArchivo).toEqual(AUTONOMIAS.map((c) => c.id));
    for (const [id, b] of Object.entries(BANDERAS)) expect(FLAG_FILES, `${id} → ${b.archivo}`).toContain(b.archivo);
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
