/**
 * @fileoverview Examen de nacionalidad: lo que da a la partida común (ver common/ui/common-mode.ts).
 */

import type { SavedState } from "../../../common/engine/common-storage";
import type { SectionMode } from "../../../common/ui/common-mode";
import { reshuffleRound, buildRound, buildReviewRound, roundSize, type CcseRoundSettings } from "../engine/ccse-questions";
import { canPlay, recordKey, selectionKey } from "../engine/ccse-selection";
import { ccseSettings } from "../engine/ccse-settings";
import { ccseRating } from "../engine/ccse-rating";
import { CCSE_ID } from "../engine/ccse-id";

export function ccseMode(state: SavedState): SectionMode {
  const c = ccseSettings(state);
  // Con su tipo escrito: así, si un campo cambia de nombre, TypeScript avisa aquí (sin él, un campo mal
  // escrito se ignoraba sin dar error, y la partida usaba el número de preguntas por defecto).
  const settings = (): CcseRoundSettings => ({ tareas: c.tareas, roundLength: c.roundLength });
  return {
    canPlay: () => canPlay(c),
    buildRound: () => buildRound(settings()),
    reshuffleRound: (lastId) => reshuffleRound(settings(), lastId),
    buildReviewRound: (misses) => buildReviewRound(misses),
    roundSize: () => roundSize(c.tareas, c.roundLength),
    isUnlimited: () => c.roundLength === "sinLimite",
    timeLimit: () => c.timeLimit,
    selectionKey: () => CCSE_ID + ":" + selectionKey(c),
    recordKey: () => recordKey(c),
    rating: ccseRating
  };
}
