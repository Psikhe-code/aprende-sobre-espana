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

export interface PantallaSimulacro {
  /** Para el reloj al salir de la pantalla del examen. */
  alSalir(): void;
}

/** Qué es el simulacro, para el inicio del examen: sale de las reglas, así que si cambian, cambia solo. */
export function textoSimulacro(): string {
  const reparto = SIMULACRO_DISTRIBUTION.map((r) => r.questionCount);
  const lista = reparto.slice(0, -1).join(", ") + " y " + reparto[reparto.length - 1];
  return `Como la prueba real: ${SIMULACRO_QUESTION_COUNT} preguntas repartidas por tareas (${lista}), ${SIMULACRO_MINUTES} minutos ` +
    `para todo y apto con ${SIMULACRO_APTO_HITS} aciertos. No sabrás si aciertas hasta entregar.`;
}

/** Bloque del simulacro en el inicio del examen: solo si hay preguntas de sobra en cada tarea. */
export function renderInicioSimulacro(state: SavedState): void {
  const posible = canDoSimulacro();
  $("simResumen").hidden = !posible;
  if (!posible) return;
  $("simInfo").textContent = textoSimulacro();
  const mejor = state.best[SIMULACRO_RECORD_KEY];
  const record = $("simRecord");
  record.replaceChildren();
  if (mejor == null) record.textContent = "Aún no has hecho ningún simulacro.";
  else record.append("Mejor resultado: ", el("b", "", `${mejor}/${SIMULACRO_QUESTION_COUNT}`));
}

