// Ayudas para los tests de pantalla: abrir el juego, cambiar opciones, responder y esconder la pestaña.
import { test as base, expect, type Page } from "@playwright/test";

/**
 * Como `test` de Playwright, pero cada test falla también si hay algún error en la consola
 * del navegador, aunque lo que se ve parezca correcto.
 */
export const test = base.extend<{ sinErrores: void }>({
  sinErrores: [async ({ page }, use) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
    await use();
    expect(errores, "errores en la consola del navegador").toEqual([]);
  }, { auto: true }]
});
export { expect };

export async function abrir(page: Page) {
  await page.goto("./");
  await expect(page.locator("#go")).toBeVisible();
}

/** Abre Opciones, pulsa las tarjetas indicadas por su id (p. ej. "cat-banderas", "len-25") y vuelve al inicio. */
export async function opciones(page: Page, tarjetas: string[]) {
  await page.locator("#openOptions").click();
  for (const id of tarjetas) await page.locator(`[id="${id}"]`).click();
  await page.locator("#doneOptions").click();
  await expect(page.locator("#go")).toBeVisible();
}

/** Para jugar solo Capitales: desmarca las otras categorías. */
export const SOLO_CAPITALES = ["cat-banderas", "cat-divisiones"];
/** Para jugar solo Banderas. */
export const SOLO_BANDERAS = ["cat-capitales", "cat-divisiones"];

/** Responde (la primera opción) y pasa a la siguiente, `n` veces. */
export async function responder(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await page.locator("#opts .opt").first().click();
    await expect(page.locator("#feedback")).toBeVisible();
    await page.locator("#next").click();
  }
}

/** Hace como si la pestaña se escondiera (otra pestaña, móvil bloqueado) o volviera a verse. */
export async function pestañaOculta(page: Page, oculta: boolean) {
  await page.evaluate((o) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => o });
    document.dispatchEvent(new Event("visibilitychange"));
  }, oculta);
}

/**
 * Deja pasar `ms` milisegundos en el reloj del navegador (instalado con `page.clock.install`).
 * Pasan 50 ms más para que se dibuje un fotograma más: el reloj se dibuja en cada fotograma, y sin
 * ellos se vería el del fotograma anterior (4,98 s pasados en vez de 5, que redondeado da un segundo más).
 */
export async function pasa(page: Page, ms: number) {
  await page.clock.runFor(ms + 50);
}

/** Segundos que marca el reloj. */
export async function segundos(page: Page): Promise<number> {
  return parseInt(await page.locator("#timerText").innerText(), 10);
}
