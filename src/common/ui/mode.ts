// Lo que cambia de una sección a otra en la partida: de dónde salen las preguntas, cuántas son,
// con qué tiempo se juega y con qué clave se guarda el récord. La pantalla de la partida (round-screen.ts)
// y la final (end-screen.ts) son las mismas para las dos secciones y le preguntan todo esto al modo.

import type { TimeLimit } from "../engine/round-settings";
import type { PlayableQuestion, Section } from "../engine/types";


export interface Modo {
  seccion: Section;
  /** Si con las opciones marcadas se puede jugar. */
  puedeJugar(): boolean;
  /** Preguntas de una partida nueva. */
  nueva(): PlayableQuestion[];
  /** Sin límite: otra vuelta a la baraja, sin empezar por la última que salió. */
  otraVuelta(ultimaId: string): PlayableQuestion[];
  /** Repaso de fallos: las mismas preguntas, con las opciones preparadas de nuevo. */
  repaso(fallos: PlayableQuestion[]): PlayableQuestion[];
  /** Cuántas preguntas tiene una partida completa (para saber si cuenta para el récord). */
  esperadas(): number;
  sinLimite(): boolean;
  tiempo(): TimeLimit;
  /** Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale. */
  seleccion(): string;
  claveRecord(): string;
}