/** Prepara las pantallas del simulacro (sus botones y teclas). `repasar` empieza el repaso de los fallos. */
export function crearSimulacro(ctx: AppContext, repasar: (fallos: PlayableQuestion[]) => void): PantallaSimulacro {
  let sim: Simulacro | null = null;
  let reloj: Countdown | null = null;
  let intervalo = 0;
  /** Qué se confirma en el aviso que está abierto: entregar o salir. */
  let confirmando: "entregar" | "salir" | null = null;
  let avisos = new Set<number>();
  let fallos: PlayableQuestion[] = [];

  const anunciar = (texto: string) => { $("simAnnounce").textContent = texto; };

  function empezar() {
    if (!canDoSimulacro()) return;
    sim = new Simulacro(simulacroQuestions());
    reloj = new Countdown(SIMULACRO_MINUTES * 60 * 1000);
    avisos = new Set();
    cerrarAviso();
    ctx.show("sim");
    dibujar();
    if (!document.hidden) reloj.start();
    clearInterval(intervalo);
    intervalo = window.setInterval(tic, 250);
    tic();
  }

  /** Cada cuarto de segundo: dibuja el reloj, avisa cuando quedan 5 minutos y 1 minuto, y entrega al acabarse. */
  function tic() {
    if (!reloj || !sim) return;
    const queda = reloj.remaining();
    $("simTimerFill").style.transform = `scaleX(${queda / reloj.ms})`;
    $("simTimerText").textContent = clockTime(queda);
    $("simTimer").classList.toggle("urgent", queda <= 5 * 60 * 1000);
    for (const m of [5, 1]) {
      if (queda <= m * 60 * 1000 && !avisos.has(m) && queda > 0) {
        avisos.add(m);
        anunciar(m === 1 ? "Queda 1 minuto." : `Quedan ${m} minutos.`);
      }
    }
    if (reloj.expired) entregar(true);
  }

  function pararReloj() {
    clearInterval(intervalo);
    intervalo = 0;
    reloj?.pause();
  }

  /** Dibuja la pregunta que se ve, con la opción elegida marcada, y el mapa de preguntas. */
  function dibujar() {
    if (!sim) return;
    const s = sim;
    const q = s.current;
    $("simSheet").replaceChildren(`Pregunta ${pad(s.index + 1)} `, el("span", "", `/ ${pad(s.total)}`));
    $("simRespondidas").textContent = `${s.answeredCount}/${s.total}`;
    $("simCat").textContent = q.label;
    $("simQuestion").textContent = q.text;
    const elegida = s.answers[s.index];
    $("simOpts").replaceChildren(...q.options.map((o, j) => {
      const b = el("button", "opt" + (o === elegida ? " elegida" : ""));
      b.id = "sim-opt-" + j;
      b.dataset.value = o;
      b.setAttribute("aria-pressed", String(o === elegida));
      b.append(el("span", "key", String(j + 1)), el("span", "", o));
      b.addEventListener("click", () => elegir(o));
      return b;
    }));
    $<HTMLButtonElement>("simPrev").disabled = s.index === 0;
    $("simNext").hidden = s.index === s.total - 1;
    $("simMapa").replaceChildren(...s.questions.map((_, j) => {
      const hecha = s.answers[j] !== null;
      const b = el("button", "sim-n" + (hecha ? " hecha" : ""), String(j + 1));
      b.id = "sim-n-" + (j + 1);
      b.setAttribute("aria-label", `Pregunta ${j + 1}, ${hecha ? "respondida" : "sin responder"}`);
      if (j === s.index) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => ir(j));
      return b;
    }));
  }

  function elegir(opcion: string) {
    if (!sim || confirmando) return;
    sim.answer(opcion);
    const i = sim.index;
    dibujar();
    $("sim-opt-" + sim.current.options.indexOf(opcion)).focus({ preventScroll: true });
    anunciar(`Respuesta de la pregunta ${i + 1}: ${opcion}.`);
  }

  function ir(i: number, foco?: string) {
    if (!sim || confirmando) return;
    sim.goTo(i);
    dibujar();
    window.scrollTo({ top: 0 });
    // El foco se queda en el botón con el que se ha llegado (Siguiente, Anterior o el número del mapa).
    const destino = foco && !$(foco).hidden && !$<HTMLButtonElement>(foco).disabled ? foco : "sim-n-" + (sim.index + 1);
    $(destino).focus({ preventScroll: true });
  }

  /** Aviso antes de entregar o salir, para que un toque sin querer no acabe el examen. */
  function pedirConfirmacion(que: "entregar" | "salir") {
    if (!sim) return;
    confirmando = que;
    const n = sim.unansweredCount;
    $("simConfirmarTexto").textContent = que === "salir"
      ? "Si sales ahora, se pierde este simulacro."
      : n ? `Te ${n === 1 ? "queda 1 pregunta" : `quedan ${n} preguntas`} sin responder, que ${n === 1 ? "contará" : "contarán"} como ${n === 1 ? "fallo" : "fallos"}. Al entregar ya no podrás cambiar las respuestas.`
      : "Al entregar ya no podrás cambiar las respuestas.";
    $("simConfirmarSi").textContent = que === "salir" ? "Salir" : n ? "Entregar igualmente" : "Entregar";
    $("simConfirmar").hidden = false;
    $("simBotones").hidden = true;
    $("simConfirmar").scrollIntoView({ block: "nearest" });
    $("simConfirmarNo").focus({ preventScroll: true });
  }

  function cerrarAviso() {
    confirmando = null;
    $("simConfirmar").hidden = true;
    $("simBotones").hidden = false;
  }

  function confirmar() {
    if (confirmando === "entregar") entregar(false);
    else if (confirmando === "salir") { cerrarAviso(); pararReloj(); sim = null; ctx.goHome(); }
  }

  /** Entrega el examen: al pulsar «Entregar» o al acabarse el tiempo. */
  function entregar(porTiempo: boolean) {
    if (!sim || !reloj || sim.submitted) return;
    pararReloj();
    cerrarAviso();
    const r = sim.submit();
    const tiempo = reloj.ms - reloj.remaining();
    const rec = applySimulacroRecord(ctx.state.best, r.hits);
    if (rec.isNewRecord) { ctx.state.best = rec.best; ctx.save(); }
    fallos = r.misses.map((f) => f.question);
    dibujarResultado(sim.questions, r, porTiempo ? "Se acabó el tiempo" : `Tiempo: ${timeUsed(tiempo)}`, rec.record);
    ctx.show("simEnd");
  }

  function dibujarResultado(preguntas: readonly CcseRoundQuestion[], r: SimulacroResult, tiempo: string, mejor: number) {
    $("simScore").replaceChildren(String(r.hits), el("small", "", `/${r.total}`));
    $("simTitle").textContent = r.apto ? "Apto" : "No apto";
    $("simTitle").classList.toggle("apto", r.apto);
    $("simTitle").classList.toggle("no-apto", !r.apto);
    $("simSub").textContent = `Simulacro de examen · Apto con ${SIMULACRO_APTO_HITS} aciertos · ${tiempo} · Mejor resultado: ${mejor}/${r.total}`;
    $("simPorTarea").replaceChildren(...r.byTarea.map((t) =>
      el("span", "chip" + (t.hits === t.total ? " llena" : ""), `Tarea ${t.tarea} · ${t.hits}/${t.total}`)));

    const lista = $("simMisses");
    lista.replaceChildren();
    $("simMissLabel").hidden = !r.misses.length;
    $("simReview").hidden = !r.misses.length;
    if (!r.misses.length) {
      lista.append(el("p", "allright", "Sin fallos en este simulacro."));
      return;
    }
    for (const f of r.misses) {
      const row = el("div", "miss");
      row.append(el("span", "miss-cat", `Pregunta ${preguntas.indexOf(f.question) + 1} · Tarea ${f.question.tarea}`));
      row.append(el("span", "miss-q", f.question.text));
      row.append(answerLine(f.question.answer, f.given, "sin responder"));
      if (f.question.why) row.append(el("p", "why miss-why", f.question.why));
      const fuentes = el("p", "source");
      renderSources(fuentes, f.question.sources);
      if (!fuentes.hidden) row.append(fuentes);
      lista.append(row);
    }
  }

  $("simGo").addEventListener("click", empezar);
  $("simAgain").addEventListener("click", empezar);
  $("simMenu").addEventListener("click", ctx.goHome);
  $("simReview").addEventListener("click", () => repasar(fallos));
  $("simPrev").addEventListener("click", () => sim && ir(sim.index - 1, "simPrev"));
  $("simNext").addEventListener("click", () => sim && ir(sim.index + 1, "simNext"));
  $("simEntregar").addEventListener("click", () => pedirConfirmacion("entregar"));
  $("simSalir").addEventListener("click", () => pedirConfirmacion("salir"));
  $("simConfirmarSi").addEventListener("click", confirmar);
  $("simConfirmarNo").addEventListener("click", () => { cerrarAviso(); $("simEntregar").focus({ preventScroll: true }); });

  // Teclas: números para elegir, flechas para ir a la anterior o la siguiente, Escape para cerrar el aviso.
  document.addEventListener("keydown", (e) => {
    if (ctx.screen() !== "sim" || !sim) return;
    if (confirmando) {
      if (e.key === "Escape") { cerrarAviso(); $("simEntregar").focus({ preventScroll: true }); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const numero = numberKey(e);
    if (numero !== null) {
      const o = sim.current.options[numero - 1];
      if (o !== undefined) { e.preventDefault(); elegir(o); }
    } else if (e.key === "ArrowRight") { e.preventDefault(); ir(sim.index + 1, "simNext"); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); ir(sim.index - 1, "simPrev"); }
  });

  // Al cambiar de pestaña o bloquear el móvil, el reloj se para; al volver, sigue (como en las partidas).
  document.addEventListener("visibilitychange", () => {
    if (!reloj || !sim || sim.submitted || ctx.screen() !== "sim") return;
    if (document.hidden) reloj.pause();
    else { reloj.start(); tic(); }
  });

  return {
    alSalir() {
      // Solo se llega aquí sin entregar si se sale de la pantalla por otro camino: el examen se da por perdido.
      if (sim && !sim.submitted) { pararReloj(); sim = null; }
    }
  };
}
