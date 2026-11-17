/**
 * @fileoverview Examen de nacionalidad: pantalla de Opciones.
 */

import type { AppContext } from "../../../common/ui/common-context";
import { $, changeWith, radioGroup, toggleCard } from "../../../common/ui/common-dom";
import { questionCountWarning, renderQuestionCountGroup, renderTimeLimitGroup } from "../../../common/ui/common-widgets";
import { TAREAS, questionCountFits, tareaQuestions, tareasWithQuestions } from "../engine/ccse-questions";
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
      const on = settings.tareas.includes(t.numero);
      const card = toggleCard("tarea-" + t.numero, on, `Tarea ${t.numero}`,
        [["cat-desc", t.nombre], ["cat-count", n ? `${n} preguntas` : "Próximamente"]],
        change("tarea-" + t.numero, () => {
          settings.tareas = on ? settings.tareas.filter((x) => x !== t.numero) : [...settings.tareas, t.numero].sort((a, b) => a - b);
        }));
      card.disabled = !withQuestions.includes(t.numero);
      return card;
    }));
    const noTareas = !settings.tareas.length;
    $("ccseNoneWarn").hidden = !noTareas;

    // Preguntas por partida: como en geografía, 25, 50 y 100 solo si hay al menos esas.
    const available = tareaQuestions(settings.tareas).length;
    renderQuestionCountGroup($("ccseQuestionCount"), {
      prefix: "ccse-question-count-", current: settings.questionCount, available: available, change: change,
      fits: (n) => questionCountFits(n, settings.tareas),
      choose: (n) => { settings.questionCount = n; }
    });
    const tooLong = !noTareas && !questionCountFits(settings.questionCount, settings.tareas);
    $("ccseQuestionCountWarn").hidden = !tooLong;
    $("ccseQuestionCountWarn").textContent = tooLong ? questionCountWarning(available) : "";

    renderTimeLimitGroup($("ccseTimeLimit"), { prefix: "ccse-time-", current: settings.timeLimit, choose: (t) => { settings.timeLimit = t; }, change: change });

    $<HTMLButtonElement>("ccseDone").disabled = !canPlay(settings);
  }

  for (const id of ["ccseQuestionCount", "ccseTimeLimit"]) radioGroup($(id));
  $("ccseDone").addEventListener("click", () => { if (canPlay(settings)) ctx.goHome(); });

  return { render };
}
