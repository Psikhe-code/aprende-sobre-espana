// Examen de nacionalidad: pantalla de inicio.

import type { SavedState } from "../../../common/engine/storage";
import { $, el } from "../../../common/ui/dom";
import { TIME_LIMIT_LABELS } from "../../../common/ui/labels";
import { renderRecord, roundText } from "../../../common/ui/widgets";
import { CCSE_QUESTIONS, TAREAS, tareaName, roundSize } from "../engine/questions";
import { renderSimulacroStart } from "./simulacro-screen";
import { ccseSettings } from "../engine/settings";
import { recordKey } from "../engine/selection";

export function renderCcseStart(state: SavedState): void {
  // Mientras la plantilla esté vacía, no hay nada que jugar ni que elegir: solo el aviso.
  const empty = !CCSE_QUESTIONS.length;
  $("ccseEmpty").hidden = !empty;
  $("ccseSummary").hidden = empty;
  $("ccseButtons").hidden = empty;
  $("ccseShortcuts").hidden = empty;
  renderSimulacroStart(state);
  if (empty) return;
  const c = ccseSettings(state);
  const { tareas, roundLength, timeLimit } = c;
  $("ccseRoundLabel").textContent = roundText(roundLength, roundSize(tareas, roundLength));
  $("ccseChips").replaceChildren(...TAREAS.filter((t) => tareas.includes(t.numero))
    .map((t) => el("span", "chip", tareaName(t))));
  $("ccseTimeLimitInfo").textContent = `Tiempo: ${TIME_LIMIT_LABELS[timeLimit].info}.`;
  renderRecord($("ccseRecord"), state.records[recordKey(c)], roundLength, roundSize(tareas, roundLength));
}
