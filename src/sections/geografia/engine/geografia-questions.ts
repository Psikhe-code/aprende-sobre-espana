/**
 * @fileoverview Geografía: sus preguntas, generadas a partir de los datos.
 */

import { NAME_FORMS, type NameForm, type Question, type Territorio } from "./geografia-types";
import { AUTONOMIAS, PROVINCIAS, MUNICIPIOS, POPULATION_YEAR, autonomia, provinciasOf, deAutonomiaText, capitalesOf, neighborAutonomias, provincia, municipioProvinciaId, isCapital, type Comunidad, type NameForms, type Municipio, type Provincia } from "./geografia-territorio";
import banderas from "../data/banderas.json";
import type { ExtraInfoItem } from "../../../common/engine/common-types";

// Preguntas generadas a partir de los datos del territorio y de las banderas.
// Cada pregunta se genera en una forma de los nombres (oficial o castellano), toda entera en esa forma.
// Los identificadores no dependen de la forma: la misma pregunta tiene el mismo id en todas.

const CIUDADES = AUTONOMIAS.filter((c) => c.tipo === "ciudad");

const ALIAS_PREFIX: Record<NameForm, string> = { oficial: "nombre oficial:", castellano: "en castellano," };

/** Líneas con las otras formas de un nombre, si son distintas: "Girona · en castellano, Gerona". */
function aliases(names: NameForms[], nameForm: NameForm): string[] {
  const out: string[] = [];
  for (const f of names) {
    for (const otherForm of NAME_FORMS) {
      if (otherForm !== nameForm && f[otherForm] !== f[nameForm]) out.push(`${f[nameForm]} · ${ALIAS_PREFIX[otherForm]} ${f[otherForm]}`);
    }
  }
  return [...new Set(out)];
}

/** La curiosidad de una pregunta (de `curiosidad` en los datos), como información complementaria. */
export const curiosidadInfo = (text: string): ExtraInfoItem => ({ title: "Curiosidad", text });

/** El significado de una bandera (de `significado` en los datos), como información complementaria. */
export const significadoInfo = (text: string): ExtraInfoItem => ({ title: "Significado", text });

/**
 * Prepara un texto de las notas para mostrarlo en la forma de la pregunta:
 * - `{provincia:NN}` → el nombre de la provincia con código INE NN («Araba/Álava» o «Álava»).
 * - `{provincia.capital:NN}` → la capital de esa provincia («A Coruña» o «La Coruña»).
 * - `{municipio:NNNNN}` → el municipio con código INE NNNNN, si está en municipios.json («Maó» o «Mahón»).
 * - `{capital}` → la capital de la comunidad (solo en las notas de capitales, que la pasan aparte).
 * Además quita los espacios que sobren al principio, al final y junto a los saltos de línea.
 * Una marca con un código que no existe se deja tal cual, y los tests la detectan.
 */
export function prepareText(text: string, nameForm: NameForm, capital?: string): string {
  const withMarks = text.replace(/\{provincia(\.capital)?:(\d{2})\}/g, (mark, capitalMark: string | undefined, id: string) => {
    const p = PROVINCIAS.find((x) => x.id === id);
    if (!p) return mark;
    return (capitalMark ? p.capital : p.nombre)[nameForm];
  }).replace(/\{municipio:(\d{5})\}/g, (mark, id: string) => MUNICIPIOS.find((m) => m.id === id)?.nombre[nameForm] ?? mark);
  const withCapital = capital === undefined ? withMarks : withMarks.replaceAll("{capital}", capital);
  return withCapital.replace(/[ \t]*\n[ \t]*/g, "\n").trim();
}

/**
 * Nota automática para las capitales que no tienen una propia: dice si la capital autonómica
 * es también capital de provincia (y de cuál), que es justo lo que explica las trampas.
 * "Zaragoza es la capital de Aragón y también de la provincia de Zaragoza."
 */
export function autonomiaCapitalExplanation(c: Comunidad, nameForm: NameForm): string {
  const [capital] = capitalesOf(c);
  const deText = deAutonomiaText(c, nameForm);
  const provincia = PROVINCIAS.find((p) => p.capital.castellano === capital.castellano);
  return provincia
    ? `${capital[nameForm]} es la capital ${deText} y también de la provincia de ${provincia.nombre[nameForm]}.`
    : `${capital[nameForm]} es la capital ${deText}, aunque no es capital de provincia.`;
}

