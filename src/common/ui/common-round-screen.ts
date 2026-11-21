/**
 * @fileoverview Pantalla de la partida: pregunta, opciones, reloj, nota al responder, fin de una vuelta,
 * y los botones de la pantalla final que empiezan otra partida (jugar otra vez, repasar fallos).
 * Las reglas (aciertos, racha, final) viven en common/engine/common-round.ts; aquí solo se dibujan.
 * Es la misma para las dos secciones: lo que cambia (de dónde salen las preguntas, el tiempo, el récord)
 * se lo pregunta al modo de la sección actual (common-mode.ts).
 */

import { Round, type AnswerResult } from "../engine/common-round";
import type { PlayableQuestion } from "../engine/common-types";
import type { AppContext } from "./common-context";
import { $, announce, el, isInteractive, pad, renderSources, numberKey } from "./common-dom";
import { preloadImage, renderQuestionImage } from "./common-images";
import { renderEnd } from "./common-end-screen";
import { createTimer } from "./common-timer";
import { cycleEndText } from "./common-labels";

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
  /** Cancela la carga de la imagen de la pregunta que se ve (al pasar a otra o salir). */
  let cancelImage = () => {};
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
      round = new Round(questions, { unlimited: mode.isUnlimited() });
    }
    // Sin límite no hay barra de progreso: no se sabe cuándo acaba.
    $("track").hidden = round.unlimited;
    $("track").style.setProperty("--n", String(round.total));
    $("track").classList.toggle("long", round.total > 25);
    ctx.show("play");
    renderQuestion();
  }

  function renderQuestion() {
    if (!round) return;
    const q = round.currentQuestion;
    $("sheet").replaceChildren(`Hoja ${pad(round.index + 1)} `, ...(round.unlimited ? [] : [el("span", "", `/ ${pad(round.total)}`)]));
    $("card").hidden = false;
    $("cycleEnd").hidden = true;
    $("stop").hidden = false; // se esconde en la tarjeta de fin de vuelta, que tiene el suyo
    $("hits").textContent = String(round.hits);
    $("streak").textContent = String(round.streak);
    $("qcat").textContent = (round.review ? "Repaso · " : "") + q.label;
    $("question").textContent = q.text;

    // Mientras se responde esta, se va descargando la imagen de la siguiente.
    const nextQuestion = round.questions[round.index + 1];
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
    timer.start(round.review ? "sinTiempo" : ctx.mode().timeLimit());

    // Con imagen, la pregunta no empieza hasta que se ve: hasta entonces, el reloj quieto y las opciones sin poder
    // pulsarse (responder sin ver la bandera no tiene sentido). Si no llega, el recuadro lo dice y deja reintentar.
    cancelImage();
    const image = $("questionImage");
    image.hidden = !q.image;
    if (!q.image) {
      image.replaceChildren();
      timer.run();
      return;
    }
    setOptionsEnabled(false);
    cancelImage = renderQuestionImage(image, q.image, () => {
      setOptionsEnabled(true);
      timer.run();
    });
  }

  /** Deja pulsar las opciones o no (mientras carga la imagen). */
  function setOptionsEnabled(enabled: boolean) {
    $("opts").classList.toggle("waiting", !enabled);
    for (const b of $("opts").querySelectorAll<HTMLButtonElement>(".opt")) b.disabled = !enabled;
  }

  function renderTrack() {
    if (!round || round.unlimited) return;
    const { questions, results, index } = round;
    $("track").replaceChildren(...questions.map((_, j) =>
      el("i", j < results.length ? (results[j] ? "ok" : "bad") : j === index ? "cur" : "")));
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
      if (b.dataset.value === r.correctAnswer) b.classList.add("right");
      else if (b === btn) b.classList.add("wrong");
      else b.classList.add("dim");
    }
    $("hits").textContent = String(round.hits);
    $("streak").textContent = String(round.streak);
    renderTrack();
    const v = $("verdict");
    v.className = "verdict " + (r.correct ? "ok" : "bad");
    v.textContent = r.correct ? "Correcto" : r.givenAnswer === null ? "Se acabó el tiempo · Era: " + r.correctAnswer : "Era: " + r.correctAnswer;
    $("explanation").textContent = round.currentQuestion.explanation;
    $("explanation").hidden = !round.currentQuestion.explanation; // en el examen, mientras falte la nota
    // Otras formas de los nombres: "Girona · en castellano, Gerona"
    const aliases = round.currentQuestion.aliases ?? [];
    $("aka").replaceChildren(...aliases.map((a) => el("span", "", a)));
    $("aka").hidden = !aliases.length;
    // Información complementaria, en el orden en que la da la sección: cada bloque, con su título.
    $("extraInfo").replaceChildren(...(round.currentQuestion.extraInfo ?? []).map((info) => {
      const p = el("p", "extra-info-item");
      p.append(el("b", "", info.title), " ", el("span", "", info.text));
      return p;
    }));
    renderSources($("source"), round.currentQuestion.sources);
    announce(r.correct ? "Correcto." : r.givenAnswer === null ? `Se acabó el tiempo. Era ${r.correctAnswer}.` : `Incorrecto. Era ${r.correctAnswer}.`);
    $("next").textContent = round.isLast && !round.unlimited ? "Ver resultado" : "Siguiente";
    $("feedback").hidden = false;
    $("next").focus({ preventScroll: true });
  }

  function next() {
    if (!round || !round.answered) return;
    if (round.next()) renderQuestion();
    else if (round.endOfCycle) showCycleEnd();
    else finish();
  }

  /** Sin límite: se ha completado una vuelta (han salido todas las preguntas). Se sigue con otra o se termina. */
  function showCycleEnd() {
    if (!round) return;
    const r = round.result();
    $("card").hidden = true;
    $("cycleEnd").hidden = false;
    $("stop").hidden = true; // la tarjeta ya tiene su «Terminar»
    timer.hide();
    $("cycleEndText").textContent = cycleEndText(round.questionsPerCycle, r.hits, r.total, round.streak);
    announce("Has completado una vuelta.");
    $("keepPlaying").focus({ preventScroll: true });
  }

  function keepPlaying() {
    if (!round?.endOfCycle) return;
    round.append(ctx.mode().reshuffleRound(round.currentQuestion.id));
    round.next();
    renderQuestion();
  }

  /** Termina la partida cuando el jugador quiere y muestra el resultado de lo respondido. */
  function stop() {
    if (!round || round.finished) return;
    timer.stop();
    cancelImage();
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
  $("stop").addEventListener("click", stop);
  $("cycleStop").addEventListener("click", stop);
  $("keepPlaying").addEventListener("click", keepPlaying);
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
      if (b && !b.disabled) answer(b);
    } else if (round.answered && e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.metaKey && !isInteractive(e.target)) {
      // Si el foco está en un botón (Siguiente, Terminar…) o en un enlace (las fuentes), Intro ya lo pulsa o lo abre:
      // no se pasa además a la siguiente pregunta.
      next();
    }
  });

  return { start: () => start(), prepare, onLeave: () => { timer.stop(); cancelImage(); }, startReview };
}
