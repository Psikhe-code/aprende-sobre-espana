// Pantalla de Créditos: autor y licencia de cada bandera.

import { BANDERAS, BANDERAS_PROVINCIAS, type BanderaInfo } from "../engine/questions";
import { AUTONOMIAS, provincia } from "../engine/territory";
import { NAME_STYLES } from "../engine/types";
import { $, el } from "./dom";
import { flagImage } from "./flags";

export function renderCredits(): void {
  const link = (href: string, text: string) => {
    const a = el("a", "", text) as HTMLAnchorElement;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  };
  const fila = (clave: string, nombre: string, f: BanderaInfo["fuente"]) => {
    const row = el("div", "credit");
    const text = el("div", "credit-text");
    const lic = el("span");
    if (f.autor) lic.append(`${f.autor} · `);
    lic.append(f.licenciaUrl ? link(f.licenciaUrl, f.licencia) : f.licencia, " · ", link(f.url, "ver en Wikimedia Commons"));
    text.append(el("b", "", nombre), lic);
    const thumb = el("span", "thumb");
    thumb.append(flagImage(clave));
    row.append(thumb, text);
    return row;
  };
  $("creditList").replaceChildren(...AUTONOMIAS.map((c) => fila(c.id, c.nombre[NAME_STYLES[0]], BANDERAS[c.id].fuente)));
  $("creditListProvincias").replaceChildren(...Object.keys(BANDERAS_PROVINCIAS).sort().map((id) =>
    fila("p" + id, provincia(id).nombre[NAME_STYLES[0]], BANDERAS_PROVINCIAS[id].fuente)));
}
