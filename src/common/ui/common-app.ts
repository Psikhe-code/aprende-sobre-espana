// Arranca el juego y decide qué pantalla se ve. Conoce las secciones por su lista (src/sections/sections.ts):
// las pantallas comunes están en common/ui, y las de cada sección, en sections/<sección>/ui.

import { loadState, saveState } from "../engine/common-storage";
import type { AppContext, Screen } from "./common-context";
import { drawContours } from "./common-contours";
import { renderCredits } from "./common-credits-screen";
import { $, el } from "./common-dom";
import { createRoundScreen } from "./common-round-screen";
import type { SectionDefinition, UpcomingSection } from "./common-section";
import { SECTION_LIST, UPCOMING_SECTIONS } from "../../sections/sections";

export interface App {
  /** true en las pantallas donde se puede recargar sin perder nada (todas menos las de juego, ver isIdleScreen). */
  isIdle(): boolean;
  /** Se llama cada vez que el jugador vuelve a una pantalla tranquila. */
  onIdle(callback: () => void): void;
  /** true si se está viendo el menú de secciones. */
  inMenu(): boolean;
}

/** Pantallas comunes a todas las secciones: el menú, la partida, su resultado y Créditos. */
const COMMON_SCREENS: readonly Screen[] = ["sections", "play", "end", "credits"];
/** Todas las pantallas: las comunes y las de cada sección. */
const SCREENS: readonly Screen[] = [
  ...COMMON_SCREENS,
  ...SECTION_LIST.flatMap((s) => [s.screens.start, s.screens.settings, ...(s.screens.play ?? [])])
];
/** Pantallas de juego: sin la cabecera grande. La partida y su resultado, y las de juego de cada sección (el simulacro). */
const PLAY_SCREENS: readonly Screen[] = ["play", "end", ...SECTION_LIST.flatMap((s) => s.screens.play ?? [])];
const isIdleScreen = (s: Screen) => !PLAY_SCREENS.includes(s);
/** Pantallas con la versión al pie: el menú de secciones y el inicio de cada sección. */
const VERSION_SCREENS: readonly Screen[] = ["sections", ...SECTION_LIST.map((s) => s.screens.start)];

/**
 * Marca que la página se va a recargar para aplicar una versión nueva (main.ts). Así, al volver a abrirse,
 * el juego sigue en la sección donde estaba el jugador en vez de saltar al menú de secciones.
 */
export const UPDATE_RELOAD_KEY = "aprende-sobre-espana:recarga-por-actualizacion";

/** Texto de la cabecera grande en el menú de secciones (en cada sección, el de su definición). */
const MENU_HEADER = {
  eyebrow: "Atlas de bolsillo",
  lede: "Geografía de España y preparación del examen de nacionalidad. Elige por dónde empezar; luego puedes cambiar de sección cuando quieras."
};

/**
 * Tarjeta de una sección en el menú: `sec-` y su id («sec-geografia»). Las que vendrán llevan debajo
 * «Próximamente» y están desactivadas, como las tareas del examen sin preguntas.
 */
function sectionCard(s: SectionDefinition | UpcomingSection, upcoming = false): HTMLButtonElement {
  const card = el("button", "cat section-card");
  card.id = "sec-" + s.id;
  const text = el("span", "cat-text");
  text.append(el("span", "cat-name", s.name), el("span", "cat-desc", s.description));
  if (upcoming) text.append(el("span", "cat-count", "Próximamente"));
  card.append(text);
  card.disabled = upcoming;
  return card;
}

export function startApp(): App {
  const state = loadState();
  let screen: Screen = "sections";
  const idleListeners: (() => void)[] = [];
  /** La sección actual: la elegida la última vez o, si no hay ninguna, la primera de la lista. */
  const section = (): SectionDefinition => SECTION_LIST.find((s) => s.id === state.section) ?? SECTION_LIST[0];

  const ctx: AppContext = {
    state,
    save: () => saveState(state),
    screen: () => screen,
    show(id) {
      if (id !== "play") roundScreen.onLeave();
      for (const [s, extra] of extraScreens) if (!(s.screens.play ?? []).includes(id)) extra.onLeave();
      screen = id;
      SCREENS.forEach((s) => { $(s).hidden = s !== id; });
      // Si el foco estaba en la pantalla que se acaba de esconder (en el botón pulsado), pasa a la nueva:
      // el lector de pantalla dice cuál es, y el tabulador sigue desde ahí. La partida y el resultado
      // lo llevan después a la pregunta o al resultado. Al abrir el juego no se mueve.
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest<HTMLElement>(".screen")?.hidden) $(id).focus({ preventScroll: true });
      $("version").hidden = !VERSION_SCREENS.includes(id);
      // En las pantallas de juego, la cabecera pequeña: la pregunta empieza arriba.
      document.querySelector(".app")!.classList.toggle("compact", !isIdleScreen(id));
      const header = id === "sections" ? MENU_HEADER : section().header;
      $("eyebrow").textContent = header.eyebrow;
      $("lede").textContent = header.lede;
      window.scrollTo({ top: 0 });
      if (isIdleScreen(id)) idleListeners.forEach((f) => f());
    },
    goHome() {
      const s = section();
      s.renderStart(state);
      roundScreen.prepare();
      ctx.show(s.screens.start);
    },
    openOptions() {
      const s = section();
      settings.get(s)!.render();
      ctx.show(s.screens.settings);
    },
    mode: () => section().mode(state)
  };

  const roundScreen = createRoundScreen(ctx);
  // Las Opciones y las pantallas propias de cada sección se preparan una vez, al arrancar.
  const settings = new Map(SECTION_LIST.map((s) => [s, s.createSettings(ctx)]));
  const extraScreens = SECTION_LIST.flatMap((s) => (s.createExtraScreens ? [[s, s.createExtraScreens(ctx, roundScreen)] as const] : []));

  // El menú de secciones, con una tarjeta por sección, y los botones del inicio de cada una.
  $("sectionList").replaceChildren(...SECTION_LIST.map((s) => {
    const card = sectionCard(s);
    card.addEventListener("click", () => { state.section = s.id; ctx.save(); ctx.goHome(); });
    return card;
  }), ...UPCOMING_SECTIONS.map((s) => sectionCard(s, true)));
  for (const s of SECTION_LIST) {
    $(s.buttons.back).addEventListener("click", () => ctx.show("sections"));
    $(s.buttons.play).addEventListener("click", roundScreen.start);
    $(s.buttons.settings).addEventListener("click", ctx.openOptions);
    $(s.buttons.credits).addEventListener("click", () => { renderCredits(s); ctx.show("credits"); });
  }
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
  if (afterUpdate && state.section !== null) ctx.goHome();
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
