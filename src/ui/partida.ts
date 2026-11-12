// Pantalla de la partida: pregunta, opciones, reloj, nota al responder, fin de la baraja,
// y los botones de la pantalla final que empiezan otra partida (jugar otra vez, repasar fallos).
// Las reglas (aciertos, racha, final) viven en src/engine/game.ts; aquí solo se dibujan.
// Es la misma para las dos secciones: lo que cambia (de dónde salen las preguntas, el tiempo, el récord)
// se lo pregunta al modo de la sección actual (modos.ts).

import { GameSession, type AnswerResult } from "../engine/game";
import type { PreguntaJugable } from "../engine/types";
import type { Contexto } from "./contexto";
import { $, announce, el, pad } from "./dom";
import { flagImage, precargarBandera } from "./flags";
import { renderEnd } from "./final";
import { crearReloj } from "./reloj";

export interface Partida {
  /** Prepara de antemano la próxima partida (en el inicio y al terminar una), ver `preparada`. */
  preparar(): void;
  /** Para el reloj al salir de la pantalla de la partida. */
  alSalir(): void;
}

export function crearPartida(ctx: Contexto): Partida {
  let game: GameSession | null = null;
  const reloj = crearReloj(() => {
    // Se acabó el tiempo: cuenta como fallo y se muestra la respuesta, como al fallar.
    if (game && !game.answered) showResult(game.timeout(), null);
  });

  /**
   * Partida preparada de antemano (en el inicio y al terminar una partida), para descargar y dibujar
   * ya la bandera de su primera pregunta: así aparece al instante al pulsar «Jugar».
   * Se guarda con la selección para la que se hizo; si el jugador cambia las opciones, se prepara otra.
   */
  let preparada: { seleccion: string; preguntas: PreguntaJugable[] } | null = null;

  function preparar() {
    const modo = ctx.modo();
    if (!modo.puedeJugar()) { preparada = null; return; }
    if (preparada?.seleccion !== modo.seleccion()) preparada = { seleccion: modo.seleccion(), preguntas: modo.nueva() };
    const primera = preparada.preguntas[0];
    if (primera?.flag) precargarBandera(primera.flag);
  }

  function start(session?: GameSession) {
    const modo = ctx.modo();
    if (!session && !modo.puedeJugar()) return ctx.openOptions();
    if (session) game = session;
    else {
      const preguntas = preparada?.seleccion === modo.seleccion() ? preparada.preguntas : modo.nueva();
      preparada = null; // cada partida preparada se juega una sola vez
      game = new GameSession(preguntas, { expected: modo.esperadas(), unlimited: modo.sinLimite() });
    }
    // Sin límite no hay barra de progreso (no se sabe cuándo acaba), sino el botón «Terminar».
    $("track").hidden = game.unlimited;
    $("track").style.setProperty("--n", String(game.total));
    $("track").classList.toggle("long", game.total > 25);
    ctx.show("play");
    renderQuestion();
  }

  function renderQuestion() {
    if (!game) return;
    const g = game;
    const q = g.current;
    $("sheet").replaceChildren(`Hoja ${pad(g.index + 1)} `, ...(g.unlimited ? [] : [el("span", "", `/ ${pad(g.total)}`)]));
    $("card").hidden = false;
    $("deckEnd").hidden = true;
    $("stop").hidden = !g.unlimited;
    $("hits").textContent = String(g.hits);
    $("streak").textContent = String(g.streak);
    $("qcat").textContent = (g.review ? "Repaso · " : "") + ctx.modo().etiqueta(q);
    $("question").textContent = q.text;

    const flag = $("flag");
    flag.replaceChildren();
    if (q.flag) flag.append(flagImage(q.flag));
    flag.hidden = !q.flag;
    // Mientras se responde esta, se va descargando la bandera de la siguiente.
    const siguiente = g.questions[g.index + 1];
    if (siguiente?.flag) precargarBandera(siguiente.flag);

    renderTrack();

    const box = $("opts");
    box.replaceChildren();
    box.classList.toggle("many", q.options.length > 4);
    box.classList.toggle("con-bandera", !!q.flag);
    q.options.forEach((o, j) => {
      const b = el("button", "opt") as HTMLButtonElement;
      b.id = "opt-" + j;
      b.dataset.value = o;
      b.append(el("span", "key", String(j + 1)), el("span", "", o));
      b.addEventListener("click", () => answer(b));
      box.append(b);
    });
    $("feedback").hidden = true;
    announce("");

    // Cada pregunta empieza arriba del todo: tras leer la nota, la página se había quedado más abajo.
    window.scrollTo({ top: 0 });

    // Reinicia la animación de entrada de la tarjeta
    const card = $("card");
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";

    // El repaso de fallos va sin tiempo.
    reloj.arrancar(g.review ? "sinTiempo" : ctx.modo().tiempo());
  }

  function renderTrack() {
    if (!game || game.unlimited) return;
    const g = game;
    $("track").replaceChildren(...g.questions.map((_, j) =>
      el("i", j < g.results.length ? (g.results[j] ? "ok" : "bad") : j === g.index ? "cur" : "")));
  }

  function answer(btn: HTMLButtonElement) {
    if (!game || game.answered) return;
    reloj.parar(true);
    showResult(game.answer(btn.dataset.value ?? ""), btn);
  }

  /** Muestra el resultado de la pregunta: la opción pulsada (null si se acabó el tiempo) y la nota. */
  function showResult(r: AnswerResult, btn: HTMLButtonElement | null) {
    if (!game) return;
    for (const b of Array.from($("opts").children) as HTMLButtonElement[]) {
      b.disabled = true;
      if (b.dataset.value === r.answer) b.classList.add("right");
      else if (b === btn) b.classList.add("wrong");
      else b.classList.add("dim");
    }
    $("hits").textContent = String(game.hits);
    $("streak").textContent = String(game.streak);
    renderTrack();
    const v = $("verdict");
    v.className = "verdict " + (r.correct ? "ok" : "bad");
    v.textContent = r.correct ? "Correcto" : r.given === null ? "Se acabó el tiempo · Era: " + r.answer : "Era: " + r.answer;
    $("why").textContent = game.current.why;
    $("why").hidden = !game.current.why; // en el examen, mientras falte la nota
    // Otras formas de los nombres: "Girona · en castellano, Gerona"
    $("aka").replaceChildren(...game.current.aliases.map((a) => el("span", "", a)));
    $("aka").hidden = !game.current.aliases.length;
    $("meaningText").textContent = game.current.meaning ?? "";
    $("meaning").hidden = !game.current.meaning;
    $("factText").textContent = game.current.fact ?? "";
    $("fact").hidden = !game.current.fact;
    renderFuentes(game.current);
    announce(r.correct ? "Correcto." : r.given === null ? `Se acabó el tiempo. Era ${r.answer}.` : `Incorrecto. Era ${r.answer}.`);
    $("next").textContent = game.isLast && !game.unlimited ? "Ver resultado" : "Siguiente";
    $("feedback").hidden = false;
    $("next").focus({ preventScroll: true });
  }

  /** Fuentes de la nota (en el examen de nacionalidad): «Fuente: Constitución española, art. 1.3», con su enlace. */
  function renderFuentes(q: PreguntaJugable) {
    const fuentes = q.fuentes ?? [];
    const p = $("source");
    p.hidden = !fuentes.length;
    p.replaceChildren();
    if (!fuentes.length) return;
    p.append(el("b", "", fuentes.length > 1 ? "Fuentes" : "Fuente"), " ");
    fuentes.forEach((f, i) => {
      if (i) p.append(" · ");
      if (f.url) {
        const a = el("a", "", f.texto) as HTMLAnchorElement;
        a.href = f.url;
        a.target = "_blank";
        a.rel = "noopener";
        p.append(a);
      } else p.append(f.texto);
    });
  }

  function next() {
    if (!game || !game.answered) return;
    if (game.next()) renderQuestion();
    else if (game.endOfDeck) showDeckEnd();
    else finish();
  }

  /** Sin límite: se han respondido todas las preguntas. Se sigue con otra vuelta o se termina. */
  function showDeckEnd() {
    if (!game) return;
    const r = game.result();
    $("card").hidden = true;
    $("deckEnd").hidden = false;
    $("stop").hidden = true; // la tarjeta ya tiene su «Terminar»
    reloj.esconder();
    $("deckEndText").textContent =
      `Ya han salido las ${game.deckSize} preguntas de esta selección, y llevas ${r.hits} ${r.hits === 1 ? "acierto" : "aciertos"} de ${r.total}. ` +
      "Puedes barajarlas y seguir con la misma racha, o terminar y repasar tus fallos.";
    announce("Has respondido todas las preguntas.");
    $("reshuffle").focus({ preventScroll: true });
  }

  function keepPlaying() {
    if (!game?.endOfDeck) return;
    game.append(ctx.modo().otraVuelta(game.current.id));
    game.next();
    renderQuestion();
  }

  /** Sin límite: termina la partida y muestra el resultado. */
  function stop() {
    if (!game?.unlimited || game.finished) return;
    reloj.parar();
    game.stop();
    finish();
  }

  function finish() {
    if (!game) return;
    renderEnd(ctx, game);
    ctx.show("end");
    preparar(); // para «Jugar otra vez»
  }

  $("go").addEventListener("click", () => start());
  $("ccseGo").addEventListener("click", () => start());
  $("again").addEventListener("click", () => start());
  $("next").addEventListener("click", next);
  $("quit").addEventListener("click", () => { game = null; ctx.goHome(); });
  $("stop").addEventListener("click", stop);
  $("deckStop").addEventListener("click", stop);
  $("reshuffle").addEventListener("click", keepPlaying);
  $("review").addEventListener("click", () => {
    // En una partida sin límite se puede fallar dos veces la misma pregunta: en el repaso sale una vez.
    const fallos = [...new Map((game?.result().misses ?? []).map((m) => [m.question.id, m.question])).values()];
    if (fallos.length) start(new GameSession(ctx.modo().repaso(fallos), { review: true }));
  });
  document.addEventListener("keydown", (e) => {
    if (ctx.pantalla() !== "play" || !game) return;
    if (!game.answered && /^[1-9]$/.test(e.key)) {
      const b = $("opts").children[Number(e.key) - 1] as HTMLButtonElement | undefined;
      if (b) answer(b);
    } else if (game.answered && e.key === "Enter" && !(document.activeElement instanceof HTMLButtonElement)) {
      // Si hay un botón con el foco (Siguiente, Terminar, Barajar y seguir…), Intro ya lo pulsa.
      next();
    }
  });

  return { preparar, alSalir: () => reloj.parar() };
}
