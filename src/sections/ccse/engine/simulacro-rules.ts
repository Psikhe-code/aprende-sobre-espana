// Reglas del simulacro de examen, como las de la prueba CCSE real. Van aparte, sin datos, para que
// también puedan usarlas los tests de pantalla (que no cargan ccse.json). El simulacro, en simulacro.ts.

/** Cuántas preguntas salen de cada tarea, como en la prueba real. */
export const REPARTO_SIMULACRO: readonly { tarea: number; preguntas: number }[] = [
  { tarea: 1, preguntas: 10 },
  { tarea: 2, preguntas: 3 },
  { tarea: 3, preguntas: 2 },
  { tarea: 4, preguntas: 3 },
  { tarea: 5, preguntas: 7 }
];
export const PREGUNTAS_SIMULACRO = REPARTO_SIMULACRO.reduce((n, r) => n + r.preguntas, 0);
export const MINUTOS_SIMULACRO = 45;
/** Aciertos que hacen falta para el «apto». */
export const APROBADO_SIMULACRO = 15;
/** Clave del mejor resultado del simulacro entre los récords (empieza por «ccse/», como los del examen). */
export const CLAVE_SIMULACRO = "ccse/simulacro";
