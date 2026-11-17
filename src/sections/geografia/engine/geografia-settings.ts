/**
 * @fileoverview Geografía: sus opciones guardadas (lo que se elige en Opciones), comprobadas al cargarlas.
 */

import { sectionSettings, type SavedState } from "../../../common/engine/common-storage";
import { DEFAULT_QUESTION_COUNT, DEFAULT_TIME_LIMIT, QUESTION_COUNTS, TIME_LIMITS, type QuestionCount, type TimeLimit } from "../../../common/engine/common-round-settings";
import { CATEGORY_IDS } from "./geografia-categories";
import { DEFAULT_NAME_FORMS, DEFAULT_OPTION_COUNT, DEFAULT_TERRITORIOS, OPTION_COUNTS, type OptionCount } from "./geografia-round-questions";
import { NAME_FORMS, TERRITORIOS, type NameForm, type Territorio } from "./geografia-types";
import { GEOGRAFIA_ID } from "./geografia-id";

export interface GeografiaSettings {
  /** Categorías marcadas (al menos una para poder jugar). */
  selectedCategories: string[];
  /** Categorías que existían la última vez: las nuevas se marcan solas. */
  knownCategories: string[];
  /** Formas de los nombres marcadas. Si hay varias, se sortea en cada pregunta. */
  selectedNameForms: NameForm[];
  /** Territorios marcados: comunidades, provincias o los dos. */
  selectedTerritorios: Territorio[];
  /** Dificultad: número de opciones por pregunta (4, 6 u 8). */
  selectedOptionCount: OptionCount;
  /** Preguntas por partida: 10, 25, 50, 100 o sin límite. */
  selectedQuestionCount: QuestionCount;
  /** Tiempo por pregunta: 60, 30 o 10 segundos, o sin tiempo. */
  selectedTimeLimit: TimeLimit;
}

/** Los valores de `allowed` que hay en `x`, en el orden de `allowed` (o undefined si `x` no es una lista). */
const listOf = <T>(x: unknown, allowed: readonly T[]): T[] | undefined =>
  Array.isArray(x) ? allowed.filter((a) => x.includes(a)) : undefined;

/**
 * Comprueba las opciones guardadas una a una: lo que falta o no vale se cambia por lo de por defecto.
 * Las categorías nuevas (que no existían la última vez) se marcan solas.
 */
export function loadGeografiaSettings(raw: unknown): GeografiaSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const known = listOf(r.knownCategories, CATEGORY_IDS) ?? [];
  let selectedCategories = listOf(r.selectedCategories, CATEGORY_IDS) ?? [...CATEGORY_IDS];
  selectedCategories = CATEGORY_IDS.filter((id) => selectedCategories.includes(id) || !known.includes(id));
  if (!selectedCategories.length) selectedCategories = [...CATEGORY_IDS];
  const nameForms = listOf(r.selectedNameForms, NAME_FORMS);
  const territorios = listOf(r.selectedTerritorios, TERRITORIOS);
  return {
    selectedCategories,
    knownCategories: [...CATEGORY_IDS],
    selectedNameForms: nameForms?.length ? nameForms : [...DEFAULT_NAME_FORMS],
    selectedTerritorios: territorios?.length ? territorios : [...DEFAULT_TERRITORIOS],
    selectedOptionCount: OPTION_COUNTS.find((n) => n === r.selectedOptionCount) ?? DEFAULT_OPTION_COUNT,
    selectedQuestionCount: QUESTION_COUNTS.find((n) => n === r.selectedQuestionCount) ?? DEFAULT_QUESTION_COUNT,
    selectedTimeLimit: TIME_LIMITS.find((n) => n === r.selectedTimeLimit) ?? DEFAULT_TIME_LIMIT
  };
}

/** Las opciones de Geografía, comprobadas (ver sectionSettings). */
export const geografiaSettings = (state: SavedState): GeografiaSettings => sectionSettings(state, GEOGRAFIA_ID, loadGeografiaSettings);
