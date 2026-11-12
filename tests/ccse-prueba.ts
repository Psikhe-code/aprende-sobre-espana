// Datos de prueba del examen de nacionalidad, con el mismo formato que ccse.json.
// Los tests de partidas y los de pantalla los usan en vez de los reales, porque la plantilla
// real se va rellenando poco a poco (y al principio está vacía).
// Tarea 1: 30 preguntas completas (entre ellas, de verdadero o falso y sin nota); Tarea 2: 5; las demás, vacías.

const vacia = (tarea: number, n: number) => ({
  id: `ccse-${tarea * 1000 + n}`, tarea, referencia: tarea * 1000 + n,
  pregunta: "", opciones: ["", "", ""], respuesta: "", nota: "", fuentes: [] as { texto: string; url?: string }[]
});

function completa(tarea: number, n: number) {
  const e = vacia(tarea, n);
  const vf = n % 7 === 0;
  const sinNota = n % 5 === 0;
  return {
    ...e,
    pregunta: `Pregunta de prueba ${e.referencia}`,
    opciones: vf ? ["Verdadero", "Falso", ""] : [`Opción a ${e.referencia}`, `Opción b ${e.referencia}`, `Opción c ${e.referencia}`],
    respuesta: "abc"[n % (vf ? 2 : 3)],
    nota: sinNota ? "" : `Nota de prueba ${e.referencia}`,
    fuentes: sinNota ? [] : [{ texto: `Fuente de prueba ${e.referencia}`, url: "https://example.org/" }]
  };
}

const tarea = (numero: number, completas: number, total: number) =>
  Array.from({ length: total }, (_, i) => (i < completas ? completa(numero, i + 1) : vacia(numero, i + 1)));

export function ccsePrueba() {
  return {
    tareas: [1, 2, 3, 4, 5].map((numero) => ({ numero, nombre: `Tema de prueba ${numero}` })),
    preguntas: [...tarea(1, 30, 40), ...tarea(2, 5, 10), ...tarea(3, 0, 5), ...tarea(4, 0, 5), ...tarea(5, 0, 5)]
  };
}

/** Los datos de prueba sin ninguna pregunta rellena, como la plantilla recién creada. */
export function ccseVacio() {
  const d = ccsePrueba();
  return { ...d, preguntas: d.preguntas.map((p) => vacia(p.tarea, p.referencia % 1000)) };
}
