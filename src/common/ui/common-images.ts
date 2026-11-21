/**
 * @fileoverview Imágenes de las preguntas: dibujarlas en su recuadro (con su hueco reservado, el aviso de que
 * están cargando y el de que no han llegado) y descargarlas por adelantado. Valen para cualquier sección;
 * qué imagen lleva cada pregunta lo decide la sección.
 */

import type { QuestionImage } from "../engine/common-types";
import { announce, el } from "./common-dom";

/** Ancho y alto de una imagen; solo importa la proporción. */
export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

/** Tiempo que puede tardar una imagen sin avisar: casi siempre llega antes, y un aviso que parpadea molesta más que ayuda. */
export const LOADING_NOTICE_DELAY_MS = 500;
/** Tiempo máximo de espera: si la imagen no ha llegado, se avisa y se ofrece reintentar (aunque, si llega después, se sigue sola). */
export const LOAD_TIMEOUT_MS = 15_000;

/**
 * Una imagen. Con `alt` vacío, el lector de pantalla no la lee (cuando lo que muestra ya está escrito al lado).
 * Con su tamaño, el navegador le reserva el hueco con su proporción antes de que llegue.
 */
export function imageElement(src: string, alt: string, size?: ImageSize): HTMLImageElement {
  const img = document.createElement("img");
  if (size) {
    img.width = size.width;
    img.height = size.height;
  }
  img.src = src;
  img.alt = alt;
  img.decoding = "async";
  return img;
}

/**
 * Dibuja la imagen de una pregunta en `container`, en un recuadro que ya tiene su tamaño, y llama a `onReady`
 * cuando se ve (descargada y dibujada). Mientras tanto:
 * - si tarda más de LOADING_NOTICE_DELAY_MS, el recuadro dice que está cargando;
 * - si falla o pasan LOAD_TIMEOUT_MS, dice que no ha llegado, con un botón para reintentar.
 * Si llega tarde, después del aviso, también se sigue sola. Devuelve una función que lo cancela todo
 * (al pasar a otra pregunta), para que una imagen que llega tarde no afecte a la pregunta siguiente.
 */
export function renderQuestionImage(container: HTMLElement, image: QuestionImage, onReady: () => void): () => void {
  const frame = el("div", "image-frame");
  // La proporción del recuadro, la de la imagen: así no se mueve nada cuando llega.
  frame.style.aspectRatio = `${image.width} / ${image.height}`;
  const status = el("div", "image-status");
  status.setAttribute("role", "status");
  container.replaceChildren(frame);

  /** Cada intento de carga tiene su número: lo que llega de un intento anterior (o cancelado) no hace nada. */
  let attempt = 0;
  let noticeTimer = 0;
  let timeoutTimer = 0;
  const clearTimers = () => { clearTimeout(noticeTimer); clearTimeout(timeoutTimer); };

  function load() {
    const current = ++attempt;
    clearTimers();
    const img = imageElement(image.src, image.alt, image);
    frame.className = "image-frame";
    status.replaceChildren();
    frame.replaceChildren(img, status);
    noticeTimer = window.setTimeout(() => {
      if (current !== attempt) return;
      frame.classList.add("loading");
      status.replaceChildren(el("span", "", "Cargando la imagen…"));
    }, LOADING_NOTICE_DELAY_MS);
    timeoutTimer = window.setTimeout(() => { if (current === attempt) fail(); }, LOAD_TIMEOUT_MS);
    img.decode().then(
      () => {
        if (current !== attempt) return;
        clearTimers();
        frame.className = "image-frame";
        status.replaceChildren();
        onReady();
      },
      () => { if (current === attempt) fail(); }
    );
  }

  function fail() {
    clearTimers();
    if (frame.classList.contains("failed")) return;
    frame.className = "image-frame failed";
    const retry = el("button", "ghost", "Reintentar") as HTMLButtonElement;
    retry.type = "button";
    retry.addEventListener("click", load);
    status.replaceChildren(el("span", "", "No se ha podido cargar la imagen. Comprueba la conexión."), retry);
    announce("No se ha podido cargar la imagen.");
  }

  load();
  return () => { attempt++; clearTimers(); };
}

// Imágenes pedidas por adelantado. Se guardan aquí para que el navegador no las descarte antes de terminar.
const preloaded = new Map<string, HTMLImageElement>();

/**
 * Descarga y prepara una imagen antes de que haga falta (la de la pregunta siguiente),
 * para que aparezca al instante al pasar de pregunta, aunque la conexión sea lenta.
 */
export function preloadImage(src: string): void {
  if (!src || preloaded.has(src)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  // decode() también la dibuja por adelantado: las imágenes detalladas (los escudos) tardan un poco en dibujarse.
  // Si falla (por ejemplo, sin conexión), se olvida, para volver a intentarlo la próxima vez que haga falta.
  img.decode?.().catch(() => { if (preloaded.get(src) === img) preloaded.delete(src); });
  preloaded.set(src, img);
}
