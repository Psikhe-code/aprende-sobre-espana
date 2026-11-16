// Examen de nacionalidad: lo que da a la partida común (ver common/ui/mode.ts).

import { ccseRecordKey, type SavedState } from "../../../common/engine/storage";
import type { SectionMode } from "../../../common/ui/mode";
import { reshuffleRound, buildRound, buildReviewRound, roundSize, type CcseRoundSettings } from "../engine/questions";
import { canPlay } from "../engine/selection";
import { ccseRating } from "../engine/rating";

export function ccseMode(state: SavedState): SectionMode {
  // Con su tipo escrito: así, si un campo cambia de nombre, TypeScript avisa aquí (sin él, un campo mal
  // escrito se ignoraba sin dar error, y la partida usaba el número de preguntas por defecto).
  const settings = (): CcseRoundSettings => ({ tareas: state.ccse.tareas, roundLength: state.ccse.longitud });
  return {
    section: "ccse",
    canPlay: () => canPlay(state),
    buildRound: () => buildRound(settings()),
    reshuffleRound: (lastId) => reshuffleRound(settings(), lastId),
    buildReviewRound: (misses) => buildReviewRound(misses),
    roundSize: () => roundSize(state.ccse.tareas, state.ccse.longitud),
    isUnlimited: () => state.ccse.longitud === "sinLimite",
    timeLimit: () => state.ccse.tiempo,
    selectionKey: () => "ccse:" + JSON.stringify([state.ccse.tareas, state.ccse.longitud]),
    recordKey: () => ccseRecordKey(state.ccse.tareas, state.ccse.longitud, state.ccse.tiempo),
    rating: ccseRating
  };
}
