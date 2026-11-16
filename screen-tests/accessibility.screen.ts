import { test, expect, abrir, opciones, responder, SOLO_BANDERAS } from "./helpers";

// Lo que necesita quien juega con teclado, con lector de pantalla (programa que lee la pantalla en voz alta)
// o con el dedo en el móvil. Lo propio de la partida (atajos, foco en cada pregunta) está en round.screen.ts.

test("al cambiar de pantalla con el teclado, el foco pasa a la pantalla nueva", async ({ page, isMobile }) => {
  test.skip(isMobile, "con teclado, solo en escritorio");
  await page.goto("./");
  await expect(page.locator("#sections")).toBeVisible();
  await page.locator("#sec-geografia").focus();
  await page.keyboard.press("Enter");
  // La pantalla recibe el foco (el lector dice su nombre), y el tabulador sigue por su primer botón.
  await expect(page.locator("#start")).toBeFocused();
  await expect(page.locator("#start")).toHaveAccessibleName("Geografía");
  await page.keyboard.press("Tab");
  await expect(page.locator("#toSections")).toBeFocused();

  await page.locator("#openOptions").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#settings")).toBeFocused();
  await page.locator("#doneOptions").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#start")).toBeFocused();
});

test("cada pantalla tiene nombre, y los títulos de cada grupo son títulos de verdad", async ({ page }) => {
  await page.goto("./");
  for (const pantalla of await page.locator(".screen").all()) {
    expect(await pantalla.getAttribute("aria-label"), await pantalla.getAttribute("id") ?? "").toBeTruthy();
  }
  // Todos los títulos de grupo (.label) son h2, salvo «10 preguntas al azar de…», que empieza una frase.
  const label = await page.locator(".label").evaluateAll((els) => els.map((e) => [e.id, e.tagName]));
  for (const [id, etiqueta] of label) {
    expect(etiqueta, id).toBe(["roundLabel", "ccseRoundLabel"].includes(id) ? "DIV" : "H2");
  }
  await abrir(page);
  await page.locator("#openOptions").click();
  await expect(page.getByRole("heading", { name: "Opciones · Categorías" })).toBeVisible();
});

test("las tarjetas sin marcar se leen igual de bien: sin transparencia", async ({ page }) => {
  await abrir(page);
  await page.locator("#openOptions").click();
  await page.locator("#cat-banderas").click();
  await expect(page.locator("#cat-banderas")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#cat-banderas")).toHaveCSS("opacity", "1");
});

test("los botones pequeños miden al menos 44 px de alto, para pulsarlos con el dedo", async ({ page }) => {
  await abrir(page);
  for (const id of ["toSections", "openCredits"]) {
    const caja = await page.locator(`#${id}`).boundingBox();
    expect(caja!.height, id).toBeGreaterThanOrEqual(44);
  }
});

test("los atajos de teclado solo se explican donde hay teclado", async ({ page, isMobile }) => {
  await abrir(page);
  const atajos = page.locator("#start .shortcuts");
  if (isMobile) await expect(atajos).toBeHidden();
  else await expect(atajos).toBeVisible();
});

test("texto alternativo de las banderas: neutro en la pregunta, con el nombre en los fallos, vacío en Créditos", async ({ page }) => {
  await abrir(page);
  await opciones(page, SOLO_BANDERAS);
  await page.locator("#go").click();
  // En la pregunta no puede delatar la respuesta.
  await expect(page.locator("#flag img")).toHaveAttribute("alt", /^Bandera de una (provincia|comunidad o ciudad autónoma)$/);
  await page.locator("#quit").click();

  // En los fallos ya se sabe de quién es: el texto alternativo lo dice (la respuesta, tal como sale escrita).
  await page.locator("#go").click();
  await responder(page, 9);
  await page.locator("#opts .opt").first().click();
  await page.locator("#next").click();
  for (const fallo of await page.locator("#misses .miss").all()) {
    const respuesta = await fallo.locator(".miss-a b").textContent();
    await expect(fallo.locator("img")).toHaveAttribute("alt", `Bandera: ${respuesta}`);
  }

  // En Créditos el nombre está escrito al lado: el texto alternativo va vacío, para no leerlo dos veces.
  await page.locator("#menu").click();
  await page.locator("#openCredits").click();
  const alts = await page.locator("#credits img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("alt")));
  expect(alts.length).toBeGreaterThan(0);
  expect(new Set(alts)).toEqual(new Set([""]));
});
