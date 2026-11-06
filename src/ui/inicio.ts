// Pantalla de inicio: resumen de lo que se va a jugar y récord de la selección.

import { CATEGORIES, CATEGORY_IDS } from "../engine/categories";
import { roundSize } from "../engine/round";
import type { SavedState } from "../engine/storage";
import { NAME_STYLES, TERRITORIOS } from "../engine/types";
import { $, el } from "./dom";
import { NAME_LABELS, TERRITORIO_LABELS, TIEMPO_LABELS } from "./labels";
import { claveRecord } from "./seleccion";

export function renderStart(state: SavedState): void {
  const chips = $("chips");
  chips.replaceChildren();
  if (state.selected.length === CATEGORY_IDS.length) {
    chips.append(el("span", "chip", "Todas las categorías"));
  } else {
    CATEGORIES.filter((c) => state.selected.includes(c.id)).forEach((c) => chips.append(el("span", "chip", c.name)));
  }
  const names = NAME_STYLES.filter((s) => state.names.includes(s));
  $("namesInfo").textContent = names.length > 1
    ? `Nombres: ${names.map((s) => NAME_LABELS[s].short).join(" y ")}, al azar en cada pregunta.`
    : `Nombres: solo ${NAME_LABELS[names[0]].short}.`;
  const territorios = TERRITORIOS.filter((x) => state.territorios.includes(x));
  $("territoriosInfo").textContent = `Territorio: ${territorios.map((x) => TERRITORIO_LABELS[x].short).join(" y ")}.`;
  $("dificultadInfo").textContent = `Dificultad: ${state.opciones} opciones por pregunta, ${TIEMPO_LABELS[state.tiempo].info}.`;
  const sinLimite = state.longitud === "sinLimite";
  $("roundLabel").textContent = sinLimite
    ? "Preguntas sin límite, al azar, de"
    : `${roundSize(state.selected, state.territorios, state.longitud) || state.longitud} preguntas al azar de`;
  const rec = state.best[claveRecord(state)];
  const record = $("record");
  record.replaceChildren();
  if (rec != null && sinLimite) record.append("Mejor racha con esta selección: ", el("b", "", String(rec)));
  else if (rec != null) record.append("Récord con esta selección: ", el("b", "", `${rec}/${roundSize(state.selected, state.territorios, state.longitud)}`));
  else record.textContent = "Aún no has jugado con esta selección.";
}

/** Versión al pie del inicio, para saber si ya se ve la última publicada. */
export function renderVersion(): void {
  const publicado = new Date(__PUBLICADO__);
  $("version").textContent = import.meta.env.DEV
    ? `Versión ${__VERSION__} · en desarrollo`
    : `Versión ${__VERSION__} · publicada el ${publicado.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} a las ${publicado.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}
