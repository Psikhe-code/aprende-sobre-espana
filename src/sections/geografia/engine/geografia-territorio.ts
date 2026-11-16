// Geografía: los datos del territorio (comunidades, provincias y municipios), cargados de los JSON.

import territorio from "../data/territorio.json";
import banderas from "../data/banderas.json";
import municipios from "../data/municipios.json";
import type { NameForm, Pools } from "./geografia-types";

// El formato de territorio.json está descrito en src/sections/geografia/data/schema/territorio.schema.json
// y los tests comprueban que el archivo lo cumple.

/** Un nombre escrito en cada una de sus formas. */
export type NameForms = Record<NameForm, string>;

export interface Comunidad {
  /** Código INE ("01" Andalucía … "17" La Rioja, "18" Ceuta, "19" Melilla). */
  id: string;
  /** Comunidad autónoma o ciudad autónoma (Ceuta y Melilla). */
  tipo: "comunidad" | "ciudad";
  nombre: NameForms;
  /** Cómo se nombra dentro de una frase, si no es igual que el nombre: "el País Vasco". */
  enFrase?: NameForms;
  /** Capital. Canarias tiene dos. */
  capital: NameForms | NameForms[];
  /**
   * Explicación propia para la pregunta de su capital. "{capital}" se sustituye por su nombre.
   * Si no la tiene, se genera una automática (ver geografia-questions.ts).
   */
  notaCapital?: string;
  /**
   * Trampa que sale siempre en la pregunta de su capital, por parecerse al nombre de la comunidad
   * (Andalucía, La Mancha, León) o de sus islas (Mallorca). Si hay varias, se sortea una en cada partida.
   */
  trampasCapital?: NameForms[];
  /**
   * Solo donde la capital se llama como la comunidad (Madrid, Murcia, Valencia, Ceuta, Melilla):
   * ciudades reales y conocidas, de la comunidad o cercanas, que salen como trampa en la pregunta de su capital.
   */
  ciudadesTrampa?: NameForms[];
  /** Curiosidad histórica sobre la capital (capital de España o de un antiguo reino). "{capital}" igual. */
  curiosidadCapital?: string;
}

export interface Provincia {
  /** Código INE ("01" Álava … "50" Zaragoza, "51" Ceuta, "52" Melilla). */
  id: string;
  nombre: NameForms;
  capital: NameForms;
  /** Código INE de su comunidad o ciudad autónoma. */
  comunidad: string;
  /** Códigos de las provincias con las que tiene frontera terrestre (vacío en las islas, Ceuta y Melilla). */
  vecinas: string[];
  /**
   * Solo en las provincias cuya capital no se llama como la provincia (y es lo que crea la pregunta):
   * códigos de provincias cercanas o que se confunden. Su capital y sus ciudades salen como trampa.
   */
  trampas?: string[];
  /**
   * Ciudades conocidas de la provincia, que no son capitales (Gijón en Asturias). Salen como trampa
   * en la pregunta de su capital y en las de las provincias que la tengan en `trampas`.
   */
  ciudades?: NameForms[];
  /** Explicación propia para la pregunta de su capital. "{capital}" se sustituye por su nombre. */
  notaCapital?: string;
  /** Curiosidad sobre la provincia, que sale en la pregunta «¿De qué comunidad autónoma es la provincia de…?». */
  curiosidad?: string;
}

/** Comunidades y ciudades autónomas. */
export const AUTONOMIAS = territorio.comunidades as Comunidad[];
/** Solo las 17 comunidades autónomas. */
export const COMUNIDADES = AUTONOMIAS.filter((c) => c.tipo === "comunidad");
export const PROVINCIAS: Provincia[] = territorio.provincias;

const autonomiaById = new Map(AUTONOMIAS.map((c) => [c.id, c]));
export function autonomia(id: string): Comunidad {
  const c = autonomiaById.get(id);
  if (!c) throw new Error(`No existe la comunidad o ciudad autónoma con código ${id}`);
  return c;
}

export const provinciasOf = (id: string) => PROVINCIAS.filter((p) => p.comunidad === id);

// ---------- Municipios (municipios.json) ----------

