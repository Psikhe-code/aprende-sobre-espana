// Pantallas del examen de nacionalidad (prueba CCSE): inicio y Opciones.
// La partida y el resultado son los mismos que en geografía (partida.ts, final.ts), con el modo del examen.

import { PREGUNTAS_CCSE, preguntasDe, tamanoCcse, cabeCcse, TAREAS, tareasConPreguntas } from "../engine/ccse";
import { ROUND_LENGTHS, TIME_LIMITS } from "../engine/round";
import { ccseKey, type SavedState } from "../engine/storage";
import type { Contexto } from "./contexto";
import { $, el, radioGroup, tabuladorEnLaMarcada, toggleCard } from "./dom";
import { LONGITUD_LABELS, TIEMPO_LABELS } from "./labels";
import { puedeJugarCcse } from "./modos";

export function renderStartCcse(state: SavedState): void {
  // Mientras la plantilla esté vacía, no hay nada que jugar ni que elegir: solo el aviso.
  const vacio = !PREGUNTAS_CCSE.length;
  $("ccseVacio").hidden = !vacio;
  $("ccseSummary").hidden = vacio;
  $("ccseBotones").hidden = vacio;
  $("ccseAtajos").hidden = vacio;
  if (vacio) return;
  const { tareas, longitud, tiempo } = state.ccse;
  const sinLimite = longitud === "sinLimite";
  $("ccseRoundLabel").textContent = sinLimite
    ? "Preguntas sin límite, al azar, de"
    : `${tamanoCcse(tareas, longitud) || longitud} preguntas al azar de`;
  $("ccseChips").replaceChildren(...TAREAS.filter((t) => tareas.includes(t.numero))
    .map((t) => el("span", "chip", `Tarea ${t.numero} · ${t.nombre}`)));
  $("ccseTiempoInfo").textContent = `Tiempo: ${TIEMPO_LABELS[tiempo].info}.`;
  const rec = state.best[ccseKey(tareas, longitud, tiempo)];
  const record = $("ccseRecord");
  record.replaceChildren();
  if (rec != null && sinLimite) record.append("Mejor racha con esta selección: ", el("b", "", String(rec)));
  else if (rec != null) record.append("Récord con esta selección: ", el("b", "", `${rec}/${tamanoCcse(tareas, longitud)}`));
  else record.textContent = "Aún no has jugado con esta selección.";
}

/** Prepara las Opciones del examen (sus botones) y devuelve cómo dibujarlas. */
export function crearOpcionesCcse(ctx: Contexto): { render: () => void } {
  const ccse = ctx.state.ccse;

  const cambiar = (idTarjeta: string, cambio: () => void) => () => {
    cambio();
    ctx.save();
    render();
    $(idTarjeta).focus();
  };

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
    $("ccseLongitud").replaceChildren(...ROUND_LENGTHS.map((n) => {
      const cabe = cabeCcse(n, ccse.tareas);
      const card = toggleCard("ccse-len-" + n, ccse.longitud === n, LONGITUD_LABELS[n].name,
        [["cat-desc", cabe || !hay ? LONGITUD_LABELS[n].desc : `Con esta selección hay ${hay} preguntas.`]],
        cambiar("ccse-len-" + n, () => { ccse.longitud = n; }), true);
      card.disabled = !cabe && ccse.longitud !== n;
      return card;
    }));
    tabuladorEnLaMarcada($("ccseLongitud"));
    const tooLong = !ninguna && !cabeCcse(ccse.longitud, ccse.tareas);
    $("ccseLengthWarn").hidden = !tooLong;
    $("ccseLengthWarn").textContent = tooLong ? `Con esta selección hay ${hay} preguntas: elige menos preguntas por partida o «Sin límite».` : "";

    // Tiempo por pregunta.
    $("ccseTiempo").replaceChildren(...TIME_LIMITS.map((t) =>
      toggleCard("ccse-tiempo-" + t, ccse.tiempo === t, TIEMPO_LABELS[t].name, [["cat-desc", TIEMPO_LABELS[t].desc]],
        cambiar("ccse-tiempo-" + t, () => { ccse.tiempo = t; }), true)));
    tabuladorEnLaMarcada($("ccseTiempo"));

    $<HTMLButtonElement>("ccseDone").disabled = !puedeJugarCcse(ctx.state);
  }

  for (const id of ["ccseLongitud", "ccseTiempo"]) radioGroup($(id));
  $("ccseDone").addEventListener("click", () => { if (puedeJugarCcse(ctx.state)) ctx.goHome(); });

  return { render };
}
