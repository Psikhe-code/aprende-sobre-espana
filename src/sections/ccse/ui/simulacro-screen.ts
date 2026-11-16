// Pantallas del simulacro de examen: el examen (25 preguntas, un reloj de 45 minutos para todo y un mapa
// para ir a cualquier pregunta) y su resultado (apto o no apto, aciertos por tarea y los fallos con su nota).
// Mientras se hace no se dice si una respuesta es correcta, como en la prueba real.
// Las reglas (reparto, aprobado, entrega) viven en engine/simulacro.ts; aquí solo se dibujan.

import type { CcseRoundQuestion } from "../engine/questions";
import { Countdown } from "../../../common/engine/countdown";
import type { PlayableQuestion } from "../../../common/engine/types";
import {
  SIMULACRO_APTO_HITS, SIMULACRO_RECORD_KEY, SIMULACRO_MINUTES, SIMULACRO_QUESTION_COUNT, SIMULACRO_DISTRIBUTION, Simulacro,
  applySimulacroRecord, simulacroQuestions, canDoSimulacro, type SimulacroResult
} from "../engine/simulacro";
import type { SavedState } from "../../../common/engine/storage";
import type { AppContext } from "../../../common/ui/context";
import { $, el, pad, renderSources, numberKey } from "../../../common/ui/dom";
import { answerLine } from "../../../common/ui/widgets";
import { clockTime, timeUsed } from "../../../common/ui/labels";

export interface SimulacroScreen {
  /** Para el reloj al salir de la pantalla del examen. */
  onLeave(): void;
}

/** Qué es el simulacro, para el inicio del examen: sale de las reglas, así que si cambian, cambia solo. */
export function simulacroText(): string {
  const counts = SIMULACRO_DISTRIBUTION.map((r) => r.questionCount);
  const list = counts.slice(0, -1).join(", ") + " y " + counts[counts.length - 1];
  return `Como la prueba real: ${SIMULACRO_QUESTION_COUNT} preguntas repartidas por tareas (${list}), ${SIMULACRO_MINUTES} minutos ` +
    `para todo y apto con ${SIMULACRO_APTO_HITS} aciertos. No sabrás si aciertas hasta entregar.`;
}

/** Bloque del simulacro en el inicio del examen: solo si hay preguntas de sobra en cada tarea. */
export function renderSimulacroStart(state: SavedState): void {
  const canDo = canDoSimulacro();
  $("simSummary").hidden = !canDo;
  if (!canDo) return;
  $("simInfo").textContent = simulacroText();
  const best = state.records[SIMULACRO_RECORD_KEY];
  const record = $("simRecord");
  record.replaceChildren();
  if (best == null) record.textContent = "Aún no has hecho ningún simulacro.";
  else record.append("Mejor resultado: ", el("b", "", `${best}/${SIMULACRO_QUESTION_COUNT}`));
}

