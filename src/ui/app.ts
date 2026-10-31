import { CATEGORIES, CATEGORY_IDS, categoryById } from "../engine/categories";
import { buildRound, rebuild, questionsIn, roundSize, OPTION_COUNTS } from "../engine/round";
import { GameSession, applyRecord, type GameResult } from "../engine/game";
import { loadState, saveState, comboKey, type SavedState } from "../engine/storage";
import { NAME_STYLES, TERRITORIOS, type NameStyle, type Territorio } from "../engine/types";
import { flagImage } from "./flags";
import { BANDERAS } from "../engine/questions";
import { AUTONOMIAS } from "../engine/territory";
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
  provincia: { name: "Provincias", example: "Por ahora, las capitales que no se llaman como su provincia", short: "provincias" }
};

/** Explicación de cada dificultad en Opciones. */
const DIFICULTAD_DESC: Record<number, string> = {
  4: "La respuesta y tres opciones más.",
  6: "Más trampas entre las opciones.",
  8: "Casi todas las trampas a la vez."
};

/** Botón de casilla para Opciones: marcado o no, con título y descripción. */
function toggleCard(id: string, on: boolean, title: string, lines: string[][], onToggle: () => void): HTMLButtonElement {
  const b = el("button", "cat") as HTMLButtonElement;
  b.id = id;
  b.setAttribute("aria-pressed", String(on));
  const check = el("span", "check");
  check.innerHTML = TICK;
  const text = el("span", "cat-text");
  text.append(el("span", "cat-name", title), ...lines.map(([cls, t]) => el("span", cls, t)));
  b.append(check, text);
  b.addEventListener("click", onToggle);
  return b;
}

