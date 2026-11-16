// Las secciones que vendrán: salen al final del menú como «Próximamente», sin poder elegirse. Van aparte de la lista
// de secciones (sections.ts), sin datos, para que también puedan usarlas los tests de pantalla.

import type { UpcomingSection } from "../common/ui/section";

export const UPCOMING_SECTIONS: readonly UpcomingSection[] = [
  { id: "historia", name: "Historia", description: "Las causas y las consecuencias de los grandes momentos de la historia de España." },
  { id: "gastronomia", name: "Gastronomía", description: "Platos, productos y tradiciones de la cocina de cada región." }
];
