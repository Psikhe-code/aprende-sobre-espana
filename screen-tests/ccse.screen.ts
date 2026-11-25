/**
 * @fileoverview El examen de nacionalidad en pantalla: el menú de secciones, el inicio de la sección, Opciones y las partidas.
 */

import { test, expect, openSection, useCcseData } from "./helpers";
import { ccseTestData, ccseEmptyTestData } from "../tests/ccse/ccse-test-data";
import { UPCOMING_SECTIONS } from "../src/sections/upcoming";

// Las partidas y Opciones se prueban con datos de prueba, porque la plantilla real se va
// rellenando poco a poco (y al principio está vacía).

test("al abrir el juego sale siempre el menú de secciones, y desde cada sección se vuelve arriba del todo", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#sections")).toBeVisible();
  await expect(page.locator("#go")).toBeHidden();
  await page.locator("#sec-ccse").click();
  await expect(page.locator("#ccseStart")).toBeVisible();
  // Al recargar, otra vez el menú, aunque se estuviera en una sección.
  await page.reload();
  await expect(page.locator("#sections")).toBeVisible();

  // El botón de volver es lo primero del inicio de cada sección, y lleva al menú.
  for (const [section, startId, backId] of [["ccse", "#ccseStart", "#ccseToSections"], ["geografia", "#start", "#toSections"]]) {
    await page.locator(`#sec-${section}`).click();
    await expect(page.locator(`${startId} > :first-child`)).toHaveId(backId.slice(1));
    await expect(page.locator(backId)).toHaveText("← Todas las secciones");
    await expect(page.locator(backId)).toBeInViewport();
    await page.locator(backId).click();
    await expect(page.locator("#sections")).toBeVisible();
  }
});

test("el menú tiene una tarjeta por sección, y después las que vendrán como «Próximamente», sin poder elegirse", async ({ page }) => {
  await page.goto("./");
  const cards = page.locator("#sectionList > button");
  // Primero, las que se juegan (las dos de hoy, como mínimo), sin «Próximamente».
  const playable = (await cards.count()) - UPCOMING_SECTIONS.length;
  expect(playable).toBeGreaterThanOrEqual(2);
  await expect(cards.nth(0)).toHaveId("sec-geografia");
  await expect(cards.nth(1)).toHaveId("sec-ccse");
  for (let i = 0; i < playable; i++) {
    await expect(cards.nth(i)).toBeEnabled();
    await expect(cards.nth(i)).not.toContainText("Próximamente");
  }
  // Después, las que vendrán, en su orden.
  for (const [i, s] of UPCOMING_SECTIONS.entries()) {
    const card = cards.nth(playable + i);
    await expect(card).toHaveId(`sec-${s.id}`);
    await expect(card).toContainText(s.name);
    await expect(card).toContainText("Próximamente");
    await expect(card).toBeDisabled();
    // Aunque se intente pulsar, no lleva a ningún sitio.
    await card.click({ force: true });
    await expect(page.locator("#sections")).toBeVisible();
  }
});

test("si la página se recarga para aplicar una versión nueva, el juego sigue en la misma sección", async ({ page }) => {
  await openSection(page, "ccse");
  // Lo que hace main.ts justo antes de recargar por una actualización.
  await page.evaluate(() => sessionStorage.setItem("aprende-sobre-espana:recarga-por-actualizacion", "1"));
  await page.reload();
  await expect(page.locator("#ccseStart")).toBeVisible();
  // Solo esa vez: la siguiente recarga vuelve al menú.
  await page.reload();
  await expect(page.locator("#sections")).toBeVisible();
});

test("la versión sale al pie del menú de secciones y del inicio de cada sección, y en ningún otro sitio", async ({ page }) => {
  await page.goto("./");
  const version = page.locator("#version");
  await expect(version).toBeVisible();
  await expect(version).toContainText(/^Versión \d+\.\d+\.\d+ · /);
  await page.locator("#sec-ccse").click();
  await expect(version).toBeVisible();
  await page.locator("#ccseOpenOptions").click();
  await expect(version).toBeHidden();
  await page.locator("#ccseDone").click();
  await page.locator("#ccseToSections").click();
  await page.locator("#sec-geografia").click();
  await expect(version).toBeVisible();
  await page.locator("#openCredits").click();
  await expect(version).toBeHidden();
  await page.locator("#closeCredits").click();
  await page.locator("#go").click();
  await expect(page.locator("#sheet")).toBeVisible();
  await expect(version).toBeHidden();
});

