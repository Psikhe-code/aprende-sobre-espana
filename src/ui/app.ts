import type { RoundQuestion } from "../engine/types";
import { CATEGORIES, CATEGORY_IDS, categoryById } from "../engine/categories";
import { buildRound, rebuild, ROUND_LENGTH } from "../engine/round";
import { loadState, saveState, comboKey, type SavedState } from "../engine/storage";
import { flagImage } from "./flags";
import { drawContours } from "./contours";

type Screen = "start" | "options" | "play" | "end";

interface Game {
  list: RoundQuestion[];
  i: number;
  hits: number;
  streak: number;
  bestStreak: number;
  results: boolean[];
  wrong: { q: RoundQuestion; given: string }[];
  review: boolean;
  answered: boolean;
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

export function startApp(): void {
  const state: SavedState = loadState();
  let game: Game | null = null;

  const save = () => saveState(state);

  function show(id: Screen) {
    (["start", "options", "play", "end"] as Screen[]).forEach((s) => { $(s).hidden = s !== id; });
    window.scrollTo({ top: 0 });
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
    const rec = state.best[comboKey(state.selected)];
    const record = $("record");
    record.replaceChildren();
    if (rec != null) record.append("Récord con esta selección: ", el("b", "", `${rec}/${ROUND_LENGTH}`));
    else record.textContent = "Aún no has jugado con esta selección.";
  }

  // ---------- Opciones ----------
  function renderOptions() {
    const box = $("cats");
    box.replaceChildren();
    for (const c of CATEGORIES) {
      const on = state.selected.includes(c.id);
      const b = el("button", "cat") as HTMLButtonElement;
      b.id = "cat-" + c.id;
      b.setAttribute("aria-pressed", String(on));
      const check = el("span", "check");
      check.innerHTML = TICK;
      const text = el("span", "cat-text");
      text.append(el("span", "cat-name", c.name), el("span", "cat-desc", c.description),
        el("span", "cat-count", `${c.questions().length} preguntas`));
      b.append(check, text);
      b.addEventListener("click", () => {
        state.selected = on ? state.selected.filter((x) => x !== c.id) : [...state.selected, c.id];
        save();
        renderOptions();
        $("cat-" + c.id).focus();
      });
      box.append(b);
    }
    const none = !state.selected.length;
    $("noneWarn").hidden = !none;
    $<HTMLButtonElement>("doneOptions").disabled = none;
    $("allCats").hidden = state.selected.length === CATEGORY_IDS.length;
  }

  // ---------- Partida ----------
  function start(list?: RoundQuestion[], review = false) {
    if (!list && !state.selected.length) return openOptions();
    const qs = list ?? buildRound({ categories: state.selected });
    game = { list: qs, i: 0, hits: 0, streak: 0, bestStreak: 0, results: [], wrong: [], review, answered: false };
    $("track").style.setProperty("--n", String(qs.length));
    show("play");
    renderQuestion();
  }

  function renderQuestion() {
    if (!game) return;
    const g = game;
    const q = g.list[g.i];
    g.answered = false;
    const sheet = $("sheet");
    sheet.replaceChildren(`Hoja ${pad(g.i + 1)} `, el("span", "", `/ ${pad(g.list.length)}`));
    $("hits").textContent = String(g.hits);
    $("streak").textContent = String(g.streak);
    $("qcat").textContent = (g.review ? "Repaso · " : "") + (categoryById(q.category)?.name ?? "");
    $("question").textContent = q.text;

    const flag = $("flag");
    flag.replaceChildren();
    if (q.flag) flag.append(flagImage(q.flag));
    flag.hidden = !q.flag;

    const track = $("track");
    track.replaceChildren(...g.list.map((_, j) =>
      el("i", j < g.i ? (g.results[j] ? "ok" : "bad") : j === g.i ? "cur" : "")));

    const box = $("opts");
    box.replaceChildren();
    q.options.forEach((o, j) => {
      const b = el("button", "opt") as HTMLButtonElement;
      b.id = "opt-" + j;
      b.dataset.value = o;
      b.append(el("span", "key", String(j + 1)), el("span", "", o));
      b.addEventListener("click", () => answer(b));
      box.append(b);
    });
    $("feedback").hidden = true;

    // Reinicia la animación de entrada de la tarjeta
    const card = $("card");
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
  }

  function answer(btn: HTMLButtonElement) {
    if (!game || game.answered) return;
    const g = game;
    g.answered = true;
    const q = g.list[g.i];
    const given = btn.dataset.value ?? "";
    const ok = given === q.answer;
    for (const b of Array.from($("opts").children) as HTMLButtonElement[]) {
      b.disabled = true;
      if (b.dataset.value === q.answer) b.classList.add("right");
      else if (b === btn) b.classList.add("wrong");
      else b.classList.add("dim");
    }
    g.results[g.i] = ok;
    if (ok) { g.hits++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak); }
    else { g.streak = 0; g.wrong.push({ q, given }); }
    $("hits").textContent = String(g.hits);
    $("streak").textContent = String(g.streak);
    $("track").children[g.i].className = ok ? "ok" : "bad";
    const v = $("verdict");
    v.className = "verdict " + (ok ? "ok" : "bad");
    v.textContent = ok ? "Correcto" : "Era: " + q.answer;
    $("why").textContent = q.why;
    $("next").textContent = g.i === g.list.length - 1 ? "Ver resultado" : "Siguiente";
    $("feedback").hidden = false;
    $("next").focus({ preventScroll: true });
  }

