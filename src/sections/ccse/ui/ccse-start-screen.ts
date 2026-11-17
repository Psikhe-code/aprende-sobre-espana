/**
 * @fileoverview Examen de nacionalidad: pantalla de inicio.
 */

import type { SavedState } from "../../../common/engine/common-storage";
import { $, el } from "../../../common/ui/common-dom";
import { TIME_LIMIT_LABELS } from "../../../common/ui/common-labels";
import { renderRecord, roundText } from "../../../common/ui/common-widgets";
import { CCSE_QUESTIONS, TAREAS, tareaName, countRoundQuestions } from "../engine/ccse-questions";
import { renderSimulacroStart } from "./ccse-simulacro-screen";
import { ccseSettings } from "../engine/ccse-settings";
import { recordKey } from "../engine/ccse-selection";

export function renderCcseStart(state: SavedState): void {
  // Mientras la plantilla esté vacía, no hay nada que jugar ni que elegir: solo el aviso.
  const empty = !CCSE_QUESTIONS.length;
  $("ccseEmpty").hidden = !empty;
  $("ccseSummary").hidden = empty;
  $("ccseButtons").hidden = empty;
  $("ccseShortcuts").hidden = empty;
  renderSimulacroStart(state);
  if (empty) return;
  const settings = ccseSettings(state);
  const roundQuestionCount = countRoundQuestions(settings.tareas, settings.questionCount);
  $("ccseRoundLabel").textContent = roundText(settings.questionCount, roundQuestionCount);
  $("ccseChips").replaceChildren(...TAREAS.filter((t) => settings.tareas.includes(t.numero))
    .map((t) => el("span", "chip", tareaName(t))));
  $("ccseTimeLimitInfo").textContent = `Tiempo: ${TIME_LIMIT_LABELS[settings.timeLimit].info}.`;
  renderRecord($("ccseRecord"), state.records[recordKey(settings)], settings.questionCount, roundQuestionCount);
}
