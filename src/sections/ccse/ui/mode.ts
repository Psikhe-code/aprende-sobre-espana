// Examen de nacionalidad: lo que da a la partida común (ver common/ui/mode.ts).

import { ccseRecordKey, type SavedState } from "../../../common/engine/storage";
import type { Modo } from "../../../common/ui/mode";
import { reshuffleRound, buildRound, buildReviewRound, roundSize } from "../engine/questions";
import { canPlay } from "../engine/selection";

export function modoCcse(state: SavedState): Modo {
  const ajustes = () => ({ tareas: state.ccse.tareas, length: state.ccse.longitud });
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
