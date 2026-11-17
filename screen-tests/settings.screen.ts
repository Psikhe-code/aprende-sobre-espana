/**
 * @fileoverview La pantalla de Opciones: cómo se eligen, se anuncian y se guardan.
 */

import { test, expect, openSection, ONLY_CAPITALES } from "./helpers";

test("las tarjetas se anuncian bien: categorías como botones, tiempo como grupo de opciones", async ({ page }) => {
  await openSection(page);
  await page.locator("#openOptions").click();
  await expect(page.getByRole("button", { name: /^Capitales/, pressed: true })).toBeVisible();
  const timeLimit = page.getByRole("radiogroup", { name: "Tiempo por pregunta" });
  await expect(timeLimit.getByRole("radio")).toHaveCount(4);
  await expect(timeLimit.getByRole("radio", { name: /^1 minuto/ })).toBeChecked();
  await expect(page.getByRole("radiogroup", { name: "Preguntas por partida" }).getByRole("radio", { name: /^10 preguntas/ })).toBeChecked();
});

test("en los grupos de opciones, las flechas pasan a otra y saltan las desactivadas", async ({ page, isMobile }) => {
  test.skip(isMobile, "con teclado, solo en escritorio");
  await openSection(page);
  await page.locator("#openOptions").click();

  // El tabulador entra en la marcada.
  await page.locator('[id="option-count-4"]').focus();
  await page.keyboard.press("Tab");
  await expect(page.locator('[id="time-60"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[id="time-30"]')).toBeFocused();
  await expect(page.locator('[id="time-30"]')).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("End");
  await expect(page.locator('[id="time-10"]')).toBeFocused();
  await page.keyboard.press("ArrowDown"); // desde la última, vuelve a la primera
  await expect(page.locator('[id="time-sinTiempo"]')).toBeFocused();

  // «Respuesta abierta» está desactivada: desde «8 opciones» se vuelve a «4 opciones».
  await page.locator('[id="option-count-8"]').click();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[id="option-count-4"]')).toBeFocused();
});

test("si la selección tiene menos preguntas, la tarjeta lo dice pero se puede elegir, y la partida tiene las que haya", async ({ page }) => {
  await openSection(page);
  await page.locator("#openOptions").click();
  for (const id of ONLY_CAPITALES) await page.locator(`[id="${id}"]`).click();
  for (const n of [50, 100]) {
    await expect(page.locator(`[id="question-count-${n}"]`)).toBeEnabled();
    await expect(page.locator(`[id="question-count-${n}"] .cat-desc`)).toHaveText(/^Con esta selección solo hay \d+ preguntas: saldrán todas\.$/);
  }
  const text = await page.locator('[id="question-count-50"] .cat-desc').textContent();
  const available = Number(text!.match(/\d+/)![0]);

  await page.locator('[id="question-count-50"]').click();
  await expect(page.locator("#doneOptions")).toBeEnabled();
  await page.locator("#doneOptions").click();
  await expect(page.locator("#roundLabel")).toHaveText(`${available} preguntas al azar de`);
  await page.locator("#go").click();
  await expect(page.locator("#track i")).toHaveCount(available);
});

test("las opciones se guardan: al volver a abrir el juego siguen marcadas", async ({ page }) => {
  await openSection(page);
  await page.locator("#openOptions").click();
  await page.locator('[id="time-10"]').click();
  await page.locator('[id="option-count-8"]').click();
  await page.locator("#doneOptions").click();
  await page.reload();
  await page.locator("#sec-geografia").click();
  await expect(page.locator("#optionCountInfo")).toHaveText("Dificultad: 8 opciones por pregunta, 10 segundos por pregunta.");
});