  function next() {
    if (!game || !game.answered) return;
    if (game.i < game.list.length - 1) { game.i++; renderQuestion(); }
    else finish();
  }

  // ---------- Final ----------
  function finish() {
    if (!game) return;
    const g = game;
    const n = g.list.length;
    const pct = g.hits / n;
    const key = comboKey(state.selected);
    if (!g.review && n === ROUND_LENGTH && (state.best[key] == null || g.hits > state.best[key])) {
      state.best[key] = g.hits;
      save();
    }
    $("score").replaceChildren(String(g.hits), el("small", "", `/${n}`));
    $("endTitle").textContent = pct === 1 ? "Mapa completo" : pct >= 0.8 ? "Gran nivel" : pct >= 0.5 ? "Buen rumbo" : "Toca repasar el atlas";
    const rec = !g.review && state.best[key] != null ? ` · Récord con esta selección: ${state.best[key]}/${ROUND_LENGTH}` : "";
    $("endSub").textContent = (g.review ? "Repaso de fallos" : "Partida") + ` · Mejor racha: ${g.bestStreak}` + rec;

    const misses = $("misses");
    misses.replaceChildren();
    $("missLabel").hidden = !g.wrong.length;
    if (!g.wrong.length) {
      misses.append(el("p", "allright", "Sin fallos en esta partida."));
    } else {
      for (const w of g.wrong) {
        const row = el("div", "miss");
        row.append(el("span", "miss-q", w.q.text));
        if (w.q.flag) {
          const f = el("div", "miss-flag");
          f.append(flagImage(w.q.flag));
          row.append(f);
        }
        const a = el("span", "miss-a");
        a.append("Respuesta: ", el("b", "", w.q.answer), " · tú dijiste ", el("s", "", w.given));
        row.append(a);
        misses.append(row);
      }
    }
    $("review").hidden = !g.wrong.length;
    show("end");
  }

  // ---------- Navegación ----------
  function openOptions() { renderOptions(); show("options"); }
  function goHome() { renderStart(); show("start"); }

  $("go").addEventListener("click", () => start());
  $("next").addEventListener("click", next);
  $("openOptions").addEventListener("click", openOptions);
  $("doneOptions").addEventListener("click", () => { if (state.selected.length) goHome(); });
  $("allCats").addEventListener("click", () => { state.selected = [...CATEGORY_IDS]; save(); renderOptions(); });
  $("quit").addEventListener("click", () => { game = null; goHome(); });
  $("again").addEventListener("click", () => start());
  $("menu").addEventListener("click", goHome);
  $("review").addEventListener("click", () => {
    if (game?.wrong.length) start(rebuild(game.wrong.map((w) => w.q)), true);
  });
  document.addEventListener("keydown", (e) => {
    if ($("play").hidden || !game) return;
    if (!game.answered && /^[1-9]$/.test(e.key)) {
      const b = $("opts").children[Number(e.key) - 1] as HTMLButtonElement | undefined;
      if (b) answer(b);
    } else if (game.answered && e.key === "Enter" && document.activeElement !== $("next")) {
      next();
    }
  });

  drawContours(document.getElementById("contours") as unknown as SVGSVGElement);
  goHome();
}
