/**
 * @fileoverview Lo que se ve al abrir el juego, antes de que cargue el código (en un móvil lento puede tardar un poco).
 */

import { test, expect } from "./helpers";

test.describe("antes de que cargue el código", () => {
  test.use({ javaScriptEnabled: false });

  test("no se ve ninguna pantalla a medias: todas empiezan escondidas", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".screen:visible")).toHaveCount(0);
  });
});
