import type { RoundQuestion } from "./types";
import { ROUND_LENGTH } from "./round";

// Lógica de una partida, sin nada de interfaz: la pantalla solo pregunta y dibuja.

export interface Miss {
  question: RoundQuestion;
  given: string;
}

export interface AnswerResult {
  correct: boolean;
  answer: string;
  given: string;
}

export interface GameResult {
  hits: number;
  total: number;
  bestStreak: number;
  misses: Miss[];
  review: boolean;
  /** Si cuenta para récords: partida normal y completa. */
  counts: boolean;
}

export class GameSession {
  readonly questions: readonly RoundQuestion[];
  /** Repaso de fallos: se juega igual pero no cuenta para récords. */
  readonly review: boolean;
  /**
   * Preguntas que debe tener una partida completa con esta selección: normalmente 10,
   * menos si la selección no da para tantas (ver roundSize). Solo cuenta para récords si las tiene.
   */
  readonly expected: number;

  private i = 0;
  private hitCount = 0;
  private streakCount = 0;
  private best = 0;
  private outcomes: boolean[] = [];
  private missList: Miss[] = [];

  constructor(questions: RoundQuestion[], options: { review?: boolean; expected?: number } = {}) {
    if (!questions.length) throw new Error("Una partida necesita al menos una pregunta");
    this.questions = questions;
    this.review = options.review ?? false;
    this.expected = options.expected ?? ROUND_LENGTH;
  }

  get index() { return this.i; }
  get total() { return this.questions.length; }
  get current(): RoundQuestion { return this.questions[this.i]; }
  get hits() { return this.hitCount; }
  get streak() { return this.streakCount; }
  /** Resultado de cada pregunta ya respondida (true = acierto). */
  get results(): readonly boolean[] { return this.outcomes; }
  get answered() { return this.outcomes.length > this.i; }
  get isLast() { return this.i === this.questions.length - 1; }
  get finished() { return this.isLast && this.answered; }

  /** Responde la pregunta actual. Solo se puede responder una vez cada pregunta. */
  answer(given: string): AnswerResult {
    if (this.answered) throw new Error("Esta pregunta ya está respondida");
    const q = this.current;
    const correct = given === q.answer;
    this.outcomes.push(correct);
    if (correct) {
      this.hitCount++;
      this.streakCount++;
      this.best = Math.max(this.best, this.streakCount);
    } else {
      this.streakCount = 0;
      this.missList.push({ question: q, given });
    }
    return { correct, answer: q.answer, given };
  }

  /** Pasa a la siguiente pregunta. Devuelve false si ya no quedan. */
  next(): boolean {
    if (!this.answered) throw new Error("Hay que responder antes de pasar");
    if (this.isLast) return false;
    this.i++;
    return true;
  }

  result(): GameResult {
    return {
      hits: this.hitCount,
      total: this.total,
      bestStreak: this.best,
      misses: [...this.missList],
      review: this.review,
      counts: this.finished && !this.review && this.total === this.expected
    };
  }
}

/**
 * Actualiza los récords con el resultado de una partida.
 * Devuelve los récords nuevos (sin modificar los anteriores) y si se ha batido el récord.
 */
export function applyRecord(best: Record<string, number>, key: string, result: GameResult) {
  const previous = best[key];
  const isNewRecord = result.counts && (previous == null || result.hits > previous);
  return {
    best: isNewRecord ? { ...best, [key]: result.hits } : best,
    isNewRecord,
    record: isNewRecord ? result.hits : previous
  };
}
