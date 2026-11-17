/**
 * @fileoverview Geografía: qué preguntas salen en cada partida.
 */

import { DEFAULT_QUESTION_COUNT, countRoundQuestions, type QuestionCount } from "../../../common/engine/common-round-settings";
import { type Rng } from "../../../common/engine/common-types";
import { NAME_FORMS, TERRITORIOS, type NameForm, type Question, type RoundQuestion, type Territorio } from "./geografia-types";
import { categoryById } from "./geografia-categories";
import { poolsFor } from "./geografia-territorio";
import { pick, shuffle, notStartingWith } from "../../../common/engine/common-random";
import { selectCorrectAnswer, prepare } from "./geografia-options";

/** Número de opciones por pregunta en cada dificultad. La respuesta abierta vendrá después. */
export const OPTION_COUNTS = [4, 6, 8] as const;
export type OptionCount = (typeof OPTION_COUNTS)[number];
/** Dificultad por defecto: 4 opciones. */
export const DEFAULT_OPTION_COUNT: OptionCount = 4;
/** Formas de los nombres por defecto: todas, sorteadas en cada pregunta para aprenderlas. */
export const DEFAULT_NAME_FORMS: NameForm[] = [...NAME_FORMS];
/** Territorios por defecto: comunidades y provincias. */
export const DEFAULT_TERRITORIOS: Territorio[] = [...TERRITORIOS];

/**
 * Lo que necesita el motor para preparar una partida. Sale de las opciones del jugador (`settings`), salvo al
 * barajar otra vuelta de la partida sin límite, que va siempre sin límite.
 */
export interface RoundParams {
  categories: string[];
  /** Preguntas de la partida. Sin límite: una vuelta entera (todas las de la selección). */
  questionCount?: QuestionCount;
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
export function countAvailableQuestions(categories: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS): number {
  return new Set(categories.flatMap((id) => questionsIn(id, territorios)).map((q) => q.id)).size;
}

type Picked = Question & { category: string; nameForm: NameForm; correctAnswer: string };

/**
 * Elige las preguntas de una partida entre las categorías marcadas.
 * - En cada pregunta se sortea primero la categoría y luego una pregunta de ella,
 *   así una categoría con muchas preguntas no acapara la partida.
 * - La forma de los nombres (oficial o castellano) se fija para cada pregunta entera:
 *   una de las marcadas, sorteada si hay varias.
 * - No se repite ninguna pregunta. El mismo lugar sí puede volver a ser la respuesta en otra pregunta
 *   (Vigo y Pontevedra, de la provincia de Pontevedra; la capital de Asturias como comunidad y como provincia).
 */
export function pickQuestions({ categories, questionCount = DEFAULT_QUESTION_COUNT, nameForms: checkedForms = DEFAULT_NAME_FORMS, territorios = DEFAULT_TERRITORIOS, rng = Math.random }: RoundParams): Picked[] {
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
  const roundQuestionCount = countRoundQuestions(questionCount, versions.size);
  const out: Picked[] = [];
  while (out.length < roundQuestionCount) {
    const live = Object.keys(decks).filter((id) => decks[id].length);
    if (!live.length) break;
    const category = pick(live, rng);
    const id = decks[category].pop()!;
    const nameForm = pick(nameForms, rng);
    out.push(selectCorrectAnswer({ ...versions.get(id)![nameForm], category, nameForm }, rng));
  }
  return out;
}

export function buildRound(params: RoundParams): RoundQuestion[] {
  const optionCount = params.optionCount ?? DEFAULT_OPTION_COUNT;
  return pickQuestions(params).map((q) => prepare(q, optionCount, poolsFor(q.nameForm), params.rng));
}

/**
 * Otra vuelta en una partida sin límite: todas las preguntas de nuevo, barajadas y con opciones nuevas.
 * La primera nunca es la última que acaba de salir, para que no se repita una detrás de otra.
 */
export function reshuffleRound(params: RoundParams, lastId?: string): RoundQuestion[] {
  return notStartingWith(buildRound({ ...params, questionCount: "sinLimite" }), lastId);
}

/** Prepara de nuevo una lista de preguntas (repaso de fallos), con opciones nuevas y la misma forma. */
export function buildReviewRound(
  questions: RoundQuestion[],
  { optionCount = DEFAULT_OPTION_COUNT, rng = Math.random }: { optionCount?: OptionCount; rng?: Rng } = {}
): RoundQuestion[] {
  return shuffle(questions, rng).map((q) => prepare(q, optionCount, poolsFor(q.nameForm), rng));
}
