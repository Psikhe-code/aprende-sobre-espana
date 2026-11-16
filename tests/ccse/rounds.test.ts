import { describe, expect, it, vi } from "vitest";
import {
  CCSE_QUESTIONS, TAREAS, lengthFits, tareaName, reshuffleRound, buildRound, tareaQuestions, buildReviewRound, roundSize, tarea, tareasWithQuestions
} from "../../src/sections/ccse/engine/questions";
import { ROUND_LENGTH, ROUND_LENGTHS, type RoundLength } from "../../src/common/engine/round-settings";
import { canPlay } from "../../src/sections/ccse/engine/selection";
import { ccseMode } from "../../src/sections/ccse/ui/mode";
import { ccseRecordKey, loadState, STORAGE_KEY } from "../../src/common/engine/storage";

// Examen de nacionalidad: partidas y guardado, con datos de prueba (test-data.ts) en vez de la
// plantilla real, que se va rellenando poco a poco. Las reglas de los datos reales, en data.test.ts.

vi.mock("../../src/sections/ccse/data/ccse.json", async () => ({ default: (await import("./test-data")).ccsePrueba() }));

const TODAS = TAREAS.map((t) => t.numero);

describe("examen de nacionalidad: datos de prueba", () => {
  it("se usan los de prueba: tareas 1 y 2 con preguntas, y también de verdadero o falso y sin nota", () => {
    expect(tareasWithQuestions()).toEqual([1, 2]);
    expect(CCSE_QUESTIONS.some((p) => p.options.length === 2 && p.fixedOrder)).toBe(true);
    expect(CCSE_QUESTIONS.some((p) => !p.why)).toBe(true);
  });
});

describe("examen de nacionalidad: partidas", () => {
  it("cada pregunta lleva encima el nombre de su tarea, también en el repaso", () => {
    const partida = buildRound({ tareas: TODAS, roundLength: "sinLimite" });
    for (const q of [...partida, ...buildReviewRound(partida)]) expect(q.label, q.id).toBe(tareaName(tarea(q.tarea)!));
    expect(tareaName(TAREAS[0])).toBe(`Tarea ${TAREAS[0].numero} · ${TAREAS[0].nombre}`);
  });

  it("solo salen preguntas de las tareas marcadas, sin repetir, con el número de preguntas elegido", () => {
    for (const tareas of [tareasWithQuestions(), TODAS, [1]]) {
      for (const length of ROUND_LENGTHS) {
        const hay = tareaQuestions(tareas).length;
        if (!hay) continue;
        const partida = buildRound({ tareas, roundLength: length });
        expect(partida).toHaveLength(roundSize(tareas, length));
        expect(new Set(partida.map((q) => q.id)).size).toBe(partida.length);
        for (const q of partida) expect(tareas).toContain(q.tarea);
      }
    }
  });

  it("cada pregunta sale con sus opciones (barajadas) y su respuesta, su nota y sus fuentes", () => {
    for (let r = 0; r < 20; r++) {
      for (const q of buildRound({ tareas: TODAS, roundLength: "sinLimite" })) {
        const p = CCSE_QUESTIONS.find((x) => x.id === q.id)!;
        expect([...q.options].sort()).toEqual([...p.options].sort());
        if (p.fixedOrder) expect(q.options).toEqual(p.options);
        expect(q.answer).toBe(p.answer);
        expect(q.text).toBe(p.text);
        expect(q.why).toBe(p.why);
        expect(q.sources).toEqual(p.sources);
      }
    }
  });

  it("las opciones se barajan: la respuesta no sale siempre en el mismo sitio", () => {
    const sitios = new Set<number>();
    for (let r = 0; r < 50; r++) for (const q of buildRound({ tareas: TODAS })) sitios.add(q.options.indexOf(q.answer));
    expect(sitios.size).toBeGreaterThan(1);
  });

  it("25, 50 y 100 preguntas solo se pueden elegir si hay al menos esas; 10 y sin límite, siempre", () => {
    for (const tareas of [[1], TODAS, []]) {
      const hay = tareaQuestions(tareas).length;
      for (const length of ROUND_LENGTHS) {
        expect(lengthFits(length, tareas)).toBe(length === "sinLimite" || length === ROUND_LENGTH || hay >= length);
      }
    }
  });

  it("otra vuelta a la baraja tiene todas las preguntas y no empieza por la última que salió", () => {
    for (let r = 0; r < 50; r++) {
      const primera = buildRound({ tareas: TODAS, roundLength: "sinLimite" });
      const ultima = primera[primera.length - 1].id;
      const otra = reshuffleRound({ tareas: TODAS }, ultima);
      expect(otra.map((q) => q.id).sort()).toEqual(primera.map((q) => q.id).sort());
      expect(otra[0].id).not.toBe(ultima);
    }
  });

  it("el repaso de fallos repite las mismas preguntas, en el mismo orden", () => {
    const fallos = buildRound({ tareas: TODAS }).slice(0, 3);
    expect(buildReviewRound(fallos).map((q) => q.id)).toEqual(fallos.map((q) => q.id));
  });

  it("la clave del récord empieza por «ccse/», con las tareas, y el número de preguntas y el tiempo si no son los de por defecto", () => {
    expect(ccseRecordKey([1])).toBe("ccse/1");
    expect(ccseRecordKey([2, 1])).toBe("ccse/1+2");
    expect(ccseRecordKey([1], 25, 60)).toBe("ccse/1/25preguntas/60s");
    expect(ccseRecordKey([1, 3], "sinLimite", "sinTiempo")).toBe("ccse/1+3/sinlimite");
  });
});

