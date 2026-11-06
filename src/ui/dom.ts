// Utilidades de pantalla que usan todas las demás: buscar y crear elementos, tarjetas de Opciones,
// grupos de opciones y avisos para lectores de pantalla.

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/** Número con dos cifras: 1 → "01". */
export const pad = (n: number) => String(n).padStart(2, "0");

/** Avisos para lectores de pantalla (en la zona `announce`, que leen sin mover el foco). */
export const announce = (text: string) => { $("announce").textContent = text; };

const TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

/**
 * Tarjeta de Opciones: marcada o no, con título y descripción.
 * - Normal: botón que se marca y desmarca (categorías, nombres, territorios: se pueden marcar varios).
 *   El lector de pantalla dice «botón de alternancia, pulsado».
 * - `radio`: una opción de un grupo en el que solo se marca una (dificultad, tiempo, preguntas por partida).
 *   El lector dice «botón de opción, seleccionado, 2 de 4». Se recorre con las flechas (ver radioGroup).
 */
export function toggleCard(id: string, on: boolean, title: string, lines: string[][], onToggle: () => void, radio = false): HTMLButtonElement {
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
export function radioGroup(group: HTMLElement): void {
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
export function tabuladorEnLaMarcada(group: HTMLElement): void {
  const radios = radiosDe(group);
  const marcada = radios.find((b) => b.getAttribute("aria-checked") === "true") ?? radios[0];
  for (const b of group.querySelectorAll('[role="radio"]')) (b as HTMLElement).tabIndex = b === marcada ? 0 : -1;
}
