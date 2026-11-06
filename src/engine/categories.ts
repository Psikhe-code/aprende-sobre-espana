import type { Category, NameStyle, Question } from "./types";
import { regionalCapitalQuestions, provincialCapitalQuestions, flagQuestions, provincialFlagQuestions, divisionQuestions, municipioQuestions } from "./questions";

/**
 * Las preguntas salen de datos que no cambian mientras se juega, así que cada categoría las genera
 * una sola vez por forma de los nombres y después devuelve las mismas. Antes se generaban de nuevo
 * cada vez que había que contarlas (varias veces por cada toque en Opciones).
 * Se congela la lista para que nadie la cambie sin querer: quien necesite cambiar una pregunta, hace una copia.
 */
function generadaUnaVez(generar: (style: NameStyle) => Question[]): (style: NameStyle) => readonly Question[] {
  const guardadas = new Map<NameStyle, readonly Question[]>();
  return (style) => {
    let preguntas = guardadas.get(style);
    if (!preguntas) {
      preguntas = Object.freeze(generar(style).map((q) => Object.freeze(q)));
      guardadas.set(style, preguntas);
    }
    return preguntas;
  };
}

/**
 * Categorías del juego, en el orden en que se muestran.
 * Cada categoría reúne sus preguntas de todos los territorios (comunidades y provincias):
 * en la partida solo salen las de los territorios marcados en Opciones.
 * Para añadir una: crea su generador (o su archivo de preguntas) y añádela aquí.
 */
export const CATEGORIES: Category[] = [
  { id: "capitales", name: "Capitales",
    labels: { comunidad: "Capitales autonómicas", provincia: "Capitales de provincia" },
    questions: generadaUnaVez((style) => [...regionalCapitalQuestions(style), ...provincialCapitalQuestions(style)]) },
  { id: "banderas", name: "Banderas",
    labels: { comunidad: "Banderas autonómicas", provincia: "Banderas de provincia" },
    questions: generadaUnaVez((style) => [...flagQuestions(style), ...provincialFlagQuestions(style)]) },
  // Comunidades: qué provincias tiene cada comunidad. Provincias: de qué provincia es cada municipio.
  { id: "divisiones", name: "Divisiones",
    labels: { comunidad: "Provincias de cada comunidad", provincia: "Municipios de cada provincia" },
    questions: generadaUnaVez((style) => [...divisionQuestions(style), ...municipioQuestions(style)]) }
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);

/**
 * Identificadores que tenían las categorías antes de separar comunidades y provincias.
 * Sirven para no perder la selección ni los récords guardados en el dispositivo.
 */
export const OLD_CATEGORY_IDS: Record<string, string> = { capitalesCCAA: "capitales", banderasCCAA: "banderas" };
