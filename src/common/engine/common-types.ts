/**
 * @fileoverview Describe los tipos que comparten todas las secciones.
 */

/**
 * Identificador de una sección del juego.
 * Las secciones disponibles se registran en `src/sections/sections.ts`.
 */
export type Section = string;

/** Fuente utilizada para respaldar la explicación de una pregunta. */
export interface Fuente {
  /** Referencia de la fuente que se muestra al jugador. */
  texto: string;
  /** Enlace al documento o recurso original, si está disponible. */
  url?: string;
}

/**
 * Estructura común de las preguntas, venga de la sección que venga: lo único que la partida
 * (common-round.ts) y su pantalla saben de una pregunta.
 */
export interface PlayableQuestion {
  /** Identificador estable y único de la pregunta dentro de su sección. */
  id: string;
  text: string;

  /** Respuesta correcta, que debe coincidir con una de las opciones. */
  answer: string;
  options: string[];

  /** Texto que se muestra sobre el enunciado de la pregunta. */
  label: string;

  /** Explicaciones que se muestran después de responder. */
  why: string;
  fact?: string;
  meaning?: string;

  /** Denominaciones alternativas, en textos preparados para mostrarse al jugador. */
  aliases: string[];

  /** Imagen opcional que acompaña a la pregunta. */
  image?: QuestionImage;

  /** Fuentes que respaldan la explicación de la pregunta. */
  sources?: Fuente[];
}

/** Imagen asociada a una pregunta. */
export interface QuestionImage {
  /** Ruta o URL de la imagen. */
  src: string;

  /** Texto alternativo durante la pregunta. No debe revelar la respuesta. */
  alt: string;

  /** Texto alternativo en la lista de fallos, cuando ya se sabe la respuesta. */
  answerAlt: string;
}

/**
 * Generador de números aleatorios en el intervalo [0, 1).
 * Permite utilizar generadores deterministas en las pruebas.
 */
export type Rng = () => number;
