/**
 * Formato de una pregunta tal como se escribe en los JSON de src/data/preguntas.
 * Las claves están en español para que editar el contenido sea fácil.
 */
export interface PreguntaJSON {
  /** Enunciado que ve el jugador. */
  pregunta: string;
  /** Respuesta correcta. Si es una lista, en cada partida se elige una al azar. */
  respuesta: string | string[];
  /**
   * Pool del que salen las opciones incorrectas (clave de pools.json o de los pools
   * derivados del territorio). "num" genera números dentro de `rango`.
   * null = sin pool: todas las incorrectas salen de `trampas`.
   */
  tipo: string | null;
  /** Incorrectas "trampa" fijas: las confusiones típicas. */
  trampas?: string[];
  /** Texto que se muestra al responder. */
  explicacion: string;
  /** Valores del pool que nunca deben salir como incorrectos (porque también serían válidos). */
  excluir?: string[];
  /** Solo para tipo "num": [mínimo, máximo]. */
  rango?: [number, number];
}

/** Pregunta ya normalizada, lista para el motor. */
export interface Question {
  text: string;
  answer: string | string[];
  type: string | null;
  traps: string[];
  why: string;
  exclude: string[];
  range?: [number, number];
  /** Comunidad cuya bandera se muestra con la pregunta. */
  flag?: string;
}

/** Pregunta preparada para una partida concreta: respuesta fijada y opciones generadas. */
export interface RoundQuestion extends Question {
  answer: string;
  category: string;
  options: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  questions: () => Question[];
}

export type Pools = Record<string, string[]>;

/** Generador de números aleatorios en [0, 1). Se puede sustituir en los tests. */
export type Rng = () => number;