function rating(r: GameResult): string {
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
    $("dificultadInfo").textContent = `Dificultad: ${state.opciones} opciones por pregunta.`;
    const rec = state.best[comboKey(state.selected, state.territorios, state.opciones)];
    const record = $("record");
    record.replaceChildren();
    if (rec != null) record.append("Récord con esta selección: ", el("b", "", `${rec}/${roundSize(state.selected, state.territorios)}`));
    else record.textContent = "Aún no has jugado con esta selección.";
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
      const card = toggleCard("dif-" + n, state.opciones === n, `${n} opciones`, [["cat-desc", DIFICULTAD_DESC[n]]], () => {
        state.opciones = n;
        save();
        renderOptions();
        $("dif-" + n).focus();
      });
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", String(state.opciones === n));
      return card;
    });
    const abierta = toggleCard("dif-abierta", false, "Respuesta abierta", [["cat-desc", "Escribes la respuesta tú. Próximamente."]], () => {});
    abierta.disabled = true;
    abierta.setAttribute("role", "radio");
    abierta.setAttribute("aria-checked", "false");
    $("dificultad").replaceChildren(...dificultades, abierta);

    const noTerr = !state.territorios.length;
    $("noTerrWarn").hidden = !noTerr;
    // Categorías y territorios marcados, pero sin preguntas (p. ej. solo banderas y solo provincias).
    const empty = !noCats && !noTerr && roundSize(state.selected, state.territorios) === 0;
    $("emptyWarn").hidden = !empty;

    $<HTMLButtonElement>("doneOptions").disabled = noCats || noNames || noTerr || empty;
  }

  // ---------- Partida ----------
  function start(session?: GameSession) {
    if (!session && !canPlay()) return openOptions();
    game = session ?? new GameSession(
      buildRound({ categories: state.selected, names: state.names, territorios: state.territorios, options: state.opciones }),
      { expected: roundSize(state.selected, state.territorios) }
    );
    $("track").style.setProperty("--n", String(game.total));
    show("play");
    renderQuestion();
  }

  function renderQuestion() {
    if (!game) return;
    const g = game;
    const q = g.current;
    $("sheet").replaceChildren(`Hoja ${pad(g.index + 1)} `, el("span", "", `/ ${pad(g.total)}`));
    $("hits").textContent = String(g.hits);
    $("streak").textContent = String(g.streak);
    $("qcat").textContent = (g.review ? "Repaso · " : "") + (categoryById(q.category)?.labels[q.territorio] ?? "");
    $("question").textContent = q.text;

    const flag = $("flag");
    flag.replaceChildren();
    if (q.flag) flag.append(flagImage(q.flag));
    flag.hidden = !q.flag;

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
  }

  function renderTrack() {
    if (!game) return;
    const g = game;
    $("track").replaceChildren(...g.questions.map((_, j) =>
      el("i", j < g.results.length ? (g.results[j] ? "ok" : "bad") : j === g.index ? "cur" : "")));
  }

  function answer(btn: HTMLButtonElement) {
    if (!game || game.answered) return;
    const r = game.answer(btn.dataset.value ?? "");
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
    v.textContent = r.correct ? "Correcto" : "Era: " + r.answer;
    $("why").textContent = game.current.why;
    // Otras formas de los nombres: "Girona · en castellano, Gerona"
    $("aka").replaceChildren(...game.current.aliases.map((a) => el("span", "", a)));
    $("aka").hidden = !game.current.aliases.length;
    $("meaningText").textContent = game.current.meaning ?? "";
    $("meaning").hidden = !game.current.meaning;
    $("factText").textContent = game.current.fact ?? "";
    $("fact").hidden = !game.current.fact;
    announce(r.correct ? "Correcto." : `Incorrecto. Era ${r.answer}.`);
    $("next").textContent = game.isLast ? "Ver resultado" : "Siguiente";
    $("feedback").hidden = false;
    $("next").focus({ preventScroll: true });
  }

  function next() {
    if (!game || !game.answered) return;
    if (game.next()) renderQuestion();
    else finish();
  }

  // ---------- Final ----------
  function finish() {
    if (!game) return;
    const r = game.result();
    const key = comboKey(state.selected, state.territorios, state.opciones);
    const rec = applyRecord(state.best, key, r);
    if (rec.isNewRecord) { state = { ...state, best: rec.best }; save(); }

    $("score").replaceChildren(String(r.hits), el("small", "", `/${r.total}`));
    $("endTitle").textContent = rating(r);
    const recText = !r.review && rec.record != null ? ` · Récord con esta selección: ${rec.record}/${game.expected}` : "";
    $("endSub").textContent = (r.review ? "Repaso de fallos" : "Partida") + ` · Mejor racha: ${r.bestStreak}` + recText;

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
        a.append("Respuesta: ", el("b", "", m.question.answer), " · tú dijiste ", el("s", "", m.given));
        row.append(a);
        misses.append(row);
      }
    }
    $("review").hidden = !r.misses.length;
    show("end");
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
    $("creditList").replaceChildren(...AUTONOMIAS.map((c) => {
      const f = BANDERAS[c.id].fuente;
      const row = el("div", "credit");
      const text = el("div", "credit-text");
      const lic = el("span");
      if (f.autor) lic.append(`${f.autor} · `);
      lic.append(f.licenciaUrl ? link(f.licenciaUrl, f.licencia) : f.licencia, " · ", link(f.url, "ver en Wikimedia Commons"));
      text.append(el("b", "", c.nombre[NAME_STYLES[0]]), lic);
      const thumb = el("span", "thumb");
      thumb.append(flagImage(c.id));
      row.append(thumb, text);
      return row;
    }));
  }

  // ---------- Navegación ----------
  function openOptions() { renderOptions(); show("options"); }
  /** Si con las opciones marcadas se puede jugar: alguna categoría, forma y territorio, y alguna pregunta. */
  function canPlay() {
    return state.selected.length > 0 && state.names.length > 0 && state.territorios.length > 0 &&
      roundSize(state.selected, state.territorios) > 0;
  }
  function goHome() { renderStart(); show("start"); }

  $("go").addEventListener("click", () => start());
  $("next").addEventListener("click", next);
  $("openOptions").addEventListener("click", openOptions);
  $("openCredits").addEventListener("click", () => { renderCredits(); show("credits"); });
  $("closeCredits").addEventListener("click", goHome);
  $("doneOptions").addEventListener("click", () => { if (canPlay()) goHome(); });
  $("allCats").addEventListener("click", () => { state.selected = [...CATEGORY_IDS]; save(); renderOptions(); });
  $("quit").addEventListener("click", () => { game = null; goHome(); });
  $("again").addEventListener("click", () => start());
  $("menu").addEventListener("click", goHome);
  $("review").addEventListener("click", () => {
    const misses = game?.result().misses ?? [];
    if (misses.length) start(new GameSession(rebuild(misses.map((m) => m.question), { options: state.opciones }), { review: true }));
  });
  document.addEventListener("keydown", (e) => {
    if (screen !== "play" || !game) return;
    if (!game.answered && /^[1-9]$/.test(e.key)) {
      const b = $("opts").children[Number(e.key) - 1] as HTMLButtonElement | undefined;
      if (b) answer(b);
    } else if (game.answered && e.key === "Enter" && document.activeElement !== $("next")) {
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
