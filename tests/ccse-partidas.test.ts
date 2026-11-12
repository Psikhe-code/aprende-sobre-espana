import { describe, expect, it, vi } from "vitest";
import {
  PREGUNTAS_CCSE, TAREAS, cabeCcse, otraVueltaCcse, partidaCcse, preguntasDe, repasoCcse, tamanoCcse, tareasConPreguntas
} from "../src/engine/ccse";
import { ROUND_LENGTH, ROUND_LENGTHS } from "../src/engine/round";
import { ccseKey, loadState, STORAGE_KEY } from "../src/engine/storage";

// Examen de nacionalidad: partidas y guardado, con datos de prueba (ccse-prueba.ts) en vez de la
// plantilla real, que se va rellenando poco a poco. Las reglas de los datos reales, en ccse.test.ts.

vi.mock("../src/data/ccse.json", async () => ({ default: (await import("./ccse-prueba")).ccsePrueba() }));

const TODAS = TAREAS.map((t) => t.numero);

describe("examen de nacionalidad: datos de prueba", () => {
  it("se usan los de prueba: tareas 1 y 2 con preguntas, y también de verdadero o falso y sin nota", () => {
    expect(tareasConPreguntas()).toEqual([1, 2]);
    expect(PREGUNTAS_CCSE.some((p) => p.opciones.length === 2 && p.ordenFijo)).toBe(true);
    expect(PREGUNTAS_CCSE.some((p) => !p.nota)).toBe(true);
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

describe("examen de nacionalidad: guardado", () => {
  const conGuardado = (datos: unknown, fn: () => void) => {
    const almacen = new Map([[STORAGE_KEY, JSON.stringify(datos)]]);
    const previo = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => almacen.get(k) ?? null,
      setItem: (k: string, v: string) => { almacen.set(k, v); }
    };
    try { fn(); } finally { (globalThis as { localStorage?: unknown }).localStorage = previo; }
  };

  it("opciones del examen: por defecto, todas las tareas con preguntas, 10 preguntas y 1 minuto; y se recuerdan", () => {
    conGuardado({}, () => {
      const porDefecto = loadState().ccse;
      expect(porDefecto.tareas).toEqual(tareasConPreguntas());
      expect(porDefecto.longitud).toBe(10);
      expect(porDefecto.tiempo).toBe(60);
    });
    conGuardado({ ccse: { tareas: [1], conocidas: [1, 2], longitud: "sinLimite", tiempo: 10 } }, () => {
      expect(loadState().ccse).toMatchObject({ tareas: [1], longitud: "sinLimite", tiempo: 10 });
    });
    // Tareas sin preguntas o que no existen no se quedan marcadas; si no queda ninguna, vuelven las de por defecto.
    conGuardado({ ccse: { tareas: [9, 4], conocidas: [1, 2] } }, () => expect(loadState().ccse.tareas).toEqual(tareasConPreguntas()));
  });

  it("una tarea que recibe sus primeras preguntas se marca sola", () => {
    // Guardado cuando solo la Tarea 1 tenía preguntas: la 2 es nueva.
    conGuardado({ ccse: { tareas: [1], conocidas: [1] } }, () => expect(loadState().ccse.tareas).toEqual([1, 2]));
    // Guardado cuando aún no había ninguna.
    conGuardado({ ccse: { tareas: [], conocidas: [] } }, () => expect(loadState().ccse.tareas).toEqual([1, 2]));
  });
});
