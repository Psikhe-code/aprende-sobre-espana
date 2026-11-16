// Geografía: pantalla de inicio.

import { CATEGORIES, CATEGORY_IDS } from "../engine/categories";
import { roundSize } from "../engine/round-questions";
import type { SavedState } from "../../../common/engine/storage";
import { NAME_FORMS, TERRITORIOS } from "../engine/types";
import { pintarRecord, textoRonda } from "../../../common/ui/widgets";
import { $, el } from "../../../common/ui/dom";
import { TIEMPO_LABELS } from "../../../common/ui/labels";
import { NAME_LABELS, TERRITORIO_LABELS } from "./labels";
import { recordKey } from "../engine/selection";

export function renderStart(state: SavedState): void {
  const chips = $("chips");
  chips.replaceChildren();
  if (state.selected.length === CATEGORY_IDS.length) {
    chips.append(el("span", "chip", "Todas las categorías"));
  } else {
    CATEGORIES.filter((c) => state.selected.includes(c.id)).forEach((c) => chips.append(el("span", "chip", c.name)));
  }
  const names = NAME_FORMS.filter((s) => state.names.includes(s));
  $("namesInfo").textContent = names.length > 1
    ? `Nombres: ${names.map((s) => NAME_LABELS[s].short).join(" y ")}, al azar en cada pregunta.`
    : `Nombres: solo ${NAME_LABELS[names[0]].short}.`;
  const territorios = TERRITORIOS.filter((x) => state.territorios.includes(x));
  $("territoriosInfo").textContent = `Territorio: ${territorios.map((x) => TERRITORIO_LABELS[x].short).join(" y ")}.`;
  $("dificultadInfo").textContent = `Dificultad: ${state.opciones} opciones por pregunta, ${TIEMPO_LABELS[state.tiempo].info}.`;
  const tamano = roundSize(state.selected, state.territorios, state.longitud);
  $("roundLabel").textContent = textoRonda(state.longitud, tamano);
  pintarRecord($("record"), state.best[recordKey(state)], state.longitud, tamano);
}
