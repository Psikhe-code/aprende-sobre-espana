/**
 * @fileoverview Piezas de pantalla que tienen igual las dos secciones (y tendrán las que vengan): en el inicio, el
 * número de preguntas y el récord; en Opciones, los grupos «Preguntas por partida» y «Tiempo por pregunta»; y en el
 * resultado, la línea de la respuesta de cada fallo.
 */

import { ROUND_LENGTHS, TIME_LIMITS, type RoundLength, type TimeLimit } from "../engine/common-round-settings";
import { el, tabToChecked, toggleCard, type Change } from "./common-dom";
import { ROUND_LENGTH_LABELS, TIME_LIMIT_LABELS } from "./common-labels";

/** Inicio: lo que se va a jugar. `size`, las preguntas que tendrá la partida (0 si aún no se sabe). */
export const roundText = (roundLength: RoundLength, size: number) =>
  roundLength === "sinLimite" ? "Preguntas sin límite, al azar, de" : `${size || roundLength} preguntas al azar de`;

/** Inicio: el récord de la selección. Sin límite, la mejor racha; si no, los aciertos sobre `size`. */
export function renderRecord(target: HTMLElement, record: number | undefined, roundLength: RoundLength, size: number): void {
  target.replaceChildren();
  if (record == null) target.textContent = "Aún no has jugado con esta selección.";
  else if (roundLength === "sinLimite") target.append("Mejor racha con esta selección: ", el("b", "", String(record)));
  else target.append("Récord con esta selección: ", el("b", "", `${record}/${size}`));
}

/**
 * Opciones: grupo «Preguntas por partida» (se marca una). 25, 50 y 100 solo si la selección tiene al menos esas
 * (`fits`); si no, salen desactivadas y dicen cuántas hay. Los ids de las tarjetas son `prefix` y el número.
 */
export function renderRoundLengthGroup(group: HTMLElement, o: {
  prefix: string; current: RoundLength; available: number; fits: (n: RoundLength) => boolean; choose: (n: RoundLength) => void; change: Change;
}): void {
  group.replaceChildren(...ROUND_LENGTHS.map((n) => {
    const fits = o.fits(n);
    const card = toggleCard(o.prefix + n, o.current === n, ROUND_LENGTH_LABELS[n].name,
      [["cat-desc", fits || !o.available ? ROUND_LENGTH_LABELS[n].desc : `Con esta selección hay ${o.available} preguntas.`]],
      o.change(o.prefix + n, () => o.choose(n)), true);
    // La elegida no se desactiva aunque ya no quepa: se ve marcada, con el aviso de debajo (roundLengthWarning).
    card.disabled = !fits && o.current !== n;
    return card;
  }));
  tabToChecked(group);
}

/** Opciones: aviso cuando el número de preguntas elegido ya no cabe en la selección. */
export const roundLengthWarning = (available: number) =>
  `Con esta selección hay ${available} preguntas: elige menos preguntas por partida o «Sin límite».`;

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
