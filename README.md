# Geoquiz España

Juego de preguntas sobre geografía de España. Partidas de 10 preguntas con opciones, explicación de cada respuesta y repaso de fallos.

Ahora mismo tiene tres categorías, **Capitales**, **Banderas** y **Divisiones** (qué provincias tiene cada comunidad), y en Opciones se elige el **territorio**: comunidades (las 17 y las 2 ciudades autónomas, Ceuta y Melilla), provincias o las dos. De provincias, por ahora solo hay capitales: las 8 que no se llaman como su provincia. El prototipo completo, con 8 categorías (provincias, ríos, relieve, costas…), está guardado en la rama [`prototipo-v0.1`](../../tree/prototipo-v0.1).

Hecho con TypeScript y Vite. Funciona en el navegador, se puede instalar como app (PWA) y funciona sin conexión.

## Puesta en marcha

Necesitas [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install        # instala las dependencias (una sola vez)
npm run dev        # arranca el juego en http://localhost:5173 y se recarga al guardar cambios
```

| Comando | Qué hace |
| --- | --- |
| `npm test` | Comprueba los datos y la lógica del juego (ver [Tests](#tests)) |
| `npm run build` | Comprueba los tipos y genera la versión final en `dist/` |
| `npm run preview` | Sirve la versión de `dist/` para probarla tal cual se publicará |

## Publicación

Cada cambio que llega a la rama `main` se publica solo en GitHub Pages (`.github/workflows/publicar.yml`): instala, pasa los tests, compila y sube la web. Si un test falla, no se publica y la web se queda con la última versión buena. El progreso se ve en la pestaña **Actions**.

Para cambios grandes: se trabaja en una rama aparte y se mezcla con un *pull request*. En cada *pull request* se pasan los tests y la compilación (sin publicar), así se revisa antes de que llegue a la web.

## Estructura

```
src/
  data/                    ← CONTENIDO
    territorio.json        comunidades y provincias, con sus códigos INE
    banderas.json          bandera de cada comunidad: archivo, banderas parecidas y explicación
    banderas-provincias.json  igual, para las provincias con bandera oficial en uso
    banderas/*.svg         una imagen por comunidad
    banderas/provincias/*.webp  una imagen por provincia con bandera
    schema/                descripción formal del formato de los JSON (se valida en los tests)
  engine/                  ← MOTOR (sin interfaz)
    territory.ts           carga el territorio y monta los pools de respuestas
    questions.ts           genera las preguntas a partir de los datos
    categories.ts          lista de categorías
    options.ts             genera las opciones de cada pregunta
    round.ts               elige las preguntas de una partida
    game.ts                desarrollo de la partida: respuestas, aciertos, racha, final y récords
    storage.ts             ajustes y récords guardados en el dispositivo
  ui/                      ← INTERFAZ (solo dibuja y llama al motor)
    app.ts                 pantallas y botones
    styles.css             estilos (tema claro y oscuro según el sistema)
  main.ts                  punto de entrada y modo sin conexión
tests/                     comprobaciones automáticas
public/                    iconos de la app
```

## Los datos

Todo se identifica por su **código INE**: comunidades `01`–`17`, ciudades autónomas `18` (Ceuta) y `19` (Melilla), provincias `01`–`52`.

**Orden:** en los archivos, todo va ordenado por código INE, y los tests lo comprueban. Es el orden oficial, coincide con el identificador y no depende de cómo se escriban los nombres. Los códigos se asignaron por orden alfabético de nombres antiguos: por eso Asturias es la provincia `33` (Oviedo), Cantabria la `39` (Santander) y La Rioja la `26` (Logroño). El orden de los archivos no afecta al juego, porque las preguntas se barajan. Si alguna pantalla muestra listas, debe ordenarlas al mostrarlas, alfabéticamente según la forma de nombres elegida.

### Nombres: siempre en todas sus formas

Cada nombre se escribe en todas sus formas, **aunque coincidan**, y siempre con la oficial primero:

```json
"nombre":  { "oficial": "Girona", "castellano": "Gerona" },
"capital": { "oficial": "Sevilla", "castellano": "Sevilla" }
```

- **`oficial`**: la denominación oficial (Girona, Lleida, A Coruña, Ourense, Bizkaia, Gipuzkoa, Illes Balears, Castelló de la Plana/Castellón de la Plana…).
- **`castellano`**: la forma que recomienda la RAE para textos en español (Gerona, Lérida, La Coruña, Orense, Vizcaya, Guipúzcoa, Islas Baleares…).

Para añadir otra forma en el futuro (por ejemplo, `ingles`), se añade como una línea más dentro de cada nombre, en el esquema y en `NAME_STYLES` (`src/engine/types.ts`). Un juego en otro idioma necesitaría además traducir los enunciados, las explicaciones y la interfaz.

### Archivos

- **`territorio.json`**:
  - Cada comunidad o ciudad autónoma tiene `id`, `tipo` (`comunidad` o `ciudad`), `nombre` y `capital` (una lista si es compartida, como Canarias).
  - Opcionalmente:
    - `enFrase`: cómo se nombra dentro de una frase si lleva artículo («el País Vasco»).
    - `trampasCapital`: la trampa que sale siempre en la pregunta de su capital, porque se parece al nombre de la comunidad o de sus islas: Andalucía, La Mancha, León, Mallorca, Rioja… Si hay varias (Aragón o Jaca, Gran Canaria o Tenerife), se sortea una en cada partida. No la tienen las comunidades cuya capital se llama como ellas (Madrid, Murcia, Valencia, Ceuta y Melilla).
    - `ciudadesTrampa`: solo en esas cinco, ciudades reales y conocidas que salen como trampa en la pregunta de su capital, sorteadas con las demás: Alcalá de Henares, Aranjuez y El Escorial (Madrid), Cartagena (Murcia), Elche y Benidorm (Valencia), y Tetuán, Tánger, Nador, Alhucemas, Algeciras y Tarifa (Ceuta y Melilla). Las ciudades extranjeras van con su forma española en los dos estilos.
    - `notaCapital`: la explicación de la pregunta de su capital, solo cuando hay algo que contar (la capital no es la ciudad más poblada o no es capital de provincia, instituciones repartidas, cambios de capital o de nombre). Si no la tiene, el juego genera una automática: *«Zaragoza es la capital de Aragón y también de la provincia de Zaragoza»*.
    - `curiosidadCapital`: un dato histórico que se muestra después de la nota, si la ciudad fue capital de España o de un antiguo reino, con sus fechas. El final de un reino se cuenta desde que perdió sus instituciones propias.
  - Cada provincia tiene `id`, `nombre`, `capital` y el código de su `comunidad`.
  - `vecinas`: códigos de las provincias con las que tiene frontera terrestre (vacío en las islas, Ceuta y Melilla). Se calcularon con los mapas del Instituto Geográfico Nacional (paquete [es-atlas](https://github.com/martgnz/es-atlas)), y los tests comprueban que son recíprocas. Sirven para las trampas de Divisiones: en *«¿De qué comunidad autónoma es la provincia de Soria?»* salen Aragón, Castilla-La Mancha y La Rioja.
  - Opcionalmente, `ciudades`: ciudades relativamente conocidas de la provincia que no son capitales (Gijón, Avilés). Se usan como trampas.
  - Solo en las provincias cuya capital no se llama como la provincia, lo que crea la pregunta *«¿Cuál es la capital de la provincia de Asturias?»*:
    - `trampas`: códigos de provincias cercanas o que se confunden con ella. Su capital y sus `ciudades` salen como trampa (en Asturias: Santander, Torrelavega, León, Ponferrada, Lugo, A Coruña, Ferrol…).
    - `notaCapital` (opcional): la explicación, con las mismas marcas que las notas de las comunidades. Si no la tiene, se genera una automática que la relaciona con su comunidad.
    - En cada partida se sortean cuáles de esas trampas salen, así que las opciones cambian. Además, siempre sale como opción el propio nombre de la provincia.
- **`banderas.json`**: por código, el `archivo` SVG, las `trampas` (códigos de banderas parecidas) y dos textos que se muestran al responder:
  - `descripcion`: cómo es la bandera, en una o dos frases sencillas.
  - `significado`: de dónde vienen sus partes y qué significan, una idea por línea. Se muestra aparte, con la etiqueta «Significado».

### Marcas en los textos

En las notas de las capitales y de las banderas se pueden escribir marcas entre llaves, que el juego sustituye por el nombre en la forma de la pregunta (oficial o castellano):

| Marca | Se sustituye por | Ejemplo |
| --- | --- | --- |
| `{capital}` | la capital de la comunidad (solo en las notas de capitales) | Vitoria-Gasteiz / Vitoria |
| `{provincia:NN}` | el nombre de la provincia con código INE `NN` | `{provincia:01}` → Araba/Álava / Álava |
| `{provincia.capital:NN}` | la capital de esa provincia | `{provincia.capital:15}` → A Coruña / La Coruña |

Los tests comprueban que cada marca está bien escrita y que el código existe. Los nombres históricos («Reino de Valencia») o los que hablan del propio nombre se escriben tal cual, sin marca.

Los espacios al principio, al final o junto a un salto de línea (`\n`) no importan: el juego los quita al mostrar el texto.

### Validación

Al ejecutar `npm test`, cada archivo se valida contra su esquema de `src/data/schema/`. Un campo mal escrito o un código que no existe hacen fallar el test con un mensaje que dice dónde está el error, por ejemplo:

```
/12: must have required property 'trampas'
```

Los tests también comprueban la coherencia entre archivos. Por ejemplo, si una ciudad es capital autonómica y de provincia, tiene que estar escrita igual en los dos sitios, en todas sus formas.

En **VS Code**, los esquemas dan autocompletado y subrayan los errores mientras editas (configurado en `.vscode/settings.json`).

## Cómo funciona

**Preguntas.** Se generan a partir de los datos (`questions.ts`), una vez por cada forma de los nombres. Cada una tiene un identificador fijo, como `capital-ccaa:12` o `bandera-ccaa:12`, igual en todas las formas, y sabe qué lugar es su respuesta (`answerKey`), independientemente de cómo se escriba.

**Forma de los nombres.** En Opciones se marcan las formas con las que se quiere jugar: oficial, castellano o las dos (por defecto). Si hay varias marcadas, se sortea una en cada pregunta, para aprenderlas todas. Cada pregunta va **entera** en una forma (enunciado, respuesta y opciones), así que nunca se mezclan Gerona y Girona en las mismas opciones. Al responder se muestra la otra forma cuando es distinta: *«Vitoria-Gasteiz · en castellano, Vitoria»*.

**Territorio.** Cada pregunta dice si es de comunidades o de provincias (`territorio`). Las categorías reúnen las de los dos, y en Opciones se marca cuáles salen (por defecto, los dos). Si una selección no da para 10 preguntas (por ejemplo, solo capitales de provincia), la partida tiene las que haya, y cuenta para el récord igual. Si no tiene ninguna (banderas de provincia, que aún no existen), Opciones lo avisa.

**Opciones.** Cada pregunta tiene un pool del que salen las incorrectas (todas las capitales, todas las comunidades) y unas trampas fijas (las confusiones típicas):

- Algunas preguntas tienen una trampa fija (`forcedTraps`) que sale siempre (si hay varias, una sorteada): en las capitales de provincia, el propio nombre de la provincia («Asturias» como capital de Asturias), y en las autonómicas, la de `trampasCapital` («Andalucía», «Mallorca»…). Es justo la confusión que enseña la pregunta.
- Al menos una incorrecta es siempre aleatoria del pool, para que las partidas no se repitan.
- Lo que está en `exclude` nunca sale como incorrecto. Por ejemplo, en Canarias ninguna de sus dos capitales aparece como incorrecta.
- **Dificultad:** en Opciones se elige el número de opciones por pregunta: 4 (por defecto), 6 u 8 (`OPTION_COUNTS` en `round.ts`). Con más opciones salen más trampas a la vez; la trampa fija sigue saliendo siempre y queda al menos un hueco al azar. En el móvil, con 6 u 8 las opciones van en dos columnas. La **respuesta abierta** aparece en Opciones como «próximamente», sin poder marcarse.
- Los récords se guardan por categorías, territorios y dificultad.

**Partida.** `round.ts` elige 10 preguntas de las categorías y territorios marcados, sorteando primero la categoría para repartirlas, sin repetir pregunta ni lugar como respuesta (aunque salga con otro nombre). `game.ts` lleva el desarrollo: responder, avanzar, aciertos, racha, fallos y si la partida cuenta para el récord. La interfaz solo dibuja lo que el motor le dice.

**Actualizaciones.** Cuando se publica una versión nueva, se descarga en segundo plano y se aplica al volver al inicio u opciones, nunca a mitad de partida (`main.ts`).

## Banderas

Las de `src/data/banderas/` son las versiones **oficiales** de Wikimedia Commons, con escudo cuando la oficial lo lleva. Cada una conserva su proporción real (no todas son 3:2) y se muestra sin deformarla.

### Banderas de provincia

Solo están las de las provincias que tienen una bandera **aprobada formalmente y en uso público** (15): Álava, Bizkaia y Gipuzkoa; Almería, Cádiz, Córdoba, Granada, Huelva, Jaén y Sevilla; Burgos, Segovia, Teruel, Toledo y Ourense. Casi siempre son la bandera de su Diputación (en el País Vasco, la del territorio histórico). No entran las de las provincias que forman ellas solas una comunidad, porque repetirían la de la comunidad, ni las que solo se usan sin aprobación o no existen.

- Los datos están en `banderas-provincias.json`, por código INE de provincia, con los mismos campos que `banderas.json`. Las trampas son provincias con banderas parecidas (del mismo color, o blancas con cruz roja).
- Las imágenes son **WebP** de 900 px de ancho en `src/data/banderas/provincias/`, convertidas desde los SVG de Commons: los originales pesaban unos 17 MB en total (Cádiz, 5 MB) y así son unos 360 KB.
- En Jaén se usa la versión sin la cinta con «Provincia de Jaén» bajo el escudo, porque esa cinta delataría la respuesta.

En `banderas.json`, cada bandera tiene su `fuente`: nombre del archivo en Commons, enlace, autor y licencia. Algunas son de dominio público o CC0. Otras tienen licencia **CC BY** o **CC BY-SA**, que permiten usarlas citando al autor; por eso el juego tiene una pantalla de **Créditos** (enlace en la pantalla de inicio) que lista todas. El esquema y los tests exigen autor y enlace a la licencia cuando la licencia pide atribución.

## Descargas con GitHub Actions

Algunas webs no se pueden abrir desde el entorno donde trabaja Claude (Wikimedia limita mucho las peticiones, y muchas webs oficiales las bloquean). Para eso hay dos procesos automáticos en GitHub. Los dos funcionan igual: se crea una **rama temporal** desde `main`, se edita la lista del script, se sube la rama, GitHub descarga los archivos y los guarda en esa misma rama. Cuando ya se han leído, la rama se borra. **Estas ramas no se mezclan nunca con `main`**: lo que haga falta se copia a una rama normal con su pull request.

| Proceso | Rama temporal | Script | Para qué | Dónde guarda |
| --- | --- | --- | --- | --- |
| Descargar banderas | `banderas-descarga` | `scripts/descargar-banderas.py` | Archivos de Wikimedia Commons, con su ficha, autor y licencia: banderas, escudos o cualquier otra imagen | `banderas-wikimedia/` |
| Descargar páginas | `paginas-descarga` | `scripts/descargar-paginas.py` | Páginas web (webs oficiales, Flags of the World, boletines, Wikipedia…) y, si se pide, las imágenes y PDF que enlazan | `paginas-descargadas/` |

### Actualizar, cambiar o añadir una bandera

1. Crea la rama `banderas-descarga` desde `main`.
2. Pon en la lista `CANDIDATOS` del script los nombres de los archivos de Commons que quieras (también escudos, como «Coat of Arms of Teruel Province.svg»). La clave de cada grupo es libre: el código de la comunidad («12»), «p» y el código de la provincia («p44»)…
3. Sube la rama. GitHub descarga los archivos y los guarda en `banderas-wikimedia/` de esa rama.
4. Revisa las candidatas con su versión oficial. En una rama normal, copia la elegida a `src/data/banderas/` (las de provincia, convertidas a WebP, a `src/data/banderas/provincias/`) y actualiza su `fuente` (y su `descripcion` y `significado` si cambia el diseño) en el JSON. Después, borra la rama temporal.

## Tests

`npm test` comprueba:

- **Datos**: que los JSON cumplen su esquema; que están las 17 comunidades, las 2 ciudades autónomas y las 52 provincias con sus códigos; que los nombres no se repiten en ningún estilo; que las referencias entre archivos existen y son coherentes; que cada bandera tiene su imagen.
- **Preguntas y opciones**, en cada forma de los nombres: con 4, 6 y 8 opciones en todas las preguntas, la correcta aparece, no hay duplicados ni excluidas y todas las opciones van en la misma forma; la otra forma se muestra solo cuando es distinta.
- **Partidas**: en cientos de partidas al azar, 10 preguntas sin repetir lugar y bien repartidas; con varias formas marcadas salen todas, cada pregunta entera en la suya, y con una sola, solo esa; aciertos, racha, fallos, final y récords.

Los tests comprueban **reglas**, no copian el contenido: por ejemplo, que las trampas de una capital de provincia son las capitales y ciudades de las provincias de su campo `trampas`, sin escribir cuáles son. Por eso se puede cambiar una nota, una trampa o una ciudad en los JSON (también desde github.dev) sin tocar los tests: si el cambio rompe una regla (una trampa que no existe, una marca mal escrita…), el test dice dónde.

## Próximos pasos

- **Banderas más ligeras**: algunas oficiales pesan bastante (la de Navarra, más de 400 KB). Se pueden optimizar sin perder calidad visible.
- **Respuesta abierta**: el jugador escribe la respuesta. Habrá que decidir cómo compararla (sin tildes, mayúsculas, formas oficial y castellana, «Vitoria» y «Vitoria-Gasteiz»…).
- **Puntuación**: una puntuación aparte del récord de aciertos, con tiempo máximo por pregunta y más puntos por responder rápido, multiplicadores por racha y más puntos por dificultad y por jugar con más categorías a la vez.
- **Guardado**: estadísticas por categoría y por pregunta (usando los identificadores), en lugar de récords por combinación.
- **Desbloqueo de categorías** y recuperar las categorías del prototipo, ya con identificadores y esquema.
- **App de Android** con [Capacitor](https://capacitorjs.com):
  ```bash
  npm install @capacitor/core @capacitor/cli @capacitor/android
  npx cap init "Geoquiz España" es.geoquiz.app --web-dir dist
  npx cap add android
  npm run build && npx cap sync android
  npx cap open android     # abre Android Studio para compilar y probar
  ```
