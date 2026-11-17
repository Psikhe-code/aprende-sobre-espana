/**
 * @fileoverview Las opciones comunes de preguntas por partida: cuántas tendrá la partida.
 */

import { describe, expect, it } from "vitest";
import {
  QUESTION_COUNTS, countRoundQuestions
} from "../../src/common/engine/common-round-settings";

describe("preguntas por partida", () => {
  it("la partida tiene las elegidas o, si hay menos, las que haya; sin límite, todas (una vuelta)", () => {
    for (const availableQuestionCount of [0, 3, 10, 30, 200]) {
      for (const questionCount of QUESTION_COUNTS) {
        const expected = questionCount === "sinLimite" ? availableQuestionCount : Math.min(questionCount, availableQuestionCount);
        expect(countRoundQuestions(questionCount, availableQuestionCount), `${questionCount} de ${availableQuestionCount}`).toBe(expected);
      }
    }
  });
});
