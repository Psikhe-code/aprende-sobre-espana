/**
 * @fileoverview Examen de nacionalidad: sus opciones guardadas (lo que se elige en Opciones), comprobadas al cargarlas.
 */

import { sectionSettings, type SavedState } from "../../../common/engine/common-storage";
import { DEFAULT_QUESTION_COUNT, DEFAULT_TIME_LIMIT, QUESTION_COUNTS, TIME_LIMITS, type QuestionCount, type TimeLimit } from "../../../common/engine/common-round-settings";
import { TAREA_IDS, tareasWithQuestions } from "./ccse-questions";
import { CCSE_ID } from "./ccse-id";

export interface CcseSettings {
  /** Tareas marcadas (solo las que tienen preguntas). */
  tareas: number[];
  /** Tareas que tenían preguntas la última vez: las que reciban sus primeras preguntas se marcan solas. */
  knownTareas: number[];
  /** Preguntas por partida: 10, 25, 50, 100 o sin límite. */
  questionCount: QuestionCount;
  /** Tiempo por pregunta: 60, 30 o 10 segundos, o sin tiempo. */
  timeLimit: TimeLimit;
}

/**
 * Comprueba las opciones guardadas una a una: lo que falta o no vale se cambia por lo de por defecto.
 * Solo se pueden marcar las tareas con preguntas, y las que reciben sus primeras preguntas se marcan solas.
 */
export function loadCcseSettings(raw: unknown): CcseSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const withQuestions = tareasWithQuestions();
  const validTareas = (x: unknown) => (Array.isArray(x) ? TAREA_IDS.filter((n) => x.includes(n)) : undefined);
  const known = validTareas(r.knownTareas) ?? [];
  const saved = validTareas(r.tareas) ?? [...withQuestions];
  let tareas = withQuestions.filter((n) => saved.includes(n) || !known.includes(n));
  if (!tareas.length) tareas = [...withQuestions];
  return {
    tareas,
    knownTareas: [...withQuestions],
    questionCount: QUESTION_COUNTS.find((n) => n === r.questionCount) ?? DEFAULT_QUESTION_COUNT,
    timeLimit: TIME_LIMITS.find((n) => n === r.timeLimit) ?? DEFAULT_TIME_LIMIT
  };
}

/** Las opciones del examen, comprobadas (ver sectionSettings). */
export const ccseSettings = (state: SavedState): CcseSettings => sectionSettings(state, CCSE_ID, loadCcseSettings);
