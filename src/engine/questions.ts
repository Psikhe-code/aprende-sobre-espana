import { NAME_STYLES, type NameStyle, type Question } from "./types";
import { AUTONOMIAS, PROVINCIAS, autonomia, provinciasDe, deAutonomia, capitalesDe, type Comunidad, type Formas } from "./territory";
import banderas from "../data/banderas.json";

// Preguntas generadas a partir de los datos del territorio y de las banderas.
// Cada pregunta se genera en una forma de los nombres (oficial o castellano), toda entera en esa forma.
// Los identificadores no dependen de la forma: la misma pregunta tiene el mismo id en todas.

const CIUDADES = AUTONOMIAS.filter((c) => c.tipo === "ciudad");

const ETIQUETA: Record<NameStyle, string> = { oficial: "nombre oficial:", castellano: "en castellano," };

/** Líneas con las otras formas de un nombre, si son distintas: "Girona · en castellano, Gerona". */
function aliases(formas: Formas[], style: NameStyle): string[] {
  const out: string[] = [];
  for (const f of formas) {
    for (const otra of NAME_STYLES) {
      if (otra !== style && f[otra] !== f[style]) out.push(`${f[style]} · ${ETIQUETA[otra]} ${f[otra]}`);
    }
  }
  return [...new Set(out)];
}

/**
 * Nota automática para las capitales que no tienen una propia: dice si la capital autonómica
 * es también capital de provincia (y de cuál), que es justo lo que explica las trampas.
 * "Zaragoza es la capital de Aragón y también de la provincia de Zaragoza."
 */
export function notaAutomatica(c: Comunidad, style: NameStyle): string {
  const [capital] = capitalesDe(c);
  const de = deAutonomia(c, style);
  const provincia = PROVINCIAS.find((p) => p.capital.castellano === capital.castellano);
  return provincia
    ? `${capital[style]} es la capital ${de} y también de la provincia de ${provincia.nombre[style]}.`
    : `${capital[style]} es la capital ${de}, aunque no es capital de provincia.`;
}

/**
 * Capitales autonómicas: una pregunta por comunidad y ciudad autónoma.
 * En Ceuta y Melilla la respuesta es la propia ciudad: parece un regalo, pero así se aprende.
 * Pool: todas las capitales (autonómicas y de provincia).
 * Trampas: las capitales de provincia de la misma comunidad; en las ciudades autónomas, la otra ciudad.
 */
export function regionalCapitalQuestions(style: NameStyle): Question[] {
  return AUTONOMIAS.map((c) => {
    const capitales = capitalesDe(c);
    const correctas = capitales.map((f) => f[style]);
    const de = deAutonomia(c, style);
    const conCapital = (texto?: string) => texto?.replaceAll("{capital}", correctas.join(" y "));
    const nota = conCapital(c.notaCapital);
    const fact = conCapital(c.curiosidadCapital);
    const base = {
      id: `capital-ccaa:${c.id}`,
      type: "capitalCualquiera",
      traps: (c.tipo === "ciudad"
        ? CIUDADES.filter((x) => x.id !== c.id).flatMap((x) => capitalesDe(x).map((f) => f[style]))
        : provinciasDe(c.id).map((p) => p.capital[style])
      ).filter((cap) => !correctas.includes(cap)),
      aliases: aliases([c.nombre, ...capitales], style),
      ...(fact ? { fact } : {})
    };
    if (capitales.length > 1) {
      // Capitalidad compartida (Canarias): todas son correctas, así que ninguna sale como incorrecta.
      return {
        ...base,
        text: `¿Cuál de estas ciudades es una de las ${capitales.length === 2 ? "dos " : ""}capitales ${de}?`,
        answer: correctas,
        answerKey: capitales.map((f) => "ciudad:" + f.castellano),
        exclude: correctas,
        why: nota ?? `La capitalidad ${de} es compartida entre ${correctas.join(" y ")}.`
      };
    }
    return {
      ...base,
      text: `¿Cuál es la capital ${de}?`,
      answer: correctas[0],
      answerKey: "ciudad:" + capitales[0].castellano,
      exclude: [],
      why: nota ?? notaAutomatica(c, style)
    };
  });
}

// ---------- Banderas ----------

export interface BanderaInfo {
  /** Archivo SVG en src/data/banderas. */
  archivo: string;
  /** Códigos INE de las comunidades o ciudades con banderas parecidas. */
  trampas: string[];
  nota: string;
  /** De dónde sale la imagen: se muestra en Créditos. */
  fuente: { titulo: string; url: string; autor?: string; licencia: string; licenciaUrl?: string };
}
/** Información de cada bandera, por código INE de la comunidad o ciudad autónoma. */
export const BANDERAS: Record<string, BanderaInfo> = banderas;

/** Banderas de las 17 comunidades y las 2 ciudades autónomas. */
export function flagQuestions(style: NameStyle): Question[] {
  return AUTONOMIAS.map((c) => ({
    id: `bandera-ccaa:${c.id}`,
    // Mismo enunciado para todas: si dijera "ciudad" solo en Ceuta y Melilla, delataría la respuesta.
    text: "¿De qué comunidad o ciudad autónoma es esta bandera?",
    answer: c.nombre[style],
    answerKey: "autonomia:" + c.id,
    type: "autonomia",
    traps: BANDERAS[c.id].trampas.map((id) => autonomia(id).nombre[style]),
    exclude: [],
    why: BANDERAS[c.id].nota,
    flag: c.id,
    aliases: aliases([c.nombre], style)
  }));
}
