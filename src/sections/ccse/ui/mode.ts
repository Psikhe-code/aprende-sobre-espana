// Examen de nacionalidad: lo que da a la partida común (ver common/ui/mode.ts).

import type { SavedState } from "../../../common/engine/storage";
import type { SectionMode } from "../../../common/ui/mode";
import { reshuffleRound, buildRound, buildReviewRound, roundSize, type CcseRoundSettings } from "../engine/questions";
import { canPlay, recordKey, selectionKey } from "../engine/selection";
import { ccseSettings } from "../engine/settings";
import { ccseRating } from "../engine/rating";

export function ccseMode(state: SavedState): SectionMode {
  const c = ccseSettings(state);
  // Con su tipo escrito: así, si un campo cambia de nombre, TypeScript avisa aquí (sin él, un campo mal
  // escrito se ignoraba sin dar error, y la partida usaba el número de preguntas por defecto).
  const settings = (): CcseRoundSettings => ({ tareas: c.tareas, roundLength: c.roundLength });
  return {
    section: "ccse",
    canPlay: () => canPlay(c),
    buildRound: () => buildRound(settings()),
    reshuffleRound: (lastId) => reshuffleRound(settings(), lastId),
    buildReviewRound: (misses) => buildReviewRound(misses),
    roundSize: () => roundSize(c.tareas, c.roundLength),
    isUnlimited: () => c.roundLength === "sinLimite",
    timeLimit: () => c.timeLimit,
    selectionKey: () => "ccse:" + selectionKey(c),
    recordKey: () => recordKey(c),
    rating: ccseRating
  };
}
