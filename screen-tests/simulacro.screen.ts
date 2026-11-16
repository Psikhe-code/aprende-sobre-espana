import { test, expect, openSection, useCcseData, setTabHidden } from "./helpers";
import { ccseTestData, ccseSimulacroTestData } from "../tests/ccse/ccse-test-data";
import { SIMULACRO_MINUTES, SIMULACRO_QUESTION_COUNT, SIMULACRO_DISTRIBUTION, SIMULACRO_APTO_HITS } from "../src/sections/ccse/engine/ccse-simulacro-rules";

// Simulacro de examen, con datos de prueba que tienen preguntas en las cinco tareas.
// Las reglas (reparto, aprobado) salen del motor, así que si cambian, los tests siguen valiendo.

/** Tarea que le toca a cada pregunta del simulacro, en orden: 1, 1, …, 2, 2, 2, 3… */
const TAREA_BY_POSITION = SIMULACRO_DISTRIBUTION.flatMap((r) => Array<number>(r.questionCount).fill(r.tarea));

test.beforeEach(async ({ page }) => {
  await useCcseData(page, ccseSimulacroTestData());
});

test("el inicio del examen ofrece el simulacro y explica cómo es", async ({ page }) => {
  await openSection(page, "ccse");
  await expect(page.locator("#simSummary")).toBeVisible();
  await expect(page.locator("#simInfo")).toContainText(`${SIMULACRO_QUESTION_COUNT} preguntas`);
  await expect(page.locator("#simInfo")).toContainText(`${SIMULACRO_MINUTES} minutos`);
  await expect(page.locator("#simInfo")).toContainText(`apto con ${SIMULACRO_APTO_HITS} aciertos`);
  await expect(page.locator("#simRecord")).toHaveText("Aún no has hecho ningún simulacro.");
});

test("sin preguntas de sobra en cada tarea, no se ofrece el simulacro", async ({ page }) => {
  // Los datos de prueba normales solo tienen preguntas en las tareas 1 y 2.
  await useCcseData(page, ccseTestData());
  await openSection(page, "ccse");
  await expect(page.locator("#ccseGo")).toBeVisible();
  await expect(page.locator("#simSummary")).toBeHidden();
});

