// Pantalla de la partida: pregunta, opciones, reloj, nota al responder, fin de la baraja,
// y los botones de la pantalla final que empiezan otra partida (jugar otra vez, repasar fallos).
// Las reglas (aciertos, racha, final) viven en common/engine/common-round.ts; aquí solo se dibujan.
// Es la misma para las dos secciones: lo que cambia (de dónde salen las preguntas, el tiempo, el récord)
// se lo pregunta al modo de la sección actual (common-mode.ts).

import { Round, type AnswerResult } from "../engine/common-round";
import type { PlayableQuestion } from "../engine/common-types";
import type { AppContext } from "./common-context";
import { $, announce, el, isInteractive, pad, renderSources, numberKey } from "./common-dom";
import { imageElement, preloadImage } from "./common-images";
import { renderEnd } from "./common-end-screen";
import { createTimer } from "./common-timer";

export interface RoundScreen {
  /** Empieza una partida nueva de la sección actual (el botón «Jugar» de su inicio). */
  start(): void;
  /** Prepara de antemano la próxima partida (en el inicio y al terminar una), ver `prepared`. */
  prepare(): void;
  /** Para el reloj al salir de la pantalla de la partida. */
  onLeave(): void;
  /** Empieza un repaso de estos fallos (lo usa también el simulacro de examen, al terminar). */
  startReview(misses: PlayableQuestion[]): void;
}

