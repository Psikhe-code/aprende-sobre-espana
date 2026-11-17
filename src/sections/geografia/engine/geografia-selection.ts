/**
 * @fileoverview Geografía: lo que se deduce de las opciones marcadas (la selección actual).
 */

import { countAvailableQuestions, type RoundParams } from "./geografia-round-questions";
import { canChooseQuestionCount, recordKeyEnding } from "../../../common/engine/common-round-settings";
import { CATEGORY_IDS } from "./geografia-categories";
import { TERRITORIOS } from "./geografia-types";
import type { GeografiaSettings } from "./geografia-settings";
import { GEOGRAFIA_ID } from "./geografia-id";

/** Si con las opciones marcadas se puede jugar: alguna categoría, forma y territorio, y preguntas suficientes. */
export function canPlay(settings: GeografiaSettings): boolean {
  if (!settings.selectedCategories.length || !settings.selectedNameForms.length || !settings.selectedTerritorios.length) return false;
  const availableQuestionCount = countAvailableQuestions(settings.selectedCategories, settings.selectedTerritorios);
  return availableQuestionCount > 0 && canChooseQuestionCount(settings.selectedQuestionCount, availableQuestionCount);
}

/** Lo que necesita el motor para preparar una partida con las opciones elegidas. */
export const roundParams = (settings: GeografiaSettings): RoundParams => ({
  categories: settings.selectedCategories, nameForms: settings.selectedNameForms, territorios: settings.selectedTerritorios,
  optionCount: settings.selectedOptionCount, questionCount: settings.selectedQuestionCount
});

/**
 * Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale.
 * El tiempo no está, porque no cambia las preguntas.
 */
export const selectionKey = (settings: GeografiaSettings) =>
  JSON.stringify([settings.selectedCategories, settings.selectedNameForms, settings.selectedTerritorios, settings.selectedOptionCount, settings.selectedQuestionCount]);

/**
 * Clave del récord de la selección actual: las categorías, los territorios, la dificultad, el número de preguntas
 * y el tiempo, en el orden oficial: «geografia/capitales+banderas/comunidad/4opciones/10preguntas/60s».
 * La forma de los nombres no está: no cambia lo que se pregunta.
 */
export const recordKey = (settings: GeografiaSettings) =>
  GEOGRAFIA_ID + "/" + CATEGORY_IDS.filter((id) => settings.selectedCategories.includes(id)).join("+") +
  "/" + TERRITORIOS.filter((t) => settings.selectedTerritorios.includes(t)).join("+") +
  `/${settings.selectedOptionCount}opciones` + recordKeyEnding(settings.selectedQuestionCount, settings.selectedTimeLimit);
