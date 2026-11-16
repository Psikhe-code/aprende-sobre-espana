/**
 * @fileoverview Datos de prueba del examen de nacionalidad, con el mismo formato que ccse.json.
 * Los tests de partidas y los de pantalla los usan en vez de los reales, porque la plantilla
 * real se va rellenando poco a poco (y al principio está vacía).
 * Tarea 1: 30 preguntas completas (entre ellas, de verdadero o falso y sin nota); Tarea 2: 5; las demás, vacías.
 */

const emptyEntry = (tareaEntries: number, n: number) => ({
  id: `ccse-${tareaEntries * 1000 + n}`, tarea: tareaEntries, referencia: tareaEntries * 1000 + n,
  pregunta: "", opciones: ["", "", ""], respuesta: "", nota: "", fuentes: [] as { texto: string; url?: string }[]
});

function completeEntry(tareaEntries: number, n: number) {
  const e = emptyEntry(tareaEntries, n);
  const isTrueFalse = n % 7 === 0;
  const withoutNota = n % 5 === 0;
  return {
    ...e,
    pregunta: `Pregunta de prueba ${e.referencia}`,
    opciones: isTrueFalse ? ["Verdadero", "Falso", ""] : [`Opción a ${e.referencia}`, `Opción b ${e.referencia}`, `Opción c ${e.referencia}`],
    respuesta: "abc"[n % (isTrueFalse ? 2 : 3)],
    nota: withoutNota ? "" : `Nota de prueba ${e.referencia}`,
    fuentes: withoutNota ? [] : [{ texto: `Fuente de prueba ${e.referencia}`, url: "https://example.org/" }]
  };
}

const tareaEntries = (tareaNumber: number, completeCount: number, total: number) =>
  Array.from({ length: total }, (_, i) => (i < completeCount ? completeEntry(tareaNumber, i + 1) : emptyEntry(tareaNumber, i + 1)));

export function ccseTestData() {
  return {
    tareas: [1, 2, 3, 4, 5].map((tareaNumber) => ({ numero: tareaNumber, nombre: `Tema de prueba ${tareaNumber}` })),
    preguntas: [...tareaEntries(1, 30, 40), ...tareaEntries(2, 5, 10), ...tareaEntries(3, 0, 5), ...tareaEntries(4, 0, 5), ...tareaEntries(5, 0, 5)]
  };
}

/** Los datos de prueba sin ninguna pregunta rellena, como la plantilla recién creada. */
export function ccseEmptyTestData() {
  const d = ccseTestData();
  return { ...d, preguntas: d.preguntas.map((p) => emptyEntry(p.tarea, p.referencia % 1000)) };
}

/**
 * Datos de prueba con preguntas en las cinco tareas, algunas más de las que pide el simulacro
 * (tareas 1 a 5: 14, 5, 4, 5 y 9), para probar el simulacro de examen.
 */
export function ccseSimulacroTestData() {
  const d = ccseTestData();
  return { ...d, preguntas: [...tareaEntries(1, 14, 14), ...tareaEntries(2, 5, 5), ...tareaEntries(3, 4, 4), ...tareaEntries(4, 5, 5), ...tareaEntries(5, 9, 9)] };
}
