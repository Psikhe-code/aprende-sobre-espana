import type { Page } from "@playwright/test";
import { test, expect } from "./helpers";
import type { Section } from "../src/common/engine/types";

// Cada sección tiene sus créditos: los bloques con data-section salen solo en los de esa sección,
// y los demás (las tipografías, el botón de volver), en todas.

async function abrirCreditos(page: Page, seccion: Section) {
  await page.locator(`#sec-${seccion}`).click();
  await page.locator(seccion === "ccse" ? "#ccseOpenCredits" : "#openCredits").click();
  await expect(page.locator("#credits")).toBeVisible();
}

async function comprobar(page: Page, seccion: Section) {
  for (const bloque of await page.locator("#credits [data-section]").all()) {
    if ((await bloque.getAttribute("data-section")) === seccion) await expect(bloque).toBeVisible();
    else await expect(bloque).toBeHidden();
  }
  for (const comun of await page.locator("#credits > :not([data-section])").all()) await expect(comun).toBeVisible();
}

async function volverAlMenu(page: Page, seccion: Section) {
  await page.locator("#closeCredits").click();
  await page.locator(seccion === "ccse" ? "#ccseToSections" : "#toSections").click();
}

test("cada sección enseña sus créditos y los comunes, y los del examen no descargan banderas", async ({ page }) => {
  const banderas: string[] = [];
  // Solo las imágenes de verdad: el servidor de los tests pide además cada «?import&url» (la dirección de cada
  // bandera, no la imagen), cosa que en el juego publicado no pasa.
  page.on("request", (r) => { if (r.resourceType() === "image" && /banderas\/.*\.svg/.test(r.url())) banderas.push(r.url()); });
  await page.goto("./");

  await abrirCreditos(page, "ccse");
  await comprobar(page, "ccse");
  await expect(page.locator("#credits img")).toHaveCount(0);
  expect(banderas, "banderas descargadas en los créditos del examen").toEqual([]);

  // Al cambiar de sección, no se quedan los bloques de la anterior.
  await volverAlMenu(page, "ccse");
  await abrirCreditos(page, "geografia");
  await comprobar(page, "geografia");
  expect(await page.locator("#credits img").count()).toBeGreaterThan(0);

  await volverAlMenu(page, "geografia");
  await abrirCreditos(page, "ccse");
  await comprobar(page, "ccse");
});
