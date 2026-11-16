// Simulacro del examen de nacionalidad: como la prueba CCSE real, 25 preguntas repartidas por tareas
// (10 de la Tarea 1, 3 de la 2, 2 de la 3, 3 de la 4 y 7 de la 5), 45 minutos para todo y «apto» con
// 15 aciertos. Mientras se hace, no se dice si una respuesta es correcta: se puede ir y volver entre
// las preguntas y cambiar las respuestas hasta entregar. Sin nada de interfaz: la pantalla está en
// ui/ccse-simulacro-screen.ts.

import { prepare, CCSE_QUESTIONS, type CcseQuestion, type CcseRoundQuestion } from "./ccse-questions";
import { shuffle } from "../../../common/engine/common-random";
import type { Rng } from "../../../common/engine/common-types";
import { SIMULACRO_APTO_HITS, SIMULACRO_RECORD_KEY, SIMULACRO_DISTRIBUTION } from "./ccse-simulacro-rules";

export * from "./ccse-simulacro-rules";

/** Si hay preguntas de sobra en cada tarea para hacer el simulacro. */
export const canDoSimulacro = (questions: readonly CcseQuestion[] = CCSE_QUESTIONS) =>
  SIMULACRO_DISTRIBUTION.every((r) => questions.filter((p) => p.tarea === r.tarea).length >= r.questionCount);

/**
 * Preguntas de un simulacro: las de cada tarea, al azar, y por orden de tareas (primero las 10 de la
 * Tarea 1, después las 3 de la 2…), como en la prueba. Las opciones se barajan, salvo las de orden fijo.
 */
export function simulacroQuestions(rng: Rng = Math.random, questions: readonly CcseQuestion[] = CCSE_QUESTIONS): CcseRoundQuestion[] {
  return SIMULACRO_DISTRIBUTION.flatMap((r) =>
    shuffle(questions.filter((p) => p.tarea === r.tarea), rng).slice(0, r.questionCount).map((p) => prepare(p, rng)));
}

export interface SimulacroResult {
  hits: number;
  total: number;
  apto: boolean;
  /** Preguntas falladas o sin responder (`given` es null), en el orden del examen. */
  misses: { question: CcseRoundQuestion; given: string | null }[];
  /** Aciertos de cada tarea, en el orden del reparto. */
  byTarea: { tarea: number; hits: number; total: number }[];
}

/** Un simulacro en marcha: qué pregunta se ve, qué se ha respondido en cada una y la entrega. */
export class Simulacro {
  /** Respuesta elegida en cada pregunta, o null si aún no se ha respondido. Solo se cambia con `elegir`. */
  private readonly chosen: (string | null)[];
  private i = 0;
  private result: SimulacroResult | null = null;

  constructor(readonly questions: readonly CcseRoundQuestion[]) {
    this.chosen = questions.map(() => null);
  }

  get index(): number { return this.i; }
  /** Respuesta elegida en cada pregunta, o null si aún no se ha respondido. Desde fuera, solo para leerla. */
  get answers(): readonly (string | null)[] { return this.chosen; }
  get current(): CcseRoundQuestion { return this.questions[this.i]; }
  get total(): number { return this.questions.length; }
  get submitted(): boolean { return this.result !== null; }
  get answeredCount(): number { return this.answers.filter((r) => r !== null).length; }
  get unansweredCount(): number { return this.total - this.answeredCount; }

  /** Va a otra pregunta (si existe). */
  goTo(i: number): void {
    if (i >= 0 && i < this.total) this.i = i;
  }

  /** Elige una opción en la pregunta que se ve; se puede cambiar cuantas veces se quiera hasta entregar. */
  answer(option: string): void {
    if (this.submitted || !this.current.options.includes(option)) return;
    this.chosen[this.i] = option;
  }

  /** Entrega el examen (también cuando se acaba el tiempo): lo que no se ha respondido cuenta como fallo. */
  submit(): SimulacroResult {
    if (this.result) return this.result;
    const correct = this.questions.map((q, j) => this.answers[j] === q.answer);
    const hits = correct.filter(Boolean).length;
    const tareas = [...new Set(this.questions.map((q) => q.tarea))];
    this.result = {
      hits: hits,
      total: this.total,
      apto: hits >= SIMULACRO_APTO_HITS,
      misses: this.questions.flatMap((q, j) => (correct[j] ? [] : [{ question: q, given: this.answers[j] }])),
      byTarea: tareas.map((t) => {
        const js = this.questions.flatMap((q, j) => (q.tarea === t ? [j] : []));
        return { tarea: t, hits: js.filter((j) => correct[j]).length, total: js.length };
      })
    };
    return this.result;
  }
}

/** Apunta el resultado si es el mejor hasta ahora. Devuelve los récords (cambiados o no) y el mejor resultado. */
export function applySimulacroRecord(records: Record<string, number>, hits: number) {
  const previous = records[SIMULACRO_RECORD_KEY];
  const isNewRecord = previous == null || hits > previous;
  return { records: isNewRecord ? { ...records, [SIMULACRO_RECORD_KEY]: hits } : records, isNewRecord, record: isNewRecord ? hits : previous };
}
