import { describe, expect, it } from "vitest";
import {
  PREGUNTAS_CCSE, TAREAS, TAREA_IDS, cabeCcse, otraVueltaCcse, partidaCcse, preguntasDe, repasoCcse, tamanoCcse, tareasConPreguntas
} from "../src/engine/ccse";
import { ROUND_LENGTH, ROUND_LENGTHS } from "../src/engine/round";
import { ccseKey } from "../src/engine/storage";

// Examen de nacionalidad: reglas de los datos y de las partidas. Como en el resto de tests,
// las expectativas salen de los datos, así que añadir o corregir preguntas no obliga a tocarlos.

const TODAS = TAREAS.map((t) => t.numero);

describe("examen de nacionalidad: datos", () => {
  it("hay cinco tareas, numeradas del 1 al 5 y en orden", () => {
    expect(TAREA_IDS).toEqual([1, 2, 3, 4, 5]);
  });

  it("cada pregunta tiene identificador único, ligado a su referencia, y van ordenadas por referencia", () => {
    expect(new Set(PREGUNTAS_CCSE.map((p) => p.id)).size).toBe(PREGUNTAS_CCSE.length);
    for (const p of PREGUNTAS_CCSE) expect(p.id).toBe(`ccse-${p.referencia}`);
    const refs = PREGUNTAS_CCSE.map((p) => p.referencia);
    expect(refs).toEqual([...refs].sort((a, b) => a - b));
  });

  it("la referencia es del manual de su tarea (la Tarea 1 va de 1001 a 1999, la 2 de 2001…)", () => {
    for (const p of PREGUNTAS_CCSE) expect(Math.floor(p.referencia / 1000), p.id).toBe(p.tarea);
  });

  it("la respuesta es una de las opciones, y las opciones no se repiten", () => {
    for (const p of PREGUNTAS_CCSE) {
      expect(p.opciones, p.id).toContain(p.respuesta);
      expect(new Set(p.opciones).size, p.id).toBe(p.opciones.length);
    }
  });

  it("cada nota tiene al menos una fuente", () => {
    for (const p of PREGUNTAS_CCSE) {
      expect(p.nota.trim(), p.id).not.toBe("");
      expect(p.fuentes.length, p.id).toBeGreaterThan(0);
    }
  });
});

describe("examen de nacionalidad: partidas", () => {
  it("solo salen preguntas de las tareas marcadas, sin repetir, con el número de preguntas elegido", () => {
    for (const tareas of [tareasConPreguntas(), TODAS, [1]]) {
      for (const length of ROUND_LENGTHS) {
        const hay = preguntasDe(tareas).length;
        if (!hay) continue;
        const partida = partidaCcse({ tareas, length });
        expect(partida).toHaveLength(tamanoCcse(tareas, length));
        expect(new Set(partida.map((q) => q.id)).size).toBe(partida.length);
        for (const q of partida) expect(tareas).toContain(q.tarea);
      }
    }
  });

  it("cada pregunta sale con sus opciones (barajadas) y su respuesta, su nota y sus fuentes", () => {
    for (let r = 0; r < 20; r++) {
      for (const q of partidaCcse({ tareas: TODAS, length: "sinLimite" })) {
        const p = PREGUNTAS_CCSE.find((x) => x.id === q.id)!;
        expect([...q.options].sort()).toEqual([...p.opciones].sort());
        if (p.ordenFijo) expect(q.options).toEqual(p.opciones);
        expect(q.answer).toBe(p.respuesta);
        expect(q.text).toBe(p.pregunta);
        expect(q.why).toBe(p.nota);
        expect(q.fuentes).toEqual(p.fuentes);
      }
    }
  });

  it("las opciones se barajan: la respuesta no sale siempre en el mismo sitio", () => {
    const sitios = new Set<number>();
    for (let r = 0; r < 50; r++) for (const q of partidaCcse({ tareas: TODAS })) sitios.add(q.options.indexOf(q.answer));
    expect(sitios.size).toBeGreaterThan(1);
  });

  it("25, 50 y 100 preguntas solo se pueden elegir si hay al menos esas; 10 y sin límite, siempre", () => {
    for (const tareas of [[1], TODAS, []]) {
      const hay = preguntasDe(tareas).length;
      for (const length of ROUND_LENGTHS) {
        expect(cabeCcse(length, tareas)).toBe(length === "sinLimite" || length === ROUND_LENGTH || hay >= length);
      }
    }
  });

  it("otra vuelta a la baraja tiene todas las preguntas y no empieza por la última que salió", () => {
    for (let r = 0; r < 50; r++) {
      const primera = partidaCcse({ tareas: TODAS, length: "sinLimite" });
      const ultima = primera[primera.length - 1].id;
      const otra = otraVueltaCcse({ tareas: TODAS }, ultima);
      expect(otra.map((q) => q.id).sort()).toEqual(primera.map((q) => q.id).sort());
      expect(otra[0].id).not.toBe(ultima);
    }
  });

  it("el repaso de fallos repite las mismas preguntas, en el mismo orden", () => {
    const fallos = partidaCcse({ tareas: TODAS }).slice(0, 3);
    expect(repasoCcse(fallos).map((q) => q.id)).toEqual(fallos.map((q) => q.id));
  });

  it("la clave del récord empieza por «ccse/», con las tareas, y el número de preguntas y el tiempo si no son los de por defecto", () => {
    expect(ccseKey([1])).toBe("ccse/1");
    expect(ccseKey([2, 1])).toBe("ccse/1+2");
    expect(ccseKey([1], 25, 60)).toBe("ccse/1/25preguntas/60s");
    expect(ccseKey([1, 3], "sinLimite", "sinTiempo")).toBe("ccse/1+3/sinlimite");
  });
});
