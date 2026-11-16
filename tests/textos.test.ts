import { describe, expect, it } from "vitest";
import { minutos, usado } from "../src/ui/labels";

// Textos que genera el código: se comprueban palabra por palabra.

describe("tiempo del simulacro", () => {
  it("en el reloj, como minutos y segundos, redondeando hacia arriba lo que queda", () => {
    expect(minutos(45 * 60_000)).toBe("45:00");
    expect(minutos(4 * 60_000 + 7_000)).toBe("4:07");
    expect(minutos(1)).toBe("0:01");
    expect(minutos(0)).toBe("0:00");
  });

  it("el tiempo usado, en palabras", () => {
    expect(usado(45_000)).toBe("45 s");
    expect(usado(2 * 60_000)).toBe("2 min");
    expect(usado(23 * 60_000 + 10_000)).toBe("23 min 10 s");
    expect(usado(59_600)).toBe("1 min"); // se redondea al segundo más cercano
  });
});
