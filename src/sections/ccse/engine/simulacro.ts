// Simulacro del examen de nacionalidad: como la prueba CCSE real, 25 preguntas repartidas por tareas
// (10 de la Tarea 1, 3 de la 2, 2 de la 3, 3 de la 4 y 7 de la 5), 45 minutos para todo y «apto» con
// 15 aciertos. Mientras se hace, no se dice si una respuesta es correcta: se puede ir y volver entre
// las preguntas y cambiar las respuestas hasta entregar. Sin nada de interfaz: la pantalla está en
// ui/simulacro-screen.ts.

import { jugable, PREGUNTAS_CCSE, type PreguntaCcse, type PreguntaCcseJugable } from "./questions";
import { shuffle } from "../../../common/engine/random";
import type { Rng } from "../../../common/engine/types";
import { APROBADO_SIMULACRO, CLAVE_SIMULACRO, REPARTO_SIMULACRO } from "./simulacro-rules";

export * from "./simulacro-rules";

/** Si hay preguntas de sobra en cada tarea para hacer el simulacro. */
export const simulacroPosible = (preguntas: readonly PreguntaCcse[] = PREGUNTAS_CCSE) =>
  REPARTO_SIMULACRO.every((r) => preguntas.filter((p) => p.tarea === r.tarea).length >= r.preguntas);

/**
 * Preguntas de un simulacro: las de cada tarea, al azar, y por orden de tareas (primero las 10 de la
 * Tarea 1, después las 3 de la 2…), como en la prueba. Las opciones se barajan, salvo las de orden fijo.
 */
export function preguntasSimulacro(rng: Rng = Math.random, preguntas: readonly PreguntaCcse[] = PREGUNTAS_CCSE): PreguntaCcseJugable[] {
  return REPARTO_SIMULACRO.flatMap((r) =>
    shuffle(preguntas.filter((p) => p.tarea === r.tarea), rng).slice(0, r.preguntas).map((p) => jugable(p, rng)));
}

export interface ResultadoSimulacro {
  aciertos: number;
  total: number;
  apto: boolean;
  /** Preguntas falladas o sin responder (`given` es null), en el orden del examen. */
  fallos: { question: PreguntaCcseJugable; given: string | null }[];
  /** Aciertos de cada tarea, en el orden del reparto. */
  porTarea: { tarea: number; aciertos: number; total: number }[];
}

/** Un simulacro en marcha: qué pregunta se ve, qué se ha respondido en cada una y la entrega. */
export class Simulacro {
  /** Respuesta elegida en cada pregunta, o null si aún no se ha respondido. Solo se cambia con `elegir`. */
  private readonly elegidas: (string | null)[];
  private i = 0;
  private resultado: ResultadoSimulacro | null = null;

  constructor(readonly preguntas: readonly PreguntaCcseJugable[]) {
    this.elegidas = preguntas.map(() => null);
  }

  get indice(): number { return this.i; }
  /** Respuesta elegida en cada pregunta, o null si aún no se ha respondido. Desde fuera, solo para leerla. */
  get respuestas(): readonly (string | null)[] { return this.elegidas; }
  get actual(): PreguntaCcseJugable { return this.preguntas[this.i]; }
  get total(): number { return this.preguntas.length; }
  get entregado(): boolean { return this.resultado !== null; }
  get respondidas(): number { return this.respuestas.filter((r) => r !== null).length; }
  get sinResponder(): number { return this.total - this.respondidas; }

  /** Va a otra pregunta (si existe). */
  ir(i: number): void {
    if (i >= 0 && i < this.total) this.i = i;
  }

  /** Elige una opción en la pregunta que se ve; se puede cambiar cuantas veces se quiera hasta entregar. */
  responder(opcion: string): void {
    if (this.entregado || !this.actual.options.includes(opcion)) return;
    this.elegidas[this.i] = opcion;
  }

  /** Entrega el examen (también cuando se acaba el tiempo): lo que no se ha respondido cuenta como fallo. */
  entregar(): ResultadoSimulacro {
    if (this.resultado) return this.resultado;
    const bien = this.preguntas.map((q, j) => this.respuestas[j] === q.answer);
    const aciertos = bien.filter(Boolean).length;
    const tareas = [...new Set(this.preguntas.map((q) => q.tarea))];
    this.resultado = {
      aciertos,
      total: this.total,
      apto: aciertos >= APROBADO_SIMULACRO,
      fallos: this.preguntas.flatMap((q, j) => (bien[j] ? [] : [{ question: q, given: this.respuestas[j] }])),
      porTarea: tareas.map((t) => {
        const js = this.preguntas.flatMap((q, j) => (q.tarea === t ? [j] : []));
        return { tarea: t, aciertos: js.filter((j) => bien[j]).length, total: js.length };
      })
    };
    return this.resultado;
  }
}

/** Apunta el resultado si es el mejor hasta ahora. Devuelve los récords (cambiados o no) y el mejor resultado. */
export function apuntarSimulacro(best: Record<string, number>, aciertos: number) {
  const anterior = best[CLAVE_SIMULACRO];
  const nuevo = anterior == null || aciertos > anterior;
  return { best: nuevo ? { ...best, [CLAVE_SIMULACRO]: aciertos } : best, nuevo, mejor: nuevo ? aciertos : anterior };
}
