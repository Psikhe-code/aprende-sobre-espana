// Lo que se guarda en el dispositivo: las opciones y los récords.

import { CATEGORY_IDS, OLD_CATEGORY_IDS } from "../../sections/geografia/engine/categories";
import { SECTIONS, type Section } from "./types";
import { NAME_FORMS, TERRITORIOS, type NameForm, type Territorio } from "../../sections/geografia/engine/types";
import { TAREA_IDS, tareasWithQuestions } from "../../sections/ccse/engine/questions";
import { DEFAULT_NAME_FORMS, DEFAULT_OPTION_COUNT, DEFAULT_TERRITORIOS, OPTION_COUNTS, type OptionCount } from "../../sections/geografia/engine/round-questions";
import { DEFAULT_ROUND_LENGTH, DEFAULT_TIME_LIMIT, ROUND_LENGTHS, TIME_LIMITS, type RoundLength, type TimeLimit } from "./round-settings";

/**
 * Progreso guardado en el dispositivo (localStorage).
 * Si algún día hace falta otro almacenamiento (p. ej. el de Capacitor en Android),
 * este es el único módulo que cambia.
 */
export interface SavedState {
  /**
   * Récord por combinación de categorías, territorios, dificultad, número de preguntas y tiempo (ver geografiaRecordKey),
   * p. ej. "capitales+banderas/comunidad+provincia" → 8. En las partidas sin límite, la mejor racha.
   */
  best: Record<string, number>;
  /** Categorías marcadas en Opciones. */
  selected: string[];
  /** Categorías que existían la última vez: las nuevas se marcan solas. */
  known: string[];
  /** Formas de los nombres marcadas en Opciones (al menos una). Si hay varias, se sortea en cada pregunta. */
  names: NameForm[];
  /** Territorios marcados en Opciones (al menos uno): comunidades, provincias o los dos. */
  territorios: Territorio[];
  /** Dificultad: número de opciones por pregunta (4, 6 u 8). */
  opciones: OptionCount;
  /** Preguntas por partida: 10, 25, 50, 100 o sin límite. */
  longitud: RoundLength;
  /** Tiempo por pregunta: 60, 30 o 10 segundos, o sin tiempo. */
  tiempo: TimeLimit;
  /**
   * Sección elegida la última vez; null si aún no se ha elegido ninguna. Al abrir el juego sale siempre el menú
   * de secciones: solo se vuelve a esta cuando la página se recarga sola para aplicar una versión nueva.
   */
  seccion: Section | null;
  /** Opciones del examen de nacionalidad (sus récords van en `best`, con claves que empiezan por «ccse/»). */
  ccse: CcseSettings;
}

export interface CcseSettings {
  /** Tareas marcadas (las que tienen preguntas). */
  tareas: number[];
  /** Tareas que tenían preguntas la última vez: las que reciban preguntas nuevas se marcan solas. */
  conocidas: number[];
  longitud: RoundLength;
  tiempo: TimeLimit;
}

/** Clave con la que se guarda todo en el dispositivo. Si se cambia, se pierde lo guardado. */
export const STORAGE_KEY = "aprende-sobre-espana";

function read(): Partial<SavedState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

/** Cambia los identificadores antiguos de categoría por los actuales ("capitalesCCAA" → "capitales"). */
const renameCategoryIds = (ids: unknown): string[] | undefined =>
  Array.isArray(ids) ? ids.map((id) => OLD_CATEGORY_IDS[id] ?? id) : undefined;

/**
 * Récords guardados antes de que existiera la opción de territorio: eran solo de comunidades.
 * "capitalesCCAA+banderasCCAA" → "capitales+banderas/comunidad".
 */
function migrateRecordKeys(best: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(best)) {
    out[key.includes("/") ? key : `${renameCategoryIds(key.split("+"))!.join("+")}/comunidad`] = value;
  }
  return out;
}

