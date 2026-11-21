/**
 * @fileoverview La imagen de la pregunta (en Geografía, la bandera) mientras llega: su hueco reservado, el aviso
 * de que está cargando, el de que no ha llegado con «Reintentar», y que hasta que se ve no se puede responder
 * ni corre el reloj. Las descargas de las banderas se retienen o se hacen fallar desde el test.
 */

import type { Page, Route } from "@playwright/test";
import { test, expect, openSection, changeSettings, advanceClock, ONLY_BANDERAS } from "./helpers";
import { LOAD_TIMEOUT_MS, LOADING_NOTICE_DELAY_MS } from "../src/common/ui/common-images";

// Solo las imágenes: en el servidor de desarrollo, el código también pide los SVG (con ?url y ?dimensions) como módulos.
const BANDERAS = /\/data\/banderas\/[^?]+\.svg$/;

/** Retiene las descargas de las banderas hasta que se llama a la función que devuelve. */
async function holdBanderas(page: Page): Promise<() => Promise<void>> {
  const held: Route[] = [];
  let holding = true;
  await page.route(BANDERAS, (route) => (holding ? held.push(route) : route.continue()));
  return async () => {
    holding = false;
    for (const route of held.splice(0)) await route.continue();
  };
}

/**
 * Empieza una partida de banderas de provincia. Las de comunidad no valen: las más sencillas pesan tan poco que Vite
 * las escribe dentro del código (como data:…) y no se descargan, así que no se podrían retener ni hacer fallar.
 */
async function startBanderas(page: Page) {
  await openSection(page);
  await changeSettings(page, [...ONLY_BANDERAS, "terr-comunidad"]);
  await page.locator("#go").click();
  await expect(page.locator("#questionImage img")).toHaveAttribute("src", BANDERAS);
}

const frame = (page: Page) => page.locator("#questionImage .image-frame");

test.describe("con el reloj controlado", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
  });

  test("mientras llega la bandera: su hueco reservado, sin poder responder, el reloj quieto y, si tarda, «Cargando»", async ({ page }) => {
    const release = await holdBanderas(page);
    await startBanderas(page);

    // El recuadro ya tiene el tamaño de la bandera, con su proporción, antes de que llegue.
    const [w, h] = (await frame(page).evaluate((e) => e.style.aspectRatio)).split("/").map(Number);
    const box = (await frame(page).boundingBox())!;
    expect(box.height).toBeGreaterThan(50);
    expect(Math.abs(box.height - box.width * (h / w))).toBeLessThan(2);

    // Al principio, ni aviso (casi siempre llega antes y sería un parpadeo); las opciones, sin poder pulsarse.
    await expect(frame(page)).not.toHaveClass(/loading/);
    await expect(page.locator("#opts .opt").first()).toBeDisabled();
    await advanceClock(page, LOADING_NOTICE_DELAY_MS);
    await expect(frame(page)).toHaveClass(/loading/);
    await expect(frame(page).locator(".image-status")).toHaveText("Cargando la imagen…");
    await advanceClock(page, 5000);
    await expect(page.locator("#timerText")).toHaveText("60 s");

    // Al llegar: la bandera se ve, sin que se mueva nada, y ya se puede responder; el reloj empieza a correr.
    // (Antes, que acabe la animación de entrada de la tarjeta, que la desplaza un poco mientras dura.)
    await page.locator("#card").evaluate((card) => Promise.all(card.getAnimations({ subtree: true }).map((a) => a.finished)));
    const before = (await page.locator("#opts .opt").first().boundingBox())!.y;
    await release();
    await expect(frame(page)).not.toHaveClass(/loading/);
    await expect(page.locator("#opts .opt").first()).toBeEnabled();
    expect(await frame(page).locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    expect(Math.abs((await page.locator("#opts .opt").first().boundingBox())!.y - before)).toBeLessThan(1);
    await advanceClock(page, 3000);
    await expect(page.locator("#timerText")).toHaveText("57 s");
  });

  test(`si tarda más de ${LOAD_TIMEOUT_MS / 1000} s, lo avisa; y si llega después, sigue sola`, async ({ page }) => {
    const release = await holdBanderas(page);
    await startBanderas(page);
    await advanceClock(page, LOAD_TIMEOUT_MS);
    await expect(frame(page)).toHaveClass(/failed/);
    await expect(frame(page).locator(".image-status")).toContainText("No se ha podido cargar la imagen.");
    await expect(page.locator("#timerText")).toHaveText("60 s");
    await release();
    await expect(frame(page)).not.toHaveClass(/failed/);
    await expect(page.locator("#opts .opt").first()).toBeEnabled();
  });
});

test.describe("si la descarga falla", () => {
  test.use({ allowedConsoleErrors: [/Failed to load resource/] });

  test("avisa de que no ha llegado; «Reintentar» la vuelve a pedir y, si llega, se sigue; «Terminar» sigue funcionando", async ({ page }) => {
    let failing = true;
    await page.route(BANDERAS, (route) => (failing ? route.abort("internetdisconnected") : route.continue()));
    await startBanderas(page);
    await expect(frame(page)).toHaveClass(/failed/);
    await expect(frame(page).locator(".image-status")).toContainText("No se ha podido cargar la imagen. Comprueba la conexión.");
    await expect(page.locator("#opts .opt").first()).toBeDisabled();
    // El icono de imagen rota no se ve.
    await expect(frame(page).locator("img")).toBeHidden();

    // Sigue sin conexión: al reintentar, vuelve a avisar.
    await frame(page).getByRole("button", { name: "Reintentar" }).click();
    await expect(frame(page)).toHaveClass(/failed/);

    // Con conexión, llega.
    failing = false;
    await frame(page).getByRole("button", { name: "Reintentar" }).click();
    await expect(frame(page)).not.toHaveClass(/failed/);
    await expect(frame(page).locator("img")).toBeVisible();
    await expect(page.locator("#opts .opt").first()).toBeEnabled();

    // Y si en otra pregunta no llega, «Terminar» lleva al resultado igual.
    failing = true;
    await page.locator("#opts .opt").first().click();
    await page.locator("#next").click();
    await expect(frame(page)).toHaveClass(/failed/);
    await page.locator("#stop").click();
    await expect(page.locator("#end")).toBeVisible();
  });
});
