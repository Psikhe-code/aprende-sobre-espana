import type { RoundQuestion } from "./types";
import { ROUND_LENGTH } from "./round";

// Lógica de una partida, sin nada de interfaz: la pantalla solo pregunta y dibuja.

export interface Miss {
  question: RoundQuestion;
  /** Lo que respondió el jugador, o null si se acabó el tiempo sin responder. */
  given: string | null;
}

export interface AnswerResult {
  correct: boolean;
  answer: string;
  /** null: se acabó el tiempo. */
  given: string | null;
}

export interface GameResult {
  hits: number;
  total: number;
  bestStreak: number;
  misses: Miss[];
  review: boolean;
  /** Partida sin límite: su récord es la mejor racha, no los aciertos. */
  unlimited: boolean;
  /**
   * Si cuenta para récords: partida normal y completa, o partida sin límite terminada
   * con al menos una pregunta respondida. El repaso de fallos nunca cuenta.
   */
  counts: boolean;
}

export class GameSession {
  private list: RoundQuestion[];
  /** Repaso de fallos: se juega igual pero no cuenta para récords. */
  readonly review: boolean;
  /**
   * Partida sin límite: sigue hasta que el jugador la termina (`stop`). Al acabarse la baraja
   * (`endOfDeck`), la interfaz pregunta si seguir, y para seguir se añade otra vuelta con `append`.
   */
  readonly unlimited: boolean;
  /** Preguntas de una vuelta a la baraja (las de la selección), para decir cuántas se han respondido. */
  readonly deckSize: number;
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
  private stopped = false;

  constructor(questions: RoundQuestion[], options: { review?: boolean; expected?: number; unlimited?: boolean } = {}) {
    if (!questions.length) throw new Error("Una partida necesita al menos una pregunta");
    this.list = [...questions];
    this.review = options.review ?? false;
    this.unlimited = options.unlimited ?? false;
    this.deckSize = questions.length;
    this.expected = options.expected ?? (this.unlimited ? questions.length : ROUND_LENGTH);
  }

  get questions(): readonly RoundQuestion[] { return this.list; }
  get index() { return this.i; }
  get total() { return this.questions.length; }
  get current(): RoundQuestion { return this.questions[this.i]; }
  get hits() { return this.hitCount; }
  get streak() { return this.streakCount; }
  /** Resultado de cada pregunta ya respondida (true = acierto). */
  get results(): readonly boolean[] { return this.outcomes; }
  get answered() { return this.outcomes.length > this.i; }
  get isLast() { return this.i === this.questions.length - 1; }
  /** Normal: respondida la última pregunta. Sin límite: cuando el jugador la termina. */
  get finished() { return this.unlimited ? this.stopped : this.isLast && this.answered; }
  /** Sin límite: respondida la última pregunta de la baraja. Para seguir, hay que añadir otra vuelta. */
  get endOfDeck() { return this.unlimited && !this.stopped && this.isLast && this.answered; }

  /** Responde la pregunta actual. Solo se puede responder una vez cada pregunta. */
  answer(given: string): AnswerResult {
    return this.resolve(given);
  }

  /** Se acabó el tiempo de la pregunta actual sin responder: cuenta como fallo y rompe la racha. */
  timeout(): AnswerResult {
    return this.resolve(null);
  }

  private resolve(given: string | null): AnswerResult {
    if (this.stopped) throw new Error("La partida ya está terminada");
    if (this.answered) throw new Error("Esta pregunta ya está respondida");
    const q = this.current;
    const correct = given !== null && given === q.answer;
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

  /** Sin límite: añade otra vuelta a la baraja al final, para seguir jugando. */
  append(more: RoundQuestion[]): void {
    if (!this.unlimited) throw new Error("Solo una partida sin límite puede seguir");
    if (this.stopped) throw new Error("La partida ya está terminada");
    this.list.push(...more);
  }

  /** Sin límite: termina la partida. La pregunta sin responder, si la hay, no cuenta. */
  stop(): void {
    if (!this.unlimited) throw new Error("Solo se termina así una partida sin límite");
    this.stopped = true;
  }

  result(): GameResult {
    const answered = this.outcomes.length;
    return {
      hits: this.hitCount,
      // Sin límite: las preguntas respondidas, no las que había preparadas.
      total: this.unlimited ? answered : this.total,
      bestStreak: this.best,
      misses: [...this.missList],
      review: this.review,
      unlimited: this.unlimited,
      counts: !this.review && this.finished && (this.unlimited ? answered > 0 : this.total === this.expected)
    };
  }
}

/** Lo que se compara para el récord: los aciertos o, en una partida sin límite, la mejor racha. */
export const recordValue = (r: GameResult) => (r.unlimited ? r.bestStreak : r.hits);

/**
 * Actualiza los récords con el resultado de una partida (aciertos; mejor racha si es sin límite).
 * Devuelve los récords nuevos (sin modificar los anteriores) y si se ha batido el récord.
 */
export function applyRecord(best: Record<string, number>, key: string, result: GameResult) {
  const previous = best[key];
  const value = recordValue(result);
  const isNewRecord = result.counts && (previous == null || value > previous);
  return {
    best: isNewRecord ? { ...best, [key]: value } : best,
    isNewRecord,
    record: isNewRecord ? value : previous
  };
}
