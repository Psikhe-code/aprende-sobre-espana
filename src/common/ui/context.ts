// Lo que comparten las pantallas: las opciones guardadas, la sección y cómo moverse entre pantallas.
// Lo crea app.ts y se lo pasa a cada pantalla, para que ninguna dependa de otra directamente.

import type { SavedState } from "../engine/storage";
import type { SectionMode } from "./mode";

/**
 * Una pantalla: el id de su <section> en index.html. Las comunes están en app.ts (COMMON_SCREENS),
 * y las de cada sección, en su definición (common/ui/section.ts).
 */
export type Screen = string;

export interface AppContext {
  /** Opciones y récords del jugador. Se cambian aquí y se guardan con `save`. */
  readonly state: SavedState;
  save(): void;
  /** Pantalla que se ve ahora. */
  screen(): Screen;
  show(id: Screen): void;
  /** Vuelve al inicio de la sección actual, dibujándolo de nuevo con las opciones actuales. */
  goHome(): void;
  /** Abre las Opciones de la sección actual. */
  openOptions(): void;
  /** Lo que cambia en la partida según la sección (de dónde salen las preguntas, récords…). */
  mode(): SectionMode;
}
