/**
 * @fileoverview Lo que se elige igual en todas las secciones para una partida: cuántas preguntas tiene y cuánto tiempo
 * hay para cada una.
 */

/**
 * Preguntas por partida que se pueden elegir en Opciones. "sinLimite": la partida sigue hasta que el jugador
 * pulsa «Terminar»; si se acaban las preguntas, se barajan otra vez.
 */
export const QUESTION_COUNTS = [10, 25, 50, 100, "sinLimite"] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];
/** Preguntas por partida por defecto. */
export const DEFAULT_QUESTION_COUNT = 10;

/**
 * Tiempo por pregunta que se puede elegir en Opciones, en segundos, o "sinTiempo".
 * Por defecto, 1 minuto (decisión del usuario). El repaso de fallos va siempre sin tiempo.
 */
export const TIME_LIMITS = ["sinTiempo", 60, 30, 10] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];
export const DEFAULT_TIME_LIMIT: TimeLimit = 60;

/**
 * Cuántas preguntas tendrá una partida de este número de preguntas, si hay `available` preguntas distintas:
 * las elegidas, o menos si no hay tantas. Sin límite: las que hay (una vuelta).
 */
export const countRoundQuestionsFor = (questionCount: QuestionCount, available: number) =>
  questionCount === "sinLimite" ? available : Math.min(questionCount, available);

/**
 * Si se puede elegir este número de preguntas habiendo `available`: 10 (el número por defecto) y sin límite, siempre;
 * 25, 50 y 100, si hay al menos esas.
 */
export const questionCountFitsFor = (questionCount: QuestionCount, available: number) =>
  questionCount === "sinLimite" || questionCount === DEFAULT_QUESTION_COUNT || available >= questionCount;

/**
 * Final de la clave de un récord, igual en todas las secciones: el número de preguntas y el tiempo,
 * «/10preguntas/60s», «/sinlimite/sintiempo». Los récords van aparte por número de preguntas y por tiempo.
 */
export const recordKeyEnding = (questionCount: QuestionCount, timeLimit: TimeLimit) =>
  `/${questionCount === "sinLimite" ? "sinlimite" : questionCount + "preguntas"}/${timeLimit === "sinTiempo" ? "sintiempo" : timeLimit + "s"}`;
