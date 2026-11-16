/**
 * @fileoverview Lo que cambia de una sección a otra en la partida: de dónde salen las preguntas, cuántas son,
 * con qué tiempo se juega y con qué clave se guarda el récord. La pantalla de la partida (common-round-screen.ts)
 * y la final (common-end-screen.ts) son las mismas para las dos secciones y le preguntan todo esto al modo.
 */

import type { TimeLimit } from "../engine/common-round-settings";
import type { PlayableQuestion } from "../engine/common-types";
import type { Rating } from "../engine/common-round";

export interface SectionMode {
  /** Si con las opciones marcadas se puede jugar. */
  canPlay(): boolean;
  /** Preguntas de una partida nueva. */
  buildRound(): PlayableQuestion[];
  /** Sin límite: otra vuelta, sin empezar por la última que salió. */
  reshuffleRound(lastId: string): PlayableQuestion[];
  /** Repaso de fallos: las mismas preguntas, con las opciones preparadas de nuevo. */
  buildReviewRound(misses: PlayableQuestion[]): PlayableQuestion[];
  /** Cuántas preguntas tiene una partida completa (para saber si cuenta para el récord). */
  roundSize(): number;
  isUnlimited(): boolean;
  timeLimit(): TimeLimit;
  /** Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale. */
  selectionKey(): string;
  recordKey(): string;
  /** Valoración del resultado de una partida con alguna respuesta. */
  rating: Rating;
}
