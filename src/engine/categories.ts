import type { Category } from "./types";
import { regionalCapitalQuestions, flagQuestions } from "./questions";

/**
 * Categorías del juego, en el orden en que se muestran.
 * Para añadir una: crea su generador (o su archivo de preguntas) y añádela aquí.
 */
export const CATEGORIES: Category[] = [
  { id: "capitalesCCAA", name: "Capitales autonómicas", description: "Las 17 comunidades y las 2 ciudades autónomas",
    questions: regionalCapitalQuestions },
  { id: "banderasCCAA", name: "Banderas autonómicas", description: "Las 17 comunidades y las 2 ciudades autónomas",
    questions: flagQuestions }
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
