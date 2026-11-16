// Examen de nacionalidad (prueba CCSE del Instituto Cervantes): preguntas y partidas.
// ccse.json es una plantilla con una entrada por cada pregunta del Manual CCSE (las 300). El texto
// (enunciado, opciones y letra de la respuesta) lo rellena el usuario; la nota y las fuentes son
// propias. Solo salen en el juego las completas; las vacías se saltan, y las que están a medias
// las señalan los tests (ver entryStatus).
// A diferencia de geografía, las opciones vienen escritas en los datos (no se generan).

import datos from "../data/ccse.json";
import { fitsFor, sizeFor, type RoundLength } from "../../../common/engine/common-round-settings";
import { shuffle, notStartingWith } from "../../../common/engine/common-random";
import type { Fuente, PlayableQuestion, Rng } from "../../../common/engine/common-types";

export interface Tarea {
  numero: number;
  nombre: string;
}

/** Una entrada de ccse.json, tal como está escrita (puede estar vacía o a medias). */
export interface CcseEntry {
  id: string;
  tarea: number;
  /** Número de la pregunta en el Manual CCSE. */
  referencia: number;
  pregunta: string;
  /** Opciones en el orden del manual (a, b, c); la tercera, vacía si solo hay dos. */
  opciones: string[];
  /** Letra de la opción correcta, o vacía. */
  respuesta: string;
  ordenFijo?: boolean;
  nota: string;
  fuentes: Fuente[];
}

/** Pregunta completa, lista para jugar: con las opciones que tienen texto y la respuesta escrita entera. */
export interface CcseQuestion {
  id: string;
  tarea: number;
  reference: number;
  text: string;
  options: string[];
  /** Si las opciones salen siempre en este orden (p. ej. «Verdadero» y «Falso»). */
  fixedOrder?: boolean;
  answer: string;
  why: string;
  sources: Fuente[];
}

export const ANSWER_LETTERS = ["a", "b", "c"] as const;

export type EntryStatus =
  | { status: "empty" }
  | { status: "complete"; question: CcseQuestion }
  | { status: "partial"; missing: string[] };

const TRUE_FALSE = ["Verdadero", "Falso"];

/**
 * Si una entrada está vacía (todavía sin rellenar), completa o a medias (y entonces, qué le falta).
 * Los espacios de más al principio o al final del texto no cuentan.
 */
export function entryStatus(e: CcseEntry): EntryStatus {
  const text = e.pregunta.trim();
  const options = e.opciones.map((o) => o.trim());
  const filled = options.filter(Boolean);
  if (!text && !filled.length && !e.respuesta) return { status: "empty" };
  const missing: string[] = [];
  if (!text) missing.push("el enunciado («pregunta»)");
  if (filled.length < 2) missing.push("al menos dos opciones");
  if (options.some((o, i) => !o && options.slice(i + 1).some(Boolean))) missing.push("que las opciones vacías vayan al final");
  if (new Set(filled).size !== filled.length) missing.push("que las opciones sean distintas (hay dos iguales)");
  const i = ANSWER_LETTERS.indexOf(e.respuesta as (typeof ANSWER_LETTERS)[number]);
  if (i < 0) missing.push("la letra de la respuesta («a», «b» o «c»)");
  else if (!options[i]) missing.push(`la opción ${e.respuesta}, que es la respuesta`);
  if (missing.length) return { status: "partial", missing };
  const fixedOrder = e.ordenFijo || (filled.length === 2 && filled.every((o, j) => o === TRUE_FALSE[j]));
  return {
    status: "complete",
    question: {
      id: e.id,
      tarea: e.tarea,
      reference: e.referencia,
      text: text,
      options: filled,
      ...(fixedOrder ? { fixedOrder: true } : {}),
      answer: options[i],
      why: e.nota.trim(),
      sources: e.fuentes
    }
  };
}

