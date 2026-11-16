// Examen de nacionalidad: lo que se deduce de las opciones marcadas.

import { lengthFits, roundSize } from "./questions";
import { recordKeyEnding } from "../../../common/engine/round-settings";
import type { CcseSettings } from "./settings";

/** Si se puede jugar: alguna tarea con preguntas y que quepa el número elegido. */
export const canPlay = (c: CcseSettings) => roundSize(c.tareas, c.roundLength) > 0 && lengthFits(c.roundLength, c.tareas);

/** Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale. */
export const selectionKey = (c: CcseSettings) => JSON.stringify([c.tareas, c.roundLength]);

/**
 * Clave del récord: las tareas, el número de preguntas y el tiempo: «ccse/1+2/10preguntas/60s».
 * El del simulacro va aparte («ccse/simulacro», en simulacro-rules.ts).
 */
export const recordKey = (c: CcseSettings) =>
  "ccse/" + [...c.tareas].sort((a, b) => a - b).join("+") + recordKeyEnding(c.roundLength, c.timeLimit);
