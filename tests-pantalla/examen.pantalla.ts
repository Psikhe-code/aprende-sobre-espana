import { test, expect, abrir, responder } from "./ayuda";

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

test("el inicio del examen avisa de que las preguntas no son las oficiales y enlaza a la prueba", async ({ page }) => {
  await abrir(page, "ccse");
  await expect(page.locator("#ccseAviso")).toContainText("no son las preguntas oficiales");
  await expect(page.locator('#ccseAviso a[href^="https://cervantes.org/"]')).toHaveAttribute("target", "_blank");
  await expect(page.locator("#lede")).toContainText("prueba CCSE");
});

test("una partida del examen: opciones, nota con fuentes, resultado y récord aparte del de geografía", async ({ page }) => {
  await abrir(page, "ccse");
  await page.locator("#ccseGo").click();
  await expect(page.locator("#sheet")).toHaveText("Hoja 01 / 10");
  await expect(page.locator("#qcat")).toHaveText(/^Tarea \d · .+/);
  await expect(page.locator("#opts .opt")).toHaveCount(3);

  await page.locator("#opts .opt").first().click();
  await expect(page.locator("#why")).not.toBeEmpty();
  await expect(page.locator("#source")).toBeVisible();
  await expect(page.locator("#source a").first()).toHaveAttribute("href", /^https:\/\//);
  await page.locator("#next").click();
  await responder(page, 9);

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
  await abrir(page, "ccse");
  await page.locator("#ccseOpenOptions").click();
  const tareas = page.locator("#ccseTareas .cat");
  await expect(tareas).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const tarjeta = tareas.nth(i);
    const proxima = (await tarjeta.locator(".cat-count").innerText()) === "Próximamente";
    if (proxima) await expect(tarjeta).toBeDisabled();
    else await expect(tarjeta).toBeEnabled();
  }
  // Sin ninguna tarea marcada no se puede jugar.
  for (const tarjeta of await tareas.all()) {
    if ((await tarjeta.getAttribute("aria-pressed")) === "true") await tarjeta.click();
  }
  await expect(page.locator("#ccseNoneWarn")).toBeVisible();
  await expect(page.locator("#ccseDone")).toBeDisabled();
});