describe("examen de nacionalidad: lo que da a la partida común", () => {
  it("cada partida tiene el número de preguntas elegido (sin límite, todas), así que cuenta para el récord", () => {
    const probadas: RoundLength[] = [];
    for (const n of ROUND_LENGTHS) {
      const s = loadState();
      s.ccse.longitud = n;
      if (!canPlay(s)) continue;
      const mode = ccseMode(s);
      expect(mode.buildRound(), String(n)).toHaveLength(mode.roundSize());
      expect(mode.roundSize(), String(n)).toBe(n === "sinLimite" ? tareaQuestions(s.ccse.tareas).length : n);
      probadas.push(n);
    }
    // Que no pase sin comprobar nada: con los datos de prueba caben al menos 10, 25 y sin límite.
    expect(probadas).toEqual(expect.arrayContaining([10, 25, "sinLimite"]));
  });
});

describe("examen de nacionalidad: si se puede jugar", () => {
  it("con las opciones por defecto, sí; sin ninguna tarea marcada, no", () => {
    const s = loadState();
    expect(canPlay(s)).toBe(true);
    expect(canPlay({ ...s, ccse: { ...s.ccse, tareas: [] } })).toBe(false);
  });

  it("solo si las tareas marcadas tienen preguntas y caben las elegidas (25, 50 y 100, solo si hay al menos esas)", () => {
    const s = loadState();
    for (const t of TODAS) for (const longitud of ROUND_LENGTHS) {
      const hay = tareaQuestions([t]).length;
      const cabe = hay > 0 && (longitud === "sinLimite" || longitud === ROUND_LENGTH || hay >= longitud);
      expect(canPlay({ ...s, ccse: { ...s.ccse, tareas: [t], longitud } }), `tarea ${t} · ${longitud}`).toBe(cabe);
    }
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
      expect(porDefecto.tareas).toEqual(tareasWithQuestions());
      expect(porDefecto.longitud).toBe(10);
      expect(porDefecto.tiempo).toBe(60);
    });
    conGuardado({ ccse: { tareas: [1], conocidas: [1, 2], longitud: "sinLimite", tiempo: 10 } }, () => {
      expect(loadState().ccse).toMatchObject({ tareas: [1], longitud: "sinLimite", tiempo: 10 });
    });
    // Tareas sin preguntas o que no existen no se quedan marcadas; si no queda ninguna, vuelven las de por defecto.
    conGuardado({ ccse: { tareas: [9, 4], conocidas: [1, 2] } }, () => expect(loadState().ccse.tareas).toEqual(tareasWithQuestions()));
  });

  it("una tarea que recibe sus primeras preguntas se marca sola", () => {
    // Guardado cuando solo la Tarea 1 tenía preguntas: la 2 es nueva.
    conGuardado({ ccse: { tareas: [1], conocidas: [1] } }, () => expect(loadState().ccse.tareas).toEqual([1, 2]));
    // Guardado cuando aún no había ninguna.
    conGuardado({ ccse: { tareas: [], conocidas: [] } }, () => expect(loadState().ccse.tareas).toEqual([1, 2]));
  });
});
