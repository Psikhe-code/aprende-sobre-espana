// Geografía: lo que se deduce de las opciones marcadas (la selección actual).

import { lengthFits, roundSize, type RoundSettings } from "./geografia-round-questions";
import { recordKeyEnding } from "../../../common/engine/common-round-settings";
import { CATEGORY_IDS } from "./geografia-categories";
import { TERRITORIOS } from "./geografia-types";
import type { GeografiaSettings } from "./geografia-settings";

/** Si con las opciones marcadas se puede jugar: alguna categoría, forma y territorio, y preguntas suficientes. */
export const canPlay = (g: GeografiaSettings) =>
  g.categories.length > 0 && g.nameForms.length > 0 && g.territorios.length > 0 &&
  roundSize(g.categories, g.territorios) > 0 && lengthFits(g.roundLength, g.categories, g.territorios);

/** Ajustes con los que se prepara una partida (o otra vuelta a la baraja). */
export const roundSettings = (g: GeografiaSettings): RoundSettings =>
  ({ categories: g.categories, nameForms: g.nameForms, territorios: g.territorios, optionCount: g.optionCount, roundLength: g.roundLength });

/**
 * Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale.
 * El tiempo no está, porque no cambia las preguntas.
 */
export const selectionKey = (g: GeografiaSettings) => JSON.stringify([g.categories, g.nameForms, g.territorios, g.optionCount, g.roundLength]);

/**
 * Clave del récord de la selección actual: las categorías, los territorios, la dificultad, el número de preguntas
 * y el tiempo, en el orden oficial: «geografia/capitales+banderas/comunidad/4opciones/10preguntas/60s».
 * La forma de los nombres no está: no cambia lo que se pregunta.
 */
export const recordKey = (g: GeografiaSettings) =>
  "geografia/" + CATEGORY_IDS.filter((id) => g.categories.includes(id)).join("+") +
  "/" + TERRITORIOS.filter((t) => g.territorios.includes(t)).join("+") +
  `/${g.optionCount}opciones` + recordKeyEnding(g.roundLength, g.timeLimit);
