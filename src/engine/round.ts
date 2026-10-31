import { NAME_STYLES, TERRITORIOS, type NameStyle, type Question, type RoundQuestion, type Rng, type Territorio } from "./types";
import { categoryById } from "./categories";
import { poolsFor } from "./territory";
import { pick, shuffle } from "./random";
import { fixAnswer, prepare } from "./options";

export const ROUND_LENGTH = 10;
/** Número de opciones por pregunta en cada dificultad. La respuesta abierta vendrá después. */
export const OPTION_COUNTS = [4, 6, 8] as const;
export type OptionCount = (typeof OPTION_COUNTS)[number];
/** Dificultad por defecto: 4 opciones. */
export const DEFAULT_OPTIONS: OptionCount = 4;
/** Formas de los nombres por defecto: todas, sorteadas en cada pregunta para aprenderlas. */
export const DEFAULT_NAMES: NameStyle[] = [...NAME_STYLES];
/** Territorios por defecto: comunidades y provincias. */
export const DEFAULT_TERRITORIOS: Territorio[] = [...TERRITORIOS];

export interface RoundSettings {
  categories: string[];
  length?: number;
  options?: number;
  /** Formas de los nombres marcadas. Si hay varias, se sortea una en cada pregunta. */
  names?: NameStyle[];
  /** Territorios marcados: solo salen preguntas de estos. */
  territorios?: Territorio[];
  rng?: Rng;
}

/** Preguntas de una categoría en los territorios marcados (en la forma oficial: los ids son iguales en todas). */
export function questionsIn(categoryId: string, territorios: Territorio[] = DEFAULT_TERRITORIOS): Question[] {
  const cat = categoryById(categoryId);
  return cat ? cat.questions(NAME_STYLES[0]).filter((q) => territorios.includes(q.territorio)) : [];
}

/**
 * Cuántas preguntas tendrá una partida con esta selección: 10, o menos si no hay tantos lugares distintos
 * (por ejemplo, solo capitales de provincia). Cero si la selección no tiene preguntas.
 */
export function roundSize(categories: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS, length = ROUND_LENGTH): number {
  const lugares = new Set(categories.flatMap((id) => questionsIn(id, territorios)).map((q) => JSON.stringify(q.answerKey)));
  return Math.min(length, lugares.size);
}

type Picked = Question & { category: string; style: NameStyle; answer: string; answerKey: string };

/**
 * Elige las preguntas de una partida entre las categorías marcadas.
 * - En cada pregunta se sortea primero la categoría y luego una pregunta de ella,
 *   así una categoría con muchas preguntas no acapara la partida.
 * - La forma de los nombres (oficial o castellano) se fija para cada pregunta entera:
 *   una de las marcadas, sorteada si hay varias.
 */
export function pickQuestions({ categories, length = ROUND_LENGTH, names = DEFAULT_NAMES, territorios = DEFAULT_TERRITORIOS, rng = Math.random }: RoundSettings): Picked[] {
  const styles = NAME_STYLES.filter((s) => names.includes(s));
  if (!styles.length) throw new Error("Hay que marcar al menos una forma de los nombres");
  // La misma pregunta (mismo id) generada en cada forma.
  const versions = new Map<string, Record<NameStyle, Question>>();
  const decks: Record<string, string[]> = {};
  for (const catId of categories) {
    const cat = categoryById(catId);
    if (!cat) continue;
    const ids = new Set(questionsIn(catId, territorios).map((q) => q.id));
    if (!ids.size) continue;
    for (const style of NAME_STYLES) {
      for (const q of cat.questions(style).filter((x) => ids.has(x.id))) {
        const v = versions.get(q.id) ?? ({} as Record<NameStyle, Question>);
        v[style] = q;
        versions.set(q.id, v);
      }
    }
    decks[catId] = shuffle([...ids], rng);
  }
  const out: Picked[] = [];
  while (out.length < length) {
    const live = Object.keys(decks).filter((id) => decks[id].length);
    if (!live.length) break;
    const category = pick(live, rng);
    const id = decks[category].pop()!;
    const style = pick(styles, rng);
    const q = fixAnswer({ ...versions.get(id)![style], category, style }, rng);
    if (!isDuplicate(q, out)) out.push(q);
  }
  return out;
}

/**
 * Una partida no repite pregunta ni lugar como respuesta, aunque salga escrito de otra forma
 * (p. ej. Vitoria y Vitoria-Gasteiz son el mismo lugar).
 */
function isDuplicate(q: Picked, chosen: Picked[]): boolean {
  return chosen.some((o) => o.id === q.id || o.answerKey === q.answerKey);
}

export function buildRound(settings: RoundSettings): RoundQuestion[] {
  const n = settings.options ?? DEFAULT_OPTIONS;
  return pickQuestions(settings).map((q) => prepare(q, n, poolsFor(q.style), settings.rng));
}

/** Prepara de nuevo una lista de preguntas (repaso de fallos), con opciones nuevas y la misma forma. */
export function rebuild(
  questions: RoundQuestion[],
  { options = DEFAULT_OPTIONS, rng = Math.random }: { options?: number; rng?: Rng } = {}
): RoundQuestion[] {
  return shuffle(questions, rng).map((q) => prepare(q, options, poolsFor(q.style), rng));
}
