// Lo que comparten las pantallas: las opciones guardadas y cómo moverse entre pantallas.
// Lo crea app.ts y se lo pasa a cada pantalla, para que ninguna dependa de otra directamente.

import type { SavedState } from "../engine/storage";

export type Screen = "start" | "options" | "play" | "end" | "credits";
export const SCREENS: readonly Screen[] = ["start", "options", "play", "end", "credits"];

export interface Contexto {
  /** Opciones y récords del jugador. Se cambian aquí y se guardan con `save`. */
  readonly state: SavedState;
  save(): void;
  /** Pantalla que se ve ahora. */
  pantalla(): Screen;
  show(id: Screen): void;
  /** Vuelve al inicio, dibujándolo de nuevo con las opciones actuales. */
  goHome(): void;
  openOptions(): void;
}
