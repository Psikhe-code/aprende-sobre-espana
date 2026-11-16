/**
 * @fileoverview Que las preguntas y sus opciones se ven sin bajar, y qué cabecera sale en cada pantalla.
 */

import { test, expect, openSection, changeSettings, answerQuestions, ONLY_BANDERAS, ONLY_CAPITALES } from "./helpers";
import type { Page } from "@playwright/test";

/** Dónde acaba la última opción respecto al alto de la pantalla, sin bajar. */
async function lastOption(page: Page) {
  return page.evaluate(() => {
    const opts = document.querySelectorAll("#opts .opt");
    return { abajo: opts[opts.length - 1].getBoundingClientRect().bottom, alto: innerHeight, bajado: scrollY };
  });
}

for (const [kind, uncheck] of [["de texto", ONLY_CAPITALES], ["de bandera", ONLY_BANDERAS]] as const) {
  test(`en las preguntas ${kind}, las opciones se ven enteras sin bajar`, async ({ page }) => {
    await openSection(page);
    await changeSettings(page, [...uncheck, "time-sinTiempo"]);
    await page.locator("#go").click();
    for (let i = 0; i < 10; i++) {
      // Cada pregunta empieza arriba del todo, aunque para leer la nota se haya bajado.
      const { abajo: bottom, alto: height, bajado: scrolled } = await lastOption(page);
      expect(scrolled, `pregunta ${i + 1}: empieza arriba`).toBe(0);
      expect(bottom, `pregunta ${i + 1}: la última opción cabe en la pantalla`).toBeLessThanOrEqual(height);
      await page.locator("#opts .opt").first().click();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // baja, como para leer la nota
      if (i < 9) await page.locator("#next").click();
    }
  });
}

test("la cabecera grande solo está en inicio, Opciones y Créditos; en la partida y el resultado, la pequeña", async ({ page }) => {
  await openSection(page);
  await expect(page.locator(".lede")).toBeVisible();
  await page.locator("#go").click();
  await expect(page.locator(".lede")).toBeHidden();
  await expect(page.locator("h1")).toBeVisible();
  await answerQuestions(page, 10);
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator(".lede")).toBeHidden();
  await page.locator("#menu").click();
  await expect(page.locator(".lede")).toBeVisible();
});
