// Reloj de cada pregunta en pantalla: barra que se vacía y segundos que quedan.
// La cuenta en sí (arrancar, pausar, cuánto queda) está en src/engine/countdown.ts.

import { Countdown } from "../engine/countdown";
import type { TimeLimit } from "../engine/round";
import { $, announce } from "./dom";

export interface Reloj {
  /**
   * Arranca el reloj de la pregunta que se acaba de dibujar (o lo esconde, si es sin tiempo).
   * Empieza cuando la pregunta se ve: si tiene bandera, cuando está dibujada, para que una imagen
   * lenta no quite tiempo. Si la bandera falla o tarda más de 3 s, empieza igual.
   */
  arrancar(limite: TimeLimit): void;
  /**
   * Lo para donde esté (al responder, salir o terminar) y lo da por acabado: ya no vuelve a arrancar,
   * ni al volver a la pestaña ni cuando termina de dibujarse la bandera. Al responder se queda a la vista
   * tal como estaba (`congelar`), para ver cuánto tiempo sobraba.
   */
  parar(congelar?: boolean): void;
  esconder(): void;
}

/** @param alAcabarse se llama cuando el tiempo llega a cero sin que se haya parado antes */
export function crearReloj(alAcabarse: () => void): Reloj {
  let countdown: Countdown | null = null;
  /** Si la pregunta ya se ve entera (con su bandera dibujada) y el reloj puede correr. */
  let listo = false;
  let frame = 0;
  let avisoFinal = false;

  function parar(congelar = false) {
    cancelAnimationFrame(frame);
    frame = 0;
    countdown?.pause();
    countdown = null;
    listo = false;
    if (!congelar) $("timer").classList.remove("urgent");
  }

  function arrancar(limite: TimeLimit) {
    parar();
    $("timer").hidden = limite === "sinTiempo";
    if (limite === "sinTiempo") return;
    const c = new Countdown(limite * 1000);
    countdown = c;
    avisoFinal = false;
    dibujar(c);
    const go = () => {
      if (countdown !== c || listo) return;
      listo = true;
      if (!document.hidden) c.start();
      seguir();
    };
    const img = $("flag").querySelector("img");
    if (img) {
      img.decode().then(go, go);
      setTimeout(go, 3000);
    } else go();
  }

  function seguir() { if (!frame) frame = requestAnimationFrame(tick); }

  function tick() {
    frame = 0;
    const c = countdown;
    if (!c) return;
    dibujar(c);
    if (c.expired) { parar(); alAcabarse(); }
    else if (c.running) seguir();
  }

  function dibujar(c: Countdown) {
    const s = c.seconds();
    $("timerFill").style.transform = `scaleX(${c.remaining() / c.ms})`;
    $("timerText").textContent = `${s} s`;
    const urgent = s <= 5 && c.ms > 5000;
    $("timer").classList.toggle("urgent", urgent);
    if (urgent && !avisoFinal) { avisoFinal = true; announce("Quedan 5 segundos."); }
  }

  // Al cambiar de pestaña o bloquear el móvil, el reloj se para; al volver, sigue.
  document.addEventListener("visibilitychange", () => {
    if (!countdown || !listo) return;
    if (document.hidden) countdown.pause();
    else { countdown.start(); seguir(); }
  });

  return { arrancar, parar, esconder: () => { $("timer").hidden = true; } };
}
