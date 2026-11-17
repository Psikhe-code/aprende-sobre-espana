/**
 * @fileoverview Examen de nacionalidad: lo que se deduce de las opciones marcadas.
 */

import { questionCountFits, countRoundQuestions } from "./ccse-questions";
import { recordKeyEnding } from "../../../common/engine/common-round-settings";
import type { CcseSettings } from "./ccse-settings";
import { CCSE_ID } from "./ccse-id";

/** Si se puede jugar: alguna tarea con preguntas y que quepa el número elegido. */
export const canPlay = (settings: CcseSettings) =>
  countRoundQuestions(settings.tareas, settings.questionCount) > 0 && questionCountFits(settings.questionCount, settings.tareas);

/** Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale. */
export const selectionKey = (settings: CcseSettings) => JSON.stringify([settings.tareas, settings.questionCount]);

/**
 * Clave del récord: las tareas, el número de preguntas y el tiempo: «ccse/1+2/10preguntas/60s».
 * El del simulacro va aparte («ccse/simulacro», en ccse-simulacro-rules.ts).
 */
export const recordKey = (settings: CcseSettings) =>
  CCSE_ID + "/" + [...settings.tareas].sort((a, b) => a - b).join("+") + recordKeyEnding(settings.questionCount, settings.timeLimit);