test("el inicio del examen dice de dónde salen las preguntas y enlaza a la prueba", async ({ page }) => {
  await openSection(page, "ccse");
  await expect(page.locator("#ccseNotice")).toContainText("Manual CCSE 2026 del Instituto Cervantes");
  await expect(page.locator('#ccseNotice a[href^="https://cervantes.org/"]')).toHaveAttribute("target", "_blank");
  await expect(page.locator("#lede")).toContainText("prueba CCSE");
});

test("una partida del examen: opciones, nota con fuentes, resultado y récord aparte del de geografía", async ({ page }) => {
  await useCcseData(page, ccseTestData());
  await openSection(page, "ccse");
  await page.locator("#ccseGo").click();
  await expect(page.locator("#sheet")).toHaveText("Hoja 01 / 10");
  await expect(page.locator("#qcat")).toHaveText(/^Tarea \d · .+/);

  // Cada pregunta: si tiene nota, sale con sus fuentes; si aún no la tiene, no sale ni nota ni fuentes.
  let withExplanation = 0;
  for (let i = 0; i < 10; i++) {
    await expect(page.locator("#opts .opt").first()).toBeVisible();
    const n = await page.locator("#opts .opt").count();
    expect([2, 3]).toContain(n);
    await page.locator("#opts .opt").first().click();
    await expect(page.locator("#feedback")).toBeVisible();
    if (await page.locator("#explanation").isVisible()) {
      withExplanation++;
      await expect(page.locator("#explanation")).toHaveText(/^Nota de prueba \d+$/);
      await expect(page.locator("#source a").first()).toHaveAttribute("href", /^https:\/\//);
    } else {
      await expect(page.locator("#source")).toBeHidden();
    }
    await page.locator("#next").click();
  }
  expect(withExplanation).toBeGreaterThan(0);

  await expect(page.locator("#score")).toHaveText(/^\d+\/10$/);
  await expect(page.locator("#endTitle")).toHaveText(/^(Pleno|Gran nivel|Por encima del aprobado|Toca repasar)$/);
  await page.locator("#menu").click();
  await expect(page.locator("#ccseRecord")).toContainText("Récord con esta selección:");

  // El récord del examen no cuenta para geografía.
  await page.locator("#ccseToSections").click();
  await page.locator("#sec-geografia").click();
  await expect(page.locator("#record")).toHaveText("Aún no has jugado con esta selección.");
});

test("Opciones del examen: las tareas sin preguntas salen como «próximamente» y no se pueden marcar", async ({ page }) => {
  await useCcseData(page, ccseTestData());
  await openSection(page, "ccse");
  await page.locator("#ccseOpenOptions").click();
  const tareas = page.locator("#ccseTareas .cat");
  await expect(tareas).toHaveCount(5);
  // En los datos de prueba, solo las tareas 1 y 2 tienen preguntas.
  for (let i = 0; i < 5; i++) {
    const card = tareas.nth(i);
    if (i < 2) {
      await expect(card).toBeEnabled();
      await expect(card.locator(".cat-count")).not.toHaveText("Próximamente");
    } else {
      await expect(card).toBeDisabled();
      await expect(card.locator(".cat-count")).toHaveText("Próximamente");
    }
  }
  // Sin ninguna tarea marcada no se puede jugar.
  for (const card of await tareas.all()) {
    if ((await card.getAttribute("aria-pressed")) === "true") await card.click();
  }
  await expect(page.locator("#ccseNoneWarn")).toBeVisible();
  await expect(page.locator("#ccseDone")).toBeDisabled();
});

test("mientras no hay ninguna pregunta rellena, el inicio del examen lo dice y no deja jugar", async ({ page }) => {
  await useCcseData(page, ccseEmptyTestData());
  await page.goto("./");
  await page.locator("#sec-ccse").click();
  await expect(page.locator("#ccseEmpty")).toBeVisible();
  await expect(page.locator("#ccseGo")).toBeHidden();
  await expect(page.locator("#ccseOpenOptions")).toBeHidden();
  await expect(page.locator("#ccseNotice")).toBeVisible();
  // Se puede seguir cambiando de sección.
  await page.locator("#ccseToSections").click();
  await expect(page.locator("#sections")).toBeVisible();
});
