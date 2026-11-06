// Interfaz: arranca el juego y une las pantallas. Cada pantalla tiene su archivo
// (inicio.ts, opciones.ts, partida.ts, final.ts, creditos.ts); aquí solo se decide cuál se ve.
// Las reglas del juego (aciertos, racha, final, récords) viven en src/engine.

import { loadState, saveState } from "../engine/storage";
import { SCREENS, type Contexto, type Screen } from "./contexto";
import { drawContours } from "./contours";
import { renderCredits } from "./creditos";
import { $ } from "./dom";
import { renderStart, renderVersion } from "./inicio";
import { crearOpciones } from "./opciones";
import { crearPartida } from "./partida";

export interface App {
  /** true en las pantallas donde se puede recargar sin perder nada (inicio, opciones y créditos). */
  isIdle(): boolean;
  /** Se llama cada vez que el jugador vuelve a una pantalla tranquila. */
  onIdle(callback: () => void): void;
}

const tranquila = (s: Screen) => s === "start" || s === "options" || s === "credits";

export function startApp(): App {
  const state = loadState();
  let screen: Screen = "start";
  const idleListeners: (() => void)[] = [];

  const ctx: Contexto = {
    state,
    save: () => saveState(state),
    pantalla: () => screen,
    show(id) {
      if (id !== "play") partida.alSalir();
      screen = id;
      SCREENS.forEach((s) => { $(s).hidden = s !== id; });
      // En la partida y el resultado, la cabecera pequeña: la pregunta empieza arriba.
      document.querySelector(".app")!.classList.toggle("compacta", id === "play" || id === "end");
      window.scrollTo({ top: 0 });
      if (tranquila(id)) idleListeners.forEach((f) => f());
    },
    goHome() {
      renderStart(state);
      partida.preparar();
      ctx.show("start");
    },
    openOptions() {
      opciones.render();
      ctx.show("options");
    }
  };

  const opciones = crearOpciones(ctx);
  const partida = crearPartida(ctx);

  $("openOptions").addEventListener("click", ctx.openOptions);
  $("openCredits").addEventListener("click", () => { renderCredits(); ctx.show("credits"); });
  $("closeCredits").addEventListener("click", ctx.goHome);
  $("menu").addEventListener("click", ctx.goHome);

  renderVersion();
  drawContours(document.getElementById("contours") as unknown as SVGSVGElement);
  ctx.goHome();

  return {
    isIdle: () => tranquila(screen),
    onIdle: (callback) => { idleListeners.push(callback); }
  };
}
