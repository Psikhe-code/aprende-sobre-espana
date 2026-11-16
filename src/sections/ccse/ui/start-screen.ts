// Examen de nacionalidad: pantalla de inicio.

import { ccseRecordKey, type SavedState } from "../../../common/engine/storage";
import { $, el } from "../../../common/ui/dom";
import { TIEMPO_LABELS } from "../../../common/ui/labels";
import { pintarRecord, textoRonda } from "../../../common/ui/widgets";
import { CCSE_QUESTIONS, TAREAS, tareaName, roundSize } from "../engine/questions";
import { renderInicioSimulacro } from "./simulacro-screen";

export function renderStartCcse(state: SavedState): void {
  // Mientras la plantilla esté vacía, no hay nada que jugar ni que elegir: solo el aviso.
  const vacio = !CCSE_QUESTIONS.length;
  $("ccseVacio").hidden = !vacio;
  $("ccseSummary").hidden = vacio;
  $("ccseBotones").hidden = vacio;
  $("ccseAtajos").hidden = vacio;
  renderInicioSimulacro(state);
  if (vacio) return;
  const { tareas, longitud, tiempo } = state.ccse;
  $("ccseRoundLabel").textContent = textoRonda(longitud, roundSize(tareas, longitud));
  $("ccseChips").replaceChildren(...TAREAS.filter((t) => tareas.includes(t.numero))
    .map((t) => el("span", "chip", tareaName(t))));
  $("ccseTiempoInfo").textContent = `Tiempo: ${TIEMPO_LABELS[tiempo].info}.`;
  pintarRecord($("ccseRecord"), state.best[ccseRecordKey(tareas, longitud, tiempo)], longitud, roundSize(tareas, longitud));
}
