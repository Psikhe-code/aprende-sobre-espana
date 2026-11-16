import { describe, expect, it } from "vitest";
import { CCSE_ENTRIES, CCSE_QUESTIONS, TAREA_IDS, entryStatus, type CcseEntry } from "../../src/sections/ccse/engine/questions";
import { SIMULACRO_DISTRIBUTION, canDoSimulacro } from "../../src/sections/ccse/engine/simulacro";
import ccse from "../../src/sections/ccse/data/ccse.json";
import ccseSchema from "../../src/sections/ccse/data/schema/ccse.schema.json";
import { schemaErrors } from "../common/schema-errors";

// Examen de nacionalidad: reglas de los datos reales (las partidas, en rounds.test.ts). Como en el resto de tests,
// las expectativas salen de los datos, así que añadir o corregir preguntas no obliga a tocarlos.

describe("examen de nacionalidad: formato del archivo", () => {
  it("ccse.json cumple su esquema", () => {
    expect(schemaErrors(ccseSchema, ccse).join("\n")).toBe("");
  });
});

describe("examen de nacionalidad: datos", () => {
  it("hay cinco tareas, numeradas del 1 al 5 y en orden", () => {
    expect(TAREA_IDS).toEqual([1, 2, 3, 4, 5]);
  });

  it("con las preguntas que hay se puede hacer el simulacro: cada tarea tiene al menos las que pide el reparto", () => {
    for (const r of SIMULACRO_DISTRIBUTION) {
      expect(CCSE_QUESTIONS.filter((p) => p.tarea === r.tarea).length, `Tarea ${r.tarea}`).toBeGreaterThanOrEqual(r.questionCount);
    }
    expect(canDoSimulacro()).toBe(true);
  });

  it("cada entrada tiene identificador único, ligado a su referencia, y van ordenadas por referencia", () => {
    expect(new Set(CCSE_ENTRIES.map((p) => p.id)).size).toBe(CCSE_ENTRIES.length);
    for (const p of CCSE_ENTRIES) expect(p.id).toBe(`ccse-${p.referencia}`);
    const refs = CCSE_ENTRIES.map((p) => p.referencia);
    expect(refs).toEqual([...refs].sort((a, b) => a - b));
  });

  it("la referencia es del manual de su tarea (la Tarea 1 va de 1001 en adelante, la 2 de 2001…), sin huecos", () => {
    for (const p of CCSE_ENTRIES) expect(Math.floor(p.referencia / 1000), p.id).toBe(p.tarea);
    for (const n of TAREA_IDS) {
      const refs = CCSE_ENTRIES.filter((p) => p.tarea === n).map((p) => p.referencia);
      expect(refs, `Tarea ${n}`).toEqual(refs.map((_, i) => n * 1000 + 1 + i));
    }
  });

  it("ninguna pregunta está a medias: o está vacía, o tiene enunciado, opciones y la letra de la respuesta", () => {
    const partial = CCSE_ENTRIES.flatMap((e) => {
      const r = entryStatus(e);
      return r.status === "partial" ? [`Pregunta ${e.referencia}: falta ${r.missing.join(", ")}`] : [];
    });
    expect(partial).toEqual([]);
  });

  it("la respuesta es una de las opciones, y las opciones no se repiten", () => {
    for (const p of CCSE_QUESTIONS) {
      expect(p.options, p.id).toContain(p.answer);
      expect(new Set(p.options).size, p.id).toBe(p.options.length);
    }
  });

  it("si hay nota, tiene al menos una fuente; y si hay fuentes, hay nota", () => {
    for (const p of CCSE_ENTRIES) expect(p.nota.trim() !== "", p.id).toBe(p.fuentes.length > 0);
  });

  it("las preguntas sin rellenar no salen en el juego", () => {
    const emptyIds = CCSE_ENTRIES.filter((e) => entryStatus(e).status === "empty").map((e) => e.id);
    for (const id of emptyIds) expect(CCSE_QUESTIONS.some((p) => p.id === id)).toBe(false);
    expect(CCSE_QUESTIONS.length + emptyIds.length).toBe(CCSE_ENTRIES.length);
  });
});

describe("examen de nacionalidad: rellenar la plantilla", () => {
  const empty: CcseEntry = {
    id: "ccse-1999", tarea: 1, referencia: 1999, pregunta: "", opciones: ["", "", ""], respuesta: "", nota: "", fuentes: []
  };
  const withChanges = (changes: Partial<CcseEntry>) => entryStatus({ ...empty, ...changes });
  const missingCount = (changes: Partial<CcseEntry>) => {
    const r = withChanges(changes);
    return r.status === "partial" ? r.missing.length : 0;
  };

  it("sin enunciado, opciones ni respuesta, está vacía", () => {
    expect(withChanges({}).status).toBe("empty");
  });

  it("la letra elige la opción en el orden escrito, y los espacios de más no cuentan", () => {
    const r = withChanges({ pregunta: " ¿Uno? ", opciones: ["Primera", " Segunda ", "Tercera"], respuesta: "b" });
    expect(r.status).toBe("complete");
    if (r.status !== "complete") return;
    expect(r.question.answer).toBe("Segunda");
    expect(r.question.text).toBe("¿Uno?");
    expect(r.question.options).toEqual(["Primera", "Segunda", "Tercera"]);
    expect(r.question.fixedOrder).toBeUndefined();
  });

  it("con dos opciones vale, dejando la tercera vacía; «Verdadero» y «Falso» no se barajan", () => {
    const r = withChanges({ pregunta: "¿Dos?", opciones: ["Verdadero", "Falso", ""], respuesta: "a" });
    expect(r.status === "complete" && r.question.options).toEqual(["Verdadero", "Falso"]);
    expect(r.status === "complete" && r.question.fixedOrder).toBe(true);
    const other = withChanges({ pregunta: "¿Dos?", opciones: ["Sí", "No", ""], respuesta: "b" });
    expect(other.status === "complete" && other.question.fixedOrder).toBeUndefined();
  });

  it("a medias, dice qué falta", () => {
    const valid = { pregunta: "¿Una?", opciones: ["A", "B", "C"], respuesta: "a" };
    expect(missingCount(valid)).toBe(0);
    expect(missingCount({ ...valid, pregunta: "" })).toBe(1);
    expect(missingCount({ ...valid, respuesta: "" })).toBe(1);
    expect(missingCount({ ...valid, respuesta: "c", opciones: ["A", "B", ""] })).toBe(1);
    expect(missingCount({ ...valid, opciones: ["A", "", ""] })).toBe(1);
    expect(missingCount({ ...valid, opciones: ["A", "", "C"] })).toBe(1);
    expect(missingCount({ ...valid, opciones: ["A", "A", "C"] })).toBe(1);
    expect(missingCount({ opciones: ["A", "B", "C"] })).toBe(2);
  });
});
