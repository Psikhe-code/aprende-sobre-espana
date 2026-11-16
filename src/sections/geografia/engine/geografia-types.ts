/**
 * @fileoverview Geografía: las formas de sus datos (qué campos tiene cada cosa).
 */

import type { ExtraInfoItem, PlayableQuestion } from "../../../common/engine/common-types";

/** Una pregunta del banco de geografía, independiente de la partida en la que salga. */
export interface Question {
  /**
   * Identificador fijo, p. ej. "capital-ccaa:12". No cambia aunque se corrija la redacción,
   * así que sirve para guardar estadísticas por pregunta.
   */
  readonly id: string;
  readonly text: string;
  /** Respuesta correcta. Si hay varias válidas, en cada partida se elige una. */
  readonly correctAnswer: string | readonly string[];
  /** Pool del que salen las opciones incorrectas (una clave de los pools: ver poolsFor). null = solo `trapOptions`. */
  readonly pool: string | null;
  /** Incorrectas "trampa": las confusiones típicas. Si hay más de las que caben, se sortean. */
  readonly trapOptions: readonly string[];
  /**
   * Trampa fija: siempre sale una de estas como incorrecta (sorteada si hay varias). Es la confusión
   * que la pregunta quiere enseñar: el nombre del propio territorio («Asturias» como capital de Asturias),
   * o algo que se le parece («Mallorca» como capital de las Islas Baleares).
   * Cuenta dentro del máximo de trampas, así que sigue quedando un hueco al azar.
   */
  readonly fixedTrapOptions?: readonly string[];
  /** Explicación que se muestra al responder. */
  readonly explanation: string;
  /** Información complementaria que se muestra al responder, después de la explicación: el significado de la bandera o la curiosidad. */
  readonly extraInfo?: readonly ExtraInfoItem[];
  /** Valores del pool que nunca deben salir como incorrectos (porque también serían válidos). */
  readonly exclude: readonly string[];
  /** Bandera que se muestra con la pregunta: código de la comunidad ("12") o "p" y código de provincia ("p48"). */
  readonly banderaKey?: string;
  /** Otras formas de los nombres de la pregunta, para mostrarlas al responder: "Girona · en castellano, Gerona". */
  readonly aliases: readonly string[];
  /** Si la pregunta es sobre comunidades (y ciudades autónomas) o sobre provincias. Se elige en Opciones. */
  readonly territorio: Territorio;
}

/**
 * Territorio de una pregunta. En Opciones se marcan uno o los dos, y cada categoría
 * (capitales, banderas…) incluye solo sus preguntas de los territorios marcados.
 */
export type Territorio = "comunidad" | "provincia";
export const TERRITORIOS: Territorio[] = ["comunidad", "provincia"];

/**
 * Pregunta de geografía lista para jugar: respuesta y forma de los nombres fijadas, y opciones ya generadas.
 * Es también una PlayableQuestion: TypeScript comprueba que tiene todo lo que necesita la partida.
 */
export interface RoundQuestion extends Question, PlayableQuestion {
  readonly correctAnswer: string;
  readonly category: string;
  readonly nameForm: NameForm;
  readonly options: readonly string[];
  /** En Geografía siempre hay (aunque esté vacía); en la partida común es opcional. */
  readonly aliases: readonly string[];
}

/**
 * Formas en que se escribe un nombre de lugar. Son las claves de los nombres en territorio.json.
 * "oficial": la denominación oficial (Girona, Bizkaia…).
 * "castellano": la que recomienda la RAE para textos en español (Gerona, Vizcaya…).
 * Para añadir otra (p. ej. "ingles"), se añade aquí, en NAME_FORMS, en el esquema y en los datos.
 */
export type NameForm = "oficial" | "castellano";
/** Todas las formas, en orden: primero la oficial. */
export const NAME_FORMS: NameForm[] = ["oficial", "castellano"];

export interface Category {
  id: string;
  name: string;
  /** Cómo se llama en la partida según el territorio de la pregunta: «Capitales de provincia». */
  labels: Record<Territorio, string>;
  /**
   * Todas sus preguntas, de todos los territorios, en una forma de los nombres. Se generan la primera vez
   * y después se devuelven las mismas (los datos no cambian durante el juego): por eso son de solo lectura.
   */
  questions: (nameForm: NameForm) => readonly Question[];
}

export type Pools = Readonly<Record<string, readonly string[]>>;
