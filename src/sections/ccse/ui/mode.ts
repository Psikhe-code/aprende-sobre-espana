// Examen de nacionalidad: lo que da a la partida común (ver common/ui/mode.ts).

import { ccseRecordKey, type SavedState } from "../../../common/engine/storage";
import type { Modo } from "../../../common/ui/mode";
import { otraVueltaCcse, partidaCcse, repasoCcse, tamanoCcse } from "../engine/questions";
import { puedeJugarCcse } from "../engine/selection";

export function modoCcse(state: SavedState): Modo {
  const ajustes = () => ({ tareas: state.ccse.tareas, length: state.ccse.longitud });
  return {
    seccion: "ccse",
    puedeJugar: () => puedeJugarCcse(state),
    nueva: () => partidaCcse(ajustes()),
    otraVuelta: (ultimaId) => otraVueltaCcse(ajustes(), ultimaId),
    repaso: (fallos) => repasoCcse(fallos),
    esperadas: () => tamanoCcse(state.ccse.tareas, state.ccse.longitud),
    sinLimite: () => state.ccse.longitud === "sinLimite",
    tiempo: () => state.ccse.tiempo,
    seleccion: () => "ccse:" + JSON.stringify([state.ccse.tareas, state.ccse.longitud]),
    claveRecord: () => ccseRecordKey(state.ccse.tareas, state.ccse.longitud, state.ccse.tiempo)
  };
}
