/**
 * @fileoverview Examen de nacionalidad: lo que da a la partida común (ver common/ui/common-mode.ts).
 */

import type { SavedState } from "../../../common/engine/common-storage";
import type { SectionMode } from "../../../common/ui/common-mode";
import { reshuffleRound, buildRound, buildReviewRound, type CcseRoundParams } from "../engine/ccse-questions";
import { canPlay, recordKey, selectionKey } from "../engine/ccse-selection";
import { ccseSettings } from "../engine/ccse-settings";
import { ccseRating } from "../engine/ccse-rating";
import { CCSE_ID } from "../engine/ccse-id";

export function ccseMode(state: SavedState): SectionMode {
  const settings = ccseSettings(state);
  // Con su tipo escrito: así, si un campo cambia de nombre, TypeScript avisa aquí (sin él, un campo mal
  // escrito se ignoraba sin dar error, y la partida usaba el número de preguntas por defecto).
  const params = (): CcseRoundParams => ({ tareas: settings.selectedTareas, questionCount: settings.selectedQuestionCount });
  return {
    canPlay: () => canPlay(settings),
    buildRound: () => buildRound(params()),
    reshuffleRound: (lastId) => reshuffleRound(params(), lastId),
    buildReviewRound: (misses) => buildReviewRound(misses),
    isUnlimited: () => settings.selectedQuestionCount === "sinLimite",
    timeLimit: () => settings.selectedTimeLimit,
    selectionKey: () => CCSE_ID + ":" + selectionKey(settings),
    recordKey: () => recordKey(settings),
    rating: ccseRating
  };
}
