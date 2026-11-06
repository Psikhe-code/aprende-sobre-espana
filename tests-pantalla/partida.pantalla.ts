import { test, expect, abrir, opciones, responder } from "./ayuda";

test("una partida de 10 se juega entera y deja el récord en el inicio", async ({ page }) => {
  await abrir(page);
  await expect(page.locator("#record")).toHaveText("Aún no has jugado con esta selección.");
  await page.locator("#go").click();
  await expect(page.locator("#sheet")).toHaveText("Hoja 01 / 10");
  await expect(page.locator("#track i")).toHaveCount(10);

  // Al responder se ve la nota, y las opciones ya no se pueden pulsar.
  await page.locator("#opts .opt").first().click();
  await expect(page.locator("#verdict")).toHaveText(/^(Correcto|Era: .+)$/);
  await expect(page.locator("#opts .opt:not([disabled])")).toHaveCount(0);
  await page.locator("#next").click();
  await expect(page.locator("#sheet")).toHaveText("Hoja 02 / 10");

  await responder(page, 9);
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator("#score")).toHaveText(/^\d+\/10$/);
  await expect(page.locator("#endSub")).toContainText("Récord con esta selección");

  await page.locator("#menu").click();
  await expect(page.locator("#record")).toContainText("Récord con esta selección:");
});

test("el repaso de fallos repite solo las falladas, marcado como repaso", async ({ page }) => {
  await abrir(page);
  await page.locator("#go").click();
  await responder(page, 10);
  const fallos = await page.locator(".miss").count();
  test.skip(fallos === 0, "se acertaron todas al azar: no hay fallos que repasar");
  await page.locator("#review").click();
  await expect(page.locator("#sheet")).toHaveText(`Hoja 01 / ${String(fallos).padStart(2, "0")}`);
  await expect(page.locator("#qcat")).toContainText("Repaso · ");
  await responder(page, fallos);
  await expect(page.locator("#endSub")).toContainText("Repaso de fallos");
});

test("«Salir al menú» vuelve al inicio sin guardar récord", async ({ page }) => {
  await abrir(page);
  await page.locator("#go").click();
  await responder(page, 3);
  await page.locator("#quit").click();
  await expect(page.locator("#go")).toBeVisible();
  await expect(page.locator("#record")).toHaveText("Aún no has jugado con esta selección.");
});

test("partida de 100 con todo: la barra de progreso cabe en la pantalla", async ({ page }) => {
  await abrir(page);
  await opciones(page, ["len-100"]);
  await expect(page.locator("#roundLabel")).toHaveText("100 preguntas al azar de");
  await page.locator("#go").click();
  await expect(page.locator("#track i")).toHaveCount(100);
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(ancho, "la página no se desborda a lo ancho").toBe(0);
});
