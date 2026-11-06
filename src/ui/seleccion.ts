// Lo que se deduce de las opciones marcadas (la selección actual): si se puede jugar,
// con qué ajustes se prepara la partida y con qué clave se guarda su récord.

import { lengthFits, roundSize, type RoundSettings } from "../engine/round";
import { comboKey, type SavedState } from "../engine/storage";

/** Si con las opciones marcadas se puede jugar: alguna categoría, forma y territorio, y preguntas suficientes. */
export const puedeJugar = (s: SavedState) =>
  s.selected.length > 0 && s.names.length > 0 && s.territorios.length > 0 &&
  roundSize(s.selected, s.territorios) > 0 && lengthFits(s.longitud, s.selected, s.territorios);

/** Ajustes con los que se prepara una partida (o otra vuelta a la baraja). */
export const ajustesPartida = (s: SavedState): RoundSettings =>
  ({ categories: s.selected, names: s.names, territorios: s.territorios, options: s.opciones, length: s.longitud });

/**
 * Lo que decide qué preguntas salen, como texto: si cambia, la partida preparada ya no vale.
 * El tiempo no está, porque no cambia las preguntas.
 */
export const seleccionActual = (s: SavedState) => JSON.stringify([s.selected, s.names, s.territorios, s.opciones, s.longitud]);

/** Clave del récord de la selección actual. */
export const claveRecord = (s: SavedState) => comboKey(s.selected, s.territorios, s.opciones, s.longitud, s.tiempo);
