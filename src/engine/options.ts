import type { Pools, Question, RoundQuestion, Rng } from "./types";
import { POOLS } from "./territory";
import { pick, shuffle } from "./random";

/** Valores entre los que salen las opciones incorrectas de una pregunta. */
export function poolFor(q: Question, pools: Pools = POOLS): string[] {
  if (q.type === "num") {
    const [min, max] = q.range ?? [0, -1];
    const out: string[] = [];
    for (let v = min; v <= max; v++) out.push(String(v));
    return out;
  }
  return q.type ? pools[q.type] ?? [] : [];
}

/**
 * Devuelve `n` opciones mezcladas: la correcta, algunas trampas y el resto del pool.
 *
 * - Si hay pool, como mucho n-2 incorrectas son trampas: siempre queda al menos
 *   un hueco aleatorio, para que las partidas no se repitan.
 * - Nunca aparecen valores de `exclude` ni duplicados.
 * - Si el pool se queda corto, se completa con las trampas que sobren.
 */
export function makeOptions(q: Question & { answer: string }, n: number, rng: Rng = Math.random, pools: Pools = POOLS): string[] {
  const banned = new Set([q.answer, ...q.exclude]);
  const traps = shuffle(q.traps.filter((v) => !banned.has(v)), rng);
  const pool = poolFor(q, pools);
  const k = pool.length ? Math.min(traps.length, n - 2) : n - 1;
  const wrong = traps.slice(0, k);
  wrong.forEach((v) => banned.add(v));
  const fill = shuffle(pool.filter((v) => !banned.has(v)), rng);
  while (wrong.length < n - 1 && fill.length) wrong.push(fill.pop()!);
  const rest = traps.slice(k);
  while (wrong.length < n - 1 && rest.length) wrong.push(rest.pop()!);
  return shuffle([q.answer, ...wrong], rng);
}

/** Fija la respuesta (si hay varias posibles) y genera las opciones para esta partida. */
export function prepare(q: Question & { category: string }, n: number, rng: Rng = Math.random): RoundQuestion {
  const answer = Array.isArray(q.answer) ? pick(q.answer, rng) : q.answer;
  const fixed = { ...q, answer };
  return { ...fixed, options: makeOptions(fixed, n, rng) };
}