export function createRoundScreen(ctx: AppContext): RoundScreen {
  let round: Round | null = null;
  const timer = createTimer(() => {
    // Se acabó el tiempo: cuenta como fallo y se muestra la respuesta, como al fallar.
    if (round && !round.answered) showResult(round.timeout(), null);
  });

  /**
   * Partida preparada de antemano (en el inicio y al terminar una partida), para descargar y dibujar
   * ya la imagen de su primera pregunta (en Geografía, la bandera): así aparece al instante al pulsar «Jugar».
   * Se guarda con la selección para la que se hizo; si el jugador cambia las opciones, se prepara otra.
   */
  let prepared: { selectionKey: string; questions: PlayableQuestion[] } | null = null;

  function prepare() {
    const mode = ctx.mode();
    if (!mode.canPlay()) { prepared = null; return; }
    if (prepared?.selectionKey !== mode.selectionKey()) prepared = { selectionKey: mode.selectionKey(), questions: mode.buildRound() };
    const first = prepared.questions[0];
    if (first?.image) preloadImage(first.image.src);
  }

  function start(givenRound?: Round) {
    const mode = ctx.mode();
    if (!givenRound && !mode.canPlay()) return ctx.openOptions();
    if (givenRound) round = givenRound;
    else {
      const questions = prepared?.selectionKey === mode.selectionKey() ? prepared.questions : mode.buildRound();
      prepared = null; // cada partida preparada se juega una sola vez
      round = new Round(questions, { expected: mode.roundSize(), unlimited: mode.isUnlimited() });
    }
    // Sin límite no hay barra de progreso (no se sabe cuándo acaba), sino el botón «Terminar».
    $("track").hidden = round.unlimited;
    $("track").style.setProperty("--n", String(round.total));
    $("track").classList.toggle("long", round.total > 25);
    ctx.show("play");
    renderQuestion();
  }

  function renderQuestion() {
    if (!round) return;
    const g = round;
    const q = g.current;
    $("sheet").replaceChildren(`Hoja ${pad(g.index + 1)} `, ...(g.unlimited ? [] : [el("span", "", `/ ${pad(g.total)}`)]));
    $("card").hidden = false;
    $("deckEnd").hidden = true;
    $("stop").hidden = !g.unlimited;
    $("hits").textContent = String(g.hits);
    $("streak").textContent = String(g.streak);
    $("qcat").textContent = (g.review ? "Repaso · " : "") + q.label;
    $("question").textContent = q.text;

    const image = $("questionImage");
    image.replaceChildren();
    if (q.image) image.append(imageElement(q.image.src, q.image.alt));
    image.hidden = !q.image;
    // Mientras se responde esta, se va descargando la imagen de la siguiente.
    const nextQuestion = g.questions[g.index + 1];
    if (nextQuestion?.image) preloadImage(nextQuestion.image.src);

    renderTrack();

    const box = $("opts");
    box.replaceChildren();
    box.classList.toggle("many", q.options.length > 4);
    box.classList.toggle("with-image", !!q.image);
    q.options.forEach((o, j) => {
      const b = el("button", "opt");
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
    // El foco pasa al enunciado: el botón pulsado («Jugar», «Siguiente»…) ya no se ve, y así el lector de pantalla
    // lee la pregunta nueva y con el tabulador se llega a la primera opción.
    $("question").focus({ preventScroll: true });

    // Reinicia la animación de entrada de la tarjeta
    const card = $("card");
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";

    // El repaso de fallos va sin tiempo.
    timer.start(g.review ? "sinTiempo" : ctx.mode().timeLimit());
  }

  function renderTrack() {
    if (!round || round.unlimited) return;
    const g = round;
    $("track").replaceChildren(...g.questions.map((_, j) =>
      el("i", j < g.results.length ? (g.results[j] ? "ok" : "bad") : j === g.index ? "cur" : "")));
  }

  function answer(btn: HTMLButtonElement) {
    if (!round || round.answered) return;
    timer.stop(true);
    showResult(round.answer(btn.dataset.value ?? ""), btn);
  }

  /** Muestra el resultado de la pregunta: la opción pulsada (null si se acabó el tiempo) y la nota. */
  function showResult(r: AnswerResult, btn: HTMLButtonElement | null) {
    if (!round) return;
    for (const b of $("opts").querySelectorAll<HTMLButtonElement>(".opt")) {
      b.disabled = true;
      if (b.dataset.value === r.answer) b.classList.add("right");
      else if (b === btn) b.classList.add("wrong");
      else b.classList.add("dim");
    }
    $("hits").textContent = String(round.hits);
    $("streak").textContent = String(round.streak);
    renderTrack();
    const v = $("verdict");
    v.className = "verdict " + (r.correct ? "ok" : "bad");
    v.textContent = r.correct ? "Correcto" : r.given === null ? "Se acabó el tiempo · Era: " + r.answer : "Era: " + r.answer;
    $("why").textContent = round.current.why;
    $("why").hidden = !round.current.why; // en el examen, mientras falte la nota
    // Otras formas de los nombres: "Girona · en castellano, Gerona"
    $("aka").replaceChildren(...round.current.aliases.map((a) => el("span", "", a)));
    $("aka").hidden = !round.current.aliases.length;
    $("meaningText").textContent = round.current.meaning ?? "";
    $("meaning").hidden = !round.current.meaning;
    $("factText").textContent = round.current.fact ?? "";
    $("fact").hidden = !round.current.fact;
    renderSources($("source"), round.current.sources);
    announce(r.correct ? "Correcto." : r.given === null ? `Se acabó el tiempo. Era ${r.answer}.` : `Incorrecto. Era ${r.answer}.`);
    $("next").textContent = round.isLast && !round.unlimited ? "Ver resultado" : "Siguiente";
    $("feedback").hidden = false;
    $("next").focus({ preventScroll: true });
  }

  function next() {
    if (!round || !round.answered) return;
    if (round.next()) renderQuestion();
    else if (round.endOfDeck) showDeckEnd();
    else finish();
  }

  /** Sin límite: se han respondido todas las preguntas. Se sigue con otra vuelta o se termina. */
  function showDeckEnd() {
    if (!round) return;
    const r = round.result();
    $("card").hidden = true;
    $("deckEnd").hidden = false;
    $("stop").hidden = true; // la tarjeta ya tiene su «Terminar»
    timer.hide();
    $("deckEndText").textContent =
      `Ya han salido las ${round.deckSize} preguntas de esta selección, y llevas ${r.hits} ${r.hits === 1 ? "acierto" : "aciertos"} de ${r.total}. ` +
      "Puedes barajarlas y seguir con la misma racha, o terminar y repasar tus fallos.";
    announce("Has respondido todas las preguntas.");
    $("reshuffle").focus({ preventScroll: true });
  }

  function keepPlaying() {
    if (!round?.endOfDeck) return;
    round.append(ctx.mode().reshuffleRound(round.current.id));
    round.next();
    renderQuestion();
  }

  /** Sin límite: termina la partida y muestra el resultado. */
  function stop() {
    if (!round?.unlimited || round.finished) return;
    timer.stop();
    round.stop();
    finish();
  }

  function finish() {
    if (!round) return;
    renderEnd(ctx, round);
    ctx.show("end");
    // El foco, al resultado: el botón pulsado («Ver resultado», «Terminar») ya no se ve.
    $("endResult").focus({ preventScroll: true });
    prepare(); // para «Jugar otra vez»
  }

  $("again").addEventListener("click", () => start());
  $("next").addEventListener("click", next);
  $("quit").addEventListener("click", () => { round = null; ctx.goHome(); });
  $("stop").addEventListener("click", stop);
  $("deckStop").addEventListener("click", stop);
  $("reshuffle").addEventListener("click", keepPlaying);
  function startReview(misses: PlayableQuestion[]) {
    if (misses.length) start(new Round(ctx.mode().buildReviewRound(misses), { review: true }));
  }
  $("review").addEventListener("click", () => {
    // En una partida sin límite se puede fallar dos veces la misma pregunta: en el repaso sale una vez.
    startReview([...new Map((round?.result().misses ?? []).map((m) => [m.question.id, m.question])).values()]);
  });
  document.addEventListener("keydown", (e) => {
    if (ctx.screen() !== "play" || !round) return;
    const number = numberKey(e);
    if (!round.answered && number !== null) {
      const b = $("opts").querySelectorAll<HTMLButtonElement>(".opt")[number - 1];
      if (b) answer(b);
    } else if (round.answered && e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.metaKey && !isInteractive(e.target)) {
      // Si el foco está en un botón (Siguiente, Terminar…) o en un enlace (las fuentes), Intro ya lo pulsa o lo abre:
      // no se pasa además a la siguiente pregunta.
      next();
    }
  });

  return { start: () => start(), prepare, onLeave: () => timer.stop(), startReview };
}
