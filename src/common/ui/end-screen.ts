// Pantalla final: aciertos, valoración, récord y lista de fallos.

import { applyRecord, valoracion, type GameSession } from "../engine/round";
import type { Contexto } from "./context";
import { lineaRespuesta } from "./widgets";
import { $, el } from "./dom";
import { flagImage } from "../../sections/geografia/ui/banderas";

/** Apunta el récord, si lo hay, y dibuja el resultado de la partida. */
export function renderEnd(ctx: Contexto, game: GameSession): void {
  const { state } = ctx;
  const r = game.result();
  const rec = applyRecord(state.best, ctx.modo().claveRecord(), r);
  if (rec.isNewRecord) { state.best = rec.best; ctx.save(); }

  $("score").replaceChildren(String(r.hits), el("small", "", `/${r.total}`));
  $("endTitle").textContent = valoracion(r, ctx.modo().seccion);
  const recText = r.review || rec.record == null ? ""
    : r.unlimited ? ` · Mejor racha con esta selección: ${rec.record}`
    : ` · Récord con esta selección: ${rec.record}/${game.expected}`;
  const tipo = r.review ? "Repaso de fallos" : r.unlimited ? "Partida sin límite" : "Partida";
  $("endSub").textContent = `${tipo} · Mejor racha: ${r.bestStreak}` + recText;

  const misses = $("misses");
  misses.replaceChildren();
  $("missLabel").hidden = !r.misses.length;
  if (!r.misses.length) {
    misses.append(el("p", "allright", "Sin fallos en esta partida."));
  } else {
    for (const m of r.misses) {
      const row = el("div", "miss");
      row.append(el("span", "miss-q", m.question.text));
      if (m.question.flag) {
        const f = el("div", "miss-flag");
        f.append(flagImage(m.question.flag, `Bandera: ${m.question.answer}`)); // aquí ya se sabe de quién es
        row.append(f);
      }
      row.append(lineaRespuesta(m.question.answer, m.given, "se acabó el tiempo"));
      misses.append(row);
    }
  }
  $("review").hidden = !r.misses.length;
}
