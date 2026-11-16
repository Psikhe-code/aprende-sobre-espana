// Examen de nacionalidad: pantalla de Opciones.

import type { Contexto } from "../../../common/ui/context";
import { $, cambiarCon, radioGroup, toggleCard } from "../../../common/ui/dom";
import { avisoLongitud, grupoLongitud, grupoTiempo } from "../../../common/ui/widgets";
import { TAREAS, lengthFits, tareaQuestions, tareasWithQuestions } from "../engine/questions";
import { canPlay } from "../engine/selection";

/** Prepara las Opciones del examen (sus botones) y devuelve cómo dibujarlas. */
export function crearOpcionesCcse(ctx: Contexto): { render: () => void } {
  const ccse = ctx.state.ccse;

  const cambiar = cambiarCon(() => ctx.save(), () => render());

  function render() {
    // Tareas: se pueden marcar varias. Las que aún no tienen preguntas se ven, pero no se pueden marcar.
    const conPreguntas = tareasWithQuestions();
    $("ccseTareas").replaceChildren(...TAREAS.map((t) => {
      const n = tareaQuestions([t.numero]).length;
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
    const hay = tareaQuestions(ccse.tareas).length;
    grupoLongitud($("ccseLongitud"), {
      prefijo: "ccse-len-", actual: ccse.longitud, hay, cambiar,
      cabe: (n) => lengthFits(n, ccse.tareas),
      elegir: (n) => { ccse.longitud = n; }
    });
    const tooLong = !ninguna && !lengthFits(ccse.longitud, ccse.tareas);
    $("ccseLengthWarn").hidden = !tooLong;
    $("ccseLengthWarn").textContent = tooLong ? avisoLongitud(hay) : "";

    grupoTiempo($("ccseTiempo"), { prefijo: "ccse-tiempo-", actual: ccse.tiempo, elegir: (t) => { ccse.tiempo = t; }, cambiar });

    $<HTMLButtonElement>("ccseDone").disabled = !canPlay(ctx.state);
  }

  for (const id of ["ccseLongitud", "ccseTiempo"]) radioGroup($(id));
  $("ccseDone").addEventListener("click", () => { if (canPlay(ctx.state)) ctx.goHome(); });

  return { render };
}