test("en el simulacro no se dice si se acierta: se elige, se cambia, se va y se vuelve", async ({ page }) => {
  await openSection(page, "ccse");
  await page.locator("#simGo").click();
  await expect(page.locator("#sim")).toBeVisible();
  await expect(page.locator("#simSheet")).toHaveText(`Pregunta 01 / ${SIMULACRO_QUESTION_COUNT}`);
  await expect(page.locator("#simTimerText")).toHaveText(`${SIMULACRO_MINUTES}:00`);
  await expect(page.locator("#simMap button")).toHaveCount(SIMULACRO_QUESTION_COUNT);
  await expect(page.locator("#simPrev")).toBeDisabled();

  // Elegir marca la opción, pero no dice si es correcta ni enseña la nota.
  const options = page.locator("#simOpts .opt");
  await options.nth(0).click();
  await expect(options.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#simOpts .right, #simOpts .wrong")).toHaveCount(0);
  await expect(page.locator("#sim .explanation:visible")).toHaveCount(0);
  await expect(page.locator("#sim-n-1")).toHaveClass(/answered/);
  await expect(page.locator("#simAnswered")).toHaveText(`1/${SIMULACRO_QUESTION_COUNT}`);

  // Se puede cambiar.
  await options.nth(1).click();
  await expect(options.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(options.nth(1)).toHaveAttribute("aria-pressed", "true");

  // Las preguntas salen por tareas, como en el examen real.
  for (let i = 0; i < SIMULACRO_QUESTION_COUNT; i++) {
    await expect(page.locator("#simCat")).toHaveText(new RegExp(`^Tarea ${TAREA_BY_POSITION[i]} · `));
    if (i < SIMULACRO_QUESTION_COUNT - 1) await page.locator("#simNext").click();
  }
  // En la última no hay «Siguiente»; con el mapa se vuelve a cualquiera, y la respuesta sigue ahí.
  await expect(page.locator("#simNext")).toBeHidden();
  await page.locator("#sim-n-1").click();
  await expect(page.locator("#simSheet")).toHaveText(`Pregunta 01 / ${SIMULACRO_QUESTION_COUNT}`);
  await expect(page.locator("#sim-n-1")).toHaveAttribute("aria-current", "true");
  await expect(options.nth(1)).toHaveAttribute("aria-pressed", "true");

  // Con teclado: números para elegir y flechas para moverse.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#simSheet")).toHaveText(`Pregunta 02 / ${SIMULACRO_QUESTION_COUNT}`);
  await page.keyboard.press("1");
  await expect(options.nth(0)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#simSheet")).toHaveText(`Pregunta 01 / ${SIMULACRO_QUESTION_COUNT}`);
});

test("al entregar se avisa de las que faltan; el resultado dice apto o no apto y enseña los fallos con su nota", async ({ page }) => {
  await openSection(page, "ccse");
  await page.locator("#simGo").click();
  // Se responden todas menos las dos últimas, siempre con la primera opción.
  for (let i = 0; i < SIMULACRO_QUESTION_COUNT - 2; i++) {
    await page.locator("#simOpts .opt").first().click();
    await page.locator("#simNext").click();
  }
  await page.locator("#simSubmit").click();
  await expect(page.locator("#simConfirm")).toBeVisible();
  await expect(page.locator("#simConfirmText")).toContainText("Te quedan 2 preguntas sin responder");
  // Es un cuadro de aviso con su texto como nombre: el lector de pantalla lo lee al pasar el foco a sus botones.
  await expect(page.getByRole("alertdialog")).toHaveAccessibleName(/Te quedan 2 preguntas sin responder/);
  await expect(page.locator("#simConfirmNo")).toBeFocused();
  // Se puede seguir con el examen…
  await page.locator("#simConfirmNo").click();
  await expect(page.locator("#simConfirm")).toBeHidden();
  await expect(page.locator("#sim")).toBeVisible();
  // …o entregar igualmente.
  await page.locator("#simSubmit").click();
  await page.locator("#simConfirmYes").click();

  await expect(page.locator("#simEnd")).toBeVisible();
  const score = await page.locator("#simScore").innerText();
  const [hits, total] = score.split("/").map(Number);
  expect(total).toBe(SIMULACRO_QUESTION_COUNT);
  await expect(page.locator("#simTitle")).toHaveText(hits >= SIMULACRO_APTO_HITS ? "Apto" : "No apto");
  await expect(page.locator("#simByTarea .chip")).toHaveCount(SIMULACRO_DISTRIBUTION.length);

  // Los fallos: cada uno con la respuesta correcta, lo que se dijo (o «sin responder») y, si la tiene, la nota con sus fuentes.
  const misses = page.locator("#simMisses .miss");
  await expect(misses).toHaveCount(total - hits);
  await expect(page.locator("#simMisses .miss-a", { hasText: "sin responder" })).toHaveCount(2);
  for (const f of await misses.all()) {
    await expect(f.locator(".miss-a")).toContainText("Respuesta: ");
    if (await f.locator(".explanation").count()) {
      await expect(f.locator(".explanation")).toHaveText(/^Nota de prueba \d+$/);
      await expect(f.locator(".source a")).toHaveAttribute("href", /^https:\/\//);
    }
  }

  // Repasar fallos: una partida normal con esas preguntas, que ya enseña la nota al responder.
  await page.locator("#simReview").click();
  await expect(page.locator("#play")).toBeVisible();
  await expect(page.locator("#qcat")).toHaveText(/^Repaso · Tarea \d · /);
  await expect(page.locator("#sheet")).toHaveText(new RegExp(`/ ${String(total - hits).padStart(2, "0")}$`));

  // El mejor resultado sale en el inicio.
  await page.locator("#quit").click();
  await expect(page.locator("#simRecord")).toHaveText(`Mejor resultado: ${hits}/${SIMULACRO_QUESTION_COUNT}`);
});

test("salir del simulacro pide confirmación y lo da por perdido", async ({ page }) => {
  await openSection(page, "ccse");
  await page.locator("#simGo").click();
  await page.locator("#simOpts .opt").first().click();
  await page.locator("#simLeave").click();
  await expect(page.locator("#simConfirmText")).toHaveText("Si sales ahora, se pierde este simulacro.");
  await page.keyboard.press("Escape");
  await expect(page.locator("#simConfirm")).toBeHidden();
  await page.locator("#simLeave").click();
  await page.locator("#simConfirmYes").click();
  await expect(page.locator("#ccseStart")).toBeVisible();
  await expect(page.locator("#simRecord")).toHaveText("Aún no has hecho ningún simulacro.");
  // Uno nuevo empieza de cero.
  await page.locator("#simGo").click();
  await expect(page.locator("#simAnswered")).toHaveText(`0/${SIMULACRO_QUESTION_COUNT}`);
});

test("el reloj marca los 45 minutos de todo el examen, se para con la pestaña oculta y al acabarse se entrega solo", async ({ page }) => {
  await page.clock.install();
  await openSection(page, "ccse");
  await page.locator("#simGo").click();
  await expect(page.locator("#simTimerText")).toHaveText(`${SIMULACRO_MINUTES}:00`);
  await page.clock.runFor(61_000);
  await expect(page.locator("#simTimerText")).toHaveText(`${SIMULACRO_MINUTES - 2}:59`);

  // Con la pestaña oculta, no corre.
  await setTabHidden(page, true);
  await page.clock.runFor(10 * 60_000);
  await setTabHidden(page, false);
  await page.clock.runFor(500);
  await expect(page.locator("#simTimerText")).toHaveText(`${SIMULACRO_MINUTES - 2}:59`);

  // Cambiar de pregunta no lo reinicia; en los últimos 5 minutos se pone en rojo.
  await page.locator("#simNext").click();
  await page.clock.runFor((SIMULACRO_MINUTES - 6) * 60_000);
  await expect(page.locator("#simTimer")).toHaveClass(/urgent/);

  // Al acabarse, se entrega con lo que haya.
  await page.clock.runFor(5 * 60_000);
  await expect(page.locator("#simEnd")).toBeVisible();
  await expect(page.locator("#simSub")).toContainText("Se acabó el tiempo");
  await expect(page.locator("#simScore")).toHaveText(`0/${SIMULACRO_QUESTION_COUNT}`);
  await expect(page.locator("#simTitle")).toHaveText("No apto");
});
