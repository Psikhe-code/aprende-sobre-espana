import type { Page } from "@playwright/test";
import { test, expect } from "./helpers";
import type { Section } from "../src/common/engine/types";

// Cada sección tiene sus créditos: los bloques con data-section salen solo en los de esa sección,
// y los demás (las tipografías, el botón de volver), en todas.

async function openCredits(page: Page, section: Section) {
  await page.locator(`#sec-${section}`).click();
  await page.locator(section === "ccse" ? "#ccseOpenCredits" : "#openCredits").click();
  await expect(page.locator("#credits")).toBeVisible();
}

async function checkBlocks(page: Page, section: Section) {
  for (const block of await page.locator("#credits [data-section]").all()) {
    if ((await block.getAttribute("data-section")) === section) await expect(block).toBeVisible();
    else await expect(block).toBeHidden();
  }
  for (const commonBlock of await page.locator("#credits > :not([data-section])").all()) await expect(commonBlock).toBeVisible();
}

async function backToMenu(page: Page, section: Section) {
  await page.locator("#closeCredits").click();
  await page.locator(section === "ccse" ? "#ccseToSections" : "#toSections").click();
}

test("cada sección enseña sus créditos y los comunes, y los del examen no descargan banderas", async ({ page }) => {
  const banderas: string[] = [];
  // Solo las imágenes de verdad: el servidor de los tests pide además cada «?import&url» (la dirección de cada
  // bandera, no la imagen), cosa que en el juego publicado no pasa.
  page.on("request", (r) => { if (r.resourceType() === "image" && /banderas\/.*\.svg/.test(r.url())) banderas.push(r.url()); });
  await page.goto("./");

  await openCredits(page, "ccse");
  await checkBlocks(page, "ccse");
  await expect(page.locator("#credits img")).toHaveCount(0);
  expect(banderas, "banderas descargadas en los créditos del examen").toEqual([]);

  // Al cambiar de sección, no se quedan los bloques de la anterior.
  await backToMenu(page, "ccse");
  await openCredits(page, "geografia");
  await checkBlocks(page, "geografia");
  expect(await page.locator("#credits img").count()).toBeGreaterThan(0);

  await backToMenu(page, "geografia");
  await openCredits(page, "ccse");
  await checkBlocks(page, "ccse");
});
