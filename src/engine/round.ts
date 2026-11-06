import { NAME_STYLES, TERRITORIOS, type NameStyle, type Question, type RoundQuestion, type Rng, type Territorio } from "./types";
import { categoryById } from "./categories";
import { poolsFor } from "./territory";
import { pick, shuffle } from "./random";
import { fixAnswer, prepare } from "./options";

/** Preguntas de una partida normal: 10 (por defecto). */
export const ROUND_LENGTH = 10;
/**
 * Preguntas por partida que se pueden elegir en Opciones. "sinLimite": la partida sigue hasta que el jugador
 * pulsa «Terminar»; si se acaban las preguntas, se barajan otra vez.
 */
export const ROUND_LENGTHS = [10, 25, 50, 100, "sinLimite"] as const;
export type RoundLength = (typeof ROUND_LENGTHS)[number];
export const DEFAULT_LENGTH: RoundLength = ROUND_LENGTH;

/**
 * Tiempo por pregunta que se puede elegir en Opciones, en segundos, o "sinTiempo".
 * Por defecto, 1 minuto (decisión del usuario). El repaso de fallos va siempre sin tiempo.
 */
export const TIME_LIMITS = ["sinTiempo", 60, 30, 10] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];
export const DEFAULT_TIME: TimeLimit = 60;
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
  /** Preguntas de la partida. Sin límite: una vuelta entera a la baraja (todas las de la selección). */
  length?: RoundLength;
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

/** Cuántas preguntas distintas hay con esta selección de categorías y territorios. */
export function questionCount(categories: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS): number {
  return new Set(categories.flatMap((id) => questionsIn(id, territorios)).map((q) => q.id)).size;
}

/**
 * Cuántas preguntas tendrá una partida con esta selección: las elegidas, o menos si no hay tantas
 * (por ejemplo, solo capitales de provincia). Cero si la selección no tiene preguntas.
 * Sin límite: las que hay, que es lo que dura una vuelta a la baraja.
 */
export function roundSize(categories: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS, length: RoundLength = ROUND_LENGTH): number {
  const n = questionCount(categories, territorios);
  return length === "sinLimite" ? n : Math.min(length, n);
}

/**
 * Si se puede elegir este número de preguntas con esta selección. Las 10 y «sin límite», siempre
 * (si hay menos de 10, la partida tiene las que haya); 25, 50 y 100, solo si hay al menos esas.
 */
export const lengthFits = (length: RoundLength, categories: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS) =>
  length === "sinLimite" || length === ROUND_LENGTH || questionCount(categories, territorios) >= length;

type Picked = Question & { category: string; style: NameStyle; answer: string; answerKey: string };

/**
 * Elige las preguntas de una partida entre las categorías marcadas.
 * - En cada pregunta se sortea primero la categoría y luego una pregunta de ella,
 *   así una categoría con muchas preguntas no acapara la partida.
 * - La forma de los nombres (oficial o castellano) se fija para cada pregunta entera:
 *   una de las marcadas, sorteada si hay varias.
 * - No se repite ninguna pregunta. El mismo lugar sí puede volver a ser la respuesta en otra pregunta
 *   (Vigo y Pontevedra, de la provincia de Pontevedra; la capital de Asturias como comunidad y como provincia).
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
  const max = length === "sinLimite" ? Infinity : length;
  const out: Picked[] = [];
  while (out.length < max) {
    const live = Object.keys(decks).filter((id) => decks[id].length);
    if (!live.length) break;
    const category = pick(live, rng);
    const id = decks[category].pop()!;
    const style = pick(styles, rng);
    out.push(fixAnswer({ ...versions.get(id)![style], category, style }, rng));
  }
  return out;
}

export function buildRound(settings: RoundSettings): RoundQuestion[] {
  const n = settings.options ?? DEFAULT_OPTIONS;
  return pickQuestions(settings).map((q) => prepare(q, n, poolsFor(q.style), settings.rng));
}

/**
 * Otra vuelta a la baraja en una partida sin límite: todas las preguntas de nuevo, barajadas y con opciones nuevas.
 * La primera nunca es la última que acaba de salir, para que no se repita una detrás de otra.
 */
export function reshuffle(settings: RoundSettings, lastId?: string): RoundQuestion[] {
  const deck = buildRound({ ...settings, length: "sinLimite" });
  if (deck.length > 1 && deck[0].id === lastId) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck;
}

/** Prepara de nuevo una lista de preguntas (repaso de fallos), con opciones nuevas y la misma forma. */
export function rebuild(
  questions: RoundQuestion[],
  { options = DEFAULT_OPTIONS, rng = Math.random }: { options?: number; rng?: Rng } = {}
): RoundQuestion[] {
  return shuffle(questions, rng).map((q) => prepare(q, options, poolsFor(q.style), rng));
}
