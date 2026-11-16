/**
 * @fileoverview Reglas del simulacro de examen, como las de la prueba CCSE real. Van aparte, sin datos, para que
 * también puedan usarlas los tests de pantalla (que no cargan ccse.json). El simulacro, en ccse-simulacro.ts.
 */

/** Cuántas preguntas salen de cada tarea, como en la prueba real. */
export const SIMULACRO_DISTRIBUTION: readonly { tarea: number; questionCount: number }[] = [
  { tarea: 1, questionCount: 10 },
  { tarea: 2, questionCount: 3 },
  { tarea: 3, questionCount: 2 },
  { tarea: 4, questionCount: 3 },
  { tarea: 5, questionCount: 7 }
];
export const SIMULACRO_QUESTION_COUNT = SIMULACRO_DISTRIBUTION.reduce((n, r) => n + r.questionCount, 0);
export const SIMULACRO_MINUTES = 45;
/** Aciertos que hacen falta para el «apto». */
export const SIMULACRO_APTO_HITS = 15;
/** Clave del mejor resultado del simulacro entre los récords (empieza por «ccse/», como los del examen). */
export const SIMULACRO_RECORD_KEY = "ccse/simulacro";
