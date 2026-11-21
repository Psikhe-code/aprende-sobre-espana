/**
 * @fileoverview Reloj de cada pregunta en pantalla: barra que se vacía y segundos que quedan.
 * La cuenta en sí (arrancar, pausar, cuánto queda) está en common/engine/common-countdown.ts.
 */

import { Countdown } from "../engine/common-countdown";
import type { TimeLimit } from "../engine/common-round-settings";
import { $, announce } from "./common-dom";

export interface Timer {
  /**
   * Prepara el reloj de la pregunta que se acaba de dibujar, lleno y parado (o lo esconde, si es sin tiempo).
   * Empieza a correr con `run()`, cuando la pregunta se ve entera: si tiene imagen, cuando está dibujada,
   * para que una imagen lenta (o que no llega) no quite tiempo.
   */
  start(timeLimit: TimeLimit): void;
  /** Lo pone a correr. Solo la primera vez después de `start()`; después de `stop()` ya no hace nada. */
  run(): void;
  /**
   * Lo para donde esté (al responder, salir o terminar) y lo da por acabado: ya no vuelve a arrancar,
   * ni al volver a la pestaña ni cuando termina de dibujarse la imagen. Al responder se queda a la vista
   * tal como estaba (`congelar`), para ver cuánto tiempo sobraba.
   */
  stop(freeze?: boolean): void;
  hide(): void;
}

/** @param onExpire se llama cuando el tiempo llega a cero sin que se haya parado antes */
export function createTimer(onExpire: () => void): Timer {
  let countdown: Countdown | null = null;
  /** Si la pregunta ya se ve entera (con su imagen dibujada) y el reloj puede correr. */
  let ready = false;
  let frame = 0;
  let finalWarningGiven = false;

  function stop(freeze = false) {
    cancelAnimationFrame(frame);
    frame = 0;
    countdown?.pause();
    countdown = null;
    ready = false;
    if (!freeze) $("timer").classList.remove("urgent");
  }

  function start(timeLimit: TimeLimit) {
    stop();
    $("timer").hidden = timeLimit === "sinTiempo";
    if (timeLimit === "sinTiempo") return;
    const c = new Countdown(timeLimit * 1000);
    countdown = c;
    finalWarningGiven = false;
    draw(c);
  }

  function run() {
    const c = countdown;
    if (!c || ready) return;
    ready = true;
    if (!document.hidden) c.start();
    keepTicking();
  }

  function keepTicking() { if (!frame) frame = requestAnimationFrame(tick); }

  function tick() {
    frame = 0;
    const c = countdown;
    if (!c) return;
    draw(c);
    if (c.expired) { stop(); onExpire(); }
    else if (c.running) keepTicking();
  }

  function draw(c: Countdown) {
    const s = c.seconds();
    $("timerFill").style.transform = `scaleX(${c.remaining() / c.ms})`;
    $("timerText").textContent = `${s} s`;
    const urgent = s <= 5 && c.ms > 5000;
    $("timer").classList.toggle("urgent", urgent);
    if (urgent && !finalWarningGiven) { finalWarningGiven = true; announce("Quedan 5 segundos."); }
  }

  // Al cambiar de pestaña o bloquear el móvil, el reloj se para; al volver, sigue.
  document.addEventListener("visibilitychange", () => {
    if (!countdown || !ready) return;
    if (document.hidden) countdown.pause();
    else { countdown.start(); keepTicking(); }
  });

  return { start, run, stop, hide: () => { $("timer").hidden = true; } };
}