/**
 * Capitales autonómicas: una pregunta por comunidad y ciudad autónoma.
 * En Ceuta y Melilla la respuesta es la propia ciudad: parece un regalo, pero así se aprende.
 * Pool: todas las capitales (autonómicas y de provincia) y las ciudades que se usan como trampa.
 * Trampas: las capitales de provincia de la misma comunidad (en las ciudades autónomas, la otra ciudad)
 * y, donde la capital se llama como la comunidad, sus `ciudadesTrampa` (Cartagena en Murcia).
 * Trampa fija: `trampasCapital`, el nombre de la comunidad o algo parecido (Andalucía, Mallorca).
 */
export function autonomiaCapitalQuestions(nameForm: NameForm): Question[] {
  return AUTONOMIAS.map((c): Question => {
    const capitales = capitalesOf(c);
    const answers = capitales.map((f) => f[nameForm]);
    const deText = deAutonomiaText(c, nameForm);
    const prepareNote = (text?: string) => (text ? prepareText(text, nameForm, answers.join(" y ")) : undefined);
    const ownExplanation = prepareNote(c.notaCapital);
    const curiosidad = prepareNote(c.curiosidadCapital);
    const base = {
      id: `capital-ccaa:${c.id}`,
      pool: "capitalOrCiudad",
      trapOptions: [
        ...(c.tipo === "ciudad"
          ? CIUDADES.filter((x) => x.id !== c.id).flatMap((x) => capitalesOf(x).map((f) => f[nameForm]))
          : provinciasOf(c.id).map((p) => p.capital[nameForm])),
        ...(c.ciudadesTrampa ?? []).map((f) => f[nameForm])
      ].filter((cap) => !answers.includes(cap)),
      aliases: aliases([c.nombre, ...capitales], nameForm),
      territorio: "comunidad" as const,
      // Trampa fija: el nombre de la comunidad o algo parecido (Andalucía, La Mancha, Mallorca…).
      ...(c.trampasCapital ? { fixedTrapOptions: c.trampasCapital.map((f) => f[nameForm]) } : {}),
      ...(curiosidad ? { extraInfo: [curiosidadInfo(curiosidad)] } : {})
    };
    if (capitales.length > 1) {
      // Capitalidad compartida (Canarias): todas son correctas, así que ninguna sale como incorrecta.
      return {
        ...base,
        text: `¿Cuál de estas ciudades es una de las ${capitales.length === 2 ? "dos " : ""}capitales ${deText}?`,
        answer: answers,
        answerKey: capitales.map((f) => "ciudad:" + f.castellano),
        exclude: answers,
        explanation: ownExplanation ?? `La capitalidad ${deText} es compartida entre ${answers.join(" y ")}.`
      };
    }
    return {
      ...base,
      text: `¿Cuál es la capital ${deText}?`,
      answer: answers[0],
      answerKey: "ciudad:" + capitales[0].castellano,
      exclude: [],
      explanation: ownExplanation ?? autonomiaCapitalExplanation(c, nameForm)
    };
  });
}

/**
 * Nota de la pregunta de capital de provincia: relaciona la provincia con su comunidad.
 * "Bilbao es la capital de la provincia de Vizcaya. La capital del País Vasco es Vitoria."
 */
export function provinciaCapitalExplanation(p: Provincia, nameForm: NameForm): string {
  const c = autonomia(p.comunidad);
  const deText = deAutonomiaText(c, nameForm);
  const base = `${p.capital[nameForm]} es la capital de la provincia de ${p.nombre[nameForm]}`;
  if (provinciasOf(c.id).length === 1) return `${base}. Como es la única provincia ${deText}, también es la capital de la comunidad.`;
  const comunidadCapital = capitalesOf(c)[0];
  if (comunidadCapital.castellano === p.capital.castellano) return `${base} y también ${deText}.`;
  return `${base}. La capital ${deText} es ${comunidadCapital[nameForm]}.`;
}

/**
 * Capitales de provincia: solo las provincias cuya capital no se llama como la provincia
 * (las que tienen `trampas` en territorio.json). En las demás la pregunta sería un regalo.
 * Pool: todas las capitales y las ciudades de las provincias.
 * Trampas: la capital y las `ciudades` de cada provincia de `trampas` (las cercanas o que se confunden),
 * y las `ciudades` de la propia provincia. Como son muchas, en cada partida se sortean cuáles salen.
 * La respuesta es el mismo lugar que en la pregunta de su comunidad (Oviedo), y las dos
 * pueden salir en la misma partida: son preguntas distintas.
 */
