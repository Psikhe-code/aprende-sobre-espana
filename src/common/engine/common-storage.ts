/**
 * @fileoverview Lo que se guarda en el dispositivo: la sección elegida, los récords y las opciones de cada sección.
 * No sabe nada de las secciones: cada una guarda sus opciones a su manera y las comprueba al cargarlas.
 */

/**
 * Lo guardado en el dispositivo (localStorage). Si algún día hace falta otro almacenamiento
 * (p. ej. el de Capacitor en Android), este es el único módulo que cambia.
 */
export interface SavedState {
  /**
   * Sección elegida la última vez (su id); null si aún no se ha elegido ninguna. Al abrir el juego sale siempre
   * el menú de secciones: solo se vuelve a esta cuando la página se recarga sola para aplicar una versión nueva.
   */
  section: string | null;
  /**
   * Récords, por clave. Cada sección hace las suyas, que empiezan por su id («geografia/…», «ccse/…»).
   * En las partidas sin límite, la mejor racha; en el simulacro, los aciertos.
   */
  records: Record<string, number>;
  /** Opciones de cada sección, por su id. Se leen con `sectionSettings`, que las comprueba. */
  settings: Record<string, unknown>;
}

/** Clave con la que se guarda todo en el dispositivo. */
export const STORAGE_KEY = "aprende-sobre-espana";

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * Lo guardado, comprobado: lo que no tiene la forma esperada se descarta (un récord que no es un número,
 * una sección que no es un texto). Lo guardado con el formato de antes de la versión 0.2.33 no se convierte:
 * se empieza de cero (decisión del usuario, hasta que haya puntuación).
 */
export function loadState(): SavedState {
  let raw: unknown;
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    raw = {};
  }
  const r = isObject(raw) ? raw : {};
  const records = isObject(r.records)
    ? Object.fromEntries(Object.entries(r.records).filter(([, v]) => typeof v === "number" && Number.isFinite(v))) as Record<string, number>
    : {};
  return {
    section: typeof r.section === "string" ? r.section : null,
    records,
    settings: isObject(r.settings) ? { ...r.settings } : {}
  };
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sin almacenamiento (modo privado, etc.): el juego funciona igual, solo no recuerda.
  }
}

// Opciones ya comprobadas: se comprueban una vez y después se devuelven las mismas, para que los cambios
// que hace la pantalla de Opciones se guarden con `saveState`.
const checkedSettings = new WeakSet<object>();

/**
 * Las opciones de una sección, comprobadas con su `load` (que da las de por defecto a lo que falte o no valga).
 * La primera vez se comprueban y se dejan en `state.settings`; las siguientes, se devuelven las mismas.
 */
export function sectionSettings<S extends object>(state: SavedState, id: string, load: (raw: unknown) => S): S {
  const current = state.settings[id];
  if (typeof current === "object" && current !== null && checkedSettings.has(current)) return current as S;
  const settings = load(current);
  checkedSettings.add(settings);
  state.settings[id] = settings;
  return settings;
}
