import type { Category, PreguntaJSON } from "./types";
import {
  fromJSON, provinceCommunityQuestions, regionalCapitalQuestions, provincialCapitalQuestions, flagQuestions
} from "./questions";

import provincias from "../data/preguntas/provincias.json";
import comunidades from "../data/preguntas/comunidades.json";
import rios from "../data/preguntas/rios.json";
import relieve from "../data/preguntas/relieve.json";
import costas from "../data/preguntas/costas.json";

const json = (items: unknown) => (items as PreguntaJSON[]).map(fromJSON);

/**
 * Categorías del juego, en el orden en que se muestran.
 * Para añadir una: crea su JSON en src/data/preguntas (o un generador en questions.ts) y añádela aquí.
 */
export const CATEGORIES: Category[] = [
  { id: "provincias", name: "Provincias", description: "Comunidades, récords y curiosidades",
    questions: () => [...provinceCommunityQuestions(), ...json(provincias)] },
  { id: "capitalesProv", name: "Capitales de provincia", description: "Las capitales de las 50 provincias",
    questions: provincialCapitalQuestions },
  { id: "comunidades", name: "Comunidades", description: "Tamaño, población y organización",
    questions: () => json(comunidades) },
  { id: "capitalesCCAA", name: "Capitales autonómicas", description: "Las capitales de las 17 comunidades",
    questions: regionalCapitalQuestions },
  { id: "banderasCCAA", name: "Banderas autonómicas", description: "Reconoce las 17 banderas",
    questions: flagQuestions },
  { id: "rios", name: "Ríos", description: "Ciudades, nacimientos y desembocaduras",
    questions: () => json(rios) },
  { id: "relieve", name: "Relieve", description: "Cordilleras, picos y lagos",
    questions: () => json(relieve) },
  { id: "costas", name: "Costas e islas", description: "Litorales, archipiélagos y cabos",
    questions: () => json(costas) }
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
