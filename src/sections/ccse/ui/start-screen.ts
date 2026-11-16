// Examen de nacionalidad: pantalla de inicio.

import { ccseRecordKey, type SavedState } from "../../../common/engine/storage";
import { $, el } from "../../../common/ui/dom";
import { TIME_LIMIT_LABELS } from "../../../common/ui/labels";
import { renderRecord, roundText } from "../../../common/ui/widgets";
import { CCSE_QUESTIONS, TAREAS, tareaName, roundSize } from "../engine/questions";
import { renderSimulacroStart } from "./simulacro-screen";

export function renderCcseStart(state: SavedState): void {
  // Mientras la plantilla esté vacía, no hay nada que jugar ni que elegir: solo el aviso.
  const empty = !CCSE_QUESTIONS.length;
  $("ccseEmpty").hidden = !empty;
  $("ccseSummary").hidden = empty;
  $("ccseButtons").hidden = empty;
  $("ccseShortcuts").hidden = empty;
  renderSimulacroStart(state);
  if (empty) return;
  const { tareas, longitud, tiempo } = state.ccse;
  $("ccseRoundLabel").textContent = roundText(longitud, roundSize(tareas, longitud));
  $("ccseChips").replaceChildren(...TAREAS.filter((t) => tareas.includes(t.numero))
    .map((t) => el("span", "chip", tareaName(t))));
  $("ccseTimeLimitInfo").textContent = `Tiempo: ${TIME_LIMIT_LABELS[tiempo].info}.`;
  renderRecord($("ccseRecord"), state.best[ccseRecordKey(tareas, longitud, tiempo)], longitud, roundSize(tareas, longitud));
}
