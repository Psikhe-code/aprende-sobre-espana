// Geografía: pantalla de inicio.

import { CATEGORIES, CATEGORY_IDS } from "../engine/categories";
import { roundSize } from "../engine/round-questions";
import type { SavedState } from "../../../common/engine/storage";
import { NAME_FORMS, TERRITORIOS } from "../engine/types";
import { renderRecord, roundText } from "../../../common/ui/widgets";
import { $, el } from "../../../common/ui/dom";
import { TIME_LIMIT_LABELS } from "../../../common/ui/labels";
import { NAME_LABELS, TERRITORIO_LABELS } from "./labels";
import { recordKey } from "../engine/selection";
import { geografiaSettings } from "../engine/settings";

export function renderGeografiaStart(state: SavedState): void {
  const g = geografiaSettings(state);
  const chips = $("chips");
  chips.replaceChildren();
  if (g.categories.length === CATEGORY_IDS.length) {
    chips.append(el("span", "chip", "Todas las categorías"));
  } else {
    CATEGORIES.filter((c) => g.categories.includes(c.id)).forEach((c) => chips.append(el("span", "chip", c.name)));
  }
  const names = NAME_FORMS.filter((s) => g.nameForms.includes(s));
  $("namesInfo").textContent = names.length > 1
    ? `Nombres: ${names.map((s) => NAME_LABELS[s].short).join(" y ")}, al azar en cada pregunta.`
    : `Nombres: solo ${NAME_LABELS[names[0]].short}.`;
  const territorios = TERRITORIOS.filter((x) => g.territorios.includes(x));
  $("territoriosInfo").textContent = `Territorio: ${territorios.map((x) => TERRITORIO_LABELS[x].short).join(" y ")}.`;
  $("optionCountInfo").textContent = `Dificultad: ${g.optionCount} opciones por pregunta, ${TIME_LIMIT_LABELS[g.timeLimit].info}.`;
  const size = roundSize(g.categories, g.territorios, g.roundLength);
  $("roundLabel").textContent = roundText(g.roundLength, size);
  renderRecord($("record"), state.records[recordKey(g)], g.roundLength, size);
}
