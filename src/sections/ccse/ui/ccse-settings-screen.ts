/**
 * @fileoverview Examen de nacionalidad: pantalla de Opciones.
 */

import type { AppContext } from "../../../common/ui/common-context";
import { $, changeWith, radioGroup, toggleCard } from "../../../common/ui/common-dom";
import { questionCountWarning, renderQuestionCountGroup, renderTimeLimitGroup } from "../../../common/ui/common-widgets";
import { TAREAS, countAvailableQuestions, tareaQuestions, tareasWithQuestions } from "../engine/ccse-questions";
import { canChooseQuestionCount } from "../../../common/engine/common-round-settings";
import { canPlay } from "../engine/ccse-selection";
import { ccseSettings } from "../engine/ccse-settings";

/** Prepara las Opciones del examen (sus botones) y devuelve cómo dibujarlas. */
export function createCcseSettings(ctx: AppContext): { render: () => void } {
  const settings = ccseSettings(ctx.state);

  const change = changeWith(() => ctx.save(), () => render());

  function render() {
    // Tareas: se pueden marcar varias. Las que aún no tienen preguntas se ven, pero no se pueden marcar.
    const withQuestions = tareasWithQuestions();
    $("ccseTareas").replaceChildren(...TAREAS.map((t) => {
      const n = tareaQuestions([t.numero]).length;
      const on = settings.selectedTareas.includes(t.numero);
      const card = toggleCard("tarea-" + t.numero, on, `Tarea ${t.numero}`,
        [["cat-desc", t.nombre], ["cat-count", n ? `${n} preguntas` : "Próximamente"]],
        change("tarea-" + t.numero, () => {
          settings.selectedTareas = on ? settings.selectedTareas.filter((x) => x !== t.numero) : [...settings.selectedTareas, t.numero].sort((a, b) => a - b);
        }));
      card.disabled = !withQuestions.includes(t.numero);
      return card;
    }));
    const noTareas = !settings.selectedTareas.length;
    $("ccseNoneWarn").hidden = !noTareas;

    // Preguntas por partida: como en geografía, 25, 50 y 100 solo si hay al menos esas.
    const availableQuestionCount = countAvailableQuestions(settings.selectedTareas);
    renderQuestionCountGroup($("ccseQuestionCount"), {
      prefix: "ccse-question-count-", current: settings.selectedQuestionCount, availableQuestionCount, change,
      choose: (questionCount) => { settings.selectedQuestionCount = questionCount; }
    });
    const tooLong = !noTareas && !canChooseQuestionCount(settings.selectedQuestionCount, availableQuestionCount);
    $("ccseQuestionCountWarn").hidden = !tooLong;
    $("ccseQuestionCountWarn").textContent = tooLong ? questionCountWarning(availableQuestionCount) : "";

    renderTimeLimitGroup($("ccseTimeLimit"), { prefix: "ccse-time-", current: settings.selectedTimeLimit, choose: (t) => { settings.selectedTimeLimit = t; }, change: change });

    $<HTMLButtonElement>("ccseDone").disabled = !canPlay(settings);
  }

  for (const id of ["ccseQuestionCount", "ccseTimeLimit"]) radioGroup($(id));
  $("ccseDone").addEventListener("click", () => { if (canPlay(settings)) ctx.goHome(); });

  return { render };
}
