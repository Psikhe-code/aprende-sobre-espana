// Geografía: lo que da a la partida común (ver common/ui/mode.ts).

import type { SavedState } from "../../../common/engine/storage";
import type { PlayableQuestion } from "../../../common/engine/types";
import type { SectionMode } from "../../../common/ui/mode";
import { buildRound, buildReviewRound, reshuffleRound, roundSize } from "../engine/round-questions";
import { roundSettings, recordKey, canPlay, selectionKey } from "../engine/selection";
import type { RoundQuestion } from "../engine/types";
import { banderaQuestionImage } from "./banderas";

/** Si una pregunta es de geografía (RoundQuestion): solo esas tienen categoría. */
const isGeografiaQuestion = (q: PlayableQuestion): q is RoundQuestion => "category" in q;

/** Pone a cada pregunta su imagen (la bandera, en las de banderas), que es lo que dibuja la partida. */
const withImages = (questions: RoundQuestion[]): RoundQuestion[] =>
  questions.map((q) => {
    const image = banderaQuestionImage(q);
    return image ? { ...q, image } : q;
  });

export function geografiaMode(state: SavedState): SectionMode {
  return {
    section: "geografia",
    canPlay: () => canPlay(state),
    buildRound: () => withImages(buildRound(roundSettings(state))),
    reshuffleRound: (lastId) => withImages(reshuffleRound(roundSettings(state), lastId)),
    buildReviewRound: (misses) => withImages(buildReviewRound(misses.filter(isGeografiaQuestion), { optionCount: state.opciones })),
    roundSize: () => roundSize(state.selected, state.territorios, state.longitud),
    isUnlimited: () => state.longitud === "sinLimite",
    timeLimit: () => state.tiempo,
    selectionKey: () => "geografia:" + selectionKey(state),
    recordKey: () => recordKey(state)
  };
}
