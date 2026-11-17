/**
 * @fileoverview Geografía: pantalla de Opciones.
 */

import { CATEGORIES, CATEGORY_IDS } from "../engine/geografia-categories";
import { questionsIn, countAvailableQuestions, OPTION_COUNTS } from "../engine/geografia-round-questions";
import { canChooseQuestionCount } from "../../../common/engine/common-round-settings";
import { NAME_FORMS, TERRITORIOS } from "../engine/geografia-types";
import type { AppContext } from "../../../common/ui/common-context";
import { questionCountWarning, renderQuestionCountGroup, renderTimeLimitGroup } from "../../../common/ui/common-widgets";
import { $, changeWith, radioGroup, tabToChecked, toggleCard } from "../../../common/ui/common-dom";
import { OPTION_COUNT_DESCRIPTIONS, NAME_LABELS, TERRITORIO_LABELS } from "./geografia-labels";
import { canPlay } from "../engine/geografia-selection";
import { geografiaSettings } from "../engine/geografia-settings";

/** Prepara la pantalla de Opciones (sus botones) y devuelve cómo dibujarla. */
export function createGeografiaSettings(ctx: AppContext): { render: () => void } {
  const settings = geografiaSettings(ctx.state);

  const change = changeWith(() => ctx.save(), () => render());

  function render() {
    // Categorías
    $("cats").replaceChildren(...CATEGORIES.map((c) => {
      const on = settings.selectedCategories.includes(c.id);
      // Preguntas de cada territorio, y cuántas salen con los territorios marcados.
      const byTerritorio = TERRITORIOS.map((x) => {
        const n = questionsIn(c.id, [x]).length;
        return `${TERRITORIO_LABELS[x].name}: ${n || "próximamente"}`;
      }).join(" · ");
      const n = questionsIn(c.id, settings.selectedTerritorios).length;
      return toggleCard("cat-" + c.id, on, c.name,
        [["cat-desc", byTerritorio], ["cat-count", n ? `${n} preguntas con los territorios marcados` : "Sin preguntas con los territorios marcados"]],
        change("cat-" + c.id, () => {
          settings.selectedCategories = on ? settings.selectedCategories.filter((x) => x !== c.id) : [...settings.selectedCategories, c.id];
        }));
    }));
    const noCats = !settings.selectedCategories.length;
    $("noneWarn").hidden = !noCats;
    $("allCatsRow").hidden = settings.selectedCategories.length === CATEGORY_IDS.length;

    // Formas de los nombres (se puede marcar más de una)
    $("names").replaceChildren(...NAME_FORMS.map((s) => {
      const on = settings.selectedNameForms.includes(s);
      return toggleCard("names-" + s, on, NAME_LABELS[s].name, [["cat-desc", NAME_LABELS[s].example]], change("names-" + s, () => {
        settings.selectedNameForms = on ? settings.selectedNameForms.filter((x) => x !== s) : NAME_FORMS.filter((x) => x === s || settings.selectedNameForms.includes(x));
      }));
    }));
    const noNames = !settings.selectedNameForms.length;
    $("noNamesWarn").hidden = !noNames;

    // Territorios (se puede marcar más de uno)
    $("territorios").replaceChildren(...TERRITORIOS.map((x) => {
      const on = settings.selectedTerritorios.includes(x);
      return toggleCard("terr-" + x, on, TERRITORIO_LABELS[x].name, [["cat-desc", TERRITORIO_LABELS[x].example]], change("terr-" + x, () => {
        settings.selectedTerritorios = on ? settings.selectedTerritorios.filter((y) => y !== x) : TERRITORIOS.filter((y) => y === x || settings.selectedTerritorios.includes(y));
      }));
    }));

    // Dificultad: se marca una sola. La respuesta abierta aún no existe: se ve, pero no se puede marcar.
    const optionCountCards = OPTION_COUNTS.map((n) =>
      toggleCard("option-count-" + n, settings.selectedOptionCount === n, `${n} opciones`, [["cat-desc", OPTION_COUNT_DESCRIPTIONS[n]]],
        change("option-count-" + n, () => { settings.selectedOptionCount = n; }), true));
    const openAnswerCard = toggleCard("option-count-open", false, "Respuesta abierta", [["cat-desc", "Escribes la respuesta tú. Próximamente."]], () => {}, true);
    openAnswerCard.disabled = true;
    $("optionCount").replaceChildren(...optionCountCards, openAnswerCard);
    tabToChecked($("optionCount"));

    renderTimeLimitGroup($("timeLimit"), { prefix: "time-", current: settings.selectedTimeLimit, choose: (t) => { settings.selectedTimeLimit = t; }, change: change });

    const availableQuestionCount = countAvailableQuestions(settings.selectedCategories, settings.selectedTerritorios);
    renderQuestionCountGroup($("questionCount"), {
      prefix: "question-count-", current: settings.selectedQuestionCount, availableQuestionCount, change,
      choose: (questionCount) => { settings.selectedQuestionCount = questionCount; }
    });

    const noTerr = !settings.selectedTerritorios.length;
    $("noTerrWarn").hidden = !noTerr;
    // Categorías y territorios marcados, pero sin preguntas (p. ej. solo banderas y solo provincias).
    const empty = !noCats && !noTerr && availableQuestionCount === 0;
    $("emptyWarn").hidden = !empty;
    // El número de preguntas elegido ya no cabe (p. ej. 50 y se ha dejado solo Capitales).
    const tooLong = !noCats && !noTerr && !empty && !canChooseQuestionCount(settings.selectedQuestionCount, availableQuestionCount);
    $("questionCountWarn").hidden = !tooLong;
    $("questionCountWarn").textContent = tooLong ? questionCountWarning(availableQuestionCount) : "";

    $<HTMLButtonElement>("doneOptions").disabled = noCats || noNames || noTerr || empty || tooLong;
  }

  for (const id of ["optionCount", "timeLimit", "questionCount"]) radioGroup($(id));
  $("doneOptions").addEventListener("click", () => { if (canPlay(settings)) ctx.goHome(); });
  $("allCats").addEventListener("click", () => { settings.selectedCategories = [...CATEGORY_IDS]; ctx.save(); render(); });

  return { render };
}
