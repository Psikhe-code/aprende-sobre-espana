// Cuenta atrás de una pregunta, sin nada de interfaz: la pantalla la arranca, la pausa
// (al cambiar de pestaña o bloquear el móvil) y le pregunta cuánto queda para dibujarlo.

export class Countdown {
  private left: number;
  /** Cuándo se arrancó o se reanudó por última vez; null si está parada. */
  private since: number | null = null;

  /**
   * @param ms   tiempo total, en milisegundos
   * @param now  reloj en milisegundos (en el navegador, `performance.now`); se cambia en los tests
   */
  constructor(readonly ms: number, private now: () => number = () => performance.now()) {
    this.left = ms;
  }

  /** Arranca o reanuda la cuenta. Si ya está en marcha o se ha acabado, no hace nada. */
  start(): void {
    if (this.since === null && this.left > 0) this.since = this.now();
  }

  /** La para sin perder lo que queda (para reanudarla después con `start`). */
  pause(): void {
    if (this.since === null) return;
    this.left = Math.max(0, this.left - (this.now() - this.since));
    this.since = null;
  }

  get running(): boolean { return this.since !== null; }

  /** Milisegundos que quedan, nunca menos de cero. */
  remaining(): number {
    return this.since === null ? this.left : Math.max(0, this.left - (this.now() - this.since));
  }

  get expired(): boolean { return this.remaining() === 0; }

  /** Segundos que se muestran: se redondea hacia arriba, para que «0 s» solo salga al acabarse. */
  seconds(): number { return Math.ceil(this.remaining() / 1000); }
}
