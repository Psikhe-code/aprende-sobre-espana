// Examen de nacionalidad: lo que da a la partida común (ver common/ui/mode.ts).

import { ccseRecordKey, type SavedState } from "../../../common/engine/storage";
import type { Modo } from "../../../common/ui/mode";
import { reshuffleRound, buildRound, buildReviewRound, roundSize, type CcseRoundSettings } from "../engine/questions";
import { canPlay } from "../engine/selection";

export function modoCcse(state: SavedState): Modo {
  // Con su tipo escrito: así, si un campo cambia de nombre, TypeScript avisa aquí (sin él, un campo mal
  // escrito se ignoraba sin dar error, y la partida usaba el número de preguntas por defecto).
  const ajustes = (): CcseRoundSettings => ({ tareas: state.ccse.tareas, roundLength: state.ccse.longitud });
  return {
    seccion: "ccse",
    puedeJugar: () => canPlay(state),
    nueva: () => buildRound(ajustes()),
    otraVuelta: (ultimaId) => reshuffleRound(ajustes(), ultimaId),
    repaso: (fallos) => buildReviewRound(fallos),
    esperadas: () => roundSize(state.ccse.tareas, state.ccse.longitud),
    sinLimite: () => state.ccse.longitud === "sinLimite",
    tiempo: () => state.ccse.tiempo,
    seleccion: () => "ccse:" + JSON.stringify([state.ccse.tareas, state.ccse.longitud]),
    claveRecord: () => ccseRecordKey(state.ccse.tareas, state.ccse.longitud, state.ccse.tiempo)
  };
}
