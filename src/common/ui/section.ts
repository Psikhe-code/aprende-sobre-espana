// El molde de sección: lo que cada sección da al juego para salir en el menú y tener sus pantallas.
// La lista de secciones (src/sections/sections.ts) es lo único que se toca al añadir una.

import type { SavedState } from "../engine/storage";
import type { Section } from "../engine/types";
import type { AppContext } from "./context";
import type { SectionMode } from "./mode";
import type { RoundScreen } from "./round-screen";

/**
 * Una sección que vendrá: sale en el menú como «Próximamente», pero no se puede elegir.
 * No lleva código propio hasta que tenga preguntas; entonces pasa a ser una SectionDefinition.
 */
export interface UpcomingSection {
  /** Su id, el mismo que tendrá cuando exista («historia»): su tarjeta del menú es `sec-` y el id. */
  id: string;
  name: string;
  description: string;
}

export interface SectionDefinition {
  id: Section;
  /** Su tarjeta en el menú de secciones. */
  name: string;
  description: string;
  /** La cabecera grande en sus pantallas: la línea de encima del título y la presentación de debajo. */
  header: { eyebrow: string; lede: string };
  /**
   * Los id de sus pantallas en index.html: el inicio, las Opciones y, si tiene, otras de juego
   * (sin la cabecera grande, como la partida), como las del simulacro en el examen.
   */
  screens: { start: string; settings: string; play?: readonly string[] };
  /** Los id de los botones de su inicio: volver al menú, jugar, Opciones y Créditos. */
  buttons: { back: string; play: string; settings: string; credits: string };
  /** Nombre de sus Créditos, para el lector de pantalla. */
  creditsName: string;
  /** Lo que da a la partida común (de dónde salen las preguntas, el tiempo, el récord…). */
  mode(state: SavedState): SectionMode;
  /** Dibuja su inicio con las opciones actuales. */
  renderStart(state: SavedState): void;
  /** Prepara sus Opciones (sus botones) y devuelve cómo dibujarlas. */
  createSettings(ctx: AppContext): { render(): void };
  /** Lo que dibuja en Créditos además de sus bloques fijos de index.html (en Geografía, la lista de banderas). */
  renderCredits?(): void;
  /**
   * Prepara sus pantallas propias, si las tiene (en el examen, el simulacro). `onLeave` se llama al ir a una
   * pantalla que no es de las suyas (para parar un reloj, por ejemplo).
   */
  createExtraScreens?(ctx: AppContext, roundScreen: RoundScreen): { onLeave(): void };
}
