import { CATEGORIES, CATEGORY_IDS, categoryById } from "../engine/categories";
import {
  buildRound, rebuild, reshuffle, questionsIn, questionCount, roundSize, lengthFits, OPTION_COUNTS, ROUND_LENGTHS, TIME_LIMITS,
  type RoundLength, type TimeLimit
} from "../engine/round";
import { Countdown } from "../engine/countdown";
import { GameSession, applyRecord, type AnswerResult, type GameResult } from "../engine/game";
import { loadState, saveState, comboKey, type SavedState } from "../engine/storage";
import { NAME_STYLES, TERRITORIOS, type NameStyle, type Territorio } from "../engine/types";
import { flagImage, precargarBandera } from "./flags";
import { BANDERAS, BANDERAS_PROVINCIAS, type BanderaInfo } from "../engine/questions";
import { AUTONOMIAS, provincia } from "../engine/territory";
import { drawContours } from "./contours";

// Interfaz: dibuja las pantallas y traduce los toques en llamadas al motor.
// Las reglas del juego (aciertos, racha, final, récords) viven en src/engine/game.ts.

type Screen = "start" | "options" | "play" | "end" | "credits";

export interface App {
  /** true en las pantallas donde se puede recargar sin perder nada (inicio y opciones). */
  isIdle(): boolean;
  /** Se llama cada vez que el jugador vuelve a una pantalla tranquila. */
  onIdle(callback: () => void): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const pad = (n: number) => String(n).padStart(2, "0");
const TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

/** Cómo se presenta cada forma de los nombres en Opciones. */
const NAME_LABELS: Record<NameStyle, { name: string; example: string; short: string }> = {
  oficial: { name: "Nombre oficial", example: "Girona, Bizkaia, Illes Balears…", short: "oficial" },
  castellano: { name: "En castellano", example: "Gerona, Vizcaya, Islas Baleares…", short: "en castellano" }
};

/** Cómo se presenta cada territorio en Opciones, y qué se añade al nombre de la categoría en la partida. */
const TERRITORIO_LABELS: Record<Territorio, { name: string; example: string; short: string }> = {
  comunidad: { name: "Comunidades", example: "Las 17 comunidades y las ciudades autónomas de Ceuta y Melilla, y de qué comunidad es cada provincia", short: "comunidades" },
  provincia: { name: "Provincias", example: "Capitales que no se llaman como su provincia, banderas de las provincias que tienen una oficial y municipios de cada provincia", short: "provincias" }
};

/** Explicación de cada dificultad en Opciones. */
const DIFICULTAD_DESC: Record<number, string> = {
  4: "La respuesta y tres opciones más.",
  6: "Más trampas entre las opciones.",
  8: "Casi todas las trampas a la vez."
};

/** Cómo se presenta cada número de preguntas en Opciones. */
const LONGITUD_LABELS: Record<RoundLength, { name: string; desc: string }> = {
  10: { name: "10 preguntas", desc: "Una partida rápida." },
  25: { name: "25 preguntas", desc: "Una partida media." },
  50: { name: "50 preguntas", desc: "Una partida larga." },
  100: { name: "100 preguntas", desc: "Para repasarlo casi todo." },
  sinLimite: { name: "Sin límite", desc: "Hasta que pulses «Terminar». Si se acaban, se barajan otra vez." }
};

/** Cómo se presenta cada tiempo por pregunta en Opciones y en el inicio. */
const TIEMPO_LABELS: Record<TimeLimit, { name: string; desc: string; info: string }> = {
  sinTiempo: { name: "Sin tiempo", desc: "Para jugar con calma.", info: "sin tiempo" },
  60: { name: "1 minuto", desc: "Tiempo de sobra para pensar.", info: "1 minuto por pregunta" },
  30: { name: "30 segundos", desc: "Hay que ir con algo de prisa.", info: "30 segundos por pregunta" },
  10: { name: "10 segundos", desc: "Nivel difícil: casi solo da para leer.", info: "10 segundos por pregunta" }
};

/**
 * Tarjeta de Opciones: marcada o no, con título y descripción.
 * - Normal: botón que se marca y desmarca (categorías, nombres, territorios: se pueden marcar varios).
 *   El lector de pantalla dice «botón de alternancia, pulsado».
 * - `radio`: una opción de un grupo en el que solo se marca una (dificultad, tiempo, preguntas por partida).
 *   El lector dice «botón de opción, seleccionado, 2 de 4». Se recorre con las flechas (ver radioGroup).
 */
function toggleCard(id: string, on: boolean, title: string, lines: string[][], onToggle: () => void, radio = false): HTMLButtonElement {
  const b = el("button", "cat") as HTMLButtonElement;
  b.id = id;
  if (radio) {
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(on));
  } else {
    b.setAttribute("aria-pressed", String(on));
  }
  const check = el("span", "check");
  check.innerHTML = TICK;
  const text = el("span", "cat-text");
  text.append(el("span", "cat-name", title), ...lines.map(([cls, t]) => el("span", cls, t)));
  b.append(check, text);
  b.addEventListener("click", onToggle);
  return b;
}

