// Lo que cambia de una sección a otra en la partida: de dónde salen las preguntas, cuántas son,
// con qué tiempo se juega y con qué clave se guarda el récord. La pantalla de la partida (partida.ts)
// y la final (final.ts) son las mismas para las dos secciones y le preguntan todo esto al modo.

import { categoryById } from "../engine/categories";
import { cabeCcse, otraVueltaCcse, partidaCcse, repasoCcse, tamanoCcse, tarea, type PreguntaCcseJugable } from "../engine/ccse";
import { buildRound, rebuild, reshuffle, roundSize, type TimeLimit } from "../engine/round";
import { ccseKey, type SavedState } from "../engine/storage";
import type { PreguntaJugable, RoundQuestion, Seccion } from "../engine/types";
import { ajustesPartida, claveRecord, puedeJugar, seleccionActual } from "./seleccion";

export interface Modo {
  seccion: Seccion;
  /** Si con las opciones marcadas se puede jugar. */
  puedeJugar(): boolean;
  /** Preguntas de una partida nueva. */
  nueva(): PreguntaJugable[];
  /** Sin límite: otra vuelta a la baraja, sin empezar por la última que salió. */
  otraVuelta(ultimaId: string): PreguntaJugable[];
  /** Repaso de fallos: las mismas preguntas, con las opciones preparadas de nuevo. */
  repaso(fallos: PreguntaJugable[]): PreguntaJugable[];
  /** Cuántas preguntas tiene una partida completa (para saber si cuenta para el récord). */
  esperadas(): number;
  sinLimite(): boolean;
  tiempo(): TimeLimit;
  /** Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale. */
  seleccion(): string;
  claveRecord(): string;
  /** Etiqueta encima de la pregunta («Capitales autonómicas», «Tarea 1 · Gobierno…»). */
  etiqueta(q: PreguntaJugable): string;
}

export function modoGeografia(state: SavedState): Modo {
  return {
    seccion: "geografia",
    puedeJugar: () => puedeJugar(state),
    nueva: () => buildRound(ajustesPartida(state)),
    otraVuelta: (ultimaId) => reshuffle(ajustesPartida(state), ultimaId),
    // Las preguntas de geografía son siempre RoundQuestion: las prepara buildRound.
    repaso: (fallos) => rebuild(fallos as RoundQuestion[], { options: state.opciones }),
    esperadas: () => roundSize(state.selected, state.territorios, state.longitud),
    sinLimite: () => state.longitud === "sinLimite",
    tiempo: () => state.tiempo,
    seleccion: () => "geografia:" + seleccionActual(state),
    claveRecord: () => claveRecord(state),
    etiqueta: (q) => {
      const g = q as RoundQuestion;
      return categoryById(g.category)?.labels[g.territorio] ?? "";
    }
  };
}

/** Si con las opciones del examen se puede jugar: alguna tarea con preguntas y que quepa el número elegido. */
export const puedeJugarCcse = (s: SavedState) =>
  tamanoCcse(s.ccse.tareas, s.ccse.longitud) > 0 && cabeCcse(s.ccse.longitud, s.ccse.tareas);

export function modoCcse(state: SavedState): Modo {
  const ajustes = () => ({ tareas: state.ccse.tareas, length: state.ccse.longitud });
  return {
    seccion: "ccse",
    puedeJugar: () => puedeJugarCcse(state),
    nueva: () => partidaCcse(ajustes()),
    otraVuelta: (ultimaId) => otraVueltaCcse(ajustes(), ultimaId),
    repaso: (fallos) => repasoCcse(fallos),
    esperadas: () => tamanoCcse(state.ccse.tareas, state.ccse.longitud),
    sinLimite: () => state.ccse.longitud === "sinLimite",
    tiempo: () => state.ccse.tiempo,
    seleccion: () => "ccse:" + JSON.stringify([state.ccse.tareas, state.ccse.longitud]),
    claveRecord: () => ccseKey(state.ccse.tareas, state.ccse.longitud, state.ccse.tiempo),
    etiqueta: (q) => {
      const t = tarea((q as PreguntaCcseJugable).tarea);
      return t ? `Tarea ${t.numero} · ${t.nombre}` : "";
    }
  };
}
