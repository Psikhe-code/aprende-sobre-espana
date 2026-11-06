// El reloj se prueba con el reloj del navegador controlado por el test: el tiempo solo pasa
// cuando el test lo dice (`pasa`), así no hay que esperar de verdad.
import { test, expect, abrir, opciones, pasa, responder, pestañaOculta, segundos, SOLO_BANDERAS, SOLO_CAPITALES } from "./ayuda";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
});

test("cuenta atrás de 1 minuto; si se acaba, es un fallo", async ({ page }) => {
  await abrir(page);
  await opciones(page, SOLO_CAPITALES); // sin banderas, para que el reloj empiece en cuanto sale la pregunta
  await page.locator("#go").click();
  await expect(page.locator("#timerText")).toHaveText("60 s");
  await pasa(page, 20_000);
  await expect(page.locator("#timerText")).toHaveText("40 s");
  await pasa(page, 41_000);
  await expect(page.locator("#verdict")).toHaveText(/^Se acabó el tiempo · Era: .+/);
  await expect(page.locator("#streak")).toHaveText("0");
  await expect(page.locator("#opts .opt:not([disabled])")).toHaveCount(0);
});

test("se pausa con la pestaña oculta, y después de responder ya no vuelve a correr", async ({ page }) => {
  await abrir(page);
  await opciones(page, SOLO_CAPITALES);
  await page.locator("#go").click();
  await pasa(page, 5000);
  await pestañaOculta(page, true);
  await pasa(page, 30_000);
  await pestañaOculta(page, false);
  await pasa(page, 1000);
  await expect(page.locator("#timerText")).toHaveText("54 s");

  await page.locator("#opts .opt").first().click();
  await pestañaOculta(page, true);
  await pasa(page, 1000);
  await pestañaOculta(page, false);
  await pasa(page, 20_000);
  await expect(page.locator("#timerText")).toHaveText("54 s");
});

test("con una bandera lenta, el reloj espera a que se dibuje, y no arranca si ya se ha respondido", async ({ page }) => {
  // La bandera tarda 2 s en dibujarse.
  await page.addInitScript(() => {
    HTMLImageElement.prototype.decode = function () { return new Promise((ok) => setTimeout(ok, 2000)); };
  });
  await abrir(page);
  await opciones(page, SOLO_BANDERAS);
  await page.locator("#go").click();
  await pasa(page, 1500);
  await expect(page.locator("#timerText")).toHaveText("60 s");
  await page.locator("#opts .opt").first().click();
  await pasa(page, 20_000);
  await expect(page.locator("#timerText")).toHaveText("60 s");

  // Sin responder, empieza al dibujarse (a los 2 s).
  await page.locator("#next").click();
  await pasa(page, 1500);
  await expect(page.locator("#timerText")).toHaveText("60 s");
  await pasa(page, 4500);
  const s = await segundos(page);
  expect(s).toBeGreaterThanOrEqual(55);
  expect(s).toBeLessThanOrEqual(57);
});

test("con 10 segundos se pone en rojo al final, y el repaso de fallos va sin reloj", async ({ page }) => {
  await abrir(page);
  await opciones(page, [...SOLO_CAPITALES, "tiempo-10"]);
  await page.locator("#go").click();
  await pasa(page, 6000);
  await expect(page.locator("#timerText")).toHaveText("4 s");
  await expect(page.locator("#timer")).toHaveClass(/urgent/);

  for (let i = 0; i < 10; i++) {
    await pasa(page, 11_000);
    await expect(page.locator("#verdict")).toContainText("Se acabó el tiempo");
    await page.locator("#next").click();
  }
  await expect(page.locator("#score")).toHaveText("0/10");
  await expect(page.locator(".miss-a").first()).toContainText("se acabó el tiempo");

  await page.locator("#review").click();
  await expect(page.locator("#timer")).toBeHidden();
  await pasa(page, 20_000);
  await expect(page.locator("#feedback")).toBeHidden();
  await responder(page, 1);
});

test("sin tiempo no hay reloj", async ({ page }) => {
  await abrir(page);
  await opciones(page, ["tiempo-sinTiempo"]);
  await expect(page.locator("#dificultadInfo")).toHaveText("Dificultad: 4 opciones por pregunta, sin tiempo.");
  await page.locator("#go").click();
  await expect(page.locator("#timer")).toBeHidden();
});