/**
 * Grupo de opciones en el que solo se marca una (role="radiogroup" en index.html). Como en cualquier grupo
 * de opciones, el tabulador entra solo en la marcada, y con las flechas (o Inicio y Fin) se pasa a otra
 * y se marca. Las desactivadas se saltan. Se llama una vez por grupo, al arrancar.
 */
function radioGroup(group: HTMLElement): void {
  group.addEventListener("keydown", (e) => {
    const paso = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (paso === undefined && e.key !== "Home" && e.key !== "End") return;
    const radios = radiosDe(group);
    if (!radios.length) return;
    const i = radios.indexOf(document.activeElement as HTMLButtonElement);
    const destino = e.key === "Home" ? radios[0]
      : e.key === "End" ? radios[radios.length - 1]
      : radios[(Math.max(i, 0) + paso! + radios.length) % radios.length];
    e.preventDefault();
    destino.click(); // al marcarla se dibuja de nuevo Opciones y el foco vuelve a ella
  });
}
const radiosDe = (group: HTMLElement) =>
  (Array.from(group.querySelectorAll('[role="radio"]')) as HTMLButtonElement[]).filter((b) => !b.disabled);

/** Tras dibujar un grupo de opciones: el tabulador entra solo en la marcada (o en la primera, si no la hay). */
function tabuladorEnLaMarcada(group: HTMLElement): void {
  const radios = radiosDe(group);
  const marcada = radios.find((b) => b.getAttribute("aria-checked") === "true") ?? radios[0];
  for (const b of group.querySelectorAll('[role="radio"]')) (b as HTMLElement).tabIndex = b === marcada ? 0 : -1;
}

function rating(r: GameResult): string {
  if (!r.total) return "Sin respuestas";
  const pct = r.hits / r.total;
  return pct === 1 ? "Mapa completo" : pct >= 0.8 ? "Gran nivel" : pct >= 0.5 ? "Buen rumbo" : "Toca repasar el atlas";
}

