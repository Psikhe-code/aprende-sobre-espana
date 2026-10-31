import { NAME_STYLES, type NameStyle, type Question } from "./types";
import { AUTONOMIAS, PROVINCIAS, MUNICIPIOS, AÑO_POBLACION, autonomia, provinciasDe, deAutonomia, capitalesDe, comunidadesVecinas, provincia, provinciaDeMunicipio, esCapital, type Comunidad, type Formas, type Municipio, type Provincia } from "./territory";
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
 * Prepara un texto de las notas para mostrarlo en la forma de la pregunta:
 * - `{provincia:NN}` → el nombre de la provincia con código INE NN («Araba/Álava» o «Álava»).
 * - `{provincia.capital:NN}` → la capital de esa provincia («A Coruña» o «La Coruña»).
 * - `{capital}` → la capital de la comunidad (solo en las notas de capitales, que la pasan aparte).
 * Además quita los espacios que sobren al principio, al final y junto a los saltos de línea.
 * Una marca con un código que no existe se deja tal cual, y los tests la detectan.
 */
export function prepararTexto(texto: string, style: NameStyle, capital?: string): string {
  const conMarcas = texto.replace(/\{provincia(\.capital)?:(\d{2})\}/g, (marca, esCapital: string | undefined, id: string) => {
    const p = PROVINCIAS.find((x) => x.id === id);
    if (!p) return marca;
    return (esCapital ? p.capital : p.nombre)[style];
  });
  const conCapital = capital === undefined ? conMarcas : conMarcas.replaceAll("{capital}", capital);
  return conCapital.replace(/[ \t]*\n[ \t]*/g, "\n").trim();
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
 * Pool: todas las capitales (autonómicas y de provincia) y las ciudades que se usan como trampa.
 * Trampas: las capitales de provincia de la misma comunidad (en las ciudades autónomas, la otra ciudad)
 * y, donde la capital se llama como la comunidad, sus `ciudadesTrampa` (Cartagena en Murcia).
 * Trampa fija: `trampasCapital`, el nombre de la comunidad o algo parecido (Andalucía, Mallorca).
 */
export function regionalCapitalQuestions(style: NameStyle): Question[] {
  return AUTONOMIAS.map((c) => {
    const capitales = capitalesDe(c);
    const correctas = capitales.map((f) => f[style]);
    const de = deAutonomia(c, style);
    const preparar = (texto?: string) => (texto ? prepararTexto(texto, style, correctas.join(" y ")) : undefined);
    const nota = preparar(c.notaCapital);
    const fact = preparar(c.curiosidadCapital);
    const base = {
      id: `capital-ccaa:${c.id}`,
      type: "capitalOCiudad",
      traps: [
        ...(c.tipo === "ciudad"
          ? CIUDADES.filter((x) => x.id !== c.id).flatMap((x) => capitalesDe(x).map((f) => f[style]))
          : provinciasDe(c.id).map((p) => p.capital[style])),
        ...(c.ciudadesTrampa ?? []).map((f) => f[style])
      ].filter((cap) => !correctas.includes(cap)),
      aliases: aliases([c.nombre, ...capitales], style),
      territorio: "comunidad" as const,
      // Trampa fija: el nombre de la comunidad o algo parecido (Andalucía, La Mancha, Mallorca…).
      ...(c.trampasCapital ? { forcedTraps: c.trampasCapital.map((f) => f[style]) } : {}),
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

/**
 * Nota de la pregunta de capital de provincia: relaciona la provincia con su comunidad.
 * "Bilbao es la capital de la provincia de Vizcaya. La capital del País Vasco es Vitoria."
 */
export function notaCapitalProvincia(p: Provincia, style: NameStyle): string {
  const c = autonomia(p.comunidad);
  const de = deAutonomia(c, style);
  const base = `${p.capital[style]} es la capital de la provincia de ${p.nombre[style]}`;
  if (provinciasDe(c.id).length === 1) return `${base}. Como es la única provincia ${de}, también es la capital de la comunidad.`;
  const capitalComunidad = capitalesDe(c)[0];
  if (capitalComunidad.castellano === p.capital.castellano) return `${base} y también ${de}.`;
  return `${base}. La capital ${de} es ${capitalComunidad[style]}.`;
}

/**
 * Capitales de provincia: solo las provincias cuya capital no se llama como la provincia
 * (las que tienen `trampas` en territorio.json). En las demás la pregunta sería un regalo.
 * Pool: todas las capitales y las ciudades de las provincias.
 * Trampas: la capital y las `ciudades` de cada provincia de `trampas` (las cercanas o que se confunden),
 * y las `ciudades` de la propia provincia. Como son muchas, en cada partida se sortean cuáles salen.
 * La respuesta es el mismo lugar que en la pregunta de su comunidad (Oviedo), así que
 * en una partida no salen las dos.
 */
export function provincialCapitalQuestions(style: NameStyle): Question[] {
  return PROVINCIAS.filter((p) => p.trampas?.length).map((p) => {
    const capital = p.capital[style];
    // Capital y ciudades de cada provincia cercana, y ciudades de la propia provincia.
    const cercanas = p.trampas!.map((id) => PROVINCIAS.find((x) => x.id === id)!);
    const trampas = [
      ...cercanas.flatMap((x) => [x.capital, ...(x.ciudades ?? [])]),
      ...(p.ciudades ?? [])
    ].map((f) => f[style]);
    return {
      id: `capital-provincia:${p.id}`,
      text: `¿Cuál es la capital de la provincia de ${p.nombre[style]}?`,
      answer: capital,
      answerKey: "ciudad:" + p.capital.castellano,
      type: "capitalOCiudad",
      traps: [...new Set(trampas)].filter((x) => x !== capital),
      // Siempre sale el propio nombre de la provincia, que no es una ciudad: es justo la confusión
      // que enseña la pregunta (en casi todas las provincias, la capital se llama igual).
      forcedTraps: [p.nombre[style]],
      exclude: [],
      why: p.notaCapital ? prepararTexto(p.notaCapital, style, capital) : notaCapitalProvincia(p, style),
      aliases: aliases([p.nombre, p.capital], style),
      territorio: "provincia" as const
    };
  });
}

// ---------- Divisiones ----------

const NUMEROS = ["ninguna", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];

/**
 * Comunidades que se pueden confundir con la de una provincia, por códigos:
 * - las que tienen frontera con la provincia (Albacete → Comunitat Valenciana, Murcia, Andalucía);
 * - si no llegan a dos (Valladolid solo linda con provincias de Castilla y León),
 *   también las que tienen frontera con su comunidad;
 * - sin fronteras terrestres (Canarias), las otras comunidades o ciudades fuera de la península.
 */
export function comunidadesTrampa(p: Provincia): string[] {
  const propias = comunidadesVecinas([p], p.comunidad);
  if (propias.length >= 2) return propias;
  const deLaComunidad = comunidadesVecinas(provinciasDe(p.comunidad), p.comunidad);
  if (deLaComunidad.length) return [...new Set([...propias, ...deLaComunidad])];
  return AUTONOMIAS.filter((c) => c.id !== p.comunidad && provinciasDe(c.id).every((x) => !x.vecinas.length)).map((c) => c.id);
}

/**
 * Divisiones de las comunidades (las provincias de cada una): «¿De qué comunidad autónoma es la provincia de Soria?».
 * Solo las provincias de comunidades con varias provincias (43): en las demás la pregunta sería
 * un regalo (Asturias es del Principado de Asturias).
 * Pool: las comunidades autónomas, sin Ceuta y Melilla (la pregunta dice «comunidad autónoma»).
 * Trampas: las comunidades vecinas (ver comunidadesTrampa).
 * La respuesta es la comunidad, así que en una partida no salen dos provincias de la misma.
 */
export function divisionQuestions(style: NameStyle): Question[] {
  const ciudades = CIUDADES.map((c) => c.nombre[style]);
  return PROVINCIAS.filter((p) => provinciasDe(p.comunidad).length > 1).map((p) => {
    const c = autonomia(p.comunidad);
    const hermanas = provinciasDe(c.id).map((x) => x.nombre[style]).sort((a, b) => a.localeCompare(b, "es"));
    const lista = `${hermanas.slice(0, -1).join(", ")} y ${hermanas[hermanas.length - 1]}`;
    return {
      id: `provincia-ccaa:${p.id}`,
      text: `¿De qué comunidad autónoma es la provincia de ${p.nombre[style]}?`,
      answer: c.nombre[style],
      answerKey: "autonomia:" + c.id,
      type: "autonomia",
      traps: comunidadesTrampa(p).map((id) => autonomia(id).nombre[style]).filter((n) => !ciudades.includes(n)),
      exclude: ciudades,
      why: `La provincia de ${p.nombre[style]} es ${deAutonomia(c, style)}, que tiene ${NUMEROS[hermanas.length]} provincias: ${lista}.`,
      aliases: aliases([p.nombre, c.nombre], style),
      territorio: "comunidad" as const
    };
  });
}

// ---------- Municipios de cada provincia ----------

const ORDINAL = ["", "", "segundo", "tercer"];

/**
 * Provincias trampa de una provincia: sus vecinas. Las que no tienen ninguna (las islas, Ceuta y Melilla)
 * usan las otras provincias sin vecinas: así Las Palmas y Santa Cruz de Tenerife se confunden entre ellas.
 */
export function provinciasTrampa(p: Provincia): string[] {
  return p.vecinas.length ? p.vecinas : PROVINCIAS.filter((x) => x.id !== p.id && !x.vecinas.length).map((x) => x.id);
}

/**
 * Nota de un municipio, generada con sus datos: si está entre los tres más poblados de su provincia,
 * qué puesto ocupa y su población; si no, su población y el motivo por el que es conocido.
 * La población lleva siempre la fuente y el año: «293.837 habitantes (INE, 2025)».
 */
export function notaMunicipio(m: Municipio, style: NameStyle): string {
  const p = provincia(provinciaDeMunicipio(m));
  const nombre = m.nombre[style];
  const habitantes = `${m.poblacion.toLocaleString("es-ES")} habitantes (INE, ${AÑO_POBLACION})`;
  const deProvincia = `de la provincia de ${p.nombre[style]}`;
  if (autonomia(p.comunidad).tipo === "ciudad") return `${nombre} es a la vez municipio, provincia y ciudad autónoma: ${habitantes}.`;
  if (m.puesto === 1) {
    return esCapital(m)
      ? `${nombre} es la capital y el municipio más poblado ${deProvincia}: ${habitantes}.`
      : `${nombre} es el municipio más poblado ${deProvincia}, más incluso que la capital, ${p.capital[style]}: ${habitantes}.`;
  }
  if (m.puesto <= 3) {
    return esCapital(m)
      ? `${nombre} es la capital ${deProvincia} y su ${ORDINAL[m.puesto]} municipio más poblado: ${habitantes}.`
      : `${nombre} es el ${ORDINAL[m.puesto]} municipio más poblado ${deProvincia}: ${habitantes}.`;
  }
  return `${nombre} tiene ${habitantes} y no está entre los tres municipios más poblados ${deProvincia}, pero es muy conocido: ${prepararTexto(m.motivo ?? "", style)}.`;
}

/**
 * Divisiones de las provincias (sus municipios): «¿De qué provincia es el municipio de Vigo?».
 * Salen todos los de municipios.json: los tres más poblados de cada provincia y los añadidos por su historia o cultura.
 * Pool: las provincias. Trampas: las vecinas (ver provinciasTrampa).
 * La respuesta es la provincia, así que en una partida no salen dos municipios de la misma.
 */
export function municipioQuestions(style: NameStyle): Question[] {
  return MUNICIPIOS.map((m) => {
    const p = provincia(provinciaDeMunicipio(m));
    return {
      id: `municipio-provincia:${m.id}`,
      text: `¿De qué provincia es el municipio de ${m.nombre[style]}?`,
      answer: p.nombre[style],
      answerKey: "provincia:" + p.id,
      type: "provincia",
      traps: provinciasTrampa(p).map((id) => provincia(id).nombre[style]),
      exclude: [],
      why: notaMunicipio(m, style),
      fact: m.curiosidad ? prepararTexto(m.curiosidad, style) : undefined,
      aliases: aliases([m.nombre, p.nombre], style),
      territorio: "provincia" as const
    };
  });
}

// ---------- Banderas ----------

export interface BanderaInfo {
  /** Código INE de la comunidad, ciudad autónoma o provincia. */
  id: string;
  /** Archivo SVG en src/data/banderas/comunidades o src/data/banderas/provincias. */
  archivo: string;
  /** Códigos INE de las comunidades (o provincias) con banderas parecidas. */
  trampas: string[];
  /** Cómo es la bandera, en una o dos frases sencillas. Se muestra al responder. */
  descripcion: string;
  /** De dónde vienen sus partes y qué significan. Se muestra después, con la etiqueta «Significado». */
  significado: string;
  /** De dónde sale la imagen: se muestra en Créditos. */
  fuente: { titulo: string; url: string; autor?: string; licencia: string; licenciaUrl?: string };
}
const porCodigo = (lista: BanderaInfo[]) => Object.fromEntries(lista.map((b) => [b.id, b]));
/** Información de cada bandera, por código INE de la comunidad o ciudad autónoma (banderas.json, «comunidades»). */
export const BANDERAS: Record<string, BanderaInfo> = porCodigo(banderas.comunidades);
/**
 * Banderas de provincia, por código INE de provincia (banderas.json, «provincias»): solo las aprobadas
 * formalmente y en uso público. Casi siempre son las de su Diputación (en el País Vasco, las del territorio histórico).
 */
export const BANDERAS_PROVINCIAS: Record<string, BanderaInfo> = porCodigo(banderas.provincias);

/**
 * Clave de la bandera que se muestra con una pregunta (campo `flag`):
 * el código de la comunidad ("12") o, para una provincia, "p" y su código ("p48").
 */
export const flagKey = (territorio: "comunidad" | "provincia", id: string) => (territorio === "provincia" ? "p" + id : id);
/** Información de una bandera por su clave ("12" o "p48"). */
export function banderaPorClave(clave: string): BanderaInfo | undefined {
  return clave.startsWith("p") ? BANDERAS_PROVINCIAS[clave.slice(1)] : BANDERAS[clave];
}

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
    why: prepararTexto(BANDERAS[c.id].descripcion, style),
    meaning: prepararTexto(BANDERAS[c.id].significado, style),
    flag: flagKey("comunidad", c.id),
    aliases: aliases([c.nombre], style),
    territorio: "comunidad" as const
  }));
}

/**
 * Banderas de provincia: las que tienen bandera aprobada y en uso (ver BANDERAS_PROVINCIAS).
 * Pool: las provincias con bandera, para que todas las opciones sean banderas que se pueden aprender.
 * Trampas: las provincias con banderas parecidas (del mismo color, o blancas con cruz roja).
 */
export function provincialFlagQuestions(style: NameStyle): Question[] {
  return Object.keys(BANDERAS_PROVINCIAS).sort().map((id) => {
    const p = provincia(id);
    const b = BANDERAS_PROVINCIAS[id];
    return {
      id: `bandera-provincia:${id}`,
      text: "¿De qué provincia es esta bandera?",
      answer: p.nombre[style],
      answerKey: "provincia:" + id,
      type: "provinciaConBandera",
      traps: b.trampas.map((t) => provincia(t).nombre[style]),
      exclude: [],
      why: prepararTexto(b.descripcion, style),
      meaning: prepararTexto(b.significado, style),
      flag: flagKey("provincia", id),
      aliases: aliases([p.nombre], style),
      territorio: "provincia" as const
    };
  });
}
