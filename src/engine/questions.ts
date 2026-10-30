import type { PreguntaJSON, Question } from "./types";
import {
  PROVINCIAS, COMUNIDADES, CAPITAL_AUTONOMICA, NOMBRE_CON_ARTICULO, NOTA_CAPITAL_AUTONOMICA, provinciasDe
} from "./territory";
import banderas from "../data/banderas.json";

/** Convierte una pregunta del JSON al formato del motor. */
export function fromJSON(p: PreguntaJSON): Question {
  return {
    text: p.pregunta,
    answer: p.respuesta,
    type: p.tipo,
    traps: p.trampas ?? [],
    why: p.explicacion,
    exclude: p.excluir ?? [],
    range: p.rango
  };
}

export function listar(items: string[]): string {
  return items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
}

// ---------- Preguntas generadas a partir del territorio ----------

/** "¿A qué comunidad pertenece la provincia de X?" (solo comunidades con más de una provincia). */
export function provinceCommunityQuestions(): Question[] {
  return PROVINCIAS.filter((p) => provinciasDe(p.comunidad).length > 1).map((p) => {
    const hermanas = provinciasDe(p.comunidad).map((x) => x.provincia);
    return fromJSON({
      pregunta: `¿A qué comunidad autónoma pertenece la provincia de ${p.provincia}?`,
      respuesta: p.comunidad,
      tipo: "comunidad",
      explicacion: `${p.comunidad} tiene ${hermanas.length} provincias: ${listar(hermanas)}.`
    });
  });
}

/**
 * Capitales autonómicas.
 * Pool: todas las capitales (autonómicas y de provincia).
 * Trampas: las capitales de provincia de la misma comunidad.
 */
export function regionalCapitalQuestions(): Question[] {
  return Object.entries(CAPITAL_AUTONOMICA).map(([cc, cap]) => {
    const correctas = ([] as string[]).concat(cap);
    const trampas = provinciasDe(cc).map((p) => p.capital).filter((c) => !correctas.includes(c));
    if (Array.isArray(cap)) {
      // Capitalidad compartida: las dos son correctas, así que ninguna sale como incorrecta.
      return fromJSON({
        pregunta: `¿Cuál de estas ciudades es una de las dos capitales de ${cc}?`,
        respuesta: cap, tipo: "capitalCualquiera", trampas, excluir: cap,
        explicacion: NOTA_CAPITAL_AUTONOMICA[cc]
      });
    }
    const de = ("de " + (NOMBRE_CON_ARTICULO[cc] ?? cc)).replace(/^de el /, "del ");
    return fromJSON({
      pregunta: `¿Cuál es la capital ${de}?`,
      respuesta: cap, tipo: "capitalCualquiera", trampas,
      explicacion: NOTA_CAPITAL_AUTONOMICA[cc] ?? `${cap} es la capital ${de}.`
    });
  });
}

/**
 * Capitales de provincia: las 50, con el mismo formato.
 * Misma estructura que las autonómicas: pool de todas las capitales; trampas de la misma comunidad.
 */
export function provincialCapitalQuestions(): Question[] {
  return PROVINCIAS.map((p) => fromJSON({
    pregunta: `¿Cuál es la capital de la provincia de ${p.provincia}?`,
    respuesta: p.capital,
    tipo: "capitalCualquiera",
    trampas: provinciasDe(p.comunidad).map((x) => x.capital).filter((c) => c !== p.capital),
    explicacion: `La capital de la provincia de ${p.provincia} es ${p.capital}.`
  }));
}

// ---------- Banderas ----------

export interface BanderaInfo { archivo: string; trampas: string[]; nota: string }
export const BANDERAS: Record<string, BanderaInfo> = banderas;

export function flagQuestions(): Question[] {
  return COMUNIDADES.map((cc) => ({
    ...fromJSON({
      pregunta: "¿De qué comunidad autónoma es esta bandera?",
      respuesta: cc, tipo: "comunidad",
      trampas: BANDERAS[cc].trampas,
      explicacion: BANDERAS[cc].nota
    }),
    flag: cc
  }));
}
