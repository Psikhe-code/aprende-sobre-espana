/**
 * @fileoverview Utilidades de pantalla que usan todas las demás: buscar y crear elementos, tarjetas de Opciones,
 * grupos de opciones, fuentes de las notas y avisos para lectores de pantalla.
 */

import type { Fuente } from "../engine/common-types";

/**
 * Busca un elemento por su id. Si no existe (un id mal escrito, o que se quitó de index.html), falla
 * enseguida con un mensaje que dice cuál, en vez de un error confuso más adelante.
 */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`No hay ningún elemento con id "${id}" en index.html`);
  return e as T;
}

/** Crea un elemento. TypeScript sabe de qué tipo es por la etiqueta: el("button") es un botón, el("a"), un enlace. */
export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/** Número con dos cifras: 1 → "01". */
export const pad = (n: number) => String(n).padStart(2, "0");

/** Avisos para lectores de pantalla (en la zona `announce`, que leen sin mover el foco). */
export const announce = (text: string) => { $("announce").textContent = text; };

/**
 * Número (1 a 9) de una tecla de atajo para elegir una opción, o null si no lo es.
 * - Con Ctrl, Alt o Cmd no cuenta: son atajos del navegador o del sistema (Ctrl+1 cambia de pestaña).
 * - Vale la fila de números aunque haga falta Mayúsculas para escribir la cifra (teclados franceses:
 *   sin Mayúsculas, la tecla del 1 escribe «&»), y el teclado numérico con el bloqueo numérico activado.
 */
export function numberKey(e: KeyboardEvent): number | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  if (/^[1-9]$/.test(e.key)) return Number(e.key);
  const digitRow = /^Digit([1-9])$/.exec(e.code);
  return digitRow ? Number(digitRow[1]) : null;
}

/** Si el elemento es un enlace, un botón o un campo: ahí Intro ya hace lo suyo (abrir, pulsar…). */
export const isInteractive = (t: EventTarget | null) =>
  t instanceof Element && t.closest("a, button, input, select, textarea") !== null;

/**
 * Enlace a otra web, que se abre en otra pestaña. Todos los enlaces externos se crean aquí: cuando llegue la
 * app de Android, se cambiará en este sitio para que se abran en el navegador del móvil.
 */
export function externalLink(href: string, text: string): HTMLAnchorElement {
  const a = el("a", "", text);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

/** Lo que hace una tarjeta de Opciones al pulsarla: `cambiar("id-de-la-tarjeta", () => { …el cambio… })`. */
export type Change = (cardId: string, change: () => void) => () => void;

/** Para las tarjetas de Opciones: hace el cambio, lo guarda, dibuja de nuevo la pantalla y deja el foco en la tarjeta tocada. */
export const changeWith = (save: () => void, render: () => void): Change => (cardId, change) => () => {
  change();
  save();
  render();
  $(cardId).focus();
};

/**
 * Fuentes de una nota (en el examen de nacionalidad): «Fuente: Constitución española, art. 1.3», con su enlace,
 * que se abre en otra pestaña. Se dibujan dentro de `p`, que se esconde si no hay ninguna.
 */
export function renderSources(p: HTMLElement, sources: readonly Fuente[] = []): void {
  p.hidden = !sources.length;
  p.replaceChildren();
  if (!sources.length) return;
  p.append(el("b", "", sources.length > 1 ? "Fuentes" : "Fuente"), " ");
  sources.forEach((f, i) => {
    if (i) p.append(" · ");
    p.append(f.url ? externalLink(f.url, f.texto) : f.texto);
  });
}

const TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

/**
 * Tarjeta de Opciones: marcada o no, con título y descripción.
 * - Normal: botón que se marca y desmarca (categorías, nombres, territorios: se pueden marcar varios).
 *   El lector de pantalla dice «botón de alternancia, pulsado».
 * - `radio`: una opción de un grupo en el que solo se marca una (dificultad, tiempo, preguntas por partida).
 *   El lector dice «botón de opción, seleccionado, 2 de 4». Se recorre con las flechas (ver radioGroup).
 */
export function toggleCard(id: string, on: boolean, title: string, lines: string[][], onToggle: () => void, radio = false): HTMLButtonElement {
  const b = el("button", "cat");
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
export function radioGroup(group: HTMLElement): void {
  group.addEventListener("keydown", (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (step === undefined && e.key !== "Home" && e.key !== "End") return;
    const radios = radiosIn(group);
    if (!radios.length) return;
    const i = radios.findIndex((b) => b === document.activeElement);
    const target = e.key === "Home" ? radios[0]
      : e.key === "End" ? radios[radios.length - 1]
      : radios[(Math.max(i, 0) + step! + radios.length) % radios.length];
    e.preventDefault();
    target.click(); // al marcarla se dibuja de nuevo Opciones y el foco vuelve a ella
  });
}

const radiosIn = (group: HTMLElement) =>
  Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]')).filter((b) => !b.disabled);

/** Tras dibujar un grupo de opciones: el tabulador entra solo en la marcada (o en la primera, si no la hay). */
export function tabToChecked(group: HTMLElement): void {
  const radios = radiosIn(group);
  const checked = radios.find((b) => b.getAttribute("aria-checked") === "true") ?? radios[0];
  for (const b of group.querySelectorAll<HTMLButtonElement>('[role="radio"]')) b.tabIndex = b === checked ? 0 : -1;
}
