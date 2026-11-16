// Geografía: lo que da a la partida común (ver common/ui/common-mode.ts).

import type { SavedState } from "../../../common/engine/common-storage";
import type { PlayableQuestion } from "../../../common/engine/common-types";
import type { SectionMode } from "../../../common/ui/common-mode";
import { buildRound, buildReviewRound, reshuffleRound, roundSize } from "../engine/geografia-round-questions";
import { roundSettings, recordKey, canPlay, selectionKey } from "../engine/geografia-selection";
import type { RoundQuestion } from "../engine/geografia-types";
import { geografiaSettings } from "../engine/geografia-settings";
import { banderaQuestionImage } from "./geografia-banderas";
import { geografiaRating } from "../engine/geografia-rating";

/** Si una pregunta es de geografía (RoundQuestion): solo esas tienen categoría. */
const isGeografiaQuestion = (q: PlayableQuestion): q is RoundQuestion => "category" in q;

/** Pone a cada pregunta su imagen (la bandera, en las de banderas), que es lo que dibuja la partida. */
const withImages = (questions: RoundQuestion[]): RoundQuestion[] =>
  questions.map((q) => {
    const image = banderaQuestionImage(q);
    return image ? { ...q, image } : q;
  });

export function geografiaMode(state: SavedState): SectionMode {
  const g = geografiaSettings(state);
  return {
    section: "geografia",
    canPlay: () => canPlay(g),
    buildRound: () => withImages(buildRound(roundSettings(g))),
    reshuffleRound: (lastId) => withImages(reshuffleRound(roundSettings(g), lastId)),
    buildReviewRound: (misses) => withImages(buildReviewRound(misses.filter(isGeografiaQuestion), { optionCount: g.optionCount })),
    roundSize: () => roundSize(g.categories, g.territorios, g.roundLength),
    isUnlimited: () => g.roundLength === "sinLimite",
    timeLimit: () => g.timeLimit,
    selectionKey: () => "geografia:" + selectionKey(g),
    recordKey: () => recordKey(g),
    rating: geografiaRating
  };
}