export function provinciaCapitalQuestions(nameForm: NameForm): Question[] {
  return PROVINCIAS.filter((p) => p.trampas?.length).map((p): Question => {
    const capital = p.capital[nameForm];
    // Capital y ciudades de cada provincia cercana, y ciudades de la propia provincia.
    // `provincia` falla con un mensaje claro si un código de `trampas` no existe (los tests de datos lo comprueban).
    const nearProvincias = (p.trampas ?? []).map(provincia);
    const trapOptions = [
      ...nearProvincias.flatMap((x) => [x.capital, ...(x.ciudades ?? [])]),
      ...(p.ciudades ?? [])
    ].map((f) => f[nameForm]);
    return {
      id: `capital-provincia:${p.id}`,
      text: `¿Cuál es la capital de la provincia de ${p.nombre[nameForm]}?`,
      answer: capital,
      answerKey: "ciudad:" + p.capital.castellano,
      pool: "capitalOrCiudad",
      trapOptions: [...new Set(trapOptions)].filter((x) => x !== capital),
      // Siempre sale el propio nombre de la provincia, que no es una ciudad: es justo la confusión
      // que enseña la pregunta (en casi todas las provincias, la capital se llama igual).
      fixedTrapOptions: [p.nombre[nameForm]],
      exclude: [],
      explanation: p.notaCapital ? prepareText(p.notaCapital, nameForm, capital) : provinciaCapitalExplanation(p, nameForm),
      aliases: aliases([p.nombre, p.capital], nameForm),
      territorio: "provincia" as const
    };
  });
}

// ---------- Divisiones ----------

const NUMBER_WORDS = ["ninguna", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];

/**
 * Comunidades que se pueden confundir con la de una provincia, por códigos:
 * - las que tienen frontera con la provincia (Albacete → Comunitat Valenciana, Murcia, Andalucía);
 * - si no llegan a dos (Valladolid solo linda con provincias de Castilla y León),
 *   también las que tienen frontera con su comunidad;
 * - sin fronteras terrestres (Canarias), las otras comunidades o ciudades fuera de la península.
 */
export function trapComunidadIds(p: Provincia): string[] {
  const ownNeighbors = neighborAutonomias([p], p.comunidad);
  if (ownNeighbors.length >= 2) return ownNeighbors;
  const comunidadNeighbors = neighborAutonomias(provinciasOf(p.comunidad), p.comunidad);
  if (comunidadNeighbors.length) return [...new Set([...ownNeighbors, ...comunidadNeighbors])];
  return AUTONOMIAS.filter((c) => c.id !== p.comunidad && provinciasOf(c.id).every((x) => !x.vecinas.length)).map((c) => c.id);
}

/**
 * Divisiones de las comunidades (las provincias de cada una): «¿De qué comunidad autónoma es la provincia de Soria?».
 * Solo las provincias de comunidades con varias provincias (43): en las demás la pregunta sería
 * un regalo (Asturias es del Principado de Asturias).
 * Pool: las comunidades autónomas, sin Ceuta y Melilla (la pregunta dice «comunidad autónoma»).
 * Trampas: las comunidades vecinas (ver trapComunidadIds).
 * La respuesta es la comunidad, así que en una partida pueden salir dos provincias de la misma: son preguntas distintas.
 */
export function provinciaComunidadQuestions(nameForm: NameForm): Question[] {
  const ciudades = CIUDADES.map((c) => c.nombre[nameForm]);
  return PROVINCIAS.filter((p) => provinciasOf(p.comunidad).length > 1).map((p): Question => {
    const c = autonomia(p.comunidad);
    const provinciaNames = provinciasOf(c.id).map((x) => x.nombre[nameForm]).sort((a, b) => a.localeCompare(b, "es"));
    const listText = `${provinciaNames.slice(0, -1).join(", ")} y ${provinciaNames[provinciaNames.length - 1]}`;
    return {
      id: `provincia-ccaa:${p.id}`,
      text: `¿De qué comunidad autónoma es la provincia de ${p.nombre[nameForm]}?`,
      answer: c.nombre[nameForm],
      answerKey: "autonomia:" + c.id,
      pool: "autonomia",
      trapOptions: trapComunidadIds(p).map((id) => autonomia(id).nombre[nameForm]).filter((n) => !ciudades.includes(n)),
      exclude: ciudades,
      explanation: `La provincia de ${p.nombre[nameForm]} es ${deAutonomiaText(c, nameForm)}, que tiene ${NUMBER_WORDS[provinciaNames.length]} provincias: ${listText}.`,
      extraInfo: p.curiosidad ? [curiosidadInfo(prepareText(p.curiosidad, nameForm))] : undefined,
      aliases: aliases([p.nombre, c.nombre], nameForm),
      territorio: "comunidad" as const
    };
  });
}

// ---------- Municipios de cada provincia ----------

const ORDINAL_WORDS = ["", "", "segundo", "tercer"];

