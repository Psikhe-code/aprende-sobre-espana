import { CATEGORY_IDS, OLD_CATEGORY_IDS } from "./categories";
import { NAME_STYLES, TERRITORIOS, type NameStyle, type Territorio } from "./types";
import { DEFAULT_NAMES, DEFAULT_TERRITORIOS } from "./round";

/**
 * Progreso guardado en el dispositivo (localStorage).
 * Si algún día hace falta otro almacenamiento (p. ej. el de Capacitor en Android),
 * este es el único módulo que cambia.
 */
export interface SavedState {
  /** Récord por combinación de categorías y territorios, p. ej. "capitales+banderas/comunidad+provincia" → 8. */
  best: Record<string, number>;
  /** Categorías marcadas en Opciones. */
  selected: string[];
  /** Categorías que existían la última vez: las nuevas se marcan solas. */
  known: string[];
  /** Formas de los nombres marcadas en Opciones (al menos una). Si hay varias, se sortea en cada pregunta. */
  names: NameStyle[];
  /** Territorios marcados en Opciones (al menos uno): comunidades, provincias o los dos. */
  territorios: Territorio[];
}

const KEY = "geoquiz-es-v2";

function read(): Partial<SavedState> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
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
  return { best: migrarRecords(raw.best ?? {}), selected, known: [...CATEGORY_IDS], names, territorios };
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, known: [...CATEGORY_IDS] }));
  } catch {
    // Sin almacenamiento (modo privado, etc.): el juego funciona igual, solo no recuerda.
  }
}

/** Clave estable de una selección de categorías y territorios, en el orden oficial: "capitales+banderas/comunidad". */
export const comboKey = (selected: string[], territorios: Territorio[] = DEFAULT_TERRITORIOS) =>
  CATEGORY_IDS.filter((id) => selected.includes(id)).join("+") + "/" + TERRITORIOS.filter((t) => territorios.includes(t)).join("+");
