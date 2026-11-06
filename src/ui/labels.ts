// Textos con los que se presentan las opciones en el inicio y en Opciones.

import type { RoundLength, TimeLimit } from "../engine/round";
import type { NameStyle, Territorio } from "../engine/types";

/** Cómo se presenta cada forma de los nombres en Opciones. */
export const NAME_LABELS: Record<NameStyle, { name: string; example: string; short: string }> = {
  oficial: { name: "Nombre oficial", example: "Girona, Bizkaia, Illes Balears…", short: "oficial" },
  castellano: { name: "En castellano", example: "Gerona, Vizcaya, Islas Baleares…", short: "en castellano" }
};

/** Cómo se presenta cada territorio en Opciones, y qué se añade al nombre de la categoría en la partida. */
export const TERRITORIO_LABELS: Record<Territorio, { name: string; example: string; short: string }> = {
  comunidad: { name: "Comunidades", example: "Las 17 comunidades y las ciudades autónomas de Ceuta y Melilla, y de qué comunidad es cada provincia", short: "comunidades" },
  provincia: { name: "Provincias", example: "Capitales que no se llaman como su provincia, banderas de las provincias que tienen una oficial y municipios de cada provincia", short: "provincias" }
};

/** Explicación de cada dificultad en Opciones. */
export const DIFICULTAD_DESC: Record<number, string> = {
  4: "La respuesta y tres opciones más.",
  6: "Más trampas entre las opciones.",
  8: "Casi todas las trampas a la vez."
};

/** Cómo se presenta cada número de preguntas en Opciones. */
export const LONGITUD_LABELS: Record<RoundLength, { name: string; desc: string }> = {
  10: { name: "10 preguntas", desc: "Una partida rápida." },
  25: { name: "25 preguntas", desc: "Una partida media." },
  50: { name: "50 preguntas", desc: "Una partida larga." },
  100: { name: "100 preguntas", desc: "Para repasarlo casi todo." },
  sinLimite: { name: "Sin límite", desc: "Hasta que pulses «Terminar». Si se acaban, se barajan otra vez." }
};

/** Cómo se presenta cada tiempo por pregunta en Opciones y en el inicio. */
export const TIEMPO_LABELS: Record<TimeLimit, { name: string; desc: string; info: string }> = {
  sinTiempo: { name: "Sin tiempo", desc: "Para jugar con calma.", info: "sin tiempo" },
  60: { name: "1 minuto", desc: "Tiempo de sobra para pensar.", info: "1 minuto por pregunta" },
  30: { name: "30 segundos", desc: "Hay que ir con algo de prisa.", info: "30 segundos por pregunta" },
  10: { name: "10 segundos", desc: "Nivel difícil: casi solo da para leer.", info: "10 segundos por pregunta" }
};
