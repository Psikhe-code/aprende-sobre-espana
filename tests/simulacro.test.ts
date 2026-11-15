import { describe, expect, it, vi } from "vitest";
import { PREGUNTAS_CCSE } from "../src/engine/ccse";
import {
  APROBADO_SIMULACRO, CLAVE_SIMULACRO, PREGUNTAS_SIMULACRO, REPARTO_SIMULACRO, Simulacro, apuntarSimulacro,
  preguntasSimulacro, simulacroPosible
} from "../src/engine/simulacro";

// Simulacro del examen, con datos de prueba que tienen preguntas en las cinco tareas (ccse-prueba.ts).
// Que los datos reales permiten hacerlo se comprueba en ccse.test.ts.

vi.mock("../src/data/ccse.json", async () => ({ default: (await import("./ccse-prueba")).ccseSimulacroPrueba() }));

/** Un simulacro respondido: en las preguntas de `bien`, la respuesta correcta; en `sinResponder`, nada; en las demás, una equivocada. */
function respondido(bien: number, sinResponder = 0) {
  const s = new Simulacro(preguntasSimulacro());
  s.preguntas.forEach((q, j) => {
    s.ir(j);
    if (j < bien) s.responder(q.answer);
    else if (j < s.total - sinResponder) s.responder(q.options.find((o) => o !== q.answer)!);
  });
  return s;
}

describe("simulacro: preguntas", () => {
  it("el reparto suma las 25 preguntas del examen, y el aprobado son 15", () => {
    expect(PREGUNTAS_SIMULACRO).toBe(25);
    expect(APROBADO_SIMULACRO).toBe(15);
    expect(REPARTO_SIMULACRO.map((r) => r.tarea)).toEqual([1, 2, 3, 4, 5]);
  });

  it("salen las de cada tarea según el reparto, por orden de tareas y sin repetir ninguna", () => {
    for (let r = 0; r < 30; r++) {
      const preguntas = preguntasSimulacro();
      expect(preguntas).toHaveLength(PREGUNTAS_SIMULACRO);
      expect(new Set(preguntas.map((q) => q.id)).size).toBe(preguntas.length);
      const esperado = REPARTO_SIMULACRO.flatMap((x) => Array(x.preguntas).fill(x.tarea));
      expect(preguntas.map((q) => q.tarea)).toEqual(esperado);
    }
  });

  it("cada pregunta, con las opciones y la respuesta de los datos", () => {
    for (const q of preguntasSimulacro()) {
      const p = PREGUNTAS_CCSE.find((x) => x.id === q.id)!;
      expect([...q.options].sort()).toEqual([...p.opciones].sort());
      expect(q.answer).toBe(p.respuesta);
      expect(q.why).toBe(p.nota);
    }
  });

  it("no se puede hacer si alguna tarea tiene menos preguntas de las que pide el reparto", () => {
    expect(simulacroPosible()).toBe(true);
    for (const r of REPARTO_SIMULACRO) {
      const deLaTarea = PREGUNTAS_CCSE.filter((p) => p.tarea === r.tarea);
      const quitada = PREGUNTAS_CCSE.filter((p) => p !== deLaTarea[0] || deLaTarea.length > r.preguntas);
      const pocas = [...PREGUNTAS_CCSE.filter((p) => p.tarea !== r.tarea), ...deLaTarea.slice(0, r.preguntas - 1)];
      expect(simulacroPosible(pocas)).toBe(false);
      expect(simulacroPosible(quitada)).toBe(true);
    }
  });
});

describe("simulacro: respuestas y entrega", () => {
  it("se puede ir y volver entre las preguntas y cambiar la respuesta hasta entregar", () => {
    const s = new Simulacro(preguntasSimulacro());
    expect(s.indice).toBe(0);
    expect(s.sinResponder).toBe(s.total);
    const [a, b] = s.actual.options;
    s.responder(a);
    s.ir(5);
    expect(s.indice).toBe(5);
    s.ir(0);
    expect(s.respuestas[0]).toBe(a);
    s.responder(b);
    expect(s.respuestas[0]).toBe(b);
    expect(s.respondidas).toBe(1);
    // Fuera de las preguntas no se va a ningún sitio, y una opción que no es de la pregunta no vale.
    s.ir(-1);
    s.ir(s.total);
    expect(s.indice).toBe(0);
    s.responder("No es una opción");
    expect(s.respuestas[0]).toBe(b);
  });

  it("al entregar cuenta los aciertos, y lo que no se ha respondido es un fallo", () => {
    const s = respondido(12, 3);
    const r = s.entregar();
    expect(r.aciertos).toBe(12);
    expect(r.total).toBe(PREGUNTAS_SIMULACRO);
    expect(r.fallos).toHaveLength(PREGUNTAS_SIMULACRO - 12);
    expect(r.fallos.filter((f) => f.given === null)).toHaveLength(3);
    for (const f of r.fallos) expect(f.given).not.toBe(f.question.answer);
    // Los fallos, en el orden del examen.
    expect(r.fallos.map((f) => f.question.id)).toEqual(s.preguntas.slice(12).map((q) => q.id));
  });

  it("apto con 15 aciertos o más", () => {
    expect(respondido(APROBADO_SIMULACRO - 1).entregar().apto).toBe(false);
    expect(respondido(APROBADO_SIMULACRO).entregar().apto).toBe(true);
    expect(respondido(PREGUNTAS_SIMULACRO).entregar()).toMatchObject({ apto: true, aciertos: PREGUNTAS_SIMULACRO, fallos: [] });
    expect(respondido(0, PREGUNTAS_SIMULACRO).entregar()).toMatchObject({ apto: false, aciertos: 0 });
  });

  it("da los aciertos de cada tarea", () => {
    const r = respondido(PREGUNTAS_SIMULACRO).entregar();
    expect(r.porTarea).toEqual(REPARTO_SIMULACRO.map((x) => ({ tarea: x.tarea, aciertos: x.preguntas, total: x.preguntas })));
    const s = respondido(11); // las 10 de la Tarea 1 y la primera de la Tarea 2
    const t = s.entregar().porTarea;
    expect(t[0]).toEqual({ tarea: 1, aciertos: 10, total: 10 });
    expect(t[1]).toEqual({ tarea: 2, aciertos: 1, total: 3 });
    expect(t.slice(2).every((x) => x.aciertos === 0)).toBe(true);
  });

  it("después de entregar ya no se pueden cambiar las respuestas, y entregar otra vez da lo mismo", () => {
    const s = respondido(20);
    const r = s.entregar();
    s.ir(0);
    s.responder(s.actual.options.find((o) => o !== s.actual.answer)!);
    expect(s.respuestas[0]).toBe(s.actual.answer);
    expect(s.entregar()).toBe(r);
    expect(s.entregado).toBe(true);
  });
});

describe("simulacro: mejor resultado", () => {
  it("se apunta solo si mejora el anterior, con su propia clave", () => {
    let best: Record<string, number> = { "ccse/1": 9 };
    let a = apuntarSimulacro(best, 16);
    expect(a).toMatchObject({ nuevo: true, mejor: 16 });
    best = a.best;
    expect(best).toEqual({ "ccse/1": 9, [CLAVE_SIMULACRO]: 16 });
    a = apuntarSimulacro(best, 14);
    expect(a).toMatchObject({ nuevo: false, mejor: 16, best });
    expect(apuntarSimulacro(best, 18).best[CLAVE_SIMULACRO]).toBe(18);
  });
});
