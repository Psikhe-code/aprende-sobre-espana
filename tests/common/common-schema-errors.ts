/**
 * @fileoverview Ayuda para los tests de datos de cada sección: validar un JSON contra su esquema.
 */

import Ajv from "ajv";

/** Valida un archivo contra su esquema y devuelve los errores en forma legible. */
export function schemaErrors(schema: object, data: unknown): string[] {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (validate(data)) return [];
  return (validate.errors ?? []).map((e) => `${e.instancePath || "(raíz)"}: ${e.message}${e.params ? " " + JSON.stringify(e.params) : ""}`);
}
