import { describe, expect, it } from "vitest";
import { Countdown } from "../src/engine/countdown";

/** Reloj de mentira: el test decide cuánto pasa. */
function reloj() {
  let t = 1000;
  return { now: () => t, avanza: (ms: number) => { t += ms; } };
}

describe("cuenta atrás de una pregunta", () => {
  it("no corre hasta que se arranca", () => {
    const r = reloj();
    const c = new Countdown(60_000, r.now);
    r.avanza(5000);
    expect(c.remaining()).toBe(60_000);
    expect(c.running).toBe(false);
    c.start();
    r.avanza(15_000);
    expect(c.remaining()).toBe(45_000);
    expect(c.seconds()).toBe(45);
  });

  it("al pausarla no pierde tiempo, y al reanudarla sigue donde estaba", () => {
    const r = reloj();
    const c = new Countdown(30_000, r.now);
    c.start();
    r.avanza(10_000);
    c.pause();
    r.avanza(60_000); // pestaña escondida, móvil bloqueado…
    expect(c.remaining()).toBe(20_000);
    c.start();
    r.avanza(5000);
    expect(c.remaining()).toBe(15_000);
  });

  it("arrancarla dos veces no reinicia la cuenta", () => {
    const r = reloj();
    const c = new Countdown(10_000, r.now);
    c.start();
    r.avanza(4000);
    c.start();
    r.avanza(1000);
    expect(c.remaining()).toBe(5000);
  });

  it("se acaba en cero, sin pasar a negativo, y los segundos se redondean hacia arriba", () => {
    const r = reloj();
    const c = new Countdown(10_000, r.now);
    c.start();
    r.avanza(9001);
    expect(c.seconds()).toBe(1);
    expect(c.expired).toBe(false);
    r.avanza(5000);
    expect(c.remaining()).toBe(0);
    expect(c.seconds()).toBe(0);
    expect(c.expired).toBe(true);
    c.pause();
    c.start();
    expect(c.running).toBe(false);
  });
});
