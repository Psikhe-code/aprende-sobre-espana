// Examen de nacionalidad: pantalla de Opciones.

import type { AppContext } from "../../../common/ui/common-context";
import { $, changeWith, radioGroup, toggleCard } from "../../../common/ui/common-dom";
import { roundLengthWarning, renderRoundLengthGroup, renderTimeLimitGroup } from "../../../common/ui/common-widgets";
import { TAREAS, lengthFits, tareaQuestions, tareasWithQuestions } from "../engine/ccse-questions";
import { canPlay } from "../engine/ccse-selection";
import { ccseSettings } from "../engine/ccse-settings";

/** Prepara las Opciones del examen (sus botones) y devuelve cómo dibujarlas. */
export function createCcseSettings(ctx: AppContext): { render: () => void } {
  const ccse = ccseSettings(ctx.state);

  const change = changeWith(() => ctx.save(), () => render());

  function render() {
    // Tareas: se pueden marcar varias. Las que aún no tienen preguntas se ven, pero no se pueden marcar.
    const withQuestions = tareasWithQuestions();
    $("ccseTareas").replaceChildren(...TAREAS.map((t) => {
      const n = tareaQuestions([t.numero]).length;
      const on = ccse.tareas.includes(t.numero);
      const card = toggleCard("tarea-" + t.numero, on, `Tarea ${t.numero}`,
        [["cat-desc", t.nombre], ["cat-count", n ? `${n} preguntas` : "Próximamente"]],
        change("tarea-" + t.numero, () => {
          ccse.tareas = on ? ccse.tareas.filter((x) => x !== t.numero) : [...ccse.tareas, t.numero].sort((a, b) => a - b);
        }));
      card.disabled = !withQuestions.includes(t.numero);
      return card;
    }));
    const noTareas = !ccse.tareas.length;
    $("ccseNoneWarn").hidden = !noTareas;

    // Preguntas por partida: como en geografía, 25, 50 y 100 solo si hay al menos esas.
    const available = tareaQuestions(ccse.tareas).length;
    renderRoundLengthGroup($("ccseRoundLength"), {
      prefix: "ccse-len-", current: ccse.roundLength, available: available, change: change,
      fits: (n) => lengthFits(n, ccse.tareas),
      choose: (n) => { ccse.roundLength = n; }
    });
    const tooLong = !noTareas && !lengthFits(ccse.roundLength, ccse.tareas);
    $("ccseLengthWarn").hidden = !tooLong;
    $("ccseLengthWarn").textContent = tooLong ? roundLengthWarning(available) : "";

    renderTimeLimitGroup($("ccseTimeLimit"), { prefix: "ccse-time-", current: ccse.timeLimit, choose: (t) => { ccse.timeLimit = t; }, change: change });

    $<HTMLButtonElement>("ccseDone").disabled = !canPlay(ccse);
  }

  for (const id of ["ccseRoundLength", "ccseTimeLimit"]) radioGroup($(id));
  $("ccseDone").addEventListener("click", () => { if (canPlay(ccse)) ctx.goHome(); });

  return { render };
}
