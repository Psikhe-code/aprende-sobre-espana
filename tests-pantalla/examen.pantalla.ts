import { test, expect, abrir, preguntasCcse } from "./ayuda";
import { ccsePrueba, ccseVacio } from "../tests/ccse-prueba";

// Las partidas y Opciones se prueban con datos de prueba, porque la plantilla real se va
// rellenando poco a poco (y al principio está vacía).

test("la primera vez se elige sección, y el juego vuelve a la última elegida", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#sections")).toBeVisible();
  await expect(page.locator("#go")).toBeHidden();
  await page.locator("#sec-ccse").click();
  await expect(page.locator("#ccseStart")).toBeVisible();
  await page.reload();
  await expect(page.locator("#ccseStart")).toBeVisible();

  // Cambiar de sección lleva a la pantalla de secciones.
  await page.locator("#ccseToSections").click();
  await page.locator("#sec-geografia").click();
  await expect(page.locator("#start")).toBeVisible();
  await page.reload();
  await expect(page.locator("#start")).toBeVisible();
});

test("el inicio del examen dice de dónde salen las preguntas y enlaza a la prueba", async ({ page }) => {
  await abrir(page, "ccse");
  await expect(page.locator("#ccseAviso")).toContainText("Manual CCSE 2026 del Instituto Cervantes");
  await expect(page.locator('#ccseAviso a[href^="https://cervantes.org/"]')).toHaveAttribute("target", "_blank");
  await expect(page.locator("#lede")).toContainText("prueba CCSE");
});

test("una partida del examen: opciones, nota con fuentes, resultado y récord aparte del de geografía", async ({ page }) => {
  await preguntasCcse(page, ccsePrueba());
  await abrir(page, "ccse");
  await page.locator("#ccseGo").click();
  await expect(page.locator("#sheet")).toHaveText("Hoja 01 / 10");
  await expect(page.locator("#qcat")).toHaveText(/^Tarea \d · .+/);

  // Cada pregunta: si tiene nota, sale con sus fuentes; si aún no la tiene, no sale ni nota ni fuentes.
  let conNota = 0;
  for (let i = 0; i < 10; i++) {
    await expect(page.locator("#opts .opt").first()).toBeVisible();
    const n = await page.locator("#opts .opt").count();
    expect([2, 3]).toContain(n);
    await page.locator("#opts .opt").first().click();
    await expect(page.locator("#feedback")).toBeVisible();
    if (await page.locator("#why").isVisible()) {
      conNota++;
      await expect(page.locator("#why")).toHaveText(/^Nota de prueba \d+$/);
      await expect(page.locator("#source a").first()).toHaveAttribute("href", /^https:\/\//);
    } else {
      await expect(page.locator("#source")).toBeHidden();
    }
    await page.locator("#next").click();
  }
  expect(conNota).toBeGreaterThan(0);

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
  await preguntasCcse(page, ccsePrueba());
  await abrir(page, "ccse");
  await page.locator("#ccseOpenOptions").click();
  const tareas = page.locator("#ccseTareas .cat");
  await expect(tareas).toHaveCount(5);
  // En los datos de prueba, solo las tareas 1 y 2 tienen preguntas.
  for (let i = 0; i < 5; i++) {
    const tarjeta = tareas.nth(i);
    if (i < 2) {
      await expect(tarjeta).toBeEnabled();
      await expect(tarjeta.locator(".cat-count")).not.toHaveText("Próximamente");
    } else {
      await expect(tarjeta).toBeDisabled();
      await expect(tarjeta.locator(".cat-count")).toHaveText("Próximamente");
    }
  }
  // Sin ninguna tarea marcada no se puede jugar.
  for (const tarjeta of await tareas.all()) {
    if ((await tarjeta.getAttribute("aria-pressed")) === "true") await tarjeta.click();
  }
  await expect(page.locator("#ccseNoneWarn")).toBeVisible();
  await expect(page.locator("#ccseDone")).toBeDisabled();
});

test("mientras no hay ninguna pregunta rellena, el inicio del examen lo dice y no deja jugar", async ({ page }) => {
  await preguntasCcse(page, ccseVacio());
  await page.goto("./");
  await page.locator("#sec-ccse").click();
  await expect(page.locator("#ccseVacio")).toBeVisible();
  await expect(page.locator("#ccseGo")).toBeHidden();
  await expect(page.locator("#ccseOpenOptions")).toBeHidden();
  await expect(page.locator("#ccseAviso")).toBeVisible();
  // Se puede seguir cambiando de sección.
  await page.locator("#ccseToSections").click();
  await expect(page.locator("#sections")).toBeVisible();
});
