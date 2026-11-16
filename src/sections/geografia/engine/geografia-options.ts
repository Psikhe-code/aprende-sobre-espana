/**
 * @fileoverview Geografía: las opciones de cada pregunta, la respuesta y las equivocadas.
 */

import type { Rng } from "../../../common/engine/common-types";
import type { NameForm, Pools, Question, RoundQuestion } from "./geografia-types";
import { categoryById } from "./geografia-categories";
import { pick, shuffle } from "../../../common/engine/common-random";

/** Valores entre los que salen las opciones incorrectas de una pregunta. */
export function poolFor(q: Question, pools: Pools): readonly string[] {
  return q.pool ? pools[q.pool] ?? [] : [];
}

/**
 * Devuelve `n` opciones mezcladas: la correcta, algunas trampas y el resto del pool.
 *
 * - Siempre sale una trampa fija (`fixedTrapOptions`), sorteada si hay varias.
 * - Si hay pool, como mucho n-2 incorrectas son trampas (contando las fijas): siempre queda
 *   al menos un hueco aleatorio, para que las partidas no se repitan.
 * - Nunca aparecen valores de `exclude` ni duplicados.
 * - Si el pool se queda corto, se completa con las trampas que sobren.
 */
export function makeOptions(q: Question & { correctAnswer: string }, n: number, pools: Pools, rng: Rng = Math.random): string[] {
  const banned = new Set([q.correctAnswer, ...q.exclude]);
  const fixedCandidates = [...new Set(q.fixedTrapOptions ?? [])].filter((v) => !banned.has(v));
  const fixed = fixedCandidates.length && n > 1 ? [pick(fixedCandidates, rng)] : [];
  fixed.forEach((v) => banned.add(v));
  const trapOptions = shuffle(q.trapOptions.filter((v) => !banned.has(v)), rng);
  const pool = poolFor(q, pools);
  const k = Math.max(0, (pool.length ? Math.min(trapOptions.length + fixed.length, n - 2) : n - 1) - fixed.length);
  const wrong = [...fixed, ...trapOptions.slice(0, k)];
  wrong.forEach((v) => banned.add(v));
  const fill = shuffle(pool.filter((v) => !banned.has(v)), rng);
  while (wrong.length < n - 1 && fill.length) wrong.push(fill.pop()!);
  const rest = trapOptions.slice(k);
  while (wrong.length < n - 1 && rest.length) wrong.push(rest.pop()!);
  return shuffle([q.correctAnswer, ...wrong], rng);
}

/** Si hay varias respuestas válidas, elige una. */
export function selectCorrectAnswer<T extends Question>(q: T, rng: Rng = Math.random): T & { correctAnswer: string } {
  if (!Array.isArray(q.correctAnswer)) return q as T & { correctAnswer: string };
  return { ...q, correctAnswer: pick(q.correctAnswer, rng) };
}

/**
 * Fija la respuesta y genera las opciones para esta partida, con los pools de la forma de la pregunta.
 * También pone la etiqueta que sale encima («Capitales de provincia»): la de su categoría y su territorio.
 */
export function prepare(q: Question & { category: string; nameForm: NameForm }, n: number, pools: Pools, rng: Rng = Math.random): RoundQuestion {
  const fixed = selectCorrectAnswer(q, rng);
  return { ...fixed, options: makeOptions(fixed, n, pools, rng), label: categoryById(q.category)?.labels[q.territorio] ?? "" };
}
