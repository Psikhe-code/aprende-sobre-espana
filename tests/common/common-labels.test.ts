import { describe, expect, it } from "vitest";
import { roundLengthWarning, roundText } from "../../src/common/ui/common-widgets";
import { clockTime, timeUsed } from "../../src/common/ui/common-labels";

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
    expect(roundLengthWarning(19)).toBe("Con esta selección hay 19 preguntas: elige menos preguntas por partida o «Sin límite».");
  });
});

