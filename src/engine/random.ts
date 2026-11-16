import type { Rng } from "./types";

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
 * Partida sin límite, al empezar otra vuelta a la baraja: si la nueva empieza por la última pregunta de la
 * anterior (`ultimaId`), la cambia por la segunda, para que no salga dos veces seguidas.
 */
export function sinEmpezarPor<T extends { id: string }>(baraja: T[], ultimaId?: string): T[] {
  if (baraja.length > 1 && baraja[0].id === ultimaId) [baraja[0], baraja[1]] = [baraja[1], baraja[0]];
  return baraja;
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}
