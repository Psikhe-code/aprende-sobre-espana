// Examen de nacionalidad (prueba CCSE del Instituto Cervantes): preguntas de práctica y partidas.
// Las preguntas son propias, escritas sobre los mismos datos que las del Manual CCSE, con una nota
// que explica la respuesta y sus fuentes. No son las oficiales: el manual tiene derechos reservados.
// A diferencia de geografía, las opciones vienen escritas en los datos (no se generan).

import datos from "../data/ccse.json";
import { fitsFor, sizeFor, type RoundLength } from "./round";
import { shuffle } from "./random";
import type { Fuente, PreguntaJugable, Rng } from "./types";

export interface Tarea {
  numero: number;
  nombre: string;
}

export interface PreguntaCcse {
  id: string;
  tarea: number;
  /** Número de la pregunta del manual sobre el mismo dato. */
  referencia: number;
  pregunta: string;
  opciones: string[];
  /** Si las opciones salen siempre en este orden (p. ej. «Verdadero» y «Falso»). */
  ordenFijo?: boolean;
  respuesta: string;
  nota: string;
  fuentes: Fuente[];
}

/** Pregunta del examen preparada para jugar: con sus opciones en el orden de esta partida. */
export interface PreguntaCcseJugable extends PreguntaJugable {
  tarea: number;
}

export const TAREAS: readonly Tarea[] = datos.tareas;
export const PREGUNTAS_CCSE: readonly PreguntaCcse[] = datos.preguntas;
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
