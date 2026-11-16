// Reloj de cada pregunta en pantalla: barra que se vacía y segundos que quedan.
// La cuenta en sí (arrancar, pausar, cuánto queda) está en common/engine/countdown.ts.

import { Countdown } from "../engine/countdown";
import type { TimeLimit } from "../engine/round-settings";
import { $, announce } from "./dom";

export interface Timer {
  /**
   * Arranca el reloj de la pregunta que se acaba de dibujar (o lo esconde, si es sin tiempo).
   * Empieza cuando la pregunta se ve: si tiene imagen, cuando está dibujada, para que una imagen
   * lenta no quite tiempo. Si la imagen falla o tarda más de 3 s, empieza igual.
   */
  start(timeLimit: TimeLimit): void;
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
    const go = () => {
      if (countdown !== c || ready) return;
      ready = true;
      if (!document.hidden) c.start();
      keepTicking();
    };
    const img = $("questionImage").querySelector("img");
    if (img) {
      img.decode().then(go, go);
      setTimeout(go, 3000);
    } else go();
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

  return { start: start, stop: stop, hide: () => { $("timer").hidden = true; } };
}
