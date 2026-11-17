/**
 * @fileoverview Geografía: pantalla de Opciones.
 */

import { CATEGORIES, CATEGORY_IDS } from "../engine/geografia-categories";
import { questionsIn, availableQuestionCount, questionCountFits, OPTION_COUNTS } from "../engine/geografia-round-questions";
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
      const on = settings.categories.includes(c.id);
      // Preguntas de cada territorio, y cuántas salen con los territorios marcados.
      const byTerritorio = TERRITORIOS.map((x) => {
        const n = questionsIn(c.id, [x]).length;
        return `${TERRITORIO_LABELS[x].name}: ${n || "próximamente"}`;
      }).join(" · ");
      const n = questionsIn(c.id, settings.territorios).length;
      return toggleCard("cat-" + c.id, on, c.name,
        [["cat-desc", byTerritorio], ["cat-count", n ? `${n} preguntas con los territorios marcados` : "Sin preguntas con los territorios marcados"]],
        change("cat-" + c.id, () => {
          settings.categories = on ? settings.categories.filter((x) => x !== c.id) : [...settings.categories, c.id];
        }));
    }));
    const noCats = !settings.categories.length;
    $("noneWarn").hidden = !noCats;
    $("allCatsRow").hidden = settings.categories.length === CATEGORY_IDS.length;

    // Formas de los nombres (se puede marcar más de una)
    $("names").replaceChildren(...NAME_FORMS.map((s) => {
      const on = settings.nameForms.includes(s);
      return toggleCard("names-" + s, on, NAME_LABELS[s].name, [["cat-desc", NAME_LABELS[s].example]], change("names-" + s, () => {
        settings.nameForms = on ? settings.nameForms.filter((x) => x !== s) : NAME_FORMS.filter((x) => x === s || settings.nameForms.includes(x));
      }));
    }));
    const noNames = !settings.nameForms.length;
    $("noNamesWarn").hidden = !noNames;

    // Territorios (se puede marcar más de uno)
    $("territorios").replaceChildren(...TERRITORIOS.map((x) => {
      const on = settings.territorios.includes(x);
      return toggleCard("terr-" + x, on, TERRITORIO_LABELS[x].name, [["cat-desc", TERRITORIO_LABELS[x].example]], change("terr-" + x, () => {
        settings.territorios = on ? settings.territorios.filter((y) => y !== x) : TERRITORIOS.filter((y) => y === x || settings.territorios.includes(y));
      }));
    }));

    // Dificultad: se marca una sola. La respuesta abierta aún no existe: se ve, pero no se puede marcar.
    const optionCountCards = OPTION_COUNTS.map((n) =>
      toggleCard("option-count-" + n, settings.optionCount === n, `${n} opciones`, [["cat-desc", OPTION_COUNT_DESCRIPTIONS[n]]],
        change("option-count-" + n, () => { settings.optionCount = n; }), true));
    const openAnswerCard = toggleCard("option-count-open", false, "Respuesta abierta", [["cat-desc", "Escribes la respuesta tú. Próximamente."]], () => {}, true);
    openAnswerCard.disabled = true;
    $("optionCount").replaceChildren(...optionCountCards, openAnswerCard);
    tabToChecked($("optionCount"));

    renderTimeLimitGroup($("timeLimit"), { prefix: "time-", current: settings.timeLimit, choose: (t) => { settings.timeLimit = t; }, change: change });

    const available = availableQuestionCount(settings.categories, settings.territorios);
    renderQuestionCountGroup($("questionCount"), {
      prefix: "question-count-", current: settings.questionCount, available: available, change: change,
      fits: (n) => questionCountFits(n, settings.categories, settings.territorios),
      choose: (n) => { settings.questionCount = n; }
    });

    const noTerr = !settings.territorios.length;
    $("noTerrWarn").hidden = !noTerr;
    // Categorías y territorios marcados, pero sin preguntas (p. ej. solo banderas y solo provincias).
    const empty = !noCats && !noTerr && available === 0;
    $("emptyWarn").hidden = !empty;
    // El número de preguntas elegido ya no cabe (p. ej. 50 y se ha dejado solo Capitales).
    const tooLong = !noCats && !noTerr && !empty && !questionCountFits(settings.questionCount, settings.categories, settings.territorios);
    $("questionCountWarn").hidden = !tooLong;
    $("questionCountWarn").textContent = tooLong ? questionCountWarning(available) : "";

    $<HTMLButtonElement>("doneOptions").disabled = noCats || noNames || noTerr || empty || tooLong;
  }

  for (const id of ["optionCount", "timeLimit", "questionCount"]) radioGroup($(id));
  $("doneOptions").addEventListener("click", () => { if (canPlay(settings)) ctx.goHome(); });
  $("allCats").addEventListener("click", () => { settings.categories = [...CATEGORY_IDS]; ctx.save(); render(); });

  return { render };
}
