import { test, expect, abrir, opciones, responder, SOLO_CAPITALES } from "./ayuda";

test("partida sin límite: fin de la baraja, barajar y seguir, terminar y récord de racha", async ({ page }) => {
  await abrir(page);
  // Solo capitales de provincia: pocas preguntas, para llegar pronto al fin de la baraja.
  await opciones(page, [...SOLO_CAPITALES, "terr-comunidad", "len-sinLimite", "tiempo-sinTiempo"]);
  await expect(page.locator("#roundLabel")).toHaveText("Preguntas sin límite, al azar, de");
  await page.locator("#go").click();
  await expect(page.locator("#track")).toBeHidden();
  await expect(page.locator("#stop")).toBeVisible();
  await expect(page.locator("#sheet")).toHaveText("Hoja 01");

  // Hasta acabar la baraja: tantas como preguntas hay (la tarjeta lo dice).
  let n = 0;
  while (await page.locator("#deckEnd").isHidden()) {
    await responder(page, 1);
    n++;
    expect(n, "la baraja se acaba").toBeLessThan(100);
  }
  await expect(page.locator("#deckEndText")).toContainText(`Ya han salido las ${n} preguntas de esta selección`);
  await expect(page.locator("#stop")).toBeHidden(); // la tarjeta ya tiene su «Terminar»

  await page.locator("#reshuffle").click();
  await expect(page.locator("#sheet")).toHaveText(`Hoja ${String(n + 1).padStart(2, "0")}`);
  await responder(page, 1);
  await page.locator("#stop").click();

  await expect(page.locator("#score")).toHaveText(new RegExp(`^\\d+/${n + 1}$`));
  await expect(page.locator("#endSub")).toContainText("Partida sin límite");
  await page.locator("#menu").click();
  await expect(page.locator("#record")).toContainText("Mejor racha con esta selección:");
});
