// Tests de pantalla: abren el juego en un navegador de verdad (Chromium), en móvil y en escritorio,
// y lo juegan como lo haría una persona. Se ejecutan con `npm run test:pantalla` y en cada PR.
import { defineConfig, devices } from "@playwright/test";

// Este archivo lo lee Node (no el navegador): `process.env.CI` dice si se ejecuta en GitHub.
declare const process: { env: Record<string, string | undefined> };

const PUERTO = 5174;

export default defineConfig({
  testDir: "tests-pantalla",
  testMatch: "*.pantalla.ts",
  fullyParallel: true,
  // En GitHub: que no se cuele un test marcado con «only», y un reintento por si el ordenador va lento.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PUERTO}/`,
    // Si un test falla, se guardan una captura y la grabación paso a paso, para ver qué pasó.
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "movil", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }
  ],
  // Arranca el juego (la versión de desarrollo, sin modo sin conexión) antes de los tests.
  webServer: {
    command: `npx vite --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}/`,
    reuseExistingServer: !process.env.CI
  }
});
