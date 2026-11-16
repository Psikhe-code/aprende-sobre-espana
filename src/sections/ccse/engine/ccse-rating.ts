/**
 * @fileoverview Examen de nacionalidad: cómo se valora el resultado de una partida.
 */

import type { Rating } from "../../../common/engine/common-round";

/**
 * Aprobado de la prueba real del examen de nacionalidad: 15 aciertos de 25, el 60 %. Las partidas del examen se
 * valoran con él como referencia (el simulacro usa el número exacto de aciertos, en ccse-simulacro-rules.ts).
 */
export const CCSE_APTO_RATIO = 0.6;

/** Las valoraciones del examen, con el aprobado como referencia. */
export const ccseRating: Rating = ({ hits, total }) => {
  const pct = hits / total;
  return pct === 1 ? "Pleno" : pct >= 0.8 ? "Gran nivel" : pct >= CCSE_APTO_RATIO ? "Por encima del aprobado" : "Toca repasar";
};
