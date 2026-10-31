/** Una pregunta del banco, independiente de la partida en la que salga. */
export interface Question {
  /**
   * Identificador fijo, p. ej. "capital-ccaa:12". No cambia aunque se corrija la redacción,
   * así que sirve para guardar estadísticas por pregunta.
   */
  id: string;
  text: string;
  /** Respuesta correcta. Si hay varias válidas, en cada partida se elige una. */
  answer: string | string[];
  /**
   * Qué lugar es la respuesta, independientemente de cómo se escriba (misma forma que `answer`).
   * Sirve para no repetir el mismo lugar en una partida aunque salga con otro nombre.
   */
  answerKey: string | string[];
  /**
   * Pool del que salen las opciones incorrectas (clave de POOLS).
   * "num" genera números dentro de `range`. null = solo `traps`.
   */
  type: string | null;
  /** Incorrectas "trampa": las confusiones típicas. Si hay más de las que caben, se sortean. */
  traps: string[];
  /**
   * Trampa fija: siempre sale una de estas como incorrecta (sorteada si hay varias). Es la confusión
   * que la pregunta quiere enseñar: el nombre del propio territorio («Asturias» como capital de Asturias),
   * o algo que se le parece («Mallorca» como capital de las Islas Baleares).
   * Cuenta dentro del máximo de trampas, así que sigue quedando un hueco al azar.
   */
  forcedTraps?: string[];
  /** Explicación que se muestra al responder. */
  why: string;
  /** Curiosidad opcional que se muestra al responder, después de la explicación. */
  fact?: string;
  /** Significado opcional (de una bandera) que se muestra al responder, después de la explicación. */
  meaning?: string;
  /** Valores del pool que nunca deben salir como incorrectos (porque también serían válidos). */
  exclude: string[];
  /** Solo para type "num": [mínimo, máximo]. */
  range?: [number, number];
  /** Código INE de la comunidad o ciudad autónoma cuya bandera se muestra con la pregunta. */
  flag?: string;
  /** Otras formas de los nombres de la pregunta, para mostrarlas al responder: "Girona · en castellano, Gerona". */
  aliases: string[];
  /** Si la pregunta es sobre comunidades (y ciudades autónomas) o sobre provincias. Se elige en Opciones. */
  territorio: Territorio;
}

/**
 * Territorio de una pregunta. En Opciones se marcan uno o los dos, y cada categoría
 * (capitales, banderas…) incluye solo sus preguntas de los territorios marcados.
 */
export type Territorio = "comunidad" | "provincia";
export const TERRITORIOS: Territorio[] = ["comunidad", "provincia"];

/** Pregunta lista para jugar: respuesta y forma de los nombres fijadas, y opciones ya generadas. */
export interface RoundQuestion extends Question {
  answer: string;
  answerKey: string;
  category: string;
  style: NameStyle;
  options: string[];
}

/**
 * Formas en que se escribe un nombre de lugar. Son las claves de los nombres en territorio.json.
 * "oficial": la denominación oficial (Girona, Bizkaia…).
 * "castellano": la que recomienda la RAE para textos en español (Gerona, Vizcaya…).
 * Para añadir otra (p. ej. "ingles"), se añade aquí, en NAME_STYLES, en el esquema y en los datos.
 */
export type NameStyle = "oficial" | "castellano";
/** Todas las formas, en orden: primero la oficial. */
export const NAME_STYLES: NameStyle[] = ["oficial", "castellano"];

export interface Category {
  id: string;
  name: string;
  /** Cómo se llama en la partida según el territorio de la pregunta: «Capitales de provincia». */
  labels: Record<Territorio, string>;
  /** Todas sus preguntas, de todos los territorios, en una forma de los nombres. */
  questions: (style: NameStyle) => Question[];
}

export type Pools = Record<string, string[]>;

/** Generador de números aleatorios en [0, 1). Se puede sustituir en los tests. */
export type Rng = () => number;