/**
 * Provincias trampa de una provincia: sus vecinas. Las que no tienen ninguna (las islas, Ceuta y Melilla)
 * usan las otras provincias sin vecinas: así Las Palmas y Santa Cruz de Tenerife se confunden entre ellas.
 */
export function trapProvinciaIds(p: Provincia): string[] {
  return p.vecinas.length ? p.vecinas : PROVINCIAS.filter((x) => x.id !== p.id && !x.vecinas.length).map((x) => x.id);
}

/**
 * Nota de un municipio, generada con sus datos: si está entre los tres más poblados de su provincia,
 * qué puesto ocupa y su población; si no, su población. Por qué es conocido lo cuenta su curiosidad.
 * La población lleva siempre la fuente y el año: «293.837 habitantes (INE, 2025)».
 */
export function municipioExplanation(m: Municipio, nameForm: NameForm): string {
  const p = provincia(municipioProvinciaId(m));
  const name = m.nombre[nameForm];
  const populationText = `${m.poblacion.toLocaleString("es-ES")} habitantes (INE, ${POPULATION_YEAR})`;
  const deProvinciaText = `de la provincia de ${p.nombre[nameForm]}`;
  if (autonomia(p.comunidad).tipo === "ciudad") return `${name} es a la vez municipio, provincia y ciudad autónoma: ${populationText}.`;
  if (m.puesto === 1) {
    return isCapital(m)
      ? `${name} es la capital y el municipio más poblado ${deProvinciaText}: ${populationText}.`
      : `${name} es el municipio más poblado ${deProvinciaText}, más incluso que la capital, ${p.capital[nameForm]}: ${populationText}.`;
  }
  if (m.puesto <= 3) {
    return isCapital(m)
      ? `${name} es la capital ${deProvinciaText} y su ${ORDINAL_WORDS[m.puesto]} municipio más poblado: ${populationText}.`
      : `${name} es el ${ORDINAL_WORDS[m.puesto]} municipio más poblado ${deProvinciaText}: ${populationText}.`;
  }
  return `${name} tiene ${populationText} y no está entre los tres municipios más poblados ${deProvinciaText}.`;
}

/**
 * Frase sobre los municipios de otras provincias que se llaman igual, que se añade a la nota:
 * «En la provincia de Gerona hay otro municipio que también se llama Torrent, con 182 habitantes.»
 * Usa el nombre oficial, que es el que comparten.
 */
export function sameNameExplanation(m: Municipio, nameForm: NameForm): string {
  return (m.mismoNombre ?? []).map((x) =>
    `En la provincia de ${provincia(x.id.slice(0, 2)).nombre[nameForm]} hay otro municipio que también se llama ${m.nombre.oficial}, con ${x.poblacion.toLocaleString("es-ES")} habitantes.`
  ).join(" ");
}

/**
 * Divisiones de las provincias (sus municipios): «¿De qué provincia es el municipio de Vigo?».
 * Salen todos los de municipios.json: los tres más poblados de cada provincia y los añadidos por su historia o cultura.
 * Pool: las provincias. Trampas: las vecinas (ver trapProvinciaIds).
 * La respuesta es la provincia, así que en una partida pueden salir dos municipios de la misma (Vigo y Pontevedra).
 */
export function municipioProvinciaQuestions(nameForm: NameForm): Question[] {
  return MUNICIPIOS.map((m): Question => {
    const p = provincia(municipioProvinciaId(m));
    return {
      id: `municipio-provincia:${m.id}`,
      text: `¿De qué provincia es el municipio de ${m.nombre[nameForm]}?`,
      answer: p.nombre[nameForm],
      answerKey: "provincia:" + p.id,
      pool: "provincia",
      trapOptions: trapProvinciaIds(p).map((id) => provincia(id).nombre[nameForm]),
      // Si en otra provincia hay un municipio que se llama igual, esa provincia también sería correcta.
      exclude: (m.mismoNombre ?? []).map((x) => provincia(x.id.slice(0, 2)).nombre[nameForm]),
      explanation: [municipioExplanation(m, nameForm), sameNameExplanation(m, nameForm)].filter(Boolean).join("\n"),
      extraInfo: m.curiosidad ? [curiosidadInfo(prepareText(m.curiosidad, nameForm))] : undefined,
      aliases: aliases([m.nombre, p.nombre], nameForm),
      territorio: "provincia" as const
    };
  });
}

// ---------- Banderas ----------

