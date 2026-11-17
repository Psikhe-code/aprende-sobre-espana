/**
 * @fileoverview Piezas de pantalla que tienen igual las dos secciones (y tendrán las que vengan): en el inicio, el
 * número de preguntas y el récord; en Opciones, los grupos «Preguntas por partida» y «Tiempo por pregunta»; y en el
 * resultado, la línea de la respuesta de cada fallo.
 */

import { QUESTION_COUNTS, TIME_LIMITS, type QuestionCount, type TimeLimit } from "../engine/common-round-settings";
import { el, tabToChecked, toggleCard, type Change } from "./common-dom";
import { QUESTION_COUNT_LABELS, TIME_LIMIT_LABELS } from "./common-labels";

/** Inicio: lo que se va a jugar. `roundQuestionCount`, las preguntas que tendrá la partida (0 si aún no se sabe). */
export const roundText = (questionCount: QuestionCount, roundQuestionCount: number) =>
  questionCount === "sinLimite" ? "Preguntas sin límite, al azar, de" : `${roundQuestionCount || questionCount} preguntas al azar de`;

/** Inicio: el récord de la selección. Sin límite, la mejor racha; si no, los aciertos sobre `roundQuestionCount`. */
export function renderRecord(target: HTMLElement, record: number | undefined, questionCount: QuestionCount, roundQuestionCount: number): void {
  target.replaceChildren();
  if (record == null) target.textContent = "Aún no has jugado con esta selección.";
  else if (questionCount === "sinLimite") target.append("Mejor racha con esta selección: ", el("b", "", String(record)));
  else target.append("Récord con esta selección: ", el("b", "", `${record}/${roundQuestionCount}`));
}

/**
 * Opciones: grupo «Preguntas por partida» (se marca una). Todas se pueden elegir: si la selección tiene menos
 * preguntas que las de una tarjeta, la tarjeta lo dice, y la partida tendrá las que haya.
 * Los ids de las tarjetas son `prefix` y el número.
 */
export function renderQuestionCountGroup(group: HTMLElement, o: {
  prefix: string; current: QuestionCount; availableQuestionCount: number; change: Change;
  choose: (questionCount: QuestionCount) => void;
}): void {
  group.replaceChildren(...QUESTION_COUNTS.map((questionCount) => {
    const fewer = questionCount !== "sinLimite" && o.availableQuestionCount > 0 && o.availableQuestionCount < questionCount;
    return toggleCard(o.prefix + questionCount, o.current === questionCount, QUESTION_COUNT_LABELS[questionCount].name,
      [["cat-desc", fewer ? fewerQuestionsText(o.availableQuestionCount) : QUESTION_COUNT_LABELS[questionCount].desc]],
      o.change(o.prefix + questionCount, () => o.choose(questionCount)), true);
  }));
  tabToChecked(group);
}

/** Opciones: lo que dice una tarjeta de preguntas por partida cuando la selección tiene menos. */
export const fewerQuestionsText = (availableQuestionCount: number) =>
  `Con esta selección solo hay ${availableQuestionCount} preguntas: saldrán todas.`;

/** Opciones: grupo «Tiempo por pregunta» (se marca uno). Los ids de las tarjetas son `prefix` y el tiempo. */
export function renderTimeLimitGroup(group: HTMLElement, o: {
  prefix: string; current: TimeLimit; choose: (t: TimeLimit) => void; change: Change;
}): void {
  group.replaceChildren(...TIME_LIMITS.map((t) =>
    toggleCard(o.prefix + t, o.current === t, TIME_LIMIT_LABELS[t].name, [["cat-desc", TIME_LIMIT_LABELS[t].desc]],
      o.change(o.prefix + t, () => o.choose(t)), true)));
  tabToChecked(group);
}

/**
 * Resultado: la línea de la respuesta de un fallo, «Respuesta: Oviedo · tú dijiste Gijón». Si no se respondió,
 * en vez de lo que dijo el jugador va `noAnswerText` («se acabó el tiempo», «sin responder»).
 */
export function answerLine(correctAnswer: string, givenAnswer: string | null, noAnswerText: string): HTMLElement {
  const a = el("span", "miss-a");
  a.append("Respuesta: ", el("b", "", correctAnswer), ...(givenAnswer === null ? [` · ${noAnswerText}`] : [" · tú dijiste ", el("s", "", givenAnswer)]));
  return a;
}
