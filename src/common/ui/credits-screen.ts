// Pantalla de Créditos, una por sección: cada una enseña lo suyo (en Geografía, el autor y la licencia
// de cada bandera; en el Examen, de dónde salen las preguntas) y lo que es de todo el juego (las tipografías).

import { BANDERAS, BANDERAS_PROVINCIAS, type BanderaInfo } from "../../sections/geografia/engine/questions";
import { AUTONOMIAS, provincia } from "../../sections/geografia/engine/territorio";
import { type Section } from "../engine/types";
import { NAME_STYLES } from "../../sections/geografia/engine/types";
import { $, el, enlaceExterno } from "./dom";
import { flagImage } from "../../sections/geografia/ui/banderas";

/** Nombre de cada sección en el nombre de la pantalla, para el lector de pantalla. */
const NOMBRE: Record<Section, string> = { geografia: "Créditos de Geografía", ccse: "Créditos del Examen de nacionalidad" };

export function renderCredits(seccion: Section): void {
  // Los bloques con data-seccion son de una sección; los demás, de todas.
  for (const bloque of document.querySelectorAll<HTMLElement>("#credits [data-seccion]")) {
    bloque.hidden = bloque.dataset.seccion !== seccion;
  }
  $("credits").setAttribute("aria-label", NOMBRE[seccion]);
  // La lista de banderas, solo en Geografía: así, en los créditos del examen no se descarga ninguna.
  if (seccion === "geografia") pintarBanderas();
}

function pintarBanderas(): void {
  const fila = (clave: string, nombre: string, f: BanderaInfo["fuente"]) => {
    const row = el("div", "credit");
    const text = el("div", "credit-text");
    const lic = el("span");
    if (f.autor) lic.append(`${f.autor} · `);
    lic.append(f.licenciaUrl ? enlaceExterno(f.licenciaUrl, f.licencia) : f.licencia, " · ", enlaceExterno(f.url, "ver en Wikimedia Commons"));
    text.append(el("b", "", nombre), lic);
    const thumb = el("span", "thumb");
    thumb.append(flagImage(clave, "")); // el nombre está escrito al lado
    row.append(thumb, text);
    return row;
  };
  $("creditList").replaceChildren(...AUTONOMIAS.map((c) => fila(c.id, c.nombre[NAME_STYLES[0]], BANDERAS[c.id].fuente)));
  $("creditListProvincias").replaceChildren(...Object.keys(BANDERAS_PROVINCIAS).sort().map((id) =>
    fila("p" + id, provincia(id).nombre[NAME_STYLES[0]], BANDERAS_PROVINCIAS[id].fuente)));
}
