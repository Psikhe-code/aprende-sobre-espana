// Pantallas del examen de nacionalidad (prueba CCSE): inicio y Opciones.
// La partida y el resultado son los mismos que en geografía (partida.ts, final.ts), con el modo del examen.

import { PREGUNTAS_CCSE, preguntasDe, tamanoCcse, cabeCcse, TAREAS, tareasConPreguntas, nombreTarea } from "../engine/ccse";
import { ccseKey, type SavedState } from "../engine/storage";
import type { Contexto } from "./contexto";
import { avisoLongitud, grupoLongitud, grupoTiempo, pintarRecord, textoRonda } from "./comun";
import { $, cambiarCon, el, radioGroup, toggleCard } from "./dom";
import { TIEMPO_LABELS } from "./labels";
import { puedeJugarCcse } from "../engine/seleccion";
import { renderInicioSimulacro } from "./simulacro";

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

/** Prepara las Opciones del examen (sus botones) y devuelve cómo dibujarlas. */
export function crearOpcionesCcse(ctx: Contexto): { render: () => void } {
  const ccse = ctx.state.ccse;

  const cambiar = cambiarCon(() => ctx.save(), () => render());

  function render() {
    // Tareas: se pueden marcar varias. Las que aún no tienen preguntas se ven, pero no se pueden marcar.
    const conPreguntas = tareasConPreguntas();
    $("ccseTareas").replaceChildren(...TAREAS.map((t) => {
      const n = preguntasDe([t.numero]).length;
      const on = ccse.tareas.includes(t.numero);
      const card = toggleCard("tarea-" + t.numero, on, `Tarea ${t.numero}`,
        [["cat-desc", t.nombre], ["cat-count", n ? `${n} preguntas` : "Próximamente"]],
        cambiar("tarea-" + t.numero, () => {
          ccse.tareas = on ? ccse.tareas.filter((x) => x !== t.numero) : [...ccse.tareas, t.numero].sort((a, b) => a - b);
        }));
      card.disabled = !conPreguntas.includes(t.numero);
      return card;
    }));
    const ninguna = !ccse.tareas.length;
    $("ccseNoneWarn").hidden = !ninguna;

    // Preguntas por partida: como en geografía, 25, 50 y 100 solo si hay al menos esas.
    const hay = preguntasDe(ccse.tareas).length;
    grupoLongitud($("ccseLongitud"), {
      prefijo: "ccse-len-", actual: ccse.longitud, hay, cambiar,
      cabe: (n) => cabeCcse(n, ccse.tareas),
      elegir: (n) => { ccse.longitud = n; }
    });
    const tooLong = !ninguna && !cabeCcse(ccse.longitud, ccse.tareas);
    $("ccseLengthWarn").hidden = !tooLong;
    $("ccseLengthWarn").textContent = tooLong ? avisoLongitud(hay) : "";

    grupoTiempo($("ccseTiempo"), { prefijo: "ccse-tiempo-", actual: ccse.tiempo, elegir: (t) => { ccse.tiempo = t; }, cambiar });

    $<HTMLButtonElement>("ccseDone").disabled = !puedeJugarCcse(ctx.state);
  }

  for (const id of ["ccseLongitud", "ccseTiempo"]) radioGroup($(id));
  $("ccseDone").addEventListener("click", () => { if (puedeJugarCcse(ctx.state)) ctx.goHome(); });

  return { render };
}
