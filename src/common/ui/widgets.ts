// Piezas de pantalla que tienen igual las dos secciones (y tendrán las que vengan): en el inicio, el número
// de preguntas y el récord; en Opciones, los grupos «Preguntas por partida» y «Tiempo por pregunta»; y en el
// resultado, la línea de la respuesta de cada fallo.

import { ROUND_LENGTHS, TIME_LIMITS, type RoundLength, type TimeLimit } from "../engine/round-settings";
import { el, tabuladorEnLaMarcada, toggleCard, type Cambiar } from "./dom";
import { LONGITUD_LABELS, TIEMPO_LABELS } from "./labels";

/** Inicio: lo que se va a jugar. `tamano`, las preguntas que tendrá la partida (0 si aún no se sabe). */
export const textoRonda = (longitud: RoundLength, tamano: number) =>
  longitud === "sinLimite" ? "Preguntas sin límite, al azar, de" : `${tamano || longitud} preguntas al azar de`;

/** Inicio: el récord de la selección. Sin límite, la mejor racha; si no, los aciertos sobre `tamano`. */
export function pintarRecord(donde: HTMLElement, record: number | undefined, longitud: RoundLength, tamano: number): void {
  donde.replaceChildren();
  if (record == null) donde.textContent = "Aún no has jugado con esta selección.";
  else if (longitud === "sinLimite") donde.append("Mejor racha con esta selección: ", el("b", "", String(record)));
  else donde.append("Récord con esta selección: ", el("b", "", `${record}/${tamano}`));
}

/**
 * Opciones: grupo «Preguntas por partida» (se marca una). 25, 50 y 100 solo si la selección tiene al menos esas
 * (`cabe`); si no, salen desactivadas y dicen cuántas hay. Los ids de las tarjetas son `prefijo` y el número.
 */
export function grupoLongitud(grupo: HTMLElement, o: {
  prefijo: string; actual: RoundLength; hay: number; cabe: (n: RoundLength) => boolean; elegir: (n: RoundLength) => void; cambiar: Cambiar;
}): void {
  grupo.replaceChildren(...ROUND_LENGTHS.map((n) => {
    const cabe = o.cabe(n);
    const card = toggleCard(o.prefijo + n, o.actual === n, LONGITUD_LABELS[n].name,
      [["cat-desc", cabe || !o.hay ? LONGITUD_LABELS[n].desc : `Con esta selección hay ${o.hay} preguntas.`]],
      o.cambiar(o.prefijo + n, () => o.elegir(n)), true);
    // La elegida no se desactiva aunque ya no quepa: se ve marcada, con el aviso de debajo (avisoLongitud).
    card.disabled = !cabe && o.actual !== n;
    return card;
  }));
  tabuladorEnLaMarcada(grupo);
}

/** Opciones: aviso cuando el número de preguntas elegido ya no cabe en la selección. */
export const avisoLongitud = (hay: number) =>
  `Con esta selección hay ${hay} preguntas: elige menos preguntas por partida o «Sin límite».`;

/** Opciones: grupo «Tiempo por pregunta» (se marca uno). Los ids de las tarjetas son `prefijo` y el tiempo. */
export function grupoTiempo(grupo: HTMLElement, o: {
  prefijo: string; actual: TimeLimit; elegir: (t: TimeLimit) => void; cambiar: Cambiar;
}): void {
  grupo.replaceChildren(...TIME_LIMITS.map((t) =>
    toggleCard(o.prefijo + t, o.actual === t, TIEMPO_LABELS[t].name, [["cat-desc", TIEMPO_LABELS[t].desc]],
      o.cambiar(o.prefijo + t, () => o.elegir(t)), true)));
  tabuladorEnLaMarcada(grupo);
}

/**
 * Resultado: la línea de la respuesta de un fallo, «Respuesta: Oviedo · tú dijiste Gijón». Si no se respondió,
 * en vez de lo que dijo el jugador va `sinRespuesta` («se acabó el tiempo», «sin responder»).
 */
export function lineaRespuesta(respuesta: string, dada: string | null, sinRespuesta: string): HTMLElement {
  const a = el("span", "miss-a");
  a.append("Respuesta: ", el("b", "", respuesta), ...(dada === null ? [` · ${sinRespuesta}`] : [" · tú dijiste ", el("s", "", dada)]));
  return a;
}
