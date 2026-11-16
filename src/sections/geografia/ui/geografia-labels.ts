/**
 * @fileoverview Geografía: textos con los que se presentan sus opciones en el inicio y en Opciones.
 */

import type { OptionCount } from "../engine/geografia-round-questions";
import type { NameForm, Territorio } from "../engine/geografia-types";

/** Cómo se presenta cada forma de los nombres en Opciones. */
export const NAME_LABELS: Record<NameForm, { name: string; example: string; short: string }> = {
  oficial: { name: "Nombre oficial", example: "Girona, Bizkaia, Illes Balears…", short: "oficial" },
  castellano: { name: "En castellano", example: "Gerona, Vizcaya, Islas Baleares…", short: "en castellano" }
};

/** Cómo se presenta cada territorio en Opciones, y qué se añade al nombre de la categoría en la partida. */
export const TERRITORIO_LABELS: Record<Territorio, { name: string; example: string; short: string }> = {
  comunidad: { name: "Comunidades", example: "Las 17 comunidades y las ciudades autónomas de Ceuta y Melilla, y de qué comunidad es cada provincia", short: "comunidades" },
  provincia: { name: "Provincias", example: "Capitales que no se llaman como su provincia, banderas de las provincias que tienen una oficial y municipios de cada provincia", short: "provincias" }
};

/** Explicación de cada dificultad en Opciones. */
export const OPTION_COUNT_DESCRIPTIONS: Record<OptionCount, string> = {
  4: "La respuesta y tres opciones más.",
  6: "Más trampas entre las opciones.",
  8: "Casi todas las trampas a la vez."
};
