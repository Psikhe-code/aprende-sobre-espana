/**
 * @fileoverview El azar del juego.
 */

import type { Rng } from "./common-types";

/** Devuelve una copia mezclada (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Partida sin límite, al empezar otra vuelta: si la nueva empieza por la última pregunta de la
 * anterior (`ultimaId`), la cambia por la segunda, para que no salga dos veces seguidas.
 */
export function notStartingWith<T extends { id: string }>(questions: T[], lastId?: string): T[] {
  if (questions.length > 1 && questions[0].id === lastId) [questions[0], questions[1]] = [questions[1], questions[0]];
  return questions;
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}
