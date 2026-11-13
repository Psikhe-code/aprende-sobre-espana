// Interfaz: arranca el juego y une las pantallas. Cada pantalla tiene su archivo
// (inicio.ts, opciones.ts, examen.ts, partida.ts, final.ts, creditos.ts); aquí solo se decide cuál se ve.
// Las reglas del juego (aciertos, racha, final, récords) viven en src/engine.

import { loadState, saveState } from "../engine/storage";
import type { Seccion } from "../engine/types";
import { SCREENS, type Contexto, type Screen } from "./contexto";
import { drawContours } from "./contours";
import { renderCredits } from "./creditos";
import { $ } from "./dom";
import { crearOpcionesCcse, renderStartCcse } from "./examen";
import { renderStart, renderVersion } from "./inicio";
import { modoCcse, modoGeografia } from "./modos";
import { crearOpciones } from "./opciones";
import { crearPartida } from "./partida";

export interface App {
  /** true en las pantallas donde se puede recargar sin perder nada (todas menos la partida y el resultado). */
  isIdle(): boolean;
  /** Se llama cada vez que el jugador vuelve a una pantalla tranquila. */
  onIdle(callback: () => void): void;
  /** true si se está viendo el menú de secciones. */
  enMenu(): boolean;
}

const tranquila = (s: Screen) => s !== "play" && s !== "end";
/** Pantallas con la versión al pie: el menú de secciones y el inicio de cada sección. */
const CON_VERSION: readonly Screen[] = ["sections", "start", "ccseStart"];

/**
 * Marca que la página se va a recargar para aplicar una versión nueva (main.ts). Así, al volver a abrirse,
 * el juego sigue en la sección donde estaba el jugador en vez de saltar al menú de secciones.
 */
export const RECARGA_POR_ACTUALIZACION = "aprende-sobre-espana:recarga-por-actualizacion";

/** Texto de la cabecera grande: en la pantalla de secciones y en cada sección. */
const CABECERAS: Record<Seccion | "secciones", { eyebrow: string; lede: string }> = {
  secciones: {
    eyebrow: "Atlas de bolsillo",
    lede: "Geografía de España y preparación del examen de nacionalidad. Elige por dónde empezar; luego puedes cambiar de sección cuando quieras."
  },
  geografia: {
    eyebrow: "Atlas de bolsillo · Geografía de España",
    lede: "Capitales, banderas, provincias y municipios de las comunidades autónomas. Elige en Opciones qué categorías y territorios entran, cuántas preguntas tiene cada partida y cuánto tiempo hay para responder."
  },
  ccse: {
    eyebrow: "Examen de nacionalidad · Práctica",
    lede: "La Constitución, las instituciones, los derechos, la cultura y la sociedad españolas, con las preguntas de la prueba CCSE del Instituto Cervantes."
  }
};

export function startApp(): App {
  const state = loadState();
  let screen: Screen = "start";
  const idleListeners: (() => void)[] = [];
  const seccion = (): Seccion => state.seccion ?? "geografia";

  const ctx: Contexto = {
    state,
    save: () => saveState(state),
    pantalla: () => screen,
    show(id) {
      if (id !== "play") partida.alSalir();
      screen = id;
      SCREENS.forEach((s) => { $(s).hidden = s !== id; });
      $("version").hidden = !CON_VERSION.includes(id);
      // En la partida y el resultado, la cabecera pequeña: la pregunta empieza arriba.
      document.querySelector(".app")!.classList.toggle("compacta", id === "play" || id === "end");
      const cabecera = CABECERAS[id === "sections" ? "secciones" : seccion()];
      $("eyebrow").textContent = cabecera.eyebrow;
      $("lede").textContent = cabecera.lede;
      window.scrollTo({ top: 0 });
      if (tranquila(id)) idleListeners.forEach((f) => f());
    },
    goHome() {
      if (seccion() === "ccse") renderStartCcse(state);
      else renderStart(state);
      partida.preparar();
      ctx.show(seccion() === "ccse" ? "ccseStart" : "start");
    },
    openOptions() {
      if (seccion() === "ccse") { opcionesCcse.render(); ctx.show("ccseOptions"); }
      else { opciones.render(); ctx.show("options"); }
    },
    modo: () => (seccion() === "ccse" ? modoCcse(state) : modoGeografia(state))
  };

  const opciones = crearOpciones(ctx);
  const opcionesCcse = crearOpcionesCcse(ctx);
  const partida = crearPartida(ctx);

  const elegirSeccion = (s: Seccion) => () => { state.seccion = s; ctx.save(); ctx.goHome(); };
  $("sec-geografia").addEventListener("click", elegirSeccion("geografia"));
  $("sec-ccse").addEventListener("click", elegirSeccion("ccse"));
  for (const id of ["toSections", "ccseToSections"]) $(id).addEventListener("click", () => ctx.show("sections"));

  for (const id of ["openOptions", "ccseOpenOptions"]) $(id).addEventListener("click", ctx.openOptions);
  for (const id of ["openCredits", "ccseOpenCredits"]) $(id).addEventListener("click", () => { renderCredits(); ctx.show("credits"); });
  $("closeCredits").addEventListener("click", ctx.goHome);
  $("menu").addEventListener("click", ctx.goHome);

  renderVersion();
  drawContours(document.getElementById("contours") as unknown as SVGSVGElement);
  // Al abrir el juego, siempre el menú de secciones. Solo si la página se ha recargado para aplicar
  // una versión nueva, se vuelve a la sección donde estaba el jugador.
  let trasActualizar = false;
  try {
    trasActualizar = sessionStorage.getItem(RECARGA_POR_ACTUALIZACION) !== null;
    sessionStorage.removeItem(RECARGA_POR_ACTUALIZACION);
  } catch { /* sin sessionStorage, se abre el menú */ }
  if (trasActualizar && state.seccion !== null) ctx.goHome();
  else ctx.show("sections");

  return {
    isIdle: () => tranquila(screen),
    onIdle: (callback) => { idleListeners.push(callback); },
    enMenu: () => screen === "sections"
  };
}
