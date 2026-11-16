// Examen de nacionalidad: lo que se deduce de las opciones marcadas.

import { lengthFits, roundSize } from "./questions";
import type { SavedState } from "../../../common/engine/storage";

/** Examen de nacionalidad: si se puede jugar, es decir, alguna tarea con preguntas y que quepa el número elegido. */
export const canPlay = (s: SavedState) =>
  roundSize(s.ccse.tareas, s.ccse.longitud) > 0 && lengthFits(s.ccse.longitud, s.ccse.tareas);
