// Examen de nacionalidad (prueba CCSE del Instituto Cervantes): preguntas y partidas.
// ccse.json es una plantilla con una entrada por cada pregunta del Manual CCSE (las 300). El texto
// (enunciado, opciones y letra de la respuesta) lo rellena el usuario; la nota y las fuentes son
// propias. Solo salen en el juego las completas; las vacías se saltan, y las que están a medias
// las señalan los tests (ver estadoPregunta).
// A diferencia de geografía, las opciones vienen escritas en los datos (no se generan).

import datos from "../data/ccse.json";
import { fitsFor, sizeFor, type RoundLength } from "./round";
import { shuffle } from "./random";
import type { Fuente, PreguntaJugable, Rng } from "./types";

export interface Tarea {
  numero: number;
  nombre: string;
}

/** Una entrada de ccse.json, tal como está escrita (puede estar vacía o a medias). */
export interface EntradaCcse {
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
export interface PreguntaCcse {
  id: string;
  tarea: number;
  referencia: number;
  pregunta: string;
  opciones: string[];
  /** Si las opciones salen siempre en este orden (p. ej. «Verdadero» y «Falso»). */
  ordenFijo?: boolean;
  respuesta: string;
  nota: string;
  fuentes: Fuente[];
}

export const LETRAS = ["a", "b", "c"] as const;

export type EstadoPregunta =
  | { estado: "vacia" }
  | { estado: "completa"; pregunta: PreguntaCcse }
  | { estado: "aMedias"; faltan: string[] };

const VERDADERO_FALSO = ["Verdadero", "Falso"];

/**
 * Si una entrada está vacía (todavía sin rellenar), completa o a medias (y entonces, qué le falta).
 * Los espacios de más al principio o al final del texto no cuentan.
 */
export function estadoPregunta(e: EntradaCcse): EstadoPregunta {
  const texto = e.pregunta.trim();
  const opciones = e.opciones.map((o) => o.trim());
  const llenas = opciones.filter(Boolean);
  if (!texto && !llenas.length && !e.respuesta) return { estado: "vacia" };
  const faltan: string[] = [];
  if (!texto) faltan.push("el enunciado («pregunta»)");
  if (llenas.length < 2) faltan.push("al menos dos opciones");
  if (opciones.some((o, i) => !o && opciones.slice(i + 1).some(Boolean))) faltan.push("que las opciones vacías vayan al final");
  if (new Set(llenas).size !== llenas.length) faltan.push("que las opciones sean distintas (hay dos iguales)");
  const i = LETRAS.indexOf(e.respuesta as (typeof LETRAS)[number]);
  if (i < 0) faltan.push("la letra de la respuesta («a», «b» o «c»)");
  else if (!opciones[i]) faltan.push(`la opción ${e.respuesta}, que es la respuesta`);
  if (faltan.length) return { estado: "aMedias", faltan };
  const fija = e.ordenFijo || (llenas.length === 2 && llenas.every((o, j) => o === VERDADERO_FALSO[j]));
  return {
    estado: "completa",
    pregunta: {
      id: e.id,
      tarea: e.tarea,
      referencia: e.referencia,
      pregunta: texto,
      opciones: llenas,
      ...(fija ? { ordenFijo: true } : {}),
      respuesta: opciones[i],
      nota: e.nota.trim(),
      fuentes: e.fuentes
    }
  };
}

export const TAREAS: readonly Tarea[] = datos.tareas;
/** Todas las entradas de la plantilla, rellenas o no. */
export const ENTRADAS_CCSE: readonly EntradaCcse[] = datos.preguntas;
/** Las preguntas que ya se pueden jugar. */
export const PREGUNTAS_CCSE: readonly PreguntaCcse[] = ENTRADAS_CCSE.flatMap((e) => {
  const r = estadoPregunta(e);
  return r.estado === "completa" ? [r.pregunta] : [];
});
export const TAREA_IDS: readonly number[] = TAREAS.map((t) => t.numero);

export const tarea = (numero: number) => TAREAS.find((t) => t.numero === numero);

/** Preguntas de las tareas marcadas. */
export const preguntasDe = (tareas: readonly number[]) => PREGUNTAS_CCSE.filter((p) => tareas.includes(p.tarea));

/** Tareas que ya tienen preguntas (las demás salen en Opciones como «próximamente»). */
export const tareasConPreguntas = () => TAREA_IDS.filter((n) => PREGUNTAS_CCSE.some((p) => p.tarea === n));

/** Cuántas preguntas tendrá una partida con estas tareas (ver sizeFor). */
export const tamanoCcse = (tareas: readonly number[], length: RoundLength) => sizeFor(length, preguntasDe(tareas).length);

/** Si se puede elegir este número de preguntas con estas tareas (ver fitsFor). */
export const cabeCcse = (length: RoundLength, tareas: readonly number[]) => fitsFor(length, preguntasDe(tareas).length);

/** Pregunta del examen preparada para jugar: con sus opciones en el orden de esta partida. */
export interface PreguntaCcseJugable extends PreguntaJugable {
  tarea: number;
}

/** Prepara una pregunta para jugar: baraja las opciones (salvo las de orden fijo). */
export function jugable(p: PreguntaCcse, rng: Rng = Math.random): PreguntaCcseJugable {
  return {
    id: p.id,
    tarea: p.tarea,
    text: p.pregunta,
    answer: p.respuesta,
    options: p.ordenFijo ? [...p.opciones] : shuffle([...p.opciones], rng),
    why: p.nota,
    aliases: [],
    fuentes: p.fuentes
  };
}

export interface AjustesCcse {
  tareas: readonly number[];
  length?: RoundLength;
  rng?: Rng;
}

/** Preguntas de una partida: al azar entre las de las tareas marcadas, sin repetir ninguna. */
export function partidaCcse({ tareas, length = 10, rng = Math.random }: AjustesCcse): PreguntaCcseJugable[] {
  const todas = shuffle([...preguntasDe(tareas)], rng);
  return todas.slice(0, sizeFor(length, todas.length)).map((p) => jugable(p, rng));
}

/**
 * Otra vuelta a la baraja en una partida sin límite: todas las preguntas de nuevo, barajadas.
 * La primera nunca es la última que acaba de salir, para que no se repita una detrás de otra.
 */
export function otraVueltaCcse(ajustes: AjustesCcse, ultimaId?: string): PreguntaCcseJugable[] {
  const vuelta = partidaCcse({ ...ajustes, length: "sinLimite" });
  if (vuelta.length > 1 && vuelta[0].id === ultimaId) [vuelta[0], vuelta[1]] = [vuelta[1], vuelta[0]];
  return vuelta;
}

/** Repaso de fallos: las mismas preguntas, con las opciones barajadas de nuevo. */
export function repasoCcse(fallos: readonly PreguntaJugable[], rng: Rng = Math.random): PreguntaCcseJugable[] {
  return fallos.flatMap((f) => {
    const p = PREGUNTAS_CCSE.find((x) => x.id === f.id);
    return p ? [jugable(p, rng)] : [];
  });
}