export function loadState(): SavedState {
  const raw = read();
  const savedSelected = renameCategoryIds(raw.selected);
  let selected = savedSelected ? savedSelected.filter((id) => CATEGORY_IDS.includes(id)) : [...CATEGORY_IDS];
  const known = renameCategoryIds(raw.known) ?? [];
  for (const id of CATEGORY_IDS) if (!known.includes(id) && !selected.includes(id)) selected.push(id);
  if (!selected.length) selected = [...CATEGORY_IDS];
  const checkedNames = Array.isArray(raw.names) ? NAME_FORMS.filter((s) => (raw.names as unknown[]).includes(s)) : [];
  const names = checkedNames.length ? checkedNames : [...DEFAULT_NAME_FORMS];
  const checkedTerritorios = Array.isArray(raw.territorios) ? TERRITORIOS.filter((t) => (raw.territorios as unknown[]).includes(t)) : [];
  const territorios = checkedTerritorios.length ? checkedTerritorios : [...DEFAULT_TERRITORIOS];
  const opciones = OPTION_COUNTS.find((n) => n === raw.opciones) ?? DEFAULT_OPTION_COUNT;
  const longitud = ROUND_LENGTHS.find((n) => n === raw.longitud) ?? DEFAULT_ROUND_LENGTH;
  const tiempo = TIME_LIMITS.find((n) => n === raw.tiempo) ?? DEFAULT_TIME_LIMIT;
  const seccion = SECTIONS.find((s) => s === raw.seccion) ?? null;
  return {
    best: migrateRecordKeys(raw.best ?? {}), selected, known: [...CATEGORY_IDS], names, territorios, opciones, longitud, tiempo,
    seccion, ccse: loadCcseSettings(raw.ccse)
  };
}

/** Opciones del examen guardadas, comprobadas una a una (como las de geografía). */
function loadCcseSettings(raw: Partial<CcseSettings> | undefined): CcseSettings {
  const withQuestions = tareasWithQuestions();
  const validTareas = (x: unknown) => (Array.isArray(x) ? TAREA_IDS.filter((n) => x.includes(n)) : undefined);
  const conocidas = validTareas(raw?.conocidas) ?? [];
  let tareas = (validTareas(raw?.tareas) ?? [...withQuestions]).filter((n) => withQuestions.includes(n));
  for (const n of withQuestions) if (!conocidas.includes(n) && !tareas.includes(n)) tareas.push(n);
  tareas.sort((a, b) => a - b);
  if (!tareas.length) tareas = [...withQuestions];
  return {
    tareas,
    conocidas: [...withQuestions],
    longitud: ROUND_LENGTHS.find((n) => n === raw?.longitud) ?? DEFAULT_ROUND_LENGTH,
    tiempo: TIME_LIMITS.find((n) => n === raw?.tiempo) ?? DEFAULT_TIME_LIMIT
  };
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, known: [...CATEGORY_IDS] }));
  } catch {
    // Sin almacenamiento (modo privado, etc.): el juego funciona igual, solo no recuerda.
  }
}

/**
 * Clave estable de una selección de categorías, territorios, dificultad, número de preguntas y tiempo, en el orden oficial:
 * "capitales+banderas/comunidad" con 4 opciones, 10 preguntas y sin tiempo; "capitales+banderas/comunidad/8" con 8 opciones;
 * ".../25preguntas" o ".../sinlimite" con otro número de preguntas, y ".../60s", ".../30s" o ".../10s" con tiempo.
 * Lo que no cambia la partida respecto a como se jugaba antes (4 opciones, 10 preguntas, sin tiempo) no se escribe:
 * así los récords anteriores siguen valiendo, como récords sin tiempo, aunque ahora el tiempo por defecto sea 1 minuto.
 */
export const geografiaRecordKey = (
  selected: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS, opciones: OptionCount = DEFAULT_OPTION_COUNT,
  longitud: RoundLength = DEFAULT_ROUND_LENGTH, tiempo: TimeLimit = "sinTiempo"
) =>
  CATEGORY_IDS.filter((id) => selected.includes(id)).join("+") + "/" + TERRITORIOS.filter((t) => territorios.includes(t)).join("+") +
  (opciones === DEFAULT_OPTION_COUNT ? "" : `/${opciones}`) + recordKeyEnding(longitud, tiempo);

/**
 * Final de la clave de un récord, igual en las dos secciones: el número de preguntas y el tiempo, si no son
 * los de por defecto. Las claves ya guardadas dependen de esto: no se puede cambiar sin convertir los récords.
 */
const recordKeyEnding = (longitud: RoundLength, tiempo: TimeLimit) =>
  (longitud === DEFAULT_ROUND_LENGTH ? "" : longitud === "sinLimite" ? "/sinlimite" : `/${longitud}preguntas`) +
  (tiempo === "sinTiempo" ? "" : `/${tiempo}s`);

/**
 * Clave del récord del examen de nacionalidad: «ccse/» y las tareas («ccse/1+2»), y como en geografiaRecordKey,
 * el número de preguntas y el tiempo si no son los de por defecto (10 preguntas, sin tiempo):
 * «ccse/1/25preguntas/60s». Empieza por «ccse/» para no mezclarse con los de geografía.
 */
export const ccseRecordKey = (tareas: readonly number[], longitud: RoundLength = DEFAULT_ROUND_LENGTH, tiempo: TimeLimit = "sinTiempo") =>
  "ccse/" + [...tareas].sort((a, b) => a - b).join("+") + recordKeyEnding(longitud, tiempo);