/** Prepara las pantallas del simulacro (sus botones y teclas). `startReview` empieza el repaso de los fallos. */
export function createSimulacroScreen(ctx: AppContext, startReview: (misses: PlayableQuestion[]) => void): SimulacroScreen {
  let sim: Simulacro | null = null;
  let countdown: Countdown | null = null;
  let intervalId = 0;
  /** Qué se confirma en el aviso que está abierto: entregar o salir. */
  let confirming: "submit" | "leave" | null = null;
  let warningsGiven = new Set<number>();
  let misses: PlayableQuestion[] = [];

  const announceSim = (text: string) => { $("simAnnounce").textContent = text; };

  function start() {
    if (!canDoSimulacro()) return;
    sim = new Simulacro(simulacroQuestions());
    countdown = new Countdown(SIMULACRO_MINUTES * 60 * 1000);
    warningsGiven = new Set();
    closeConfirmation();
    ctx.show("sim");
    render();
    if (!document.hidden) countdown.start();
    clearInterval(intervalId);
    intervalId = window.setInterval(tick, 250);
    tick();
  }

  /** Cada cuarto de segundo: dibuja el reloj, avisa cuando quedan 5 minutos y 1 minuto, y entrega al acabarse. */
  function tick() {
    if (!countdown || !sim) return;
    const remaining = countdown.remaining();
    $("simTimerFill").style.transform = `scaleX(${remaining / countdown.ms})`;
    $("simTimerText").textContent = clockTime(remaining);
    $("simTimer").classList.toggle("urgent", remaining <= 5 * 60 * 1000);
    for (const m of [5, 1]) {
      if (remaining <= m * 60 * 1000 && !warningsGiven.has(m) && remaining > 0) {
        warningsGiven.add(m);
        announceSim(m === 1 ? "Queda 1 minuto." : `Quedan ${m} minutos.`);
      }
    }
    if (countdown.expired) submit(true);
  }

  function stopCountdown() {
    clearInterval(intervalId);
    intervalId = 0;
    countdown?.pause();
  }

  /** Dibuja la pregunta que se ve, con la opción elegida marcada, y el mapa de preguntas. */
  function render() {
    if (!sim) return;
    const s = sim;
    const q = s.current;
    $("simSheet").replaceChildren(`Pregunta ${pad(s.index + 1)} `, el("span", "", `/ ${pad(s.total)}`));
    $("simAnswered").textContent = `${s.answeredCount}/${s.total}`;
    $("simCat").textContent = q.label;
    $("simQuestion").textContent = q.text;
    const chosen = s.answers[s.index];
    $("simOpts").replaceChildren(...q.options.map((o, j) => {
      const b = el("button", "opt" + (o === chosen ? " chosen" : ""));
      b.id = "sim-opt-" + j;
      b.dataset.value = o;
      b.setAttribute("aria-pressed", String(o === chosen));
      b.append(el("span", "key", String(j + 1)), el("span", "", o));
      b.addEventListener("click", () => choose(o));
      return b;
    }));
    $<HTMLButtonElement>("simPrev").disabled = s.index === 0;
    $("simNext").hidden = s.index === s.total - 1;
    $("simMap").replaceChildren(...s.questions.map((_, j) => {
      const answered = s.answers[j] !== null;
      const b = el("button", "sim-n" + (answered ? " answered" : ""), String(j + 1));
      b.id = "sim-n-" + (j + 1);
      b.setAttribute("aria-label", `Pregunta ${j + 1}, ${answered ? "respondida" : "sin responder"}`);
      if (j === s.index) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => goTo(j));
      return b;
    }));
  }

  function choose(option: string) {
    if (!sim || confirming) return;
    sim.answer(option);
    const i = sim.index;
    render();
    $("sim-opt-" + sim.current.options.indexOf(option)).focus({ preventScroll: true });
    announceSim(`Respuesta de la pregunta ${i + 1}: ${option}.`);
  }

  function goTo(i: number, focusId?: string) {
    if (!sim || confirming) return;
    sim.goTo(i);
    render();
    window.scrollTo({ top: 0 });
    // El foco se queda en el botón con el que se ha llegado (Siguiente, Anterior o el número del mapa).
    const targetId = focusId && !$(focusId).hidden && !$<HTMLButtonElement>(focusId).disabled ? focusId : "sim-n-" + (sim.index + 1);
    $(targetId).focus({ preventScroll: true });
  }

  /** Aviso antes de entregar o salir, para que un toque sin querer no acabe el examen. */
  function askConfirmation(what: "submit" | "leave") {
    if (!sim) return;
    confirming = what;
    const n = sim.unansweredCount;
    $("simConfirmText").textContent = what === "leave"
      ? "Si sales ahora, se pierde este simulacro."
      : n ? `Te ${n === 1 ? "queda 1 pregunta" : `quedan ${n} preguntas`} sin responder, que ${n === 1 ? "contará" : "contarán"} como ${n === 1 ? "fallo" : "fallos"}. Al entregar ya no podrás cambiar las respuestas.`
      : "Al entregar ya no podrás cambiar las respuestas.";
    $("simConfirmYes").textContent = what === "leave" ? "Salir" : n ? "Entregar igualmente" : "Entregar";
    $("simConfirm").hidden = false;
    $("simButtons").hidden = true;
    $("simConfirm").scrollIntoView({ block: "nearest" });
    $("simConfirmNo").focus({ preventScroll: true });
  }

  function closeConfirmation() {
    confirming = null;
    $("simConfirm").hidden = true;
    $("simButtons").hidden = false;
  }

  function confirm() {
    if (confirming === "submit") submit(false);
    else if (confirming === "leave") { closeConfirmation(); stopCountdown(); sim = null; ctx.goHome(); }
  }

  /** Entrega el examen: al pulsar «Entregar» o al acabarse el tiempo. */
  function submit(timeUp: boolean) {
    if (!sim || !countdown || sim.submitted) return;
    stopCountdown();
    closeConfirmation();
    const r = sim.submit();
    const timeText = countdown.ms - countdown.remaining();
    const rec = applySimulacroRecord(ctx.state.records, r.hits);
    if (rec.isNewRecord) { ctx.state.records = rec.records; ctx.save(); }
    misses = r.misses.map((f) => f.question);
    renderResult(sim.questions, r, timeUp ? "Se acabó el tiempo" : `Tiempo: ${timeUsed(timeText)}`, rec.record);
    ctx.show("simEnd");
  }

  function renderResult(questions: readonly CcseRoundQuestion[], r: SimulacroResult, timeText: string, best: number) {
    $("simScore").replaceChildren(String(r.hits), el("small", "", `/${r.total}`));
    $("simTitle").textContent = r.apto ? "Apto" : "No apto";
    $("simTitle").classList.toggle("apto", r.apto);
    $("simTitle").classList.toggle("no-apto", !r.apto);
    $("simSub").textContent = `Simulacro de examen · Apto con ${SIMULACRO_APTO_HITS} aciertos · ${timeText} · Mejor resultado: ${best}/${r.total}`;
    $("simByTarea").replaceChildren(...r.byTarea.map((t) =>
      el("span", "chip" + (t.hits === t.total ? " full" : ""), `Tarea ${t.tarea} · ${t.hits}/${t.total}`)));

    const list = $("simMisses");
    list.replaceChildren();
    $("simMissLabel").hidden = !r.misses.length;
    $("simReview").hidden = !r.misses.length;
    if (!r.misses.length) {
      list.append(el("p", "allright", "Sin fallos en este simulacro."));
      return;
    }
    for (const f of r.misses) {
      const row = el("div", "miss");
      row.append(el("span", "miss-cat", `Pregunta ${questions.indexOf(f.question) + 1} · Tarea ${f.question.tarea}`));
      row.append(el("span", "miss-q", f.question.text));
      row.append(answerLine(f.question.answer, f.given, "sin responder"));
      if (f.question.why) row.append(el("p", "why miss-why", f.question.why));
      const sourcesLine = el("p", "source");
      renderSources(sourcesLine, f.question.sources);
      if (!sourcesLine.hidden) row.append(sourcesLine);
      list.append(row);
    }
  }

  $("simGo").addEventListener("click", start);
  $("simAgain").addEventListener("click", start);
  $("simMenu").addEventListener("click", ctx.goHome);
  $("simReview").addEventListener("click", () => startReview(misses));
  $("simPrev").addEventListener("click", () => sim && goTo(sim.index - 1, "simPrev"));
  $("simNext").addEventListener("click", () => sim && goTo(sim.index + 1, "simNext"));
  $("simSubmit").addEventListener("click", () => askConfirmation("submit"));
  $("simLeave").addEventListener("click", () => askConfirmation("leave"));
  $("simConfirmYes").addEventListener("click", confirm);
  $("simConfirmNo").addEventListener("click", () => { closeConfirmation(); $("simSubmit").focus({ preventScroll: true }); });

  // Teclas: números para elegir, flechas para ir a la anterior o la siguiente, Escape para cerrar el aviso.
  document.addEventListener("keydown", (e) => {
    if (ctx.screen() !== "sim" || !sim) return;
    if (confirming) {
      if (e.key === "Escape") { closeConfirmation(); $("simSubmit").focus({ preventScroll: true }); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const number = numberKey(e);
    if (number !== null) {
      const o = sim.current.options[number - 1];
      if (o !== undefined) { e.preventDefault(); choose(o); }
    } else if (e.key === "ArrowRight") { e.preventDefault(); goTo(sim.index + 1, "simNext"); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(sim.index - 1, "simPrev"); }
  });

  // Al cambiar de pestaña o bloquear el móvil, el reloj se para; al volver, sigue (como en las partidas).
  document.addEventListener("visibilitychange", () => {
    if (!countdown || !sim || sim.submitted || ctx.screen() !== "sim") return;
    if (document.hidden) countdown.pause();
    else { countdown.start(); tick(); }
  });

  return {
    onLeave() {
      // Solo se llega aquí sin entregar si se sale de la pantalla por otro camino: el examen se da por perdido.
      if (sim && !sim.submitted) { stopCountdown(); sim = null; }
    }
  };
}
