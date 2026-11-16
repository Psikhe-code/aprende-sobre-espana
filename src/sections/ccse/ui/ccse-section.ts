/**
 * @fileoverview Examen de nacionalidad: lo que da al juego para salir en el menú y tener sus pantallas (ver
 * common/ui/common-section.ts).
 */

import type { SectionDefinition } from "../../../common/ui/common-section";
import { ccseMode } from "./ccse-mode";
import { renderCcseStart } from "./ccse-start-screen";
import { createCcseSettings } from "./ccse-settings-screen";
import { createSimulacroScreen } from "./ccse-simulacro-screen";
import { CCSE_ID } from "../engine/ccse-id";

export const ccseSection: SectionDefinition = {
  id: CCSE_ID,
  name: "Examen de nacionalidad",
  description: "Practica los temas de la prueba CCSE: la Constitución, las instituciones, la cultura y la sociedad españolas.",
  header: {
    eyebrow: "Examen de nacionalidad · Práctica",
    lede: "La Constitución, las instituciones, los derechos, la cultura y la sociedad españolas, con las preguntas de la prueba CCSE del Instituto Cervantes."
  },
  // El simulacro tiene sus propias pantallas de juego: el examen y su resultado.
  screens: { start: "ccseStart", settings: "ccseSettings", play: ["sim", "simEnd"] },
  buttons: { back: "ccseToSections", play: "ccseGo", settings: "ccseOpenOptions", credits: "ccseOpenCredits" },
  creditsName: "Créditos del Examen de nacionalidad",
  mode: ccseMode,
  renderStart: renderCcseStart,
  createSettings: createCcseSettings,
  createExtraScreens: (ctx, roundScreen) => createSimulacroScreen(ctx, roundScreen.startReview)
};
