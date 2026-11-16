// La partida sin límite: fin de la baraja, barajar y seguir, terminar y récord de racha.

import { test, expect, openSection, changeSettings, answerQuestions, ONLY_CAPITALES } from "./helpers";

test("partida sin límite: fin de la baraja, barajar y seguir, terminar y récord de racha", async ({ page }) => {
  await openSection(page);
  // Solo capitales de provincia: pocas preguntas, para llegar pronto al fin de la baraja.
  await changeSettings(page, [...ONLY_CAPITALES, "terr-comunidad", "len-sinLimite", "time-sinTiempo"]);
  await expect(page.locator("#roundLabel")).toHaveText("Preguntas sin límite, al azar, de");
  await page.locator("#go").click();
  await expect(page.locator("#track")).toBeHidden();
  await expect(page.locator("#stop")).toBeVisible();
  await expect(page.locator("#sheet")).toHaveText("Hoja 01");

  // Hasta acabar la baraja: tantas como preguntas hay (la tarjeta lo dice).
  let n = 0;
  while (await page.locator("#deckEnd").isHidden()) {
    await answerQuestions(page, 1);
    n++;
    expect(n, "la baraja se acaba").toBeLessThan(100);
  }
  await expect(page.locator("#deckEndText")).toContainText(`Ya han salido las ${n} preguntas de esta selección`);
  await expect(page.locator("#stop")).toBeHidden(); // la tarjeta ya tiene su «Terminar»
  // El aviso para el lector de pantalla está fuera de la tarjeta de la pregunta, que ahora se esconde: así se lee.
  await expect(page.locator("#announce")).toHaveText("Has respondido todas las preguntas.");
  await expect(page.locator("#announce")).toBeVisible();

  await page.locator("#reshuffle").click();
  await expect(page.locator("#sheet")).toHaveText(`Hoja ${String(n + 1).padStart(2, "0")}`);
  await answerQuestions(page, 1);
  await page.locator("#stop").click();

  await expect(page.locator("#score")).toHaveText(new RegExp(`^\\d+/${n + 1}$`));
  await expect(page.locator("#endSub")).toContainText("Partida sin límite");
  await page.locator("#menu").click();
  await expect(page.locator("#record")).toContainText("Mejor racha con esta selección:");
});
