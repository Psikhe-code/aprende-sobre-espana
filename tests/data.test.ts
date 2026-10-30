import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../src/engine/categories";
import { BANDERAS } from "../src/engine/questions";
import {
  PROVINCIAS, COMUNIDADES, CAPITAL_AUTONOMICA, CAPITALES_AUTONOMICAS, POOLS
} from "../src/engine/territory";
import { poolFor } from "../src/engine/options";

// Comprobaciones del contenido: si alguien edita un JSON y se equivoca, el test lo dice.

const FLAG_FILES = Object.keys(import.meta.glob("../src/data/banderas/*.svg")).map((f) => f.split("/").pop());
const all = CATEGORIES.flatMap((c) => c.questions().map((q) => ({ ...q, category: c.id })));
const label = (q: { text: string; category: string }) => `[${q.category}] ${q.text}`;

describe("territorio", () => {
  it("tiene 50 provincias y 17 comunidades", () => {
    expect(PROVINCIAS).toHaveLength(50);
    expect(COMUNIDADES).toHaveLength(17);
    expect(new Set(PROVINCIAS.map((p) => p.provincia)).size).toBe(50);
  });

  it("cada comunidad tiene capital y bandera", () => {
    for (const cc of COMUNIDADES) {
      expect(CAPITAL_AUTONOMICA[cc], cc).toBeDefined();
      expect(BANDERAS[cc], cc).toBeDefined();
    }
    expect(Object.keys(CAPITAL_AUTONOMICA).sort()).toEqual([...COMUNIDADES].sort());
  });

  it("los archivos de bandera existen y sus trampas son comunidades", () => {
    for (const [cc, info] of Object.entries(BANDERAS)) {
      expect(FLAG_FILES, info.archivo).toContain(info.archivo);
      for (const t of info.trampas) expect(COMUNIDADES, `${cc} → ${t}`).toContain(t);
      expect(info.trampas, cc).not.toContain(cc);
    }
  });

  it("las capitales autonómicas están en el pool de capitales", () => {
    for (const c of CAPITALES_AUTONOMICAS) expect(POOLS.capitalCualquiera).toContain(c);
  });
});

describe("preguntas", () => {
  it("hay preguntas en todas las categorías", () => {
    for (const c of CATEGORIES) expect(c.questions().length, c.id).toBeGreaterThan(0);
  });

  it("cada tipo de respuesta existe", () => {
    for (const q of all) {
      if (q.type && q.type !== "num") expect(POOLS[q.type], `${label(q)} → tipo "${q.type}"`).toBeDefined();
      if (q.type === "num") expect(q.range, label(q)).toBeDefined();
    }
  });

  it("la respuesta correcta nunca es una trampa ni está excluida", () => {
    for (const q of all) {
      for (const a of ([] as string[]).concat(q.answer)) {
        expect(q.traps, label(q)).not.toContain(a);
        if (!Array.isArray(q.answer)) expect(q.exclude, label(q)).not.toContain(a);
      }
    }
  });

  it("las trampas no están repetidas ni excluidas", () => {
    for (const q of all) {
      expect(new Set(q.traps).size, label(q)).toBe(q.traps.length);
      for (const t of q.traps) expect(q.exclude, `${label(q)} → ${t}`).not.toContain(t);
    }
  });

  it("si la respuesta tiene pool, pertenece a él (si no, se delataría)", () => {
    // Excepción buscada: aquí el pool son las comunidades CON costa y la respuesta, una sin costa.
    const POOL_INVERSO = ["¿Cuál de estas comunidades no tiene costa?"];
    for (const q of all) {
      if (POOL_INVERSO.includes(q.text)) continue;
      const pool = poolFor(q);
      if (!pool.length) continue;
      for (const a of ([] as string[]).concat(q.answer)) expect(pool, `${label(q)} → ${a}`).toContain(a);
    }
  });

  it("cada pregunta tiene explicación", () => {
    for (const q of all) expect(q.why?.length, label(q)).toBeGreaterThan(10);
  });
});
