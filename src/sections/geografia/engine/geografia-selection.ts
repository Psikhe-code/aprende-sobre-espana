/**
 * @fileoverview Geografía: lo que se deduce de las opciones marcadas (la selección actual).
 */

import { questionCountFits, countRoundQuestions, type RoundParams } from "./geografia-round-questions";
import { recordKeyEnding } from "../../../common/engine/common-round-settings";
import { CATEGORY_IDS } from "./geografia-categories";
import { TERRITORIOS } from "./geografia-types";
import type { GeografiaSettings } from "./geografia-settings";
import { GEOGRAFIA_ID } from "./geografia-id";

/** Si con las opciones marcadas se puede jugar: alguna categoría, forma y territorio, y preguntas suficientes. */
export const canPlay = (settings: GeografiaSettings) =>
  settings.categories.length > 0 && settings.nameForms.length > 0 && settings.territorios.length > 0 &&
  countRoundQuestions(settings.categories, settings.territorios) > 0 &&
  questionCountFits(settings.questionCount, settings.categories, settings.territorios);

/** Lo que necesita el motor para preparar una partida con las opciones elegidas. */
export const roundParams = (settings: GeografiaSettings): RoundParams => ({
  categories: settings.categories, nameForms: settings.nameForms, territorios: settings.territorios,
  optionCount: settings.optionCount, questionCount: settings.questionCount
});

/**
 * Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale.
 * El tiempo no está, porque no cambia las preguntas.
 */
export const selectionKey = (settings: GeografiaSettings) =>
  JSON.stringify([settings.categories, settings.nameForms, settings.territorios, settings.optionCount, settings.questionCount]);

/**
 * Clave del récord de la selección actual: las categorías, los territorios, la dificultad, el número de preguntas
 * y el tiempo, en el orden oficial: «geografia/capitales+banderas/comunidad/4opciones/10preguntas/60s».
 * La forma de los nombres no está: no cambia lo que se pregunta.
 */
export const recordKey = (settings: GeografiaSettings) =>
  GEOGRAFIA_ID + "/" + CATEGORY_IDS.filter((id) => settings.categories.includes(id)).join("+") +
  "/" + TERRITORIOS.filter((t) => settings.territorios.includes(t)).join("+") +
  `/${settings.optionCount}opciones` + recordKeyEnding(settings.questionCount, settings.timeLimit);
