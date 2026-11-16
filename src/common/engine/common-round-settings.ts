/**
 * @fileoverview Lo que se elige igual en todas las secciones para una partida: cuántas preguntas tiene y cuánto tiempo
 * hay para cada una.
 */

/** Preguntas de una partida normal: 10 (por defecto). */
export const ROUND_LENGTH = 10;
/**
 * Preguntas por partida que se pueden elegir en Opciones. "sinLimite": la partida sigue hasta que el jugador
 * pulsa «Terminar»; si se acaban las preguntas, se barajan otra vez.
 */
export const ROUND_LENGTHS = [10, 25, 50, 100, "sinLimite"] as const;
export type RoundLength = (typeof ROUND_LENGTHS)[number];
export const DEFAULT_ROUND_LENGTH: RoundLength = ROUND_LENGTH;

/**
 * Tiempo por pregunta que se puede elegir en Opciones, en segundos, o "sinTiempo".
 * Por defecto, 1 minuto (decisión del usuario). El repaso de fallos va siempre sin tiempo.
 */
export const TIME_LIMITS = ["sinTiempo", 60, 30, 10] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];
export const DEFAULT_TIME_LIMIT: TimeLimit = 60;

/**
 * Cuántas preguntas tendrá una partida de este número de preguntas, si hay `available` preguntas distintas:
 * las elegidas, o menos si no hay tantas. Sin límite: las que hay (una vuelta a la baraja).
 */
export const sizeFor = (length: RoundLength, available: number) => (length === "sinLimite" ? available : Math.min(length, available));

/** Si se puede elegir este número de preguntas habiendo `available`: 10 y sin límite, siempre; 25, 50 y 100, si hay al menos esas. */
export const fitsFor = (length: RoundLength, available: number) => length === "sinLimite" || length === ROUND_LENGTH || available >= length;

/**
 * Final de la clave de un récord, igual en todas las secciones: el número de preguntas y el tiempo,
 * «/10preguntas/60s», «/sinlimite/sintiempo». Los récords van aparte por número de preguntas y por tiempo.
 */
export const recordKeyEnding = (roundLength: RoundLength, timeLimit: TimeLimit) =>
  `/${roundLength === "sinLimite" ? "sinlimite" : roundLength + "preguntas"}/${timeLimit === "sinTiempo" ? "sintiempo" : timeLimit + "s"}`;
