// Examen de nacionalidad: lo que se deduce de las opciones marcadas.

import { cabeCcse, tamanoCcse } from "./questions";
import type { SavedState } from "../../../common/engine/storage";

/** Examen de nacionalidad: si se puede jugar, es decir, alguna tarea con preguntas y que quepa el número elegido. */
export const puedeJugarCcse = (s: SavedState) =>
  tamanoCcse(s.ccse.tareas, s.ccse.longitud) > 0 && cabeCcse(s.ccse.longitud, s.ccse.tareas);
