/**
 * @fileoverview Las formas de los datos comunes a todas las secciones (qué campos tiene cada cosa). No hace nada al
 * jugar: sirve para que TypeScript compruebe el resto del código.
 */

/**
 * El id de una sección del juego («geografia», «ccse»). Las que hay están en la lista de secciones
 * (src/sections/sections.ts). Cada una tiene sus preguntas, sus opciones y sus récords; la partida es la misma.
 */
export type Section = string;

/** Una fuente que respalda la nota de una pregunta. */
export interface Fuente {
  /** Cómo se cita: «Constitución española, art. 1.3». */
  texto: string;
  url?: string;
}

/**
 * Lo que una partida necesita de cada pregunta, venga de geografía (RoundQuestion) o del examen de
 * nacionalidad. El desarrollo de la partida (common-round.ts) y su pantalla solo usan esto.
 */
export interface PlayableQuestion {
  /** Identificador fijo (no se repite en una partida; sirve para estadísticas). */
  id: string;
  text: string;
  /** Respuesta correcta: una de `options`. */
  answer: string;
  options: string[];
  /** Lo que se escribe encima de la pregunta: su categoría («Capitales de provincia») o su tarea («Tarea 1 · …»). */
  label: string;
  /** Explicación que se muestra al responder. */
  why: string;
  fact?: string;
  meaning?: string;
  /** Otras formas de los nombres («Girona · en castellano, Gerona»). */
  aliases: string[];
  /** Imagen que acompaña a la pregunta (en Geografía, la bandera). La pone la sección; la partida solo la dibuja. */
  image?: QuestionImage;
  /** Dónde se ha comprobado la explicación (en el examen de nacionalidad). */
  sources?: Fuente[];
}

/** Imagen de una pregunta. */
export interface QuestionImage {
  /** Dirección del archivo. */
  src: string;
  /** Texto alternativo (lo que lee el lector de pantalla) mientras se responde: no puede delatar la respuesta. */
  alt: string;
  /** Texto alternativo cuando ya se sabe la respuesta, en la lista de fallos: «Bandera: Cantabria». */
  answerAlt: string;
}

/** Generador de números aleatorios en [0, 1). Se puede sustituir en los tests. */
export type Rng = () => number;
