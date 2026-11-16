// Examen de nacionalidad: pantalla de inicio.

import { ccseKey, type SavedState } from "../../../common/engine/storage";
import { $, el } from "../../../common/ui/dom";
import { TIEMPO_LABELS } from "../../../common/ui/labels";
import { pintarRecord, textoRonda } from "../../../common/ui/widgets";
import { PREGUNTAS_CCSE, TAREAS, nombreTarea, tamanoCcse } from "../engine/questions";
import { renderInicioSimulacro } from "./simulacro-screen";

export function renderStartCcse(state: SavedState): void {
  // Mientras la plantilla esté vacía, no hay nada que jugar ni que elegir: solo el aviso.
  const vacio = !PREGUNTAS_CCSE.length;
  $("ccseVacio").hidden = !vacio;
  $("ccseSummary").hidden = vacio;
  $("ccseBotones").hidden = vacio;
  $("ccseAtajos").hidden = vacio;
  renderInicioSimulacro(state);
  if (vacio) return;
  const { tareas, longitud, tiempo } = state.ccse;
  $("ccseRoundLabel").textContent = textoRonda(longitud, tamanoCcse(tareas, longitud));
  $("ccseChips").replaceChildren(...TAREAS.filter((t) => tareas.includes(t.numero))
    .map((t) => el("span", "chip", nombreTarea(t))));
  $("ccseTiempoInfo").textContent = `Tiempo: ${TIEMPO_LABELS[tiempo].info}.`;
  pintarRecord($("ccseRecord"), state.best[ccseKey(tareas, longitud, tiempo)], longitud, tamanoCcse(tareas, longitud));
}
