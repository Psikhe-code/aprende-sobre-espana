/**
 * @fileoverview Pantalla final: aciertos, valoración, récord y lista de fallos.
 */

import { applyRecord, ratingText, type Round } from "../engine/common-round";
import type { AppContext } from "./common-context";
import { answerLine } from "./common-widgets";
import { $, el } from "./common-dom";
import { imageElement } from "./common-images";

/** Apunta el récord, si lo hay, y dibuja el resultado de la partida. */
export function renderEnd(ctx: AppContext, round: Round): void {
  const { state } = ctx;
  const r = round.result();
  const rec = applyRecord(state.records, ctx.mode().recordKey(), r);
  if (rec.isNewRecord) { state.records = rec.records; ctx.save(); }

  $("score").replaceChildren(String(r.hits), el("small", "", `/${r.total}`));
  $("endTitle").textContent = ratingText(r, ctx.mode().rating);
  const recText = r.review || rec.record == null ? ""
    : r.unlimited ? ` · Mejor racha con esta selección: ${rec.record}`
    : ` · Récord con esta selección: ${rec.record}/${r.total}`;
  const kind = r.review ? "Repaso de fallos" : r.unlimited ? "Partida sin límite" : "Partida";
  $("endSub").textContent = `${kind} · Mejor racha: ${r.bestStreak}` + recText;

  const misses = $("misses");
  misses.replaceChildren();
  $("missLabel").hidden = !r.misses.length;
  if (!r.misses.length) {
    misses.append(el("p", "allright", "Sin fallos en esta partida."));
  } else {
    for (const m of r.misses) {
      const row = el("div", "miss");
      row.append(el("span", "miss-q", m.question.text));
      if (m.question.image) {
        const f = el("div", "miss-image");
        f.append(imageElement(m.question.image.src, m.question.image.answerAlt)); // aquí ya se sabe la respuesta
        row.append(f);
      }
      row.append(answerLine(m.question.correctAnswer, m.givenAnswer, "se acabó el tiempo"));
      misses.append(row);
    }
  }
  $("review").hidden = !r.misses.length;
}
