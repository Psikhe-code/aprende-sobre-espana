import { describe, expect, it } from "vitest";
import { ENTRADAS_CCSE, PREGUNTAS_CCSE, TAREA_IDS, estadoPregunta, type EntradaCcse } from "../src/engine/ccse";

// Examen de nacionalidad: reglas de los datos reales (las partidas, en ccse-partidas.test.ts). Como en el resto de tests,
// las expectativas salen de los datos, así que añadir o corregir preguntas no obliga a tocarlos.

describe("examen de nacionalidad: datos", () => {
  it("hay cinco tareas, numeradas del 1 al 5 y en orden", () => {
    expect(TAREA_IDS).toEqual([1, 2, 3, 4, 5]);
  });

  it("cada entrada tiene identificador único, ligado a su referencia, y van ordenadas por referencia", () => {
    expect(new Set(ENTRADAS_CCSE.map((p) => p.id)).size).toBe(ENTRADAS_CCSE.length);
    for (const p of ENTRADAS_CCSE) expect(p.id).toBe(`ccse-${p.referencia}`);
    const refs = ENTRADAS_CCSE.map((p) => p.referencia);
    expect(refs).toEqual([...refs].sort((a, b) => a - b));
  });

  it("la referencia es del manual de su tarea (la Tarea 1 va de 1001 en adelante, la 2 de 2001…), sin huecos", () => {
    for (const p of ENTRADAS_CCSE) expect(Math.floor(p.referencia / 1000), p.id).toBe(p.tarea);
    for (const n of TAREA_IDS) {
      const refs = ENTRADAS_CCSE.filter((p) => p.tarea === n).map((p) => p.referencia);
      expect(refs, `Tarea ${n}`).toEqual(refs.map((_, i) => n * 1000 + 1 + i));
    }
  });

  it("ninguna pregunta está a medias: o está vacía, o tiene enunciado, opciones y la letra de la respuesta", () => {
    const aMedias = ENTRADAS_CCSE.flatMap((e) => {
      const r = estadoPregunta(e);
      return r.estado === "aMedias" ? [`Pregunta ${e.referencia}: falta ${r.faltan.join(", ")}`] : [];
    });
    expect(aMedias).toEqual([]);
  });

  it("la respuesta es una de las opciones, y las opciones no se repiten", () => {
    for (const p of PREGUNTAS_CCSE) {
      expect(p.opciones, p.id).toContain(p.respuesta);
      expect(new Set(p.opciones).size, p.id).toBe(p.opciones.length);
    }
  });

  it("si hay nota, tiene al menos una fuente; y si hay fuentes, hay nota", () => {
    for (const p of ENTRADAS_CCSE) expect(p.nota.trim() !== "", p.id).toBe(p.fuentes.length > 0);
  });

  it("las preguntas sin rellenar no salen en el juego", () => {
    const vacias = ENTRADAS_CCSE.filter((e) => estadoPregunta(e).estado === "vacia").map((e) => e.id);
    for (const id of vacias) expect(PREGUNTAS_CCSE.some((p) => p.id === id)).toBe(false);
    expect(PREGUNTAS_CCSE.length + vacias.length).toBe(ENTRADAS_CCSE.length);
  });
});

describe("examen de nacionalidad: rellenar la plantilla", () => {
  const vacia: EntradaCcse = {
    id: "ccse-1999", tarea: 1, referencia: 1999, pregunta: "", opciones: ["", "", ""], respuesta: "", nota: "", fuentes: []
  };
  const con = (cambios: Partial<EntradaCcse>) => estadoPregunta({ ...vacia, ...cambios });
  const faltan = (cambios: Partial<EntradaCcse>) => {
    const r = con(cambios);
    return r.estado === "aMedias" ? r.faltan.length : 0;
  };

  it("sin enunciado, opciones ni respuesta, está vacía", () => {
    expect(con({}).estado).toBe("vacia");
  });

  it("la letra elige la opción en el orden escrito, y los espacios de más no cuentan", () => {
    const r = con({ pregunta: " ¿Uno? ", opciones: ["Primera", " Segunda ", "Tercera"], respuesta: "b" });
    expect(r.estado).toBe("completa");
    if (r.estado !== "completa") return;
    expect(r.pregunta.respuesta).toBe("Segunda");
    expect(r.pregunta.pregunta).toBe("¿Uno?");
    expect(r.pregunta.opciones).toEqual(["Primera", "Segunda", "Tercera"]);
    expect(r.pregunta.ordenFijo).toBeUndefined();
  });

  it("con dos opciones vale, dejando la tercera vacía; «Verdadero» y «Falso» no se barajan", () => {
    const r = con({ pregunta: "¿Dos?", opciones: ["Verdadero", "Falso", ""], respuesta: "a" });
    expect(r.estado === "completa" && r.pregunta.opciones).toEqual(["Verdadero", "Falso"]);
    expect(r.estado === "completa" && r.pregunta.ordenFijo).toBe(true);
    const otra = con({ pregunta: "¿Dos?", opciones: ["Sí", "No", ""], respuesta: "b" });
    expect(otra.estado === "completa" && otra.pregunta.ordenFijo).toBeUndefined();
  });

  it("a medias, dice qué falta", () => {
    const bien = { pregunta: "¿Una?", opciones: ["A", "B", "C"], respuesta: "a" };
    expect(faltan(bien)).toBe(0);
    expect(faltan({ ...bien, pregunta: "" })).toBe(1);
    expect(faltan({ ...bien, respuesta: "" })).toBe(1);
    expect(faltan({ ...bien, respuesta: "c", opciones: ["A", "B", ""] })).toBe(1);
    expect(faltan({ ...bien, opciones: ["A", "", ""] })).toBe(1);
    expect(faltan({ ...bien, opciones: ["A", "", "C"] })).toBe(1);
    expect(faltan({ ...bien, opciones: ["A", "A", "C"] })).toBe(1);
    expect(faltan({ opciones: ["A", "B", "C"] })).toBe(2);
  });
});
