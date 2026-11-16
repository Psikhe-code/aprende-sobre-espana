// La lista de secciones del juego, en el orden del menú. Para añadir una, se crea su carpeta (con su `section.ts`,
// como las demás) y se añade aquí; si estaba entre las que vendrán (upcoming.ts), se quita de allí.

import type { SectionDefinition } from "../common/ui/section";
import { geografiaSection } from "./geografia/ui/section";
import { ccseSection } from "./ccse/ui/section";

export const SECTION_LIST: readonly SectionDefinition[] = [geografiaSection, ccseSection];
export { UPCOMING_SECTIONS } from "./upcoming";
