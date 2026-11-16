/**
 * @fileoverview Geografía: cómo se valora el resultado de una partida.
 */

import type { Rating } from "../../../common/engine/common-round";

/** Las valoraciones del atlas, según la parte de aciertos. */
export const geografiaRating: Rating = ({ hits, total }) => {
  const pct = hits / total;
  return pct === 1 ? "Mapa completo" : pct >= 0.8 ? "Gran nivel" : pct >= 0.5 ? "Buen rumbo" : "Toca repasar el atlas";
};
