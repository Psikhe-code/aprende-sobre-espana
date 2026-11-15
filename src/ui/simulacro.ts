// Pantallas del simulacro de examen: el examen (25 preguntas, un reloj de 45 minutos para todo y un mapa
// para ir a cualquier pregunta) y su resultado (apto o no apto, aciertos por tarea y los fallos con su nota).
// Mientras se hace no se dice si una respuesta es correcta, como en la prueba real.
// Las reglas (reparto, aprobado, entrega) viven en src/engine/simulacro.ts; aquí solo se dibujan.

import { tarea, type PreguntaCcseJugable } from "../engine/ccse";
import { Countdown } from "../engine/countdown";
import type { PreguntaJugable } from "../engine/types";
import {
  APROBADO_SIMULACRO, CLAVE_SIMULACRO, MINUTOS_SIMULACRO, PREGUNTAS_SIMULACRO, REPARTO_SIMULACRO, Simulacro,
  apuntarSimulacro, preguntasSimulacro, simulacroPosible, type ResultadoSimulacro
} from "../engine/simulacro";
import type { SavedState } from "../engine/storage";
import type { Contexto } from "./contexto";
import { $, el, pad, pintarFuentes } from "./dom";

export interface PantallaSimulacro {
  /** Para el reloj al salir de la pantalla del examen. */
  alSalir(): void;
}

/** Tiempo como en un reloj: 45:00, 4:07. */
const minutos = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

