// Geografía: lo suyo en Créditos que no está fijo en index.html: la lista de banderas, con su autor y su licencia.

import { AUTONOMIA_BANDERAS, PROVINCIA_BANDERAS, type Bandera } from "../engine/questions";
import { AUTONOMIAS, provincia } from "../engine/territorio";
import { NAME_FORMS } from "../engine/types";
import { $, el, externalLink } from "../../../common/ui/dom";
import { banderaImage } from "./banderas";

/** Dibuja la lista de banderas. Solo se llama en los Créditos de Geografía: así, en los del examen no se descarga ninguna. */
export function renderBanderaCredits(): void {
  const creditRow = (key: string, name: string, f: Bandera["fuente"]) => {
    const row = el("div", "credit");
    const text = el("div", "credit-text");
    const lic = el("span");
    if (f.autor) lic.append(`${f.autor} · `);
    lic.append(f.licenciaUrl ? externalLink(f.licenciaUrl, f.licencia) : f.licencia, " · ", externalLink(f.url, "ver en Wikimedia Commons"));
    text.append(el("b", "", name), lic);
    const thumb = el("span", "thumb");
    thumb.append(banderaImage(key, "")); // el nombre está escrito al lado
    row.append(thumb, text);
    return row;
  };
  $("autonomiaCreditList").replaceChildren(...AUTONOMIAS.map((c) => creditRow(c.id, c.nombre[NAME_FORMS[0]], AUTONOMIA_BANDERAS[c.id].fuente)));
  $("provinciaCreditList").replaceChildren(...Object.keys(PROVINCIA_BANDERAS).sort().map((id) =>
    creditRow("p" + id, provincia(id).nombre[NAME_FORMS[0]], PROVINCIA_BANDERAS[id].fuente)));
}
