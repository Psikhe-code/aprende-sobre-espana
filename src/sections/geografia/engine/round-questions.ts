// Geografía: qué preguntas salen en cada partida.

import { ROUND_LENGTH, fitsFor, sizeFor, type RoundLength } from "../../../common/engine/round-settings";
import { type Rng } from "../../../common/engine/types";
import { NAME_FORMS, TERRITORIOS, type NameForm, type Question, type RoundQuestion, type Territorio } from "./types";
import { categoryById } from "./categories";
import { poolsFor } from "./territorio";
import { pick, shuffle, notStartingWith } from "../../../common/engine/random";
import { fixAnswer, prepare } from "./options";

/** Número de opciones por pregunta en cada dificultad. La respuesta abierta vendrá después. */
export const OPTION_COUNTS = [4, 6, 8] as const;
export type OptionCount = (typeof OPTION_COUNTS)[number];
/** Dificultad por defecto: 4 opciones. */
export const DEFAULT_OPTION_COUNT: OptionCount = 4;
/** Formas de los nombres por defecto: todas, sorteadas en cada pregunta para aprenderlas. */
export const DEFAULT_NAME_FORMS: NameForm[] = [...NAME_FORMS];
/** Territorios por defecto: comunidades y provincias. */
export const DEFAULT_TERRITORIOS: Territorio[] = [...TERRITORIOS];

export interface RoundSettings {
  categories: string[];
  /** Preguntas de la partida. Sin límite: una vuelta entera a la baraja (todas las de la selección). */
  roundLength?: RoundLength;
  /** Opciones por pregunta (la dificultad). */
  optionCount?: OptionCount;
  /** Formas de los nombres marcadas. Si hay varias, se sortea una en cada pregunta. */
  nameForms?: NameForm[];
  /** Territorios marcados: solo salen preguntas de estos. */
  territorios?: Territorio[];
  rng?: Rng;
}

/** Preguntas de una categoría en los territorios marcados (en la forma oficial: los ids son iguales en todas). */
export function questionsIn(categoryId: string, territorios: Territorio[] = DEFAULT_TERRITORIOS): Question[] {
  const cat = categoryById(categoryId);
  return cat ? cat.questions(NAME_FORMS[0]).filter((q) => territorios.includes(q.territorio)) : [];
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
  return sizeFor(length, questionCount(categories, territorios));
}

/**
 * Si se puede elegir este número de preguntas con esta selección. Las 10 y «sin límite», siempre
 * (si hay menos de 10, la partida tiene las que haya); 25, 50 y 100, solo si hay al menos esas.
 */
export const lengthFits = (length: RoundLength, categories: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS) =>
  fitsFor(length, questionCount(categories, territorios));

type Picked = Question & { category: string; nameForm: NameForm; answer: string; answerKey: string };

/**
 * Elige las preguntas de una partida entre las categorías marcadas.
 * - En cada pregunta se sortea primero la categoría y luego una pregunta de ella,
 *   así una categoría con muchas preguntas no acapara la partida.
 * - La forma de los nombres (oficial o castellano) se fija para cada pregunta entera:
 *   una de las marcadas, sorteada si hay varias.
 * - No se repite ninguna pregunta. El mismo lugar sí puede volver a ser la respuesta en otra pregunta
 *   (Vigo y Pontevedra, de la provincia de Pontevedra; la capital de Asturias como comunidad y como provincia).
 */
export function pickQuestions({ categories, roundLength = ROUND_LENGTH, nameForms: checkedForms = DEFAULT_NAME_FORMS, territorios = DEFAULT_TERRITORIOS, rng = Math.random }: RoundSettings): Picked[] {
  const nameForms = NAME_FORMS.filter((f) => checkedForms.includes(f));
  if (!nameForms.length) throw new Error("Hay que marcar al menos una forma de los nombres");
  // La misma pregunta (mismo id) generada en cada forma.
  const versions = new Map<string, Record<NameForm, Question>>();
  const decks: Record<string, string[]> = {};
  for (const catId of categories) {
    const cat = categoryById(catId);
    if (!cat) continue;
    const ids = new Set(questionsIn(catId, territorios).map((q) => q.id));
    if (!ids.size) continue;
    for (const nameForm of NAME_FORMS) {
      for (const q of cat.questions(nameForm).filter((x) => ids.has(x.id))) {
        const v = versions.get(q.id) ?? ({} as Record<NameForm, Question>);
        v[nameForm] = q;
        versions.set(q.id, v);
      }
    }
    decks[catId] = shuffle([...ids], rng);
  }
  const max = roundLength === "sinLimite" ? Infinity : roundLength;
  const out: Picked[] = [];
  while (out.length < max) {
    const live = Object.keys(decks).filter((id) => decks[id].length);
    if (!live.length) break;
    const category = pick(live, rng);
    const id = decks[category].pop()!;
    const nameForm = pick(nameForms, rng);
    out.push(fixAnswer({ ...versions.get(id)![nameForm], category, nameForm }, rng));
  }
  return out;
}

export function buildRound(settings: RoundSettings): RoundQuestion[] {
  const n = settings.optionCount ?? DEFAULT_OPTION_COUNT;
  return pickQuestions(settings).map((q) => prepare(q, n, poolsFor(q.nameForm), settings.rng));
}

/**
 * Otra vuelta a la baraja en una partida sin límite: todas las preguntas de nuevo, barajadas y con opciones nuevas.
 * La primera nunca es la última que acaba de salir, para que no se repita una detrás de otra.
 */
export function reshuffleRound(settings: RoundSettings, lastId?: string): RoundQuestion[] {
  return notStartingWith(buildRound({ ...settings, roundLength: "sinLimite" }), lastId);
}

/** Prepara de nuevo una lista de preguntas (repaso de fallos), con opciones nuevas y la misma forma. */
export function buildReviewRound(
  questions: RoundQuestion[],
  { optionCount = DEFAULT_OPTION_COUNT, rng = Math.random }: { optionCount?: OptionCount; rng?: Rng } = {}
): RoundQuestion[] {
  return shuffle(questions, rng).map((q) => prepare(q, optionCount, poolsFor(q.nameForm), rng));
}
