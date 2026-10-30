import type { Question, RoundQuestion, Rng } from "./types";
import { categoryById } from "./categories";
import { pick, shuffle } from "./random";
import { prepare } from "./options";

export const ROUND_LENGTH = 10;
/** Número de opciones por pregunta. Base para las futuras dificultades (4, 6, 8). */
export const DEFAULT_OPTIONS = 4;

export interface RoundSettings {
  categories: string[];
  length?: number;
  options?: number;
  rng?: Rng;
}

type Tagged = Question & { category: string };

/**
 * Elige las preguntas de una partida entre las categorías marcadas.
 * En cada pregunta se sortea primero la categoría y luego una pregunta de ella,
 * así una categoría con muchas preguntas no acapara la partida.
 */
export function pickQuestions({ categories, length = ROUND_LENGTH, rng = Math.random }: RoundSettings): Tagged[] {
  const decks: Record<string, Tagged[]> = {};
  for (const id of categories) {
    const cat = categoryById(id);
    if (cat) decks[id] = shuffle(cat.questions(), rng).map((q) => ({ ...q, category: id }));
  }
  const out: Tagged[] = [];
  while (out.length < length) {
    const live = Object.keys(decks).filter((id) => decks[id].length);
    if (!live.length) break;
    const raw = decks[pick(live, rng)].pop()!;
    // Si hay varias respuestas válidas, se fija una ya aquí, para poder comprobar repeticiones.
    const q = Array.isArray(raw.answer) ? { ...raw, answer: pick(raw.answer, rng) } : raw;
    if (!isDuplicate(q, out)) out.push(q);
  }
  return out;
}

/**
 * Evita dos preguntas iguales en la misma partida, y que la misma ciudad salga dos veces
 * como respuesta de capital (p. ej. Pamplona en capitales de provincia y autonómicas).
 */
function isDuplicate(q: Tagged, chosen: Tagged[]): boolean {
  return chosen.some((o) =>
    (o.text === q.text && o.answer === q.answer) ||
    (o.type === "capitalCualquiera" && q.type === "capitalCualquiera" && o.answer === q.answer));
}

export function buildRound(settings: RoundSettings): RoundQuestion[] {
  const n = settings.options ?? DEFAULT_OPTIONS;
  return pickQuestions(settings).map((q) => prepare(q, n, settings.rng));
}

/** Prepara de nuevo una lista de preguntas (repaso de fallos), con opciones nuevas. */
export function rebuild(questions: RoundQuestion[], options = DEFAULT_OPTIONS, rng: Rng = Math.random): RoundQuestion[] {
  return shuffle(questions, rng).map((q) => prepare(q, options, rng));
}
