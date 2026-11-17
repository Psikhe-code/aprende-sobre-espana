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
 * Tiempo por pregunta seleccionable en Opciones, en segundos, o `"sinTiempo"`.
 * El repaso de fallos siempre se realiza sin tiempo.
 */
export const TIME_LIMITS = ["sinTiempo", 60, 30, 10] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];
export const DEFAULT_TIME_LIMIT: TimeLimit = 60;

/**
 * Calcula cuántas preguntas tendrá una partida según la cantidad solicitada y las disponibles.
 * Si hay menos de las solicitadas, utiliza las disponibles. En «Sin límite», devuelve las de una vuelta.
 */
export const countRoundQuestions = (questionCount: QuestionCount, availableQuestionCount: number) =>
  questionCount === "sinLimite" ? availableQuestionCount : Math.min(questionCount, availableQuestionCount);

/**
 * Genera el sufijo de la clave de un récord a partir del número de preguntas y el tiempo por pregunta.
 * Permite guardar récords separados para cada combinación.
 */
export const recordKeyEnding = (questionCount: QuestionCount, timeLimit: TimeLimit) =>
  `/${questionCount === "sinLimite" ? "sinlimite" : questionCount + "preguntas"}/${timeLimit === "sinTiempo" ? "sintiempo" : timeLimit + "s"}`;
