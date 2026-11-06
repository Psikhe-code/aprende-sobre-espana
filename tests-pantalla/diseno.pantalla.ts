import { test, expect, abrir, opciones, responder, SOLO_BANDERAS, SOLO_CAPITALES } from "./ayuda";
import type { Page } from "@playwright/test";

/** Dónde acaba la última opción respecto al alto de la pantalla, sin bajar. */
async function ultimaOpcion(page: Page) {
  return page.evaluate(() => {
    const opts = document.querySelectorAll("#opts .opt");
    return { abajo: opts[opts.length - 1].getBoundingClientRect().bottom, alto: innerHeight, bajado: scrollY };
  });
}

for (const [tipo, quitar] of [["de texto", SOLO_CAPITALES], ["de bandera", SOLO_BANDERAS]] as const) {
  test(`en las preguntas ${tipo}, las opciones se ven enteras sin bajar`, async ({ page }) => {
    await abrir(page);
    await opciones(page, [...quitar, "tiempo-sinTiempo"]);
    await page.locator("#go").click();
    for (let i = 0; i < 10; i++) {
      // Cada pregunta empieza arriba del todo, aunque para leer la nota se haya bajado.
      const { abajo, alto, bajado } = await ultimaOpcion(page);
      expect(bajado, `pregunta ${i + 1}: empieza arriba`).toBe(0);
      expect(abajo, `pregunta ${i + 1}: la última opción cabe en la pantalla`).toBeLessThanOrEqual(alto);
      await page.locator("#opts .opt").first().click();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // baja, como para leer la nota
      if (i < 9) await page.locator("#next").click();
    }
  });
}

test("la cabecera grande solo está en inicio, Opciones y Créditos; en la partida y el resultado, la pequeña", async ({ page }) => {
  await abrir(page);
  await expect(page.locator(".lede")).toBeVisible();
  await page.locator("#go").click();
  await expect(page.locator(".lede")).toBeHidden();
  await expect(page.locator("h1")).toBeVisible();
  await responder(page, 10);
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator(".lede")).toBeHidden();
  await page.locator("#menu").click();
  await expect(page.locator(".lede")).toBeVisible();
});
