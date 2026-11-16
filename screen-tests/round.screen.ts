// Una partida de principio a fin: responder, el repaso de fallos, salir y el teclado.

import { test, expect, abrir, opciones, preguntasCcse, responder } from "./helpers";
import { ccsePrueba } from "../tests/ccse/test-data";

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

test("con el teclado: los números responden (Ctrl y Alt no), Intro pasa, y el foco sigue a la pregunta", async ({ page, isMobile }) => {
  test.skip(isMobile, "con teclado, solo en escritorio");
  await abrir(page);
  await page.locator("#go").click();
  // El foco va al enunciado, para que el lector de pantalla lo lea (el botón «Jugar» ya no se ve).
  await expect(page.locator("#question")).toBeFocused();

  // Con Ctrl, Alt o Cmd, un número es un atajo del navegador o del sistema: no responde.
  for (const tecla of ["Control+2", "Alt+2", "Meta+2"]) await page.keyboard.press(tecla);
  await expect(page.locator("#feedback")).toBeHidden();

  await page.keyboard.press("2");
  await expect(page.locator("#feedback")).toBeVisible();
  await expect(page.locator("#opts .opt").nth(1)).toHaveClass(/right|wrong/); // la pulsada es la segunda
  await expect(page.locator("#next")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sheet")).toHaveText("Hoja 02 / 10");
  await expect(page.locator("#question")).toBeFocused();

  // En un teclado francés, la tecla del 3 escribe «"» sin Mayúsculas: también responde la tercera.
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: '"', code: "Digit3", bubbles: true })));
  await expect(page.locator("#opts .opt").nth(2)).toHaveClass(/right|wrong/);

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Enter");
    await page.keyboard.press("1");
  }
  await page.keyboard.press("Enter");
  await expect(page.locator("#end")).toBeVisible();
  // Al terminar, el foco va al resultado.
  await expect(page.locator("#endResult")).toBeFocused();
});

test("Intro sobre un enlace de las fuentes lo abre, sin pasar a la siguiente pregunta", async ({ page, isMobile }) => {
  test.skip(isMobile, "con teclado, solo en escritorio");
  await preguntasCcse(page, ccsePrueba());
  // Los enlaces de los datos de prueba no salen a internet: se contestan aquí.
  await page.context().route("https://example.org/**", (route) => route.fulfill({ contentType: "text/html", body: "Fuente" }));
  await abrir(page, "ccse");
  await page.locator("#ccseGo").click();
  // Hasta una pregunta con fuentes (algunas de prueba no tienen nota ni fuentes).
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("1");
    if (await page.locator("#source a").first().isVisible()) break;
    await page.keyboard.press("Enter");
  }
  const hoja = (await page.locator("#sheet").textContent()) ?? "";
  await page.locator("#source a").first().focus();
  const pestaña = page.context().waitForEvent("page");
  await page.keyboard.press("Enter");
  await (await pestaña).close();
  await expect(page.locator("#sheet")).toHaveText(hoja);
  await expect(page.locator("#feedback")).toBeVisible();
});
