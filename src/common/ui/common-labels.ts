/**
 * @fileoverview Textos con los que se presentan, en todas las secciones, las opciones comunes y el tiempo.
 */

import type { RoundLength, TimeLimit } from "../engine/common-round-settings";

/** Cómo se presenta cada número de preguntas en Opciones. */
export const ROUND_LENGTH_LABELS: Record<RoundLength, { name: string; desc: string }> = {
  10: { name: "10 preguntas", desc: "Una partida rápida." },
  25: { name: "25 preguntas", desc: "Una partida media." },
  50: { name: "50 preguntas", desc: "Una partida larga." },
  100: { name: "100 preguntas", desc: "Para repasarlo casi todo." },
  sinLimite: { name: "Sin límite", desc: "Hasta que pulses «Terminar». Si se acaban, se barajan otra vez." }
};

/** Cómo se presenta cada tiempo por pregunta en Opciones y en el inicio. */
export const TIME_LIMIT_LABELS: Record<TimeLimit, { name: string; desc: string; info: string }> = {
  sinTiempo: { name: "Sin tiempo", desc: "Para jugar con calma.", info: "sin tiempo" },
  60: { name: "1 minuto", desc: "Tiempo de sobra para pensar.", info: "1 minuto por pregunta" },
  30: { name: "30 segundos", desc: "Hay que ir con algo de prisa.", info: "30 segundos por pregunta" },
  10: { name: "10 segundos", desc: "Nivel difícil: casi solo da para leer.", info: "10 segundos por pregunta" }
};

/** Tiempo como en un reloj, redondeando hacia arriba (lo que queda): 45:00, 4:07. */
export const clockTime = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Tiempo usado, en palabras: «23 min 10 s», «45 s», «2 min». */
export const timeUsed = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min` + (s % 60 ? ` ${s % 60} s` : "");
};
