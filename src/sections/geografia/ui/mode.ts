// Geografía: lo que da a la partida común (ver common/ui/mode.ts).

import type { SavedState } from "../../../common/engine/storage";
import type { PlayableQuestion } from "../../../common/engine/types";
import type { Modo } from "../../../common/ui/mode";
import { buildRound, buildReviewRound, reshuffleRound, roundSize } from "../engine/round-questions";
import { roundSettings, recordKey, canPlay, selectionKey } from "../engine/selection";
import type { RoundQuestion } from "../engine/types";

/** Si una pregunta es de geografía (RoundQuestion): solo esas tienen categoría. */
const esDeGeografia = (q: PlayableQuestion): q is RoundQuestion => "category" in q;

export function modoGeografia(state: SavedState): Modo {
  return {
    seccion: "geografia",
    puedeJugar: () => canPlay(state),
    nueva: () => buildRound(roundSettings(state)),
    otraVuelta: (ultimaId) => reshuffleRound(roundSettings(state), ultimaId),
    repaso: (fallos) => buildReviewRound(fallos.filter(esDeGeografia), { optionCount: state.opciones }),
    esperadas: () => roundSize(state.selected, state.territorios, state.longitud),
    sinLimite: () => state.longitud === "sinLimite",
    tiempo: () => state.tiempo,
    seleccion: () => "geografia:" + selectionKey(state),
    claveRecord: () => recordKey(state)
  };
}
