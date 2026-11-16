// Lo que se guarda en el dispositivo: valores por defecto, lo que se recuerda y la conversión de lo antiguo.

import { describe, expect, it } from "vitest";
import { geografiaRecordKey, loadState, STORAGE_KEY } from "../../src/common/engine/storage";

describe("guardado", () => {
  const withSavedData = (data: unknown, fn: () => void) => {
    const store = new Map([[STORAGE_KEY, JSON.stringify(data)]]);
    const previous = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); }
    };
    try { fn(); } finally { (globalThis as { localStorage?: unknown }).localStorage = previous; }
  };

  it("por defecto están marcados los dos territorios", () => {
    expect(loadState().territorios).toEqual(["comunidad", "provincia"]);
  });

  it("la clave del récord incluye las categorías, los territorios, la dificultad y el número de preguntas (si no son los de por defecto)", () => {
    expect(geografiaRecordKey(["banderas", "capitales"], ["provincia", "comunidad"])).toBe("capitales+banderas/comunidad+provincia");
    expect(geografiaRecordKey(["capitales"], ["comunidad"])).toBe("capitales/comunidad");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 4)).toBe("capitales/comunidad");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 8)).toBe("capitales/comunidad/8");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 4, 10)).toBe("capitales/comunidad");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 4, 25)).toBe("capitales/comunidad/25preguntas");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 8, 100)).toBe("capitales/comunidad/8/100preguntas");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 6, "sinLimite")).toBe("capitales/comunidad/6/sinlimite");
    // El tiempo: sin tiempo no se escribe (los récords de antes eran sin tiempo); con tiempo, en segundos.
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 4, 10, "sinTiempo")).toBe("capitales/comunidad");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 4, 10, 60)).toBe("capitales/comunidad/60s");
    expect(geografiaRecordKey(["capitales"], ["comunidad"], 8, 25, 10)).toBe("capitales/comunidad/8/25preguntas/10s");
  });

  it("por defecto, 1 minuto por pregunta, y se recuerda el tiempo elegido", () => {
    expect(loadState().tiempo).toBe(60);
    withSavedData({ tiempo: 10 }, () => expect(loadState().tiempo).toBe(10));
    withSavedData({ tiempo: "sinTiempo" }, () => expect(loadState().tiempo).toBe("sinTiempo"));
    withSavedData({ tiempo: 45 }, () => expect(loadState().tiempo).toBe(60));
  });

  it("la primera vez no hay sección elegida; después, se recuerda la última", () => {
    expect(loadState().seccion).toBe(null);
    withSavedData({ seccion: "ccse" }, () => expect(loadState().seccion).toBe("ccse"));
    withSavedData({ seccion: "historia" }, () => expect(loadState().seccion).toBe(null));
  });

  it("por defecto, 10 preguntas por partida, y se recuerda el número elegido", () => {
    expect(loadState().longitud).toBe(10);
    withSavedData({ longitud: 50 }, () => expect(loadState().longitud).toBe(50));
    withSavedData({ longitud: "sinLimite" }, () => expect(loadState().longitud).toBe("sinLimite"));
    withSavedData({ longitud: 30 }, () => expect(loadState().longitud).toBe(10));
  });

  it("la dificultad por defecto es 4 opciones, y se recuerda la elegida", () => {
    expect(loadState().opciones).toBe(4);
    withSavedData({ opciones: 8 }, () => expect(loadState().opciones).toBe(8));
    withSavedData({ opciones: 5 }, () => expect(loadState().opciones).toBe(4));
  });

  it("convierte lo guardado con los nombres antiguos de categoría, sin perder selección ni récords", () => {
    withSavedData({
      selected: ["banderasCCAA"], known: ["capitalesCCAA", "banderasCCAA"], names: ["oficial"],
      best: { "capitalesCCAA+banderasCCAA": 8, banderasCCAA: 6 }
    }, () => {
      const s = loadState();
      // «divisiones» no existía cuando se guardó, así que se marca sola, como toda categoría nueva.
      expect(s.selected).toEqual(["banderas", "divisiones"]);
      expect(s.names).toEqual(["oficial"]);
      expect(s.best).toEqual({ "capitales+banderas/comunidad": 8, "banderas/comunidad": 6 });
    });
  });
});