export interface Municipio {
  /** Código INE del municipio: cinco cifras, las dos primeras son las de su provincia ("36057", Vigo). */
  id: string;
  nombre: NameForms;
  /** Habitantes según el INE, en el año de POPULATION_YEAR. */
  poblacion: number;
  /** Puesto entre los municipios de su provincia, de más a menos habitantes (1 = el más poblado). */
  puesto: number;
  /** Curiosidad sobre el municipio. Obligatoria en los que no están entre los tres más poblados: por qué es conocido. */
  curiosidad?: string;
  /** Municipios de otras provincias que se llaman igual (código INE y habitantes). */
  mismoNombre?: { id: string; poblacion: number }[];
}
/** Municipios que salen en el juego, en orden de código INE. */
export const MUNICIPIOS: Municipio[] = municipios.municipios;
/** Año de las cifras de población (a 1 de enero), según el INE. */
export const POPULATION_YEAR: number = municipios.datosPoblacion.año;
/** Código de la provincia de un municipio: las dos primeras cifras de su código. */
export const municipioProvinciaId = (m: Municipio) => m.id.slice(0, 2);
/** Si el municipio es la capital de su provincia (se llama igual que la capital en territorio.json). */
export const isCapital = (m: Municipio) => provincia(municipioProvinciaId(m)).capital.oficial === m.nombre.oficial;

const provinciaById = new Map(PROVINCIAS.map((p) => [p.id, p]));
export function provincia(id: string): Provincia {
  const p = provinciaById.get(id);
  if (!p) throw new Error(`No existe la provincia con código ${id}`);
  return p;
}

/**
 * Comunidades o ciudades autónomas que tienen frontera con una lista de provincias,
 * sin contar la comunidad indicada. En orden de código.
 */
export function neighborAutonomias(provincias: Provincia[], except: string): string[] {
  const ids = new Set(provincias.flatMap((p) => p.vecinas.map((v) => provincia(v).comunidad)));
  ids.delete(except);
  return [...ids].sort();
}

/** Las capitales de una comunidad, cada una con todas sus formas. */
export const capitalesOf = (c: Comunidad): NameForms[] => ([] as NameForms[]).concat(c.capital);

/** "de Galicia", "del País Vasco", "de la Comunitat Valenciana"… */
export function deAutonomiaText(c: Comunidad, nameForm: NameForm): string {
  return ("de " + (c.enFrase ?? c.nombre)[nameForm]).replace(/^de el /, "del ");
}

const poolCache = new Map<NameForm, Pools>();

/**
 * Pools de respuestas: de aquí salen las opciones incorrectas según el `pool` de cada pregunta.
 * Como las preguntas, se generan una vez por forma y después se devuelven los mismos (congelados).
 */
export function poolsFor(nameForm: NameForm): Pools {
  let pools = poolCache.get(nameForm);
  if (!pools) {
    pools = Object.freeze(Object.fromEntries(Object.entries(generatePools(nameForm)).map(([k, v]) => [k, Object.freeze(v)]))) as Pools;
    poolCache.set(nameForm, pools);
  }
  return pools;
}

function generatePools(nameForm: NameForm): Record<string, string[]> {
  return {
    /** Comunidades y ciudades autónomas. */
    autonomia: AUTONOMIAS.map((c) => c.nombre[nameForm]),
    /** Capitales autonómicas y de provincia (incluidas Ceuta y Melilla). */
    anyCapital: [...new Set([
      ...AUTONOMIAS.flatMap((c) => capitalesOf(c).map((f) => f[nameForm])),
      ...PROVINCIAS.map((p) => p.capital[nameForm])
    ])],
    /** Las 52 provincias. */
    provincia: PROVINCIAS.map((p) => p.nombre[nameForm]),
    /** Provincias que tienen bandera (ver banderas.json, «provincias»). */
    provinciaWithBandera: banderas.provincias.map((b) => provincia(b.id).nombre[nameForm]),
    /** Todas las capitales, más las ciudades de las provincias y las ciudades trampa de las comunidades. */
    capitalOrCiudad: [...new Set([
      ...AUTONOMIAS.flatMap((c) => [...capitalesOf(c), ...(c.ciudadesTrampa ?? [])].map((f) => f[nameForm])),
      ...PROVINCIAS.flatMap((p) => [p.capital, ...(p.ciudades ?? [])].map((f) => f[nameForm]))
    ])]
  };
}
