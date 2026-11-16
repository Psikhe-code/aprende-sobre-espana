// Geografía: sus categorías.

import type { Category, NameForm, Question } from "./geografia-types";
import { autonomiaCapitalQuestions, provinciaCapitalQuestions, autonomiaBanderaQuestions, provinciaBanderaQuestions, provinciaComunidadQuestions, municipioProvinciaQuestions } from "./geografia-questions";

/**
 * Las preguntas salen de datos que no cambian mientras se juega, así que cada categoría las genera
 * una sola vez por forma de los nombres y después devuelve las mismas. Antes se generaban de nuevo
 * cada vez que había que contarlas (varias veces por cada toque en Opciones).
 * Se congela la lista para que nadie la cambie sin querer: quien necesite cambiar una pregunta, hace una copia.
 */
function generatedOnce(generate: (nameForm: NameForm) => Question[]): (nameForm: NameForm) => readonly Question[] {
  const cache = new Map<NameForm, readonly Question[]>();
  return (nameForm) => {
    let questions = cache.get(nameForm);
    if (!questions) {
      questions = Object.freeze(generate(nameForm).map((q) => Object.freeze(q)));
      cache.set(nameForm, questions);
    }
    return questions;
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
    questions: generatedOnce((nameForm) => [...autonomiaCapitalQuestions(nameForm), ...provinciaCapitalQuestions(nameForm)]) },
  { id: "banderas", name: "Banderas",
    labels: { comunidad: "Banderas autonómicas", provincia: "Banderas de provincia" },
    questions: generatedOnce((nameForm) => [...autonomiaBanderaQuestions(nameForm), ...provinciaBanderaQuestions(nameForm)]) },
  // Comunidades: qué provincias tiene cada comunidad. Provincias: de qué provincia es cada municipio.
  { id: "divisiones", name: "Divisiones",
    labels: { comunidad: "Provincias de cada comunidad", provincia: "Municipios de cada provincia" },
    questions: generatedOnce((nameForm) => [...provinciaComunidadQuestions(nameForm), ...municipioProvinciaQuestions(nameForm)]) }
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
