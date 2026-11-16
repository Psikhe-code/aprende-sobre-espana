/**
 * @fileoverview Geografía: sus opciones guardadas (lo que se elige en Opciones), comprobadas al cargarlas.
 */

import { sectionSettings, type SavedState } from "../../../common/engine/common-storage";
import { DEFAULT_ROUND_LENGTH, DEFAULT_TIME_LIMIT, ROUND_LENGTHS, TIME_LIMITS, type RoundLength, type TimeLimit } from "../../../common/engine/common-round-settings";
import { CATEGORY_IDS } from "./geografia-categories";
import { DEFAULT_NAME_FORMS, DEFAULT_OPTION_COUNT, DEFAULT_TERRITORIOS, OPTION_COUNTS, type OptionCount } from "./geografia-round-questions";
import { NAME_FORMS, TERRITORIOS, type NameForm, type Territorio } from "./geografia-types";
import { GEOGRAFIA_ID } from "./geografia-id";

export interface GeografiaSettings {
  /** Categorías marcadas (al menos una para poder jugar). */
  categories: string[];
  /** Categorías que existían la última vez: las nuevas se marcan solas. */
  knownCategories: string[];
  /** Formas de los nombres marcadas. Si hay varias, se sortea en cada pregunta. */
  nameForms: NameForm[];
  /** Territorios marcados: comunidades, provincias o los dos. */
  territorios: Territorio[];
  /** Dificultad: número de opciones por pregunta (4, 6 u 8). */
  optionCount: OptionCount;
  /** Preguntas por partida: 10, 25, 50, 100 o sin límite. */
  roundLength: RoundLength;
  /** Tiempo por pregunta: 60, 30 o 10 segundos, o sin tiempo. */
  timeLimit: TimeLimit;
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
  let categories = listOf(r.categories, CATEGORY_IDS) ?? [...CATEGORY_IDS];
  categories = CATEGORY_IDS.filter((id) => categories.includes(id) || !known.includes(id));
  if (!categories.length) categories = [...CATEGORY_IDS];
  const nameForms = listOf(r.nameForms, NAME_FORMS);
  const territorios = listOf(r.territorios, TERRITORIOS);
  return {
    categories,
    knownCategories: [...CATEGORY_IDS],
    nameForms: nameForms?.length ? nameForms : [...DEFAULT_NAME_FORMS],
    territorios: territorios?.length ? territorios : [...DEFAULT_TERRITORIOS],
    optionCount: OPTION_COUNTS.find((n) => n === r.optionCount) ?? DEFAULT_OPTION_COUNT,
    roundLength: ROUND_LENGTHS.find((n) => n === r.roundLength) ?? DEFAULT_ROUND_LENGTH,
    timeLimit: TIME_LIMITS.find((n) => n === r.timeLimit) ?? DEFAULT_TIME_LIMIT
  };
}

/** Las opciones de Geografía, comprobadas (ver sectionSettings). */
export const geografiaSettings = (state: SavedState): GeografiaSettings => sectionSettings(state, GEOGRAFIA_ID, loadGeografiaSettings);
