// Pantalla de inicio: resumen de lo que se va a jugar y récord de la selección.

import { CATEGORIES, CATEGORY_IDS } from "../engine/categories";
import { roundSize } from "../engine/round";
import type { SavedState } from "../engine/storage";
import { NAME_STYLES, TERRITORIOS } from "../engine/types";
import { pintarRecord, textoRonda } from "./comun";
import { $, el } from "./dom";
import { NAME_LABELS, TERRITORIO_LABELS, TIEMPO_LABELS } from "./labels";
import { claveRecord } from "../engine/seleccion";

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
  const tamano = roundSize(state.selected, state.territorios, state.longitud);
  $("roundLabel").textContent = textoRonda(state.longitud, tamano);
  pintarRecord($("record"), state.best[claveRecord(state)], state.longitud, tamano);
}

/** Versión al pie del menú de secciones y del inicio de cada sección, para saber si ya se ve la última publicada. */
export function renderVersion(): void {
  const publicado = new Date(__PUBLICADO__);
  $("version").textContent = import.meta.env.DEV
    ? `Versión ${__VERSION__} · en desarrollo`
    : `Versión ${__VERSION__} · publicada el ${publicado.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} a las ${publicado.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}
