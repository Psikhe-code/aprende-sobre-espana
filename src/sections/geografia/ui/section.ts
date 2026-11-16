// Geografía: lo que da al juego para salir en el menú y tener sus pantallas (ver common/ui/section.ts).

import type { SectionDefinition } from "../../../common/ui/section";
import { geografiaMode } from "./mode";
import { renderGeografiaStart } from "./start-screen";
import { createGeografiaSettings } from "./settings-screen";
import { renderBanderaCredits } from "./credits";

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
