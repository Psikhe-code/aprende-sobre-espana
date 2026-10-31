import type { NameStyle, Pools, Question, RoundQuestion, Rng } from "./types";
import { pick, shuffle } from "./random";

/** Valores entre los que salen las opciones incorrectas de una pregunta. */
export function poolFor(q: Question, pools: Pools): string[] {
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
 * - Siempre sale una trampa fija (`forcedTraps`), sorteada si hay varias.
 * - Si hay pool, como mucho n-2 incorrectas son trampas (contando las fijas): siempre queda
 *   al menos un hueco aleatorio, para que las partidas no se repitan.
 * - Nunca aparecen valores de `exclude` ni duplicados.
 * - Si el pool se queda corto, se completa con las trampas que sobren.
 */
export function makeOptions(q: Question & { answer: string }, n: number, pools: Pools, rng: Rng = Math.random): string[] {
  const banned = new Set([q.answer, ...q.exclude]);
  const fijas = [...new Set(q.forcedTraps ?? [])].filter((v) => !banned.has(v));
  const forced = fijas.length && n > 1 ? [pick(fijas, rng)] : [];
  forced.forEach((v) => banned.add(v));
  const traps = shuffle(q.traps.filter((v) => !banned.has(v)), rng);
  const pool = poolFor(q, pools);
  const k = Math.max(0, (pool.length ? Math.min(traps.length + forced.length, n - 2) : n - 1) - forced.length);
  const wrong = [...forced, ...traps.slice(0, k)];
  wrong.forEach((v) => banned.add(v));
  const fill = shuffle(pool.filter((v) => !banned.has(v)), rng);
  while (wrong.length < n - 1 && fill.length) wrong.push(fill.pop()!);
  const rest = traps.slice(k);
  while (wrong.length < n - 1 && rest.length) wrong.push(rest.pop()!);
  return shuffle([q.answer, ...wrong], rng);
}

/** Si hay varias respuestas válidas, fija una (con su lugar correspondiente). */
export function fixAnswer<T extends Question>(q: T, rng: Rng = Math.random): T & { answer: string; answerKey: string } {
  if (!Array.isArray(q.answer)) return q as T & { answer: string; answerKey: string };
  const i = pick(q.answer.map((_, j) => j), rng);
  return { ...q, answer: q.answer[i], answerKey: (q.answerKey as string[])[i] };
}

/** Fija la respuesta y genera las opciones para esta partida, con los pools de la forma de la pregunta. */
export function prepare(q: Question & { category: string; style: NameStyle }, n: number, pools: Pools, rng: Rng = Math.random): RoundQuestion {
  const fixed = fixAnswer(q, rng);
  return { ...fixed, options: makeOptions(fixed, n, pools, rng) };
}
