import { describe, expect, it } from "vitest";
import { questionCountWarning, roundText } from "../../src/common/ui/common-widgets";
import { clockTime, cycleEndText, timeUsed } from "../../src/common/ui/common-labels";

// Textos que genera el código: se comprueban palabra por palabra.

describe("tiempo del simulacro", () => {
  it("en el reloj, como minutos y segundos, redondeando hacia arriba lo que queda", () => {
    expect(clockTime(45 * 60_000)).toBe("45:00");
    expect(clockTime(4 * 60_000 + 7_000)).toBe("4:07");
    expect(clockTime(1)).toBe("0:01");
    expect(clockTime(0)).toBe("0:00");
  });

  it("el tiempo usado, en palabras", () => {
    expect(timeUsed(45_000)).toBe("45 s");
    expect(timeUsed(2 * 60_000)).toBe("2 min");
    expect(timeUsed(23 * 60_000 + 10_000)).toBe("23 min 10 s");
    expect(timeUsed(59_600)).toBe("1 min"); // se redondea al segundo más cercano
  });
});

describe("inicio y Opciones de cada sección", () => {
  it("lo que se va a jugar: el número de preguntas, el elegido si aún no se sabe, o sin límite", () => {
    expect(roundText(10, 10)).toBe("10 preguntas al azar de");
    expect(roundText(10, 8)).toBe("8 preguntas al azar de"); // con 10, si hay menos, las que haya
    expect(roundText(25, 0)).toBe("25 preguntas al azar de");
    expect(roundText("sinLimite", 300)).toBe("Preguntas sin límite, al azar, de");
  });

  it("el aviso cuando ya no caben las preguntas elegidas", () => {
    expect(questionCountWarning(19)).toBe("Con esta selección hay 19 preguntas: elige menos preguntas por partida o «Sin límite».");
  });
});

describe("fin de una vuelta (partida sin límite)", () => {
  it("dice las preguntas de la vuelta, cómo va la partida y qué pasa si se sigue", () => {
    expect(cycleEndText(43, 62, 86, 5)).toBe(
      "Has respondido las 43 preguntas de esta selección. Llevas 62 aciertos de 86 y una racha de 5. " +
        "Si sigues, vuelven a salir en orden aleatorio, sin perder tus aciertos ni tu racha."
    );
  });

  it("un solo acierto, en singular; y sin racha, no la nombra", () => {
    expect(cycleEndText(8, 1, 8, 0)).toBe(
      "Has respondido las 8 preguntas de esta selección. Llevas 1 acierto de 8. " +
        "Si sigues, vuelven a salir en orden aleatorio, sin perder tus aciertos ni tu racha."
    );
  });
});
