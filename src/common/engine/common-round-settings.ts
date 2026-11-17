/**
 * @fileoverview Define las opciones comunes de número de preguntas por partida
 * y tiempo por pregunta.
 */

/**
 * Preguntas por partida que se pueden elegir en Opciones. `"sinLimite"`: la partida sigue hasta que el jugador
 * pulsa «Terminar»; al completar una vuelta, puede seguir con las mismas preguntas en otro orden.
 */
export const QUESTION_COUNTS = [10, 25, 50, 100, "sinLimite"] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];
/** Primera opción disponible, utilizada por defecto. */
export const DEFAULT_QUESTION_COUNT = QUESTION_COUNTS[0];

/**
 * Tiempo por pregunta seleccionable en Opciones, en segundos, o "sinTiempo".
 * Por defecto, 60 segundos. El repaso de fallos siempre se realiza sin tiempo.
 */
export const TIME_LIMITS = ["sinTiempo", 60, 30, 10] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];
export const DEFAULT_TIME_LIMIT: TimeLimit = 60;

/**
 * Cuántas preguntas tendrá una partida de este número de preguntas, si hay `availableQuestionCount` preguntas
 * distintas: las elegidas, o menos si no hay tantas. Sin límite: las que hay (una vuelta).
 */
export const countRoundQuestions = (questionCount: QuestionCount, availableQuestionCount: number) =>
  questionCount === "sinLimite" ? availableQuestionCount : Math.min(questionCount, availableQuestionCount);

/**
 * Si se puede elegir este número de preguntas habiendo `availableQuestionCount`: 10 (el número por defecto) y
 * sin límite, siempre; 25, 50 y 100, si hay al menos esas.
 */
export const canChooseQuestionCount = (questionCount: QuestionCount, availableQuestionCount: number) =>
  questionCount === "sinLimite" || questionCount === DEFAULT_QUESTION_COUNT || availableQuestionCount >= questionCount;

/**
 * Final de la clave de un récord, igual en todas las secciones: el número de preguntas y el tiempo,
 * «/10preguntas/60s», «/sinlimite/sintiempo». Los récords van aparte por número de preguntas y por tiempo.
 */
export const recordKeyEnding = (questionCount: QuestionCount, timeLimit: TimeLimit) =>
  `/${questionCount === "sinLimite" ? "sinlimite" : questionCount + "preguntas"}/${timeLimit === "sinTiempo" ? "sintiempo" : timeLimit + "s"}`;
