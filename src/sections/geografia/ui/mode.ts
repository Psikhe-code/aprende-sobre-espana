// Geografía: lo que da a la partida común (ver common/ui/mode.ts).

import type { SavedState } from "../../../common/engine/storage";
import type { PlayableQuestion } from "../../../common/engine/types";
import type { SectionMode } from "../../../common/ui/mode";
import { buildRound, buildReviewRound, reshuffleRound, roundSize } from "../engine/round-questions";
import { roundSettings, recordKey, canPlay, selectionKey } from "../engine/selection";
import type { RoundQuestion } from "../engine/types";
import { geografiaSettings } from "../engine/settings";
import { banderaQuestionImage } from "./banderas";
import { geografiaRating } from "../engine/rating";

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
