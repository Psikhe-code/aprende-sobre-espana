// Pantalla de Créditos, una por sección: cada una enseña lo suyo (en Geografía, el autor y la licencia
// de cada bandera; en el Examen, de dónde salen las preguntas) y lo que es de todo el juego (las tipografías).

import { AUTONOMIA_BANDERAS, PROVINCIA_BANDERAS, type Bandera } from "../../sections/geografia/engine/questions";
import { AUTONOMIAS, provincia } from "../../sections/geografia/engine/territorio";
import { type Section } from "../engine/types";
import { NAME_FORMS } from "../../sections/geografia/engine/types";
import { $, el, externalLink } from "./dom";
import { flagImage } from "../../sections/geografia/ui/banderas";

/** Nombre de cada sección en el nombre de la pantalla, para el lector de pantalla. */
const SCREEN_NAMES: Record<Section, string> = { geografia: "Créditos de Geografía", ccse: "Créditos del Examen de nacionalidad" };

export function renderCredits(section: Section): void {
  // Los bloques con data-section son de una sección; los demás, de todas.
  for (const block of document.querySelectorAll<HTMLElement>("#credits [data-section]")) {
    block.hidden = block.dataset.section !== section;
  }
  $("credits").setAttribute("aria-label", SCREEN_NAMES[section]);
  // La lista de banderas, solo en Geografía: así, en los créditos del examen no se descarga ninguna.
  if (section === "geografia") renderBanderaCredits();
}

function renderBanderaCredits(): void {
  const creditRow = (key: string, name: string, f: Bandera["fuente"]) => {
    const row = el("div", "credit");
    const text = el("div", "credit-text");
    const lic = el("span");
    if (f.autor) lic.append(`${f.autor} · `);
    lic.append(f.licenciaUrl ? externalLink(f.licenciaUrl, f.licencia) : f.licencia, " · ", externalLink(f.url, "ver en Wikimedia Commons"));
    text.append(el("b", "", name), lic);
    const thumb = el("span", "thumb");
    thumb.append(flagImage(key, "")); // el nombre está escrito al lado
    row.append(thumb, text);
    return row;
  };
  $("autonomiaCreditList").replaceChildren(...AUTONOMIAS.map((c) => creditRow(c.id, c.nombre[NAME_FORMS[0]], AUTONOMIA_BANDERAS[c.id].fuente)));
  $("provinciaCreditList").replaceChildren(...Object.keys(PROVINCIA_BANDERAS).sort().map((id) =>
    creditRow("p" + id, provincia(id).nombre[NAME_FORMS[0]], PROVINCIA_BANDERAS[id].fuente)));
}