export const TAREAS: readonly Tarea[] = datos.tareas;
/** Todas las entradas de la plantilla, rellenas o no. */
export const CCSE_ENTRIES: readonly CcseEntry[] = datos.preguntas;
/** Las preguntas que ya se pueden jugar. */
export const CCSE_QUESTIONS: readonly CcseQuestion[] = CCSE_ENTRIES.flatMap((e) => {
  const r = entryStatus(e);
  return r.status === "complete" ? [r.question] : [];
});
export const TAREA_IDS: readonly number[] = TAREAS.map((t) => t.numero);

export const tarea = (tareaNumber: number) => TAREAS.find((t) => t.numero === tareaNumber);

/** Cómo se nombra una tarea encima de sus preguntas y en el inicio de la sección: «Tarea 1 · Gobierno, legislación…». */
export const tareaName = (t: Tarea) => `Tarea ${t.numero} · ${t.nombre}`;

/** Preguntas de las tareas marcadas. */
export const tareaQuestions = (tareas: readonly number[]) => CCSE_QUESTIONS.filter((p) => tareas.includes(p.tarea));

/** Tareas que ya tienen preguntas (las demás salen en Opciones como «próximamente»). */
export const tareasWithQuestions = () => TAREA_IDS.filter((n) => CCSE_QUESTIONS.some((p) => p.tarea === n));

/** Cuántas preguntas tendrá una partida con estas tareas (ver sizeFor). */
export const roundSize = (tareas: readonly number[], length: RoundLength) => sizeFor(length, tareaQuestions(tareas).length);

/** Si se puede elegir este número de preguntas con estas tareas (ver fitsFor). */
export const lengthFits = (length: RoundLength, tareas: readonly number[]) => fitsFor(length, tareaQuestions(tareas).length);

/** Pregunta del examen preparada para jugar: con sus opciones en el orden de esta partida. */
export interface CcseRoundQuestion extends PlayableQuestion {
  tarea: number;
}

const tareaLabel = (tareaNumber: number) => { const t = tarea(tareaNumber); return t ? tareaName(t) : ""; };

/** Prepara una pregunta para jugar: baraja las opciones (salvo las de orden fijo). */
export function prepare(p: CcseQuestion, rng: Rng = Math.random): CcseRoundQuestion {
  return {
    id: p.id,
    tarea: p.tarea,
    text: p.text,
    answer: p.answer,
    options: p.fixedOrder ? [...p.options] : shuffle([...p.options], rng),
    label: tareaLabel(p.tarea),
    why: p.why,
    aliases: [],
    sources: p.sources
  };
}

export interface CcseRoundSettings {
  tareas: readonly number[];
  roundLength?: RoundLength;
  rng?: Rng;
}

/** Preguntas de una partida: al azar entre las de las tareas marcadas, sin repetir ninguna. */
export function buildRound({ tareas, roundLength: length = 10, rng = Math.random }: CcseRoundSettings): CcseRoundQuestion[] {
  const all = shuffle([...tareaQuestions(tareas)], rng);
  return all.slice(0, sizeFor(length, all.length)).map((p) => prepare(p, rng));
}

/**
 * Otra vuelta a la baraja en una partida sin límite: todas las preguntas de nuevo, barajadas.
 * La primera nunca es la última que acaba de salir, para que no se repita una detrás de otra.
 */
export function reshuffleRound(settings: CcseRoundSettings, lastId?: string): CcseRoundQuestion[] {
  return notStartingWith(buildRound({ ...settings, roundLength: "sinLimite" }), lastId);
}

/** Repaso de fallos: las mismas preguntas, con las opciones barajadas de nuevo. */
export function buildReviewRound(misses: readonly PlayableQuestion[], rng: Rng = Math.random): CcseRoundQuestion[] {
  return misses.flatMap((f) => {
    const p = CCSE_QUESTIONS.find((x) => x.id === f.id);
    return p ? [prepare(p, rng)] : [];
  });
}
