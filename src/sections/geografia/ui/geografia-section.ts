/**
 * @fileoverview Geografía: lo que da al juego para salir en el menú y tener sus pantallas (ver
 * common/ui/common-section.ts).
 */

import type { SectionDefinition } from "../../../common/ui/common-section";
import { geografiaMode } from "./geografia-mode";
import { renderGeografiaStart } from "./geografia-start-screen";
import { createGeografiaSettings } from "./geografia-settings-screen";
import { renderBanderaCredits } from "./geografia-credits";

export const geografiaSection: SectionDefinition = {
  id: "geografia",
  name: "Geografía",
  description: "Capitales, banderas, provincias y municipios de España.",
  header: {
    eyebrow: "Atlas de bolsillo · Geografía de España",
    lede: "Capitales, banderas, provincias y municipios de las comunidades autónomas. Elige en Opciones qué categorías y territorios entran, cuántas preguntas tiene cada partida y cuánto tiempo hay para responder."
  },
  screens: { start: "start", settings: "settings" },
  buttons: { back: "toSections", play: "go", settings: "openOptions", credits: "openCredits" },
  creditsName: "Créditos de Geografía",
  mode: geografiaMode,
  renderStart: renderGeografiaStart,
  createSettings: createGeografiaSettings,
  renderCredits: renderBanderaCredits
};
