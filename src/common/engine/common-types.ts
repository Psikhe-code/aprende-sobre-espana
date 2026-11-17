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
  readonly texto: string;

  /** Enlace al documento o recurso original, si está disponible. */
  readonly url?: string;
}

/**
 * Estructura común de las preguntas, venga de la sección que venga: lo único que la partida
 * (common-round.ts) y su pantalla saben de una pregunta.
 */
export interface PlayableQuestion {
  /** Identificador estable y único de la pregunta dentro de su sección. */
  readonly id: string;
  readonly text: string;

  /** Respuesta correcta, que debe coincidir con una de las opciones. */
  readonly correctAnswer: string;
  readonly options: readonly string[];

  /** Texto que se muestra sobre el enunciado de la pregunta. */
  readonly label: string;

  /** Explicación que se muestra después de responder. */
  readonly explanation: string;

  /** Información complementaria que se muestra después de la explicación, en el orden indicado. */
  readonly extraInfo?: readonly ExtraInfoItem[];

  /** Denominaciones alternativas, en textos preparados para mostrarse al jugador. */
  readonly aliases?: readonly string[];

  /** Imagen opcional que acompaña a la pregunta. */
  readonly image?: QuestionImage;

  /** Fuentes que respaldan la explicación de la pregunta. */
  readonly sources?: readonly Fuente[];
}

/** Un bloque de información complementaria de una pregunta, con su título. */
export interface ExtraInfoItem {
  readonly title: string;
  readonly text: string;
}

/** Imagen asociada a una pregunta. */
export interface QuestionImage {
  /** Ruta o URL de la imagen. */
  readonly src: string;

  /** Texto alternativo durante la pregunta. No debe revelar la respuesta. */
  readonly alt: string;

  /** Texto alternativo en la lista de fallos, cuando ya se sabe la respuesta. */
  readonly answerAlt: string;
}

/**
 * Generador de números aleatorios en el intervalo [0, 1).
 * Permite utilizar generadores deterministas en las pruebas.
 */
export type Rng = () => number;
