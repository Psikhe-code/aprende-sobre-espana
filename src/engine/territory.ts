import territorio from "../data/territorio.json";
import poolsJSON from "../data/pools.json";
import type { Pools } from "./types";

export interface Provincia {
  provincia: string;
  capital: string;
  comunidad: string;
}

export const PROVINCIAS: Provincia[] = territorio.provincias;

/** Comunidades autónomas, en el orden en que aparecen sus provincias. */
export const COMUNIDADES: string[] = [...new Set(PROVINCIAS.map((p) => p.comunidad))];

/** Capital de cada comunidad. Canarias tiene dos. */
export const CAPITAL_AUTONOMICA: Record<string, string | string[]> = territorio.capitalesAutonomicas;

/** "el Principado de Asturias", "la Comunidad de Madrid"… para construir frases. */
export const NOMBRE_CON_ARTICULO: Record<string, string> = territorio.nombreConArticulo;

export const NOTA_CAPITAL_AUTONOMICA: Record<string, string> = territorio.notasCapitalAutonomica;

export const CAPITALES_PROVINCIA = PROVINCIAS.map((p) => p.capital);
export const CAPITALES_AUTONOMICAS = Object.values(CAPITAL_AUTONOMICA).flat();

export const provinciasDe = (comunidad: string) => PROVINCIAS.filter((p) => p.comunidad === comunidad);

/**
 * Todos los pools de respuestas: los de pools.json más los que se derivan del territorio.
 */
export const POOLS: Pools = {
  ...(poolsJSON as Pools),
  provincia: PROVINCIAS.map((p) => p.provincia),
  capital: CAPITALES_PROVINCIA,
  ciudad: [...new Set([...CAPITALES_PROVINCIA, ...(poolsJSON as Pools).ciudad])],
  comunidad: COMUNIDADES,
  /** Capitales autonómicas y de provincia: el pool de las dos categorías de capitales. */
  capitalCualquiera: [...new Set([...CAPITALES_AUTONOMICAS, ...CAPITALES_PROVINCIA])],
  isla: [...(poolsJSON as Pools).islaCan, ...(poolsJSON as Pools).islaBal]
};