/** Tiempo usado, en palabras: «23 min 10 s». */
const usado = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min` + (s % 60 ? ` ${s % 60} s` : "");
};

/** Qué es el simulacro, para el inicio del examen: sale de las reglas, así que si cambian, cambia solo. */
export function textoSimulacro(): string {
  const reparto = REPARTO_SIMULACRO.map((r) => r.preguntas);
  const lista = reparto.slice(0, -1).join(", ") + " y " + reparto[reparto.length - 1];
  return `Como la prueba real: ${PREGUNTAS_SIMULACRO} preguntas repartidas por tareas (${lista}), ${MINUTOS_SIMULACRO} minutos ` +
    `para todo y apto con ${APROBADO_SIMULACRO} aciertos. No sabrás si aciertas hasta entregar.`;
}

/** Bloque del simulacro en el inicio del examen: solo si hay preguntas de sobra en cada tarea. */
export function renderInicioSimulacro(state: SavedState): void {
  const posible = simulacroPosible();
  $("simResumen").hidden = !posible;
  if (!posible) return;
  $("simInfo").textContent = textoSimulacro();
  const mejor = state.best[CLAVE_SIMULACRO];
  const record = $("simRecord");
  record.replaceChildren();
  if (mejor == null) record.textContent = "Aún no has hecho ningún simulacro.";
  else record.append("Mejor resultado: ", el("b", "", `${mejor}/${PREGUNTAS_SIMULACRO}`));
}

/** Prepara las pantallas del simulacro (sus botones y teclas). `repasar` empieza el repaso de los fallos. */
export function crearSimulacro(ctx: Contexto, repasar: (fallos: PreguntaJugable[]) => void): PantallaSimulacro {
  let sim: Simulacro | null = null;
  let reloj: Countdown | null = null;
  let intervalo = 0;
  /** Qué se confirma en el aviso que está abierto: entregar o salir. */
  let confirmando: "entregar" | "salir" | null = null;
  let avisos = new Set<number>();
  let fallos: PreguntaJugable[] = [];

  const anunciar = (texto: string) => { $("simAnnounce").textContent = texto; };

  function empezar() {
    if (!simulacroPosible()) return;
    sim = new Simulacro(preguntasSimulacro());
    reloj = new Countdown(MINUTOS_SIMULACRO * 60 * 1000);
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
    $("simTimerText").textContent = minutos(queda);
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
    const q = s.actual;
    $("simSheet").replaceChildren(`Pregunta ${pad(s.indice + 1)} `, el("span", "", `/ ${pad(s.total)}`));
    $("simRespondidas").textContent = `${s.respondidas}/${s.total}`;
    const t = tarea(q.tarea);
    $("simCat").textContent = t ? `Tarea ${t.numero} · ${t.nombre}` : "";
    $("simQuestion").textContent = q.text;
    const elegida = s.respuestas[s.indice];
    $("simOpts").replaceChildren(...q.options.map((o, j) => {
      const b = el("button", "opt" + (o === elegida ? " elegida" : "")) as HTMLButtonElement;
      b.id = "sim-opt-" + j;
      b.dataset.value = o;
      b.setAttribute("aria-pressed", String(o === elegida));
      b.append(el("span", "key", String(j + 1)), el("span", "", o));
      b.addEventListener("click", () => elegir(o));
      return b;
    }));
    $<HTMLButtonElement>("simPrev").disabled = s.indice === 0;
    $("simNext").hidden = s.indice === s.total - 1;
    $("simMapa").replaceChildren(...s.preguntas.map((_, j) => {
      const hecha = s.respuestas[j] !== null;
      const b = el("button", "sim-n" + (hecha ? " hecha" : ""), String(j + 1)) as HTMLButtonElement;
      b.id = "sim-n-" + (j + 1);
      b.setAttribute("aria-label", `Pregunta ${j + 1}, ${hecha ? "respondida" : "sin responder"}`);
      if (j === s.indice) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => ir(j));
      return b;
    }));
  }

  function elegir(opcion: string) {
    if (!sim || confirmando) return;
    sim.responder(opcion);
    const i = sim.indice;
    dibujar();
    $("sim-opt-" + sim.actual.options.indexOf(opcion)).focus({ preventScroll: true });
    anunciar(`Respuesta de la pregunta ${i + 1}: ${opcion}.`);
  }

  function ir(i: number, foco?: string) {
    if (!sim || confirmando) return;
    sim.ir(i);
    dibujar();
    window.scrollTo({ top: 0 });
    // El foco se queda en el botón con el que se ha llegado (Siguiente, Anterior o el número del mapa).
    const destino = foco && !$(foco).hidden && !$<HTMLButtonElement>(foco).disabled ? foco : "sim-n-" + (sim.indice + 1);
    $(destino).focus({ preventScroll: true });
  }

  /** Aviso antes de entregar o salir, para que un toque sin querer no acabe el examen. */
  function pedirConfirmacion(que: "entregar" | "salir") {
    if (!sim) return;
    confirmando = que;
    const n = sim.sinResponder;
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
    if (!sim || !reloj || sim.entregado) return;
    pararReloj();
    cerrarAviso();
    const r = sim.entregar();
    const tiempo = reloj.ms - reloj.remaining();
    const rec = apuntarSimulacro(ctx.state.best, r.aciertos);
    if (rec.nuevo) { ctx.state.best = rec.best; ctx.save(); }
    fallos = r.fallos.map((f) => f.question);
    dibujarResultado(sim.preguntas, r, porTiempo ? "Se acabó el tiempo" : `Tiempo: ${usado(tiempo)}`, rec.mejor);
    ctx.show("simEnd");
  }

  function dibujarResultado(preguntas: readonly PreguntaCcseJugable[], r: ResultadoSimulacro, tiempo: string, mejor: number) {
    $("simScore").replaceChildren(String(r.aciertos), el("small", "", `/${r.total}`));
    $("simTitle").textContent = r.apto ? "Apto" : "No apto";
    $("simTitle").classList.toggle("apto", r.apto);
    $("simTitle").classList.toggle("no-apto", !r.apto);
    $("simSub").textContent = `Simulacro de examen · Apto con ${APROBADO_SIMULACRO} aciertos · ${tiempo} · Mejor resultado: ${mejor}/${r.total}`;
    $("simPorTarea").replaceChildren(...r.porTarea.map((t) =>
      el("span", "chip" + (t.aciertos === t.total ? " llena" : ""), `Tarea ${t.tarea} · ${t.aciertos}/${t.total}`)));

    const lista = $("simMisses");
    lista.replaceChildren();
    $("simMissLabel").hidden = !r.fallos.length;
    $("simReview").hidden = !r.fallos.length;
    if (!r.fallos.length) {
      lista.append(el("p", "allright", "Sin fallos en este simulacro."));
      return;
    }
    for (const f of r.fallos) {
      const row = el("div", "miss");
      row.append(el("span", "miss-cat", `Pregunta ${preguntas.indexOf(f.question) + 1} · Tarea ${f.question.tarea}`));
      row.append(el("span", "miss-q", f.question.text));
      const a = el("span", "miss-a");
      a.append("Respuesta: ", el("b", "", f.question.answer),
        ...(f.given === null ? [" · sin responder"] : [" · tú dijiste ", el("s", "", f.given)]));
      row.append(a);
      if (f.question.why) row.append(el("p", "why miss-why", f.question.why));
      const fuentes = el("p", "source");
      pintarFuentes(fuentes, f.question.fuentes);
      if (!fuentes.hidden) row.append(fuentes);
      lista.append(row);
    }
  }

  $("simGo").addEventListener("click", empezar);
  $("simAgain").addEventListener("click", empezar);
  $("simMenu").addEventListener("click", ctx.goHome);
  $("simReview").addEventListener("click", () => repasar(fallos));
  $("simPrev").addEventListener("click", () => sim && ir(sim.indice - 1, "simPrev"));
  $("simNext").addEventListener("click", () => sim && ir(sim.indice + 1, "simNext"));
  $("simEntregar").addEventListener("click", () => pedirConfirmacion("entregar"));
  $("simSalir").addEventListener("click", () => pedirConfirmacion("salir"));
  $("simConfirmarSi").addEventListener("click", confirmar);
  $("simConfirmarNo").addEventListener("click", () => { cerrarAviso(); $("simEntregar").focus({ preventScroll: true }); });

  // Teclas: números para elegir, flechas para ir a la anterior o la siguiente, Escape para cerrar el aviso.
  document.addEventListener("keydown", (e) => {
    if (ctx.pantalla() !== "sim" || !sim) return;
    if (confirmando) {
      if (e.key === "Escape") { cerrarAviso(); $("simEntregar").focus({ preventScroll: true }); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key)) {
      const o = sim.actual.options[Number(e.key) - 1];
      if (o !== undefined) { e.preventDefault(); elegir(o); }
    } else if (e.key === "ArrowRight") { e.preventDefault(); ir(sim.indice + 1, "simNext"); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); ir(sim.indice - 1, "simPrev"); }
  });

  // Al cambiar de pestaña o bloquear el móvil, el reloj se para; al volver, sigue (como en las partidas).
  document.addEventListener("visibilitychange", () => {
    if (!reloj || !sim || sim.entregado || ctx.pantalla() !== "sim") return;
    if (document.hidden) reloj.pause();
    else { reloj.start(); tic(); }
  });

  return {
    alSalir() {
      // Solo se llega aquí sin entregar si se sale de la pantalla por otro camino: el examen se da por perdido.
      if (sim && !sim.entregado) { pararReloj(); sim = null; }
    }
  };
}
