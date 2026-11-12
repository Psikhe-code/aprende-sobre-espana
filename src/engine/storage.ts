import { CATEGORY_IDS, OLD_CATEGORY_IDS } from "./categories";
import { NAME_STYLES, SECCIONES, TERRITORIOS, type NameStyle, type Seccion, type Territorio } from "./types";
import { TAREA_IDS, tareasConPreguntas } from "./ccse";
import {
  DEFAULT_LENGTH, DEFAULT_NAMES, DEFAULT_OPTIONS, DEFAULT_TERRITORIOS, DEFAULT_TIME, OPTION_COUNTS, ROUND_LENGTHS, TIME_LIMITS,
  type OptionCount, type RoundLength, type TimeLimit
} from "./round";

/**
 * Progreso guardado en el dispositivo (localStorage).
 * Si algún día hace falta otro almacenamiento (p. ej. el de Capacitor en Android),
 * este es el único módulo que cambia.
 */
export interface SavedState {
  /**
   * Récord por combinación de categorías, territorios, dificultad, número de preguntas y tiempo (ver comboKey),
   * p. ej. "capitales+banderas/comunidad+provincia" → 8. En las partidas sin límite, la mejor racha.
   */
  best: Record<string, number>;
  /** Categorías marcadas en Opciones. */
  selected: string[];
  /** Categorías que existían la última vez: las nuevas se marcan solas. */
  known: string[];
  /** Formas de los nombres marcadas en Opciones (al menos una). Si hay varias, se sortea en cada pregunta. */
  names: NameStyle[];
  /** Territorios marcados en Opciones (al menos uno): comunidades, provincias o los dos. */
  territorios: Territorio[];
  /** Dificultad: número de opciones por pregunta (4, 6 u 8). */
  opciones: OptionCount;
  /** Preguntas por partida: 10, 25, 50, 100 o sin límite. */
  longitud: RoundLength;
  /** Tiempo por pregunta: 60, 30 o 10 segundos, o sin tiempo. */
  tiempo: TimeLimit;
  /** Sección elegida la última vez (el juego vuelve a ella al abrirlo); null si aún no se ha elegido ninguna. */
  seccion: Seccion | null;
  /** Opciones del examen de nacionalidad (sus récords van en `best`, con claves que empiezan por «ccse/»). */
  ccse: OpcionesCcse;
}

export interface OpcionesCcse {
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
const renombrar = (ids: unknown): string[] | undefined =>
  Array.isArray(ids) ? ids.map((id) => OLD_CATEGORY_IDS[id] ?? id) : undefined;

/**
 * Récords guardados antes de que existiera la opción de territorio: eran solo de comunidades.
 * "capitalesCCAA+banderasCCAA" → "capitales+banderas/comunidad".
 */
function migrarRecords(best: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(best)) {
    out[key.includes("/") ? key : `${renombrar(key.split("+"))!.join("+")}/comunidad`] = value;
  }
  return out;
}

export function loadState(): SavedState {
  const raw = read();
  const guardadas = renombrar(raw.selected);
  let selected = guardadas ? guardadas.filter((id) => CATEGORY_IDS.includes(id)) : [...CATEGORY_IDS];
  const known = renombrar(raw.known) ?? [];
  for (const id of CATEGORY_IDS) if (!known.includes(id) && !selected.includes(id)) selected.push(id);
  if (!selected.length) selected = [...CATEGORY_IDS];
  const marcadas = Array.isArray(raw.names) ? NAME_STYLES.filter((s) => (raw.names as unknown[]).includes(s)) : [];
  const names = marcadas.length ? marcadas : [...DEFAULT_NAMES];
  const territoriosMarcados = Array.isArray(raw.territorios) ? TERRITORIOS.filter((t) => (raw.territorios as unknown[]).includes(t)) : [];
  const territorios = territoriosMarcados.length ? territoriosMarcados : [...DEFAULT_TERRITORIOS];
  const opciones = OPTION_COUNTS.find((n) => n === raw.opciones) ?? DEFAULT_OPTIONS;
  const longitud = ROUND_LENGTHS.find((n) => n === raw.longitud) ?? DEFAULT_LENGTH;
  const tiempo = TIME_LIMITS.find((n) => n === raw.tiempo) ?? DEFAULT_TIME;
  const seccion = SECCIONES.find((s) => s === raw.seccion) ?? null;
  return {
    best: migrarRecords(raw.best ?? {}), selected, known: [...CATEGORY_IDS], names, territorios, opciones, longitud, tiempo,
    seccion, ccse: cargarCcse(raw.ccse)
  };
}

/** Opciones del examen guardadas, comprobadas una a una (como las de geografía). */
function cargarCcse(raw: Partial<OpcionesCcse> | undefined): OpcionesCcse {
  const conPreguntas = tareasConPreguntas();
  const numeros = (x: unknown) => (Array.isArray(x) ? TAREA_IDS.filter((n) => x.includes(n)) : undefined);
  const conocidas = numeros(raw?.conocidas) ?? [];
  let tareas = (numeros(raw?.tareas) ?? [...conPreguntas]).filter((n) => conPreguntas.includes(n));
  for (const n of conPreguntas) if (!conocidas.includes(n) && !tareas.includes(n)) tareas.push(n);
  tareas.sort((a, b) => a - b);
  if (!tareas.length) tareas = [...conPreguntas];
  return {
    tareas,
    conocidas: [...conPreguntas],
    longitud: ROUND_LENGTHS.find((n) => n === raw?.longitud) ?? DEFAULT_LENGTH,
    tiempo: TIME_LIMITS.find((n) => n === raw?.tiempo) ?? DEFAULT_TIME
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
export const comboKey = (
  selected: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS, opciones: OptionCount = DEFAULT_OPTIONS,
  longitud: RoundLength = DEFAULT_LENGTH, tiempo: TimeLimit = "sinTiempo"
) =>
  CATEGORY_IDS.filter((id) => selected.includes(id)).join("+") + "/" + TERRITORIOS.filter((t) => territorios.includes(t)).join("+") +
  (opciones === DEFAULT_OPTIONS ? "" : `/${opciones}`) +
  (longitud === DEFAULT_LENGTH ? "" : longitud === "sinLimite" ? "/sinlimite" : `/${longitud}preguntas`) +
  (tiempo === "sinTiempo" ? "" : `/${tiempo}s`);

/**
 * Clave del récord del examen de nacionalidad: «ccse/» y las tareas («ccse/1+2»), y como en comboKey,
 * el número de preguntas y el tiempo si no son los de por defecto (10 preguntas, sin tiempo):
 * «ccse/1/25preguntas/60s». Empieza por «ccse/» para no mezclarse con los de geografía.
 */
export const ccseKey = (tareas: readonly number[], longitud: RoundLength = DEFAULT_LENGTH, tiempo: TimeLimit = "sinTiempo") =>
  "ccse/" + [...tareas].sort((a, b) => a - b).join("+") +
  (longitud === DEFAULT_LENGTH ? "" : longitud === "sinLimite" ? "/sinlimite" : `/${longitud}preguntas`) +
  (tiempo === "sinTiempo" ? "" : `/${tiempo}s`);
