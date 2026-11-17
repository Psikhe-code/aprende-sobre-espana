/**
 * @fileoverview Geografía: lo que da a la partida común (ver common/ui/common-mode.ts).
 */

import type { SavedState } from "../../../common/engine/common-storage";
import type { PlayableQuestion } from "../../../common/engine/common-types";
import type { SectionMode } from "../../../common/ui/common-mode";
import { buildRound, buildReviewRound, reshuffleRound, countRoundQuestions } from "../engine/geografia-round-questions";
import { roundParams, recordKey, canPlay, selectionKey } from "../engine/geografia-selection";
import type { RoundQuestion } from "../engine/geografia-types";
import { geografiaSettings } from "../engine/geografia-settings";
import { banderaQuestionImage } from "./geografia-banderas";
import { geografiaRating } from "../engine/geografia-rating";
import { GEOGRAFIA_ID } from "../engine/geografia-id";

/** Si una pregunta es de geografía (RoundQuestion): solo esas tienen categoría. */
const isGeografiaQuestion = (q: PlayableQuestion): q is RoundQuestion => "category" in q;

/** Pone a cada pregunta su imagen (la bandera, en las de banderas), que es lo que dibuja la partida. */
const withImages = (questions: RoundQuestion[]): RoundQuestion[] =>
  questions.map((q) => {
    const image = banderaQuestionImage(q);
    return image ? { ...q, image } : q;
  });

export function geografiaMode(state: SavedState): SectionMode {
  const settings = geografiaSettings(state);
  return {
    canPlay: () => canPlay(settings),
    buildRound: () => withImages(buildRound(roundParams(settings))),
    reshuffleRound: (lastId) => withImages(reshuffleRound(roundParams(settings), lastId)),
    buildReviewRound: (misses) => withImages(buildReviewRound(misses.filter(isGeografiaQuestion), { optionCount: settings.optionCount })),
    roundQuestionCount: () => countRoundQuestions(settings.categories, settings.territorios, settings.questionCount),
    isUnlimited: () => settings.questionCount === "sinLimite",
    timeLimit: () => settings.timeLimit,
    selectionKey: () => GEOGRAFIA_ID + ":" + selectionKey(settings),
    recordKey: () => recordKey(settings),
    rating: geografiaRating
  };
}
