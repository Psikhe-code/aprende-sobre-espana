import type { Category } from "./types";
import { regionalCapitalQuestions, provincialCapitalQuestions, flagQuestions } from "./questions";

/**
 * Categorías del juego, en el orden en que se muestran.
 * Cada categoría reúne sus preguntas de todos los territorios (comunidades y provincias):
 * en la partida solo salen las de los territorios marcados en Opciones.
 * Para añadir una: crea su generador (o su archivo de preguntas) y añádela aquí.
 */
export const CATEGORIES: Category[] = [
  { id: "capitales", name: "Capitales",
    questions: (style) => [...regionalCapitalQuestions(style), ...provincialCapitalQuestions(style)] },
  { id: "banderas", name: "Banderas", questions: flagQuestions }
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);

/**
 * Identificadores que tenían las categorías antes de separar comunidades y provincias.
 * Sirven para no perder la selección ni los récords guardados en el dispositivo.
 */
export const OLD_CATEGORY_IDS: Record<string, string> = { capitalesCCAA: "capitales", banderasCCAA: "banderas" };
