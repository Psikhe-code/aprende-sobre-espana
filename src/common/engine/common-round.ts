/**
 * @fileoverview Describe la lógica de las partidas, independiente de la interfaz.
 */

import type { PlayableQuestion } from "./common-types";

/** Resultado de una pregunta respondida o agotada por tiempo. */
export interface AnswerResult {
  correct: boolean;
  correctAnswer: string;

  /** Respuesta del jugador, o null si se agotó el tiempo. */
  givenAnswer: string | null;
}

/** Pregunta fallada o sin responder durante una partida. */
export interface Miss {
  question: PlayableQuestion;

  /** Respuesta del jugador, o null si se agotó el tiempo. */
  givenAnswer: string | null;
}

/** Resultado global de una partida. */
export interface RoundResult {
  hits: number;

  /** Número de preguntas de la partida; en partidas sin límite, solo las respondidas. */
  total: number;

  misses: Miss[];

  bestStreak: number;

  /** Indica si es una partida de repaso de fallos. */
  review: boolean;

  /** Indica si es una partida sin límite de preguntas. */
  unlimited: boolean;

  /** Indica si el resultado cuenta para récords. */
  counts: boolean;
}

/** Gestiona el estado y la progresión de una partida. */
export class Round {
  private readonly internalQuestions: PlayableQuestion[];

  /** Indica si es una partida de repaso de fallos. */
  readonly review: boolean;

  /** Indica si es una partida sin límite de preguntas. */
  readonly unlimited: boolean;

  /** Número de preguntas de la selección, que se repiten en cada vuelta del modo sin límite. */
  readonly questionsPerCycle: number;

  private internalIndex = 0;
  private internalHits = 0;
  private internalStreak = 0;
  private bestStreak = 0;
  private readonly internalResults: boolean[] = [];
  private readonly missList: Miss[] = [];
  private stopped = false;

  constructor(questions: readonly PlayableQuestion[], options: { review?: boolean; unlimited?: boolean } = {}) {
    if (questions.length === 0) throw new Error("Una partida necesita al menos una pregunta");

    this.internalQuestions = [...questions];
    this.review = options.review ?? false;
    this.unlimited = options.unlimited ?? false;
    this.questionsPerCycle = questions.length;
  }

  get questions(): readonly PlayableQuestion[] { return this.internalQuestions; }
  get total() { return this.questions.length; }
  get index() { return this.internalIndex; }
  get currentQuestion(): PlayableQuestion { return this.questions[this.internalIndex]; }

  get hits() { return this.internalHits; }
  get streak() { return this.internalStreak; }
  /** Resultado de cada pregunta ya respondida (true = acierto). */
  get results(): readonly boolean[] { return this.internalResults; }

  get answered() { return this.internalResults.length > this.internalIndex; }
  get isLast() { return this.internalIndex === this.questions.length - 1; }

  /** Sin límite: indica que se ha completado la vuelta y se puede añadir otra. */
  get endOfCycle() { return this.unlimited && !this.stopped && this.isLast && this.answered; }

  /** Normal: al responder la última pregunta. Sin límite: al detener la partida. */
  get finished() { return this.unlimited ? this.stopped : this.isLast && this.answered; }

  /** Registra la respuesta del jugador a la pregunta actual. */
  answer(givenAnswer: string): AnswerResult {
    return this.resolve(givenAnswer);
  }

  /** Registra el agotamiento del tiempo como fallo y rompe la racha. */
  timeout(): AnswerResult {
    return this.resolve(null);
  }

  /** Implementación común para registrar una respuesta o el agotamiento del tiempo. */
  private resolve(givenAnswer: string | null): AnswerResult {
    if (this.stopped) throw new Error("La partida ya está terminada");
    if (this.answered) throw new Error("Esta pregunta ya está respondida");

    const question = this.currentQuestion;
    const correct = givenAnswer !== null && givenAnswer === question.correctAnswer;

    this.internalResults.push(correct);
    if (correct) {
      this.internalHits++;
      this.internalStreak++;
      this.bestStreak = Math.max(this.bestStreak, this.internalStreak);
    } else {
      this.internalStreak = 0;
      this.missList.push({ question, givenAnswer });
    }
    return { correct, correctAnswer: question.correctAnswer, givenAnswer };
  }

  /** Pasa a la siguiente pregunta. Devuelve false si ya no quedan. */
  next(): boolean {
    if (this.stopped) throw new Error("La partida ya está terminada");
    if (!this.answered) throw new Error("Hay que responder antes de pasar");
    if (this.isLast) return false;
    this.internalIndex++;
    return true;
  }

  /** En «Sin límite»: añade otra vuelta al final, para seguir jugando. */
  append(more: readonly PlayableQuestion[]): void {
    if (!this.unlimited) throw new Error("Solo una partida sin límite puede seguir");
    if (this.stopped) throw new Error("La partida ya está terminada");
    this.internalQuestions.push(...more);
  }

  /** En «Sin límite»: termina la partida. Si hay pregunta sin responder, no cuenta. */
  stop(): void {
    if (!this.unlimited) throw new Error("Solo se termina así una partida sin límite");
    this.stopped = true;
  }

  /** Construye el resultado de la partida sin modificar su estado. */
  result(): RoundResult {
    const answeredCount = this.internalResults.length;
    return {
      hits: this.internalHits,
      // Sin límite: las preguntas respondidas, no las que había preparadas.
      total: this.unlimited ? answeredCount : this.total,
      misses: [...this.missList],
      bestStreak: this.bestStreak,
      review: this.review,
      unlimited: this.unlimited,
      counts: !this.review && this.finished && (!this.unlimited || answeredCount > 0)
    };
  }
}

/** Lo que se compara para el récord: los aciertos o, en una partida sin límite, la mejor racha. */
export const recordValue = (result: RoundResult) => (result.unlimited ? result.bestStreak : result.hits);

/**
 * Actualiza los récords con el resultado de una partida (aciertos; mejor racha si es sin límite).
 * Devuelve los récords nuevos (sin modificar los anteriores) y si se ha batido el récord.
 */
export function applyRecord(records: Record<string, number>, key: string, result: RoundResult) {
  const previous = records[key];
  const value = recordValue(result);
  const isNewRecord = result.counts && (previous == null || value > previous);
  return {
    records: isNewRecord ? { ...records, [key]: value } : records,
    isNewRecord,
    record: isNewRecord ? value : previous
  };
}

/** Función de valoración del resultado. Cada sección tiene las suyas («Gran nivel», «Toca repasar»…). */
export type Rating = (result: Pick<RoundResult, "hits" | "total">) => string;

/** Aplica la valoración de la sección, o devuelve «Sin respuestas» si el total es cero. */
export const ratingText = (result: Pick<RoundResult, "hits" | "total">, sectionRating: Rating): string =>
  result.total > 0 ? sectionRating(result) : "Sin respuestas";
