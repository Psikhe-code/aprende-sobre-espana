// Geografía: pantalla de Opciones.

import { CATEGORIES, CATEGORY_IDS } from "../engine/categories";
import { questionsIn, questionCount, lengthFits, OPTION_COUNTS } from "../engine/round-questions";
import { NAME_FORMS, TERRITORIOS } from "../engine/types";
import type { AppContext } from "../../../common/ui/context";
import { roundLengthWarning, renderRoundLengthGroup, renderTimeLimitGroup } from "../../../common/ui/widgets";
import { $, changeWith, radioGroup, tabToChecked, toggleCard } from "../../../common/ui/dom";
import { OPTION_COUNT_DESCRIPTIONS, NAME_LABELS, TERRITORIO_LABELS } from "./labels";
import { canPlay } from "../engine/selection";
import { geografiaSettings } from "../engine/settings";

/** Prepara la pantalla de Opciones (sus botones) y devuelve cómo dibujarla. */
export function createGeografiaSettings(ctx: AppContext): { render: () => void } {
  const g = geografiaSettings(ctx.state);

  const change = changeWith(() => ctx.save(), () => render());

  function render() {
    // Categorías
    $("cats").replaceChildren(...CATEGORIES.map((c) => {
      const on = g.categories.includes(c.id);
      // Preguntas de cada territorio, y cuántas salen con los territorios marcados.
      const byTerritorio = TERRITORIOS.map((x) => {
        const n = questionsIn(c.id, [x]).length;
        return `${TERRITORIO_LABELS[x].name}: ${n || "próximamente"}`;
      }).join(" · ");
      const n = questionsIn(c.id, g.territorios).length;
      return toggleCard("cat-" + c.id, on, c.name,
        [["cat-desc", byTerritorio], ["cat-count", n ? `${n} preguntas con los territorios marcados` : "Sin preguntas con los territorios marcados"]],
        change("cat-" + c.id, () => {
          g.categories = on ? g.categories.filter((x) => x !== c.id) : [...g.categories, c.id];
        }));
    }));
    const noCats = !g.categories.length;
    $("noneWarn").hidden = !noCats;
    $("allCatsRow").hidden = g.categories.length === CATEGORY_IDS.length;

    // Formas de los nombres (se puede marcar más de una)
    $("names").replaceChildren(...NAME_FORMS.map((s) => {
      const on = g.nameForms.includes(s);
      return toggleCard("names-" + s, on, NAME_LABELS[s].name, [["cat-desc", NAME_LABELS[s].example]], change("names-" + s, () => {
        g.nameForms = on ? g.nameForms.filter((x) => x !== s) : NAME_FORMS.filter((x) => x === s || g.nameForms.includes(x));
      }));
    }));
    const noNames = !g.nameForms.length;
    $("noNamesWarn").hidden = !noNames;

    // Territorios (se puede marcar más de uno)
    $("territorios").replaceChildren(...TERRITORIOS.map((x) => {
      const on = g.territorios.includes(x);
      return toggleCard("terr-" + x, on, TERRITORIO_LABELS[x].name, [["cat-desc", TERRITORIO_LABELS[x].example]], change("terr-" + x, () => {
        g.territorios = on ? g.territorios.filter((y) => y !== x) : TERRITORIOS.filter((y) => y === x || g.territorios.includes(y));
      }));
    }));

    // Dificultad: se marca una sola. La respuesta abierta aún no existe: se ve, pero no se puede marcar.
    const optionCountCards = OPTION_COUNTS.map((n) =>
      toggleCard("option-count-" + n, g.optionCount === n, `${n} opciones`, [["cat-desc", OPTION_COUNT_DESCRIPTIONS[n]]],
        change("option-count-" + n, () => { g.optionCount = n; }), true));
    const openAnswerCard = toggleCard("option-count-open", false, "Respuesta abierta", [["cat-desc", "Escribes la respuesta tú. Próximamente."]], () => {}, true);
    openAnswerCard.disabled = true;
    $("optionCount").replaceChildren(...optionCountCards, openAnswerCard);
    tabToChecked($("optionCount"));

    renderTimeLimitGroup($("timeLimit"), { prefix: "time-", current: g.timeLimit, choose: (t) => { g.timeLimit = t; }, change: change });

    const available = questionCount(g.categories, g.territorios);
    renderRoundLengthGroup($("roundLength"), {
      prefix: "len-", current: g.roundLength, available: available, change: change,
      fits: (n) => lengthFits(n, g.categories, g.territorios),
      choose: (n) => { g.roundLength = n; }
    });

    const noTerr = !g.territorios.length;
    $("noTerrWarn").hidden = !noTerr;
    // Categorías y territorios marcados, pero sin preguntas (p. ej. solo banderas y solo provincias).
    const empty = !noCats && !noTerr && available === 0;
    $("emptyWarn").hidden = !empty;
    // El número de preguntas elegido ya no cabe (p. ej. 50 y se ha dejado solo Capitales).
    const tooLong = !noCats && !noTerr && !empty && !lengthFits(g.roundLength, g.categories, g.territorios);
    $("lengthWarn").hidden = !tooLong;
    $("lengthWarn").textContent = tooLong ? roundLengthWarning(available) : "";

    $<HTMLButtonElement>("doneOptions").disabled = noCats || noNames || noTerr || empty || tooLong;
  }

  for (const id of ["optionCount", "timeLimit", "roundLength"]) radioGroup($(id));
  $("doneOptions").addEventListener("click", () => { if (canPlay(g)) ctx.goHome(); });
  $("allCats").addEventListener("click", () => { g.categories = [...CATEGORY_IDS]; ctx.save(); render(); });

  return { render };
}
