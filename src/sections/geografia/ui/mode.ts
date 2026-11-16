// Geografía: lo que da a la partida común (ver common/ui/mode.ts).

import type { SavedState } from "../../../common/engine/storage";
import type { PlayableQuestion } from "../../../common/engine/types";
import type { SectionMode } from "../../../common/ui/mode";
import { buildRound, buildReviewRound, reshuffleRound, roundSize } from "../engine/round-questions";
import { roundSettings, recordKey, canPlay, selectionKey } from "../engine/selection";
import type { RoundQuestion } from "../engine/types";

/** Si una pregunta es de geografía (RoundQuestion): solo esas tienen categoría. */
const esDeGeografia = (q: PlayableQuestion): q is RoundQuestion => "category" in q;

export function modoGeografia(state: SavedState): SectionMode {
  return {
    section: "geografia",
    canPlay: () => canPlay(state),
    buildRound: () => buildRound(roundSettings(state)),
    reshuffleRound: (ultimaId) => reshuffleRound(roundSettings(state), ultimaId),
    buildReviewRound: (fallos) => buildReviewRound(fallos.filter(esDeGeografia), { optionCount: state.opciones }),
    roundSize: () => roundSize(state.selected, state.territorios, state.longitud),
    isUnlimited: () => state.longitud === "sinLimite",
    timeLimit: () => state.tiempo,
    selectionKey: () => "geografia:" + selectionKey(state),
    recordKey: () => recordKey(state)
  };
}
