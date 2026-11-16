// Las formas de los datos comunes a todas las secciones (qué campos tiene cada cosa). No hace nada al jugar:
// sirve para que TypeScript compruebe el resto del código.

/**
 * Sección del juego: geografía o examen de nacionalidad (CCSE). Cada una tiene sus preguntas, sus opciones
 * y sus récords; la partida (round.ts) y su pantalla son las mismas.
 */
export type Seccion = "geografia" | "ccse";
export const SECCIONES: readonly Seccion[] = ["geografia", "ccse"];

/** Una fuente que respalda la nota de una pregunta. */
export interface Fuente {
  /** Cómo se cita: «Constitución española, art. 1.3». */
  texto: string;
  url?: string;
}

/**
 * Lo que una partida necesita de cada pregunta, venga de geografía (RoundQuestion) o del examen de
 * nacionalidad. El desarrollo de la partida (round.ts) y su pantalla solo usan esto.
 */
export interface PreguntaJugable {
  /** Identificador fijo (no se repite en una partida; sirve para estadísticas). */
  id: string;
  text: string;
  /** Respuesta correcta: una de `options`. */
  answer: string;
  options: string[];
  /** Lo que se escribe encima de la pregunta: su categoría («Capitales de provincia») o su tarea («Tarea 1 · …»). */
  etiqueta: string;
  /** Explicación que se muestra al responder. */
  why: string;
  fact?: string;
  meaning?: string;
  /** Otras formas de los nombres («Girona · en castellano, Gerona»). */
  aliases: string[];
  flag?: string;
  /** Dónde se ha comprobado la explicación (en el examen de nacionalidad). */
  fuentes?: Fuente[];
}

/** Generador de números aleatorios en [0, 1). Se puede sustituir en los tests. */
export type Rng = () => number;
