/**
 * @fileoverview Geografía: pantalla de inicio.
 */

import { CATEGORIES, CATEGORY_IDS } from "../engine/geografia-categories";
import { countRoundQuestions } from "../engine/geografia-round-questions";
import type { SavedState } from "../../../common/engine/common-storage";
import { NAME_FORMS, TERRITORIOS } from "../engine/geografia-types";
import { renderRecord, roundText } from "../../../common/ui/common-widgets";
import { $, el } from "../../../common/ui/common-dom";
import { TIME_LIMIT_LABELS } from "../../../common/ui/common-labels";
import { NAME_LABELS, TERRITORIO_LABELS } from "./geografia-labels";
import { recordKey } from "../engine/geografia-selection";
import { geografiaSettings } from "../engine/geografia-settings";

export function renderGeografiaStart(state: SavedState): void {
  const settings = geografiaSettings(state);
  const chips = $("chips");
  chips.replaceChildren();
  if (settings.categories.length === CATEGORY_IDS.length) {
    chips.append(el("span", "chip", "Todas las categorías"));
  } else {
    CATEGORIES.filter((c) => settings.categories.includes(c.id)).forEach((c) => chips.append(el("span", "chip", c.name)));
  }
  const names = NAME_FORMS.filter((s) => settings.nameForms.includes(s));
  $("namesInfo").textContent = names.length > 1
    ? `Nombres: ${names.map((s) => NAME_LABELS[s].short).join(" y ")}, al azar en cada pregunta.`
    : `Nombres: solo ${NAME_LABELS[names[0]].short}.`;
  const territorios = TERRITORIOS.filter((x) => settings.territorios.includes(x));
  $("territoriosInfo").textContent = `Territorio: ${territorios.map((x) => TERRITORIO_LABELS[x].short).join(" y ")}.`;
  $("optionCountInfo").textContent = `Dificultad: ${settings.optionCount} opciones por pregunta, ${TIME_LIMIT_LABELS[settings.timeLimit].info}.`;
  const roundQuestionCount = countRoundQuestions(settings.categories, settings.territorios, settings.questionCount);
  $("roundLabel").textContent = roundText(settings.questionCount, roundQuestionCount);
  renderRecord($("record"), state.records[recordKey(settings)], settings.questionCount, roundQuestionCount);
}
