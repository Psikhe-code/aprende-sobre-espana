// Arranca el juego y decide qué pantalla se ve. Cada pantalla tiene su archivo: las comunes, en common/ui,
// y las de cada sección, en sections/<sección>/ui.

import { loadState, saveState } from "../engine/storage";
import type { Section } from "../engine/types";
import { SCREENS, type AppContext, type Screen } from "./context";
import { drawContours } from "./contours";
import { renderCredits } from "./credits-screen";
import { $ } from "./dom";
import { renderStartCcse } from "../../sections/ccse/ui/start-screen";
import { crearOpcionesCcse } from "../../sections/ccse/ui/settings-screen";
import { renderStart } from "../../sections/geografia/ui/start-screen";
import { modoCcse } from "../../sections/ccse/ui/mode";
import { modoGeografia } from "../../sections/geografia/ui/mode";
import { crearOpciones } from "../../sections/geografia/ui/settings-screen";
import { createRoundScreen } from "./round-screen";
import { crearSimulacro } from "../../sections/ccse/ui/simulacro-screen";

export interface App {
  /** true en las pantallas donde se puede recargar sin perder nada (todas menos la partida, el simulacro y sus resultados). */
  isIdle(): boolean;
  /** Se llama cada vez que el jugador vuelve a una pantalla tranquila. */
  onIdle(callback: () => void): void;
  /** true si se está viendo el menú de secciones. */
  inMenu(): boolean;
}

/** Pantallas de juego: sin la cabecera grande. */
const PLAY_SCREENS: readonly Screen[] = ["play", "end", "sim", "simEnd"];
const isIdleScreen = (s: Screen) => !PLAY_SCREENS.includes(s);
/** Pantallas con la versión al pie: el menú de secciones y el inicio de cada sección. */
const VERSION_SCREENS: readonly Screen[] = ["sections", "start", "ccseStart"];

/**
 * Marca que la página se va a recargar para aplicar una versión nueva (main.ts). Así, al volver a abrirse,
 * el juego sigue en la sección donde estaba el jugador en vez de saltar al menú de secciones.
 */
export const UPDATE_RELOAD_KEY = "aprende-sobre-espana:recarga-por-actualizacion";

/** Texto de la cabecera grande: en la pantalla de secciones y en cada sección. */
const HEADERS: Record<Section | "sections", { eyebrow: string; lede: string }> = {
  sections: {
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
  const section = (): Section => state.seccion ?? "geografia";

  const ctx: AppContext = {
    state,
    save: () => saveState(state),
    screen: () => screen,
    show(id) {
      if (id !== "play") roundScreen.onLeave();
      if (id !== "sim") simulacroScreen.alSalir();
      screen = id;
      SCREENS.forEach((s) => { $(s).hidden = s !== id; });
      // Si el foco estaba en la pantalla que se acaba de esconder (en el botón pulsado), pasa a la nueva:
      // el lector de pantalla dice cuál es, y el tabulador sigue desde ahí. La partida y el resultado
      // lo llevan después a la pregunta o al resultado. Al abrir el juego no se mueve.
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest<HTMLElement>(".screen")?.hidden) $(id).focus({ preventScroll: true });
      $("version").hidden = !VERSION_SCREENS.includes(id);
      // En la partida, el simulacro y sus resultados, la cabecera pequeña: la pregunta empieza arriba.
      document.querySelector(".app")!.classList.toggle("compact", !isIdleScreen(id));
      const header = HEADERS[id === "sections" ? "sections" : section()];
      $("eyebrow").textContent = header.eyebrow;
      $("lede").textContent = header.lede;
      window.scrollTo({ top: 0 });
      if (isIdleScreen(id)) idleListeners.forEach((f) => f());
    },
    goHome() {
      if (section() === "ccse") renderStartCcse(state);
      else renderStart(state);
      roundScreen.prepare();
      ctx.show(section() === "ccse" ? "ccseStart" : "start");
    },
    openOptions() {
      if (section() === "ccse") { ccseSettings.render(); ctx.show("ccseSettings"); }
      else { settings.render(); ctx.show("settings"); }
    },
    mode: () => (section() === "ccse" ? modoCcse(state) : modoGeografia(state))
  };

  const settings = crearOpciones(ctx);
  const ccseSettings = crearOpcionesCcse(ctx);
  const roundScreen = createRoundScreen(ctx);
  const simulacroScreen = crearSimulacro(ctx, roundScreen.startReview);

  const chooseSection = (s: Section) => () => { state.seccion = s; ctx.save(); ctx.goHome(); };
  $("sec-geografia").addEventListener("click", chooseSection("geografia"));
  $("sec-ccse").addEventListener("click", chooseSection("ccse"));
  for (const id of ["toSections", "ccseToSections"]) $(id).addEventListener("click", () => ctx.show("sections"));

  for (const id of ["openOptions", "ccseOpenOptions"]) $(id).addEventListener("click", ctx.openOptions);
  for (const id of ["openCredits", "ccseOpenCredits"]) $(id).addEventListener("click", () => { renderCredits(section()); ctx.show("credits"); });
  $("closeCredits").addEventListener("click", ctx.goHome);
  $("menu").addEventListener("click", ctx.goHome);

  renderVersion();
  drawContours(document.querySelector<SVGSVGElement>("#contours")!);
  // Al abrir el juego, siempre el menú de secciones. Solo si la página se ha recargado para aplicar
  // una versión nueva, se vuelve a la sección donde estaba el jugador.
  let afterUpdate = false;
  try {
    afterUpdate = sessionStorage.getItem(UPDATE_RELOAD_KEY) !== null;
    sessionStorage.removeItem(UPDATE_RELOAD_KEY);
  } catch { /* sin sessionStorage, se abre el menú */ }
  if (afterUpdate && state.seccion !== null) ctx.goHome();
  else ctx.show("sections");

  return {
    isIdle: () => isIdleScreen(screen),
    onIdle: (callback) => { idleListeners.push(callback); },
    inMenu: () => screen === "sections"
  };
}

/** Versión al pie del menú de secciones y del inicio de cada sección, para saber si ya se ve la última publicada. */
export function renderVersion(): void {
  const published = new Date(__PUBLICADO__);
  $("version").textContent = import.meta.env.DEV
    ? `Versión ${__VERSION__} · en desarrollo`
    : `Versión ${__VERSION__} · publicada el ${published.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} a las ${published.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
}