export interface Bandera {
  /** Código INE de la comunidad, ciudad autónoma o provincia. */
  id: string;
  /** Archivo SVG en src/sections/geografia/data/banderas/comunidades o src/sections/geografia/data/banderas/provincias. */
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
const byId = (list: Bandera[]) => Object.fromEntries(list.map((b) => [b.id, b]));
/** Información de cada bandera, por código INE de la comunidad o ciudad autónoma (banderas.json, «comunidades»). */
export const AUTONOMIA_BANDERAS: Record<string, Bandera> = byId(banderas.comunidades);
/**
 * Banderas de provincia, por código INE de provincia (banderas.json, «provincias»): solo las aprobadas
 * formalmente y en uso público. Casi siempre son las de su Diputación (en el País Vasco, las del territorio histórico).
 */
export const PROVINCIA_BANDERAS: Record<string, Bandera> = byId(banderas.provincias);

/**
 * Clave de la bandera que se muestra con una pregunta (campo `banderaKey`):
 * el código de la comunidad ("12") o, para una provincia, "p" y su código ("p48").
 */
export const toBanderaKey = (territorio: "comunidad" | "provincia", id: string) => (territorio === "provincia" ? "p" + id : id);
/** Información de una bandera por su clave ("12" o "p48"). */
export function banderaByKey(key: string): Bandera | undefined {
  return key.startsWith("p") ? PROVINCIA_BANDERAS[key.slice(1)] : AUTONOMIA_BANDERAS[key];
}

/** Lo que cambia entre las preguntas de banderas de comunidades y las de provincias. */
interface BanderaQuestionsSpec {
  territorio: Territorio;
  /** Banderas de este territorio, por código INE, y los códigos de las que salen, en orden. */
  banderas: Record<string, Bandera>;
  ids: string[];
  /** Nombre, en todas sus formas, de la comunidad o provincia con este código (también de las trampas). */
  name: (id: string) => NameForms;
  /** Principio del identificador de la pregunta («bandera-ccaa») y del lugar de la respuesta («autonomia»). */
  idPrefix: string;
  answerKeyPrefix: string;
  text: string;
  /** Pool del que salen las opciones equivocadas que no son trampas. */
  pool: string;
}

/**
 * Preguntas de banderas: «¿De qué comunidad (o provincia) es esta bandera?». La nota es la descripción de la bandera,
 * y después su significado. Trampas: las de banderas parecidas (`trampas` en banderas.json).
 */
function banderaQuestions(spec: BanderaQuestionsSpec, nameForm: NameForm): Question[] {
  return spec.ids.map((id): Question => {
    const b = spec.banderas[id];
    const name = spec.name(id);
    return {
      id: `${spec.idPrefix}:${id}`,
      text: spec.text,
      answer: name[nameForm],
      answerKey: `${spec.answerKeyPrefix}:${id}`,
      pool: spec.pool,
      trapOptions: b.trampas.map((t) => spec.name(t)[nameForm]),
      exclude: [],
      explanation: prepareText(b.descripcion, nameForm),
      extraInfo: [significadoInfo(prepareText(b.significado, nameForm))],
      banderaKey: toBanderaKey(spec.territorio, id),
      aliases: aliases([name], nameForm),
      territorio: spec.territorio
    };
  });
}

/** Banderas de las 17 comunidades y las 2 ciudades autónomas. */
export const autonomiaBanderaQuestions = (nameForm: NameForm): Question[] => banderaQuestions({
  territorio: "comunidad",
  banderas: AUTONOMIA_BANDERAS,
  ids: AUTONOMIAS.map((c) => c.id),
  name: (id) => autonomia(id).nombre,
  idPrefix: "bandera-ccaa",
  answerKeyPrefix: "autonomia",
  // Mismo enunciado para todas: si dijera "ciudad" solo en Ceuta y Melilla, delataría la respuesta.
  text: "¿De qué comunidad o ciudad autónoma es esta bandera?",
  pool: "autonomia"
}, nameForm);

/**
 * Banderas de provincia: las que tienen bandera aprobada y en uso (ver PROVINCIA_BANDERAS).
 * Pool: las provincias con bandera, para que todas las opciones sean banderas que se pueden aprender.
 * Trampas: las provincias con banderas parecidas (del mismo color, o blancas con cruz roja).
 */
export const provinciaBanderaQuestions = (nameForm: NameForm): Question[] => banderaQuestions({
  territorio: "provincia",
  banderas: PROVINCIA_BANDERAS,
  ids: Object.keys(PROVINCIA_BANDERAS).sort(),
  name: (id) => provincia(id).nombre,
  idPrefix: "bandera-provincia",
  answerKeyPrefix: "provincia",
  text: "¿De qué provincia es esta bandera?",
  pool: "provinciaWithBandera"
}, nameForm);
