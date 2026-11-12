// Pantalla final: aciertos, valoración, récord y lista de fallos.

import { applyRecord, type GameResult, type GameSession } from "../engine/game";
import type { Seccion } from "../engine/types";
import type { Contexto } from "./contexto";
import { $, el } from "./dom";
import { flagImage } from "./flags";

/**
 * Valoración del resultado. En el examen de nacionalidad toma como referencia el aprobado de la prueba
 * real (15 aciertos de 25, el 60 %); en geografía, las del atlas.
 */
function rating(r: GameResult, seccion: Seccion): string {
  if (!r.total) return "Sin respuestas";
  const pct = r.hits / r.total;
  if (seccion === "ccse") return pct === 1 ? "Pleno" : pct >= 0.8 ? "Gran nivel" : pct >= 0.6 ? "Por encima del aprobado" : "Toca repasar";
  return pct === 1 ? "Mapa completo" : pct >= 0.8 ? "Gran nivel" : pct >= 0.5 ? "Buen rumbo" : "Toca repasar el atlas";
}

/** Apunta el récord, si lo hay, y dibuja el resultado de la partida. */
export function renderEnd(ctx: Contexto, game: GameSession): void {
  const { state } = ctx;
  const r = game.result();
  const rec = applyRecord(state.best, ctx.modo().claveRecord(), r);
  if (rec.isNewRecord) { state.best = rec.best; ctx.save(); }

  $("score").replaceChildren(String(r.hits), el("small", "", `/${r.total}`));
  $("endTitle").textContent = rating(r, ctx.modo().seccion);
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
        f.append(flagImage(m.question.flag));
        row.append(f);
      }
      const a = el("span", "miss-a");
      a.append("Respuesta: ", el("b", "", m.question.answer),
        ...(m.given === null ? [" · se acabó el tiempo"] : [" · tú dijiste ", el("s", "", m.given)]));
      row.append(a);
      misses.append(row);
    }
  }
  $("review").hidden = !r.misses.length;
}
