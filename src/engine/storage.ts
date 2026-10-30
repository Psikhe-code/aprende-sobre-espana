import { CATEGORY_IDS } from "./categories";

/**
 * Progreso guardado en el dispositivo (localStorage).
 * Si algún día hace falta sincronizar entre dispositivos, este es el único módulo que cambia.
 */
export interface SavedState {
  /** Récord por combinación de categorías, p. ej. "rios+relieve" → 8. */
  best: Record<string, number>;
  /** Categorías marcadas en Opciones. */
  selected: string[];
  /** Categorías que existían la última vez: las nuevas se marcan solas. */
  known: string[];
}

const KEY = "geoquiz-es-v2";
/** Categorías del prototipo, para quien venga de una versión sin `known`. */
const LEGACY_KNOWN = ["provincias", "comunidades", "rios", "relieve", "costas"];

function read(): Partial<SavedState> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function loadState(): SavedState {
  const raw = read();
  let selected = Array.isArray(raw.selected) ? raw.selected.filter((id) => CATEGORY_IDS.includes(id)) : [...CATEGORY_IDS];
  const known = Array.isArray(raw.known) ? raw.known : LEGACY_KNOWN;
  for (const id of CATEGORY_IDS) if (!known.includes(id) && !selected.includes(id)) selected.push(id);
  if (!selected.length) selected = [...CATEGORY_IDS];
  return { best: raw.best ?? {}, selected, known: [...CATEGORY_IDS] };
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, known: [...CATEGORY_IDS] }));
  } catch {
    // Sin almacenamiento (modo privado, etc.): el juego funciona igual, solo no recuerda.
  }
}

/** Clave estable de una selección de categorías, en el orden oficial. */
export const comboKey = (selected: string[]) => CATEGORY_IDS.filter((id) => selected.includes(id)).join("+");