export function startApp(): App {
  let state: SavedState = loadState();
  let game: GameSession | null = null;
  let screen: Screen = "start";
  const idleListeners: (() => void)[] = [];

  const save = () => saveState(state);
  /** Avisos para lectores de pantalla. */
  const announce = (text: string) => { $("announce").textContent = text; };

  function show(id: Screen) {
    if (id !== "play") stopTimer();
    screen = id;
    (["start", "options", "play", "end", "credits"] as Screen[]).forEach((s) => { $(s).hidden = s !== id; });
    window.scrollTo({ top: 0 });
    if (id === "start" || id === "options" || id === "credits") idleListeners.forEach((f) => f());
  }

  // ---------- Inicio ----------
  function renderStart() {
    const chips = $("chips");
    chips.replaceChildren();
    if (state.selected.length === CATEGORY_IDS.length) {
      chips.append(el("span", "chip", "Todas las categorías"));
    } else {
      CATEGORIES.filter((c) => state.selected.includes(c.id)).forEach((c) => chips.append(el("span", "chip", c.name)));
    }
    const names = NAME_STYLES.filter((s) => state.names.includes(s));
    $("namesInfo").textContent = names.length > 1
      ? `Nombres: ${names.map((s) => NAME_LABELS[s].short).join(" y ")}, al azar en cada pregunta.`
      : `Nombres: solo ${NAME_LABELS[names[0]].short}.`;
    const territorios = TERRITORIOS.filter((x) => state.territorios.includes(x));
    $("territoriosInfo").textContent = `Territorio: ${territorios.map((x) => TERRITORIO_LABELS[x].short).join(" y ")}.`;
    $("dificultadInfo").textContent = `Dificultad: ${state.opciones} opciones por pregunta, ${TIEMPO_LABELS[state.tiempo].info}.`;
    const sinLimite = state.longitud === "sinLimite";
    $("roundLabel").textContent = sinLimite ? "Preguntas sin límite, al azar, de" : `${roundSize(state.selected, state.territorios, state.longitud) || state.longitud} preguntas al azar de`;
    const rec = state.best[recordKey()];
    const record = $("record");
    record.replaceChildren();
    if (rec != null && sinLimite) record.append("Mejor racha con esta selección: ", el("b", "", String(rec)));
    else if (rec != null) record.append("Récord con esta selección: ", el("b", "", `${rec}/${roundSize(state.selected, state.territorios, state.longitud)}`));
    else record.textContent = "Aún no has jugado con esta selección.";
    prepararPartida();
  }

  // ---------- Opciones ----------
  function renderOptions() {
    // Categorías
    $("cats").replaceChildren(...CATEGORIES.map((c) => {
      const on = state.selected.includes(c.id);
      // Preguntas de cada territorio, y cuántas salen con los territorios marcados.
      const porTerritorio = TERRITORIOS.map((x) => {
        const n = questionsIn(c.id, [x]).length;
        return `${TERRITORIO_LABELS[x].name}: ${n || "próximamente"}`;
      }).join(" · ");
      const n = questionsIn(c.id, state.territorios).length;
      return toggleCard("cat-" + c.id, on, c.name,
        [["cat-desc", porTerritorio], ["cat-count", n ? `${n} preguntas con los territorios marcados` : "Sin preguntas con los territorios marcados"]],
        () => {
          state.selected = on ? state.selected.filter((x) => x !== c.id) : [...state.selected, c.id];
          save();
          renderOptions();
          $("cat-" + c.id).focus();
        });
    }));
    const noCats = !state.selected.length;
    $("noneWarn").hidden = !noCats;
    $("allCatsRow").hidden = state.selected.length === CATEGORY_IDS.length;

    // Formas de los nombres (se puede marcar más de una)
    $("names").replaceChildren(...NAME_STYLES.map((s) => {
      const on = state.names.includes(s);
      return toggleCard("names-" + s, on, NAME_LABELS[s].name, [["cat-desc", NAME_LABELS[s].example]], () => {
        state.names = on ? state.names.filter((x) => x !== s) : NAME_STYLES.filter((x) => x === s || state.names.includes(x));
        save();
        renderOptions();
        $("names-" + s).focus();
      });
    }));
    const noNames = !state.names.length;
    $("noNamesWarn").hidden = !noNames;

    // Territorios (se puede marcar más de uno)
    $("territorios").replaceChildren(...TERRITORIOS.map((x) => {
      const on = state.territorios.includes(x);
      return toggleCard("terr-" + x, on, TERRITORIO_LABELS[x].name, [["cat-desc", TERRITORIO_LABELS[x].example]], () => {
        state.territorios = on ? state.territorios.filter((y) => y !== x) : TERRITORIOS.filter((y) => y === x || state.territorios.includes(y));
        save();
        renderOptions();
        $("terr-" + x).focus();
      });
    }));
    // Dificultad: se marca una sola. La respuesta abierta aún no existe: se ve, pero no se puede marcar.
    const dificultades = OPTION_COUNTS.map((n) => {
      return toggleCard("dif-" + n, state.opciones === n, `${n} opciones`, [["cat-desc", DIFICULTAD_DESC[n]]], () => {
        state.opciones = n;
        save();
        renderOptions();
        $("dif-" + n).focus();
      }, true);
    });
    const abierta = toggleCard("dif-abierta", false, "Respuesta abierta", [["cat-desc", "Escribes la respuesta tú. Próximamente."]], () => {}, true);
    abierta.disabled = true;
    $("dificultad").replaceChildren(...dificultades, abierta);
    tabuladorEnLaMarcada($("dificultad"));

    // Tiempo por pregunta: se marca uno solo.
    $("tiempo").replaceChildren(...TIME_LIMITS.map((t) => {
      return toggleCard("tiempo-" + t, state.tiempo === t, TIEMPO_LABELS[t].name, [["cat-desc", TIEMPO_LABELS[t].desc]], () => {
        state.tiempo = t;
        save();
        renderOptions();
        $("tiempo-" + t).focus();
      }, true);
    }));
    tabuladorEnLaMarcada($("tiempo"));

    // Preguntas por partida: se marca una sola. 25, 50 y 100, solo si la selección tiene al menos esas.
    const hay = questionCount(state.selected, state.territorios);
    $("longitud").replaceChildren(...ROUND_LENGTHS.map((n) => {
      const cabe = lengthFits(n, state.selected, state.territorios);
      const card = toggleCard("len-" + n, state.longitud === n, LONGITUD_LABELS[n].name,
        [["cat-desc", cabe || !hay ? LONGITUD_LABELS[n].desc : `Con esta selección hay ${hay} preguntas.`]], () => {
          state.longitud = n;
          save();
          renderOptions();
          $("len-" + n).focus();
        }, true);
      // La elegida no se desactiva aunque ya no quepa: se ve marcada, con el aviso de abajo.
      card.disabled = !cabe && state.longitud !== n;
      return card;
    }));
    tabuladorEnLaMarcada($("longitud"));

    const noTerr = !state.territorios.length;
    $("noTerrWarn").hidden = !noTerr;
    // Categorías y territorios marcados, pero sin preguntas (p. ej. solo banderas y solo provincias).
    const empty = !noCats && !noTerr && hay === 0;
    $("emptyWarn").hidden = !empty;
    // El número de preguntas elegido ya no cabe (p. ej. 50 y se ha dejado solo Capitales).
    const tooLong = !noCats && !noTerr && !empty && !lengthFits(state.longitud, state.selected, state.territorios);
    $("lengthWarn").hidden = !tooLong;
    $("lengthWarn").textContent = tooLong ? `Con esta selección hay ${hay} preguntas: elige menos preguntas por partida o «Sin límite».` : "";

    $<HTMLButtonElement>("doneOptions").disabled = noCats || noNames || noTerr || empty || tooLong;
  }

  // ---------- Partida ----------
  /**
   * Partida preparada de antemano (en el inicio y al terminar una partida), para descargar y dibujar
   * ya la bandera de su primera pregunta: así aparece al instante al pulsar «Jugar».
   * Se guarda con la selección para la que se hizo; si el jugador cambia las opciones, se prepara otra.
   */
  let preparada: { seleccion: string; preguntas: ReturnType<typeof buildRound> } | null = null;
  const seleccionActual = () => JSON.stringify([state.selected, state.names, state.territorios, state.opciones, state.longitud]);
  const ajustesPartida = () => ({ categories: state.selected, names: state.names, territorios: state.territorios, options: state.opciones, length: state.longitud });
  const nuevaPartida = () => buildRound(ajustesPartida());
  /** Clave del récord de la selección actual. */
  const recordKey = () => comboKey(state.selected, state.territorios, state.opciones, state.longitud, state.tiempo);
  function prepararPartida() {
    if (!canPlay()) { preparada = null; return; }
    if (preparada?.seleccion !== seleccionActual()) preparada = { seleccion: seleccionActual(), preguntas: nuevaPartida() };
    const primera = preparada.preguntas[0];
    if (primera?.flag) precargarBandera(primera.flag);
  }

  function start(session?: GameSession) {
    if (!session && !canPlay()) return openOptions();
    if (session) game = session;
    else {
      const preguntas = preparada?.seleccion === seleccionActual() ? preparada.preguntas : nuevaPartida();
      preparada = null; // cada partida preparada se juega una sola vez
      game = new GameSession(preguntas, {
        expected: roundSize(state.selected, state.territorios, state.longitud),
        unlimited: state.longitud === "sinLimite"
      });
    }
    // Sin límite no hay barra de progreso (no se sabe cuándo acaba), sino el botón «Terminar».
    $("track").hidden = game.unlimited;
    $("track").style.setProperty("--n", String(game.total));
    $("track").classList.toggle("long", game.total > 25);
    show("play");
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
    $("qcat").textContent = (g.review ? "Repaso · " : "") + (categoryById(q.category)?.labels[q.territorio] ?? "");
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

    // Reinicia la animación de entrada de la tarjeta
    const card = $("card");
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";

    startTimer();
  }

  // ---------- Tiempo por pregunta ----------
  let countdown: Countdown | null = null;
  /** Si la pregunta ya se ve entera (con su bandera dibujada) y el reloj puede correr. */
  let timerReady = false;
  let frame = 0;
  let avisoFinal = false;

  /** Arranca el reloj de la pregunta actual, si se juega con tiempo. El repaso de fallos va sin tiempo. */
  function startTimer() {
    stopTimer();
    const limite = !game || game.review ? "sinTiempo" : state.tiempo;
    $("timer").hidden = limite === "sinTiempo";
    if (limite === "sinTiempo") return;
    const c = new Countdown(limite * 1000);
    countdown = c;
    avisoFinal = false;
    drawTimer(c);
    // El reloj empieza cuando la pregunta se ve: si tiene bandera, cuando está dibujada,
    // para que una imagen lenta no quite tiempo. Si la bandera falla o tarda más de 3 s, empieza igual.
    const go = () => {
      if (countdown !== c || timerReady) return;
      timerReady = true;
      if (!document.hidden) c.start();
      loop();
    };
    const img = $("flag").querySelector("img");
    if (img) {
      img.decode().then(go, go);
      setTimeout(go, 3000);
    } else go();
  }

  /**
   * Para el reloj donde esté (al responder, salir o terminar) y lo da por acabado: ya no vuelve a arrancar,
   * ni al volver a la pestaña ni cuando termina de dibujarse la bandera. Al responder se queda a la vista
   * tal como estaba (`congelar`), para ver cuánto tiempo sobraba.
   */
  function stopTimer(congelar = false) {
    cancelAnimationFrame(frame);
    frame = 0;
    countdown?.pause();
    countdown = null;
    timerReady = false;
    if (!congelar) $("timer").classList.remove("urgent");
  }

  function loop() { if (!frame) frame = requestAnimationFrame(tick); }

  function tick() {
    frame = 0;
    const c = countdown;
    if (!c) return;
    drawTimer(c);
    if (c.expired) timeUp();
    else if (c.running) loop();
  }

  function drawTimer(c: Countdown) {
    const s = c.seconds();
    $("timerFill").style.transform = `scaleX(${c.remaining() / c.ms})`;
    $("timerText").textContent = `${s} s`;
    const urgent = s <= 5 && c.ms > 5000;
    $("timer").classList.toggle("urgent", urgent);
    if (urgent && !avisoFinal) { avisoFinal = true; announce("Quedan 5 segundos."); }
  }

  /** Se acabó el tiempo: cuenta como fallo y se muestra la respuesta, como al fallar. */
  function timeUp() {
    if (!game || game.answered) return;
    stopTimer();
    showResult(game.timeout(), null);
  }

  // Al cambiar de pestaña o bloquear el móvil, el reloj se para; al volver, sigue.
  document.addEventListener("visibilitychange", () => {
    if (!countdown || !timerReady) return;
    if (document.hidden) countdown.pause();
    else { countdown.start(); loop(); }
  });

  function renderTrack() {
    if (!game || game.unlimited) return;
    const g = game;
    $("track").replaceChildren(...g.questions.map((_, j) =>
      el("i", j < g.results.length ? (g.results[j] ? "ok" : "bad") : j === g.index ? "cur" : "")));
  }

  function answer(btn: HTMLButtonElement) {
    if (!game || game.answered) return;
    stopTimer(true);
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
    // Otras formas de los nombres: "Girona · en castellano, Gerona"
    $("aka").replaceChildren(...game.current.aliases.map((a) => el("span", "", a)));
    $("aka").hidden = !game.current.aliases.length;
    $("meaningText").textContent = game.current.meaning ?? "";
    $("meaning").hidden = !game.current.meaning;
    $("factText").textContent = game.current.fact ?? "";
    $("fact").hidden = !game.current.fact;
    announce(r.correct ? "Correcto." : r.given === null ? `Se acabó el tiempo. Era ${r.answer}.` : `Incorrecto. Era ${r.answer}.`);
    $("next").textContent = game.isLast && !game.unlimited ? "Ver resultado" : "Siguiente";
    $("feedback").hidden = false;
    $("next").focus({ preventScroll: true });
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
    $("timer").hidden = true;
    $("deckEndText").textContent =
      `Ya han salido las ${game.deckSize} preguntas de esta selección, y llevas ${r.hits} ${r.hits === 1 ? "acierto" : "aciertos"} de ${r.total}. ` +
      "Puedes barajarlas y seguir con la misma racha, o terminar y repasar tus fallos.";
    announce("Has respondido todas las preguntas.");
    $("reshuffle").focus({ preventScroll: true });
  }

  function keepPlaying() {
    if (!game?.endOfDeck) return;
    game.append(reshuffle(ajustesPartida(), game.current.id));
    game.next();
    renderQuestion();
  }

  /** Sin límite: termina la partida y muestra el resultado. */
  function stop() {
    if (!game?.unlimited || game.finished) return;
    stopTimer();
    game.stop();
    finish();
  }

  // ---------- Final ----------
  function finish() {
    if (!game) return;
    const r = game.result();
    const rec = applyRecord(state.best, recordKey(), r);
    if (rec.isNewRecord) { state = { ...state, best: rec.best }; save(); }

    $("score").replaceChildren(String(r.hits), el("small", "", `/${r.total}`));
    $("endTitle").textContent = rating(r);
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
    show("end");
    prepararPartida(); // para «Jugar otra vez»
  }

  // ---------- Créditos ----------
  function renderCredits() {
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

  // ---------- Navegación ----------
  function openOptions() { renderOptions(); show("options"); }
  /** Si con las opciones marcadas se puede jugar: alguna categoría, forma y territorio, y alguna pregunta. */
  function canPlay() {
    return state.selected.length > 0 && state.names.length > 0 && state.territorios.length > 0 &&
      roundSize(state.selected, state.territorios) > 0 && lengthFits(state.longitud, state.selected, state.territorios);
  }
  function goHome() { renderStart(); show("start"); }

  // Versión al pie del inicio, para saber si ya se ve la última publicada.
  const publicado = new Date(__PUBLICADO__);
  $("version").textContent = import.meta.env.DEV
    ? `Versión ${__VERSION__} · en desarrollo`
    : `Versión ${__VERSION__} · publicada el ${publicado.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} a las ${publicado.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;

  for (const id of ["dificultad", "tiempo", "longitud"]) radioGroup($(id));
  $("go").addEventListener("click", () => start());
  $("next").addEventListener("click", next);
  $("openOptions").addEventListener("click", openOptions);
  $("openCredits").addEventListener("click", () => { renderCredits(); show("credits"); });
  $("closeCredits").addEventListener("click", goHome);
  $("doneOptions").addEventListener("click", () => { if (canPlay()) goHome(); });
  $("allCats").addEventListener("click", () => { state.selected = [...CATEGORY_IDS]; save(); renderOptions(); });
  $("quit").addEventListener("click", () => { game = null; goHome(); });
  $("stop").addEventListener("click", stop);
  $("deckStop").addEventListener("click", stop);
  $("reshuffle").addEventListener("click", keepPlaying);
  $("again").addEventListener("click", () => start());
  $("menu").addEventListener("click", goHome);
  $("review").addEventListener("click", () => {
    // En una partida sin límite se puede fallar dos veces la misma pregunta: en el repaso sale una vez.
    const fallos = [...new Map((game?.result().misses ?? []).map((m) => [m.question.id, m.question])).values()];
    if (fallos.length) start(new GameSession(rebuild(fallos, { options: state.opciones }), { review: true }));
  });
  document.addEventListener("keydown", (e) => {
    if (screen !== "play" || !game) return;
    if (!game.answered && /^[1-9]$/.test(e.key)) {
      const b = $("opts").children[Number(e.key) - 1] as HTMLButtonElement | undefined;
      if (b) answer(b);
    } else if (game.answered && e.key === "Enter" && !(document.activeElement instanceof HTMLButtonElement)) {
      // Si hay un botón con el foco (Siguiente, Terminar, Barajar y seguir…), Intro ya lo pulsa.
      next();
    }
  });

  drawContours(document.getElementById("contours") as unknown as SVGSVGElement);
  goHome();

  return {
    isIdle: () => screen === "start" || screen === "options" || screen === "credits",
    onIdle: (callback) => { idleListeners.push(callback); }
  };
}
