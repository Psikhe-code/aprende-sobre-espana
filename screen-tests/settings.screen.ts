// La pantalla de Opciones: cómo se eligen, se anuncian y se guardan.

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

test("si la selección no llega a un número de preguntas, sale desactivado y lo dice", async ({ page }) => {
  await openSection(page);
  await page.locator("#openOptions").click();
  for (const id of ONLY_CAPITALES) await page.locator(`[id="${id}"]`).click();
  for (const n of [50, 100]) {
    await expect(page.locator(`[id="len-${n}"]`)).toBeDisabled();
    await expect(page.locator(`[id="len-${n}"] .cat-desc`)).toHaveText(/^Con esta selección hay \d+ preguntas\.$/);
  }
  await expect(page.locator('[id="len-sinLimite"]')).toBeEnabled();

  // Elegida una que cabe y quitado un territorio, ya no cabe: aviso y «Listo» desactivado.
  await page.locator('[id="len-25"]').click();
  await page.locator('[id="terr-comunidad"]').click();
  await expect(page.locator("#lengthWarn")).toBeVisible();
  await expect(page.locator("#doneOptions")).toBeDisabled();
  await page.locator('[id="len-10"]').click();
  await expect(page.locator("#lengthWarn")).toBeHidden();
  await expect(page.locator("#doneOptions")).toBeEnabled();
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
