/**
 * @fileoverview Las opciones comunes de preguntas por partida: cuántas tendrá la partida y cuáles se pueden elegir.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUESTION_COUNT, QUESTION_COUNTS, canChooseQuestionCount, countRoundQuestions
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

  it("la de por defecto y sin límite se pueden elegir siempre; las demás, solo si hay al menos esas", () => {
    for (const availableQuestionCount of [0, 3, 10, 30, 200]) {
      for (const questionCount of QUESTION_COUNTS) {
        const expected = questionCount === "sinLimite" || questionCount === DEFAULT_QUESTION_COUNT || availableQuestionCount >= questionCount;
        expect(canChooseQuestionCount(questionCount, availableQuestionCount), `${questionCount} de ${availableQuestionCount}`).toBe(expected);
      }
    }
  });
});
