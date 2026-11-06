// Pantalla de Opciones: categorías, territorio, preguntas por partida, dificultad, tiempo y nombres.

import { CATEGORIES, CATEGORY_IDS } from "../engine/categories";
import { questionsIn, questionCount, lengthFits, OPTION_COUNTS, ROUND_LENGTHS, TIME_LIMITS } from "../engine/round";
import { NAME_STYLES, TERRITORIOS } from "../engine/types";
import type { Contexto } from "./contexto";
import { $, radioGroup, tabuladorEnLaMarcada, toggleCard } from "./dom";
import { DIFICULTAD_DESC, LONGITUD_LABELS, NAME_LABELS, TERRITORIO_LABELS, TIEMPO_LABELS } from "./labels";
import { puedeJugar } from "./seleccion";

/** Prepara la pantalla de Opciones (sus botones) y devuelve cómo dibujarla. */
export function crearOpciones(ctx: Contexto): { render: () => void } {
  const { state } = ctx;

  /** Cambia una opción, la guarda, dibuja de nuevo la pantalla y deja el foco en la tarjeta tocada. */
  const cambiar = (idTarjeta: string, cambio: () => void) => () => {
    cambio();
    ctx.save();
    render();
    $(idTarjeta).focus();
  };

  function render() {
    // Categorías
    $("cats").replaceChildren(...CATEGORIES.map((c) => {
      const on = state.selected.includes(c.id);
      // Preguntas de cada territorio, y cuántas salen con los territorios marcados.
      const porTerritorio = TERRITORIOS.map((x) => {
        const n = questionsIn(c.id, [x]).length;
        return `${TERRITORIO_LABELS[x].name}: ${n || "próximamente"}`;
      }).join(" · ");
      const n = questionsIn(c.id, state.territorios).length;
      return toggleCard("cat-" + c.id, on, c.name,
        [["cat-desc", porTerritorio], ["cat-count", n ? `${n} preguntas con los territorios marcados` : "Sin preguntas con los territorios marcados"]],
        cambiar("cat-" + c.id, () => {
          state.selected = on ? state.selected.filter((x) => x !== c.id) : [...state.selected, c.id];
        }));
    }));
    const noCats = !state.selected.length;
    $("noneWarn").hidden = !noCats;
    $("allCatsRow").hidden = state.selected.length === CATEGORY_IDS.length;

    // Formas de los nombres (se puede marcar más de una)
    $("names").replaceChildren(...NAME_STYLES.map((s) => {
      const on = state.names.includes(s);
      return toggleCard("names-" + s, on, NAME_LABELS[s].name, [["cat-desc", NAME_LABELS[s].example]], cambiar("names-" + s, () => {
        state.names = on ? state.names.filter((x) => x !== s) : NAME_STYLES.filter((x) => x === s || state.names.includes(x));
      }));
    }));
    const noNames = !state.names.length;
    $("noNamesWarn").hidden = !noNames;

    // Territorios (se puede marcar más de uno)
    $("territorios").replaceChildren(...TERRITORIOS.map((x) => {
      const on = state.territorios.includes(x);
      return toggleCard("terr-" + x, on, TERRITORIO_LABELS[x].name, [["cat-desc", TERRITORIO_LABELS[x].example]], cambiar("terr-" + x, () => {
        state.territorios = on ? state.territorios.filter((y) => y !== x) : TERRITORIOS.filter((y) => y === x || state.territorios.includes(y));
      }));
    }));

    // Dificultad: se marca una sola. La respuesta abierta aún no existe: se ve, pero no se puede marcar.
    const dificultades = OPTION_COUNTS.map((n) =>
      toggleCard("dif-" + n, state.opciones === n, `${n} opciones`, [["cat-desc", DIFICULTAD_DESC[n]]],
        cambiar("dif-" + n, () => { state.opciones = n; }), true));
    const abierta = toggleCard("dif-abierta", false, "Respuesta abierta", [["cat-desc", "Escribes la respuesta tú. Próximamente."]], () => {}, true);
    abierta.disabled = true;
    $("dificultad").replaceChildren(...dificultades, abierta);
    tabuladorEnLaMarcada($("dificultad"));

    // Tiempo por pregunta: se marca uno solo.
    $("tiempo").replaceChildren(...TIME_LIMITS.map((t) =>
      toggleCard("tiempo-" + t, state.tiempo === t, TIEMPO_LABELS[t].name, [["cat-desc", TIEMPO_LABELS[t].desc]],
        cambiar("tiempo-" + t, () => { state.tiempo = t; }), true)));
    tabuladorEnLaMarcada($("tiempo"));

    // Preguntas por partida: se marca una sola. 25, 50 y 100, solo si la selección tiene al menos esas.
    const hay = questionCount(state.selected, state.territorios);
    $("longitud").replaceChildren(...ROUND_LENGTHS.map((n) => {
      const cabe = lengthFits(n, state.selected, state.territorios);
      const card = toggleCard("len-" + n, state.longitud === n, LONGITUD_LABELS[n].name,
        [["cat-desc", cabe || !hay ? LONGITUD_LABELS[n].desc : `Con esta selección hay ${hay} preguntas.`]],
        cambiar("len-" + n, () => { state.longitud = n; }), true);
      // La elegida no se desactiva aunque ya no quepa: se ve marcada, con el aviso de abajo.
      card.disabled = !cabe && state.longitud !== n;
      return card;
    }));
    tabuladorEnLaMarcada($("longitud"));

    const noTerr = !state.territorios.length;
    $("noTerrWarn").hidden = !noTerr;
    // Categorías y territorios marcados, pero sin preguntas (p. ej. solo banderas y solo provincias).
    const empty = !noCats && !noTerr && hay === 0;
    $("emptyWarn").hidden = !empty;
    // El número de preguntas elegido ya no cabe (p. ej. 50 y se ha dejado solo Capitales).
    const tooLong = !noCats && !noTerr && !empty && !lengthFits(state.longitud, state.selected, state.territorios);
    $("lengthWarn").hidden = !tooLong;
    $("lengthWarn").textContent = tooLong ? `Con esta selección hay ${hay} preguntas: elige menos preguntas por partida o «Sin límite».` : "";

    $<HTMLButtonElement>("doneOptions").disabled = noCats || noNames || noTerr || empty || tooLong;
  }

  for (const id of ["dificultad", "tiempo", "longitud"]) radioGroup($(id));
  $("doneOptions").addEventListener("click", () => { if (puedeJugar(state)) ctx.goHome(); });
  $("allCats").addEventListener("click", () => { state.selected = [...CATEGORY_IDS]; ctx.save(); render(); });

  return { render };
}
