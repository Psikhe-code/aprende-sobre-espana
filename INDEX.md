# Índice de lo exportado

Todo lo que un archivo de `src` exporta para que lo usen otros (funciones, constantes, clases y tipos), con una línea de para qué sirve. Va agrupado como en la sección «Estructura» del README, que explica para qué sirve cada archivo.

Sirve para orientarse: ver qué hay, encontrar dónde está algo y notar nombres que se parecen o se repiten. Lo que manda es el código, y este índice se mantiene a mano, así que puede ir un poco por detrás:

- **En cada PR**, se añade, se cambia o se quita lo que toque.
- **De vez en cuando**, se repasa entero, también las descripciones: con cada cambio del número del medio de la versión, antes de empezar una sección nueva o cada unos 20 PR, lo que llegue antes.
- **Antes de crear algo nuevo**, se busca también en el código, no solo aquí, por si existe y no está apuntado.

Lo que no se exporta (lo que solo se usa dentro de su archivo) no está aquí.

Tipo de cada nombre: *función*, *constante*, *clase* o *tipo* (los `type` e `interface` de TypeScript, que solo describen la forma de los datos y no existen al jugar).

**Nombres que se repiten a propósito.** Cada sección prepara sus partidas a su manera, pero lo común las llama igual, así que estos nombres están en `geografia-*` y en `ccse-*` y hacen lo mismo para su sección: `prepare`, `buildRound`, `reshuffleRound`, `buildReviewRound`, `countAvailableQuestions`, `canPlay`, `selectionKey` y `recordKey`. Hay que importarlos siempre del archivo de la sección que toca.

## src/common/engine

### common-countdown.ts
- `Countdown` (clase): cuenta atrás de una pregunta: se arranca, se pausa y dice cuánto queda (la pantalla la dibuja).

### common-random.ts
- `shuffle` (función): copia de una lista con el orden mezclado al azar.
- `pick` (función): un elemento al azar de una lista.
- `notStartingWith` (función): en la partida sin límite, al empezar otra vuelta, evita que la primera pregunta sea la última de la vuelta anterior.

### common-round-settings.ts
- `QUESTION_COUNTS` (constante): preguntas por partida que se pueden elegir (10, 25, 50, 100 o sin límite).
- `QuestionCount` (tipo): uno de esos valores.
- `DEFAULT_QUESTION_COUNT` (constante): el de por defecto (10).
- `TIME_LIMITS` (constante): tiempos por pregunta que se pueden elegir, en segundos, o «sin tiempo».
- `TimeLimit` (tipo): uno de esos valores.
- `DEFAULT_TIME_LIMIT` (constante): el de por defecto (60 s).
- `countRoundQuestions` (función): cuántas preguntas tendrá la partida según las elegidas y las que hay (en «sin límite», las de una vuelta).
- `recordKeyEnding` (función): final de la clave de un récord, con el número de preguntas y el tiempo, para separar los récords de cada combinación.

### common-round.ts
- `Round` (clase): la partida en marcha: preguntas, respuestas, aciertos, racha, vueltas y final.
- `AnswerResult` (tipo): resultado de una pregunta respondida o agotada por tiempo.
- `Miss` (tipo): una pregunta fallada o sin responder.
- `RoundResult` (tipo): resultado de una partida entera.
- `recordValue` (función): lo que se compara para el récord: los aciertos o, sin límite, la mejor racha.
- `applyRecord` (función): apunta el récord si se ha batido; devuelve los récords nuevos sin cambiar los anteriores.
- `Rating` (tipo): la valoración del resultado que pone cada sección («Gran nivel», «Toca repasar»…).
- `ratingText` (función): aplica esa valoración, o dice «Sin respuestas» si no se respondió nada.

### common-storage.ts
- `SavedState` (tipo): todo lo guardado en el dispositivo: la sección, los récords y las opciones de cada sección.
- `STORAGE_KEY` (constante): clave con la que se guarda en el dispositivo (no se cambia).
- `loadState` (función): carga lo guardado y descarta lo que no tiene la forma esperada.
- `saveState` (función): guarda el estado en el dispositivo.
- `sectionSettings` (función): las opciones de una sección, comprobadas por la propia sección la primera vez.

### common-types.ts
- `Section` (tipo): id de una sección («geografia», «ccse»…).
- `Fuente` (tipo): una fuente de una nota: su texto y, si tiene, su enlace.
- `PlayableQuestion` (tipo): lo que la partida común sabe de una pregunta, venga de la sección que venga.
- `ExtraInfoItem` (tipo): un bloque de información complementaria de una pregunta, con su título («Curiosidad», «Significado»).
- `QuestionImage` (tipo): la imagen de una pregunta, con sus textos alternativos.
- `Rng` (tipo): generador de números al azar; en los tests se usa uno fijo para que salga siempre lo mismo.

## src/common/ui

### common-app.ts
- `App` (tipo): lo que devuelve `startApp`.
- `startApp` (función): arranca el juego: pantallas, botones, menú de secciones y versión.
- `renderVersion` (función): escribe la versión y la fecha de publicación al pie.
- `UPDATE_RELOAD_KEY` (constante): marca que se pone al recargar la página por una versión nueva, para volver a la misma sección.

### common-context.ts
- `Screen` (tipo): una pantalla, por el id de su `<section>` en `index.html`.
- `AppContext` (tipo): lo que comparten las pantallas: lo guardado, la sección, cambiar de pantalla y volver.

### common-contours.ts
- `drawContours` (función): dibuja las curvas de nivel decorativas de la cabecera.

### common-credits-screen.ts
- `renderCredits` (función): dibuja los Créditos de una sección (lo suyo y lo común).

### common-dom.ts
- `$` (función): busca un elemento por su id y falla enseguida, con su nombre, si no existe.
- `el` (función): crea un elemento, con su clase y su texto.
- `pad` (función): número con dos cifras (1 → «01»).
- `announce` (función): aviso para lectores de pantalla, sin mover el foco.
- `numberKey` (función): número (1 a 9) de una tecla de atajo, o nada si no lo es (también con teclados como el francés).
- `isInteractive` (función): si un elemento es un enlace, un botón o un campo, donde Intro ya hace lo suyo.
- `externalLink` (función): enlace a otra web, que se abre en otra pestaña; todos se crean aquí.
- `Change` (tipo): lo que hace una tarjeta de Opciones al pulsarla.
- `changeWith` (función): prepara el `Change` de una pantalla: hace el cambio, lo guarda, vuelve a dibujar y deja el foco en la tarjeta.
- `renderSources` (función): dibuja las fuentes de una nota, con sus enlaces.
- `toggleCard` (función): tarjeta de Opciones que se marca y se desmarca, o que se elige dentro de un grupo.
- `radioGroup` (función): prepara un grupo de opciones en el que solo se marca una, con las flechas para moverse.
- `tabToChecked` (función): hace que el tabulador entre en la tarjeta marcada de un grupo.

### common-end-screen.ts
- `renderEnd` (función): apunta el récord y dibuja el resultado de la partida, con sus fallos.

### common-images.ts
- `imageElement` (función): crea una imagen, con su texto alternativo.
- `preloadImage` (función): descarga y prepara por adelantado la imagen de la pregunta siguiente.

### common-labels.ts
- `QUESTION_COUNT_LABELS` (constante): cómo se escribe cada número de preguntas en Opciones.
- `TIME_LIMIT_LABELS` (constante): cómo se escribe cada tiempo por pregunta.
- `clockTime` (función): tiempo como en un reloj (45:00, 4:07).
- `timeUsed` (función): tiempo usado en palabras («23 min 10 s»).
- `cycleEndText` (función): texto de la tarjeta de fin de vuelta de la partida sin límite.

### common-mode.ts
- `SectionMode` (tipo): lo que cada sección da a la partida común: de dónde salen las preguntas, récords, valoración, etiquetas…

### common-round-screen.ts
- `RoundScreen` (tipo): lo que se puede hacer con la pantalla de la partida desde fuera.
- `createRoundScreen` (función): prepara la pantalla de la partida (pregunta, respuesta, nota, fin de vuelta).

### common-section.ts
- `SectionDefinition` (tipo): el molde de sección: todo lo que una sección da al juego (menú, cabecera, pantallas, botones…).
- `UpcomingSection` (tipo): una sección que vendrá, que sale en el menú como «Próximamente».

### common-timer.ts
- `Timer` (tipo): el reloj de una pregunta en pantalla: arrancar, parar y esconder.
- `createTimer` (función): prepara ese reloj, con lo que se hace cuando el tiempo llega a cero.

### common-widgets.ts
- `roundText` (función): en el inicio, lo que se va a jugar.
- `renderRecord` (función): en el inicio, el récord de la selección.
- `renderQuestionCountGroup` (función): en Opciones, el grupo «Preguntas por partida».
- `fewerQuestionsText` (función): lo que dice una tarjeta de preguntas por partida cuando la selección tiene menos.
- `renderTimeLimitGroup` (función): en Opciones, el grupo «Tiempo por pregunta».
- `answerLine` (función): en el resultado, la línea de la respuesta de un fallo («Respuesta: Oviedo · tú dijiste Gijón»).

## src/sections

### sections.ts
- `SECTION_LIST` (constante): las secciones, en el orden del menú; lo único que se toca al añadir una.
- `UPCOMING_SECTIONS` (constante): la reexporta de `upcoming.ts`, para tener las dos listas en el mismo sitio.

### upcoming.ts
- `UPCOMING_SECTIONS` (constante): las secciones que vendrán (Historia, Gastronomía), solo con su nombre y su descripción.

## src/sections/geografia/engine

### geografia-categories.ts
- `CATEGORIES` (constante): las categorías (capitales, banderas, divisiones), en el orden en que se muestran.
- `CATEGORY_IDS` (constante): sus ids.
- `categoryById` (función): una categoría por su id.

### geografia-id.ts
- `GEOGRAFIA_ID` (constante): el id de la sección («geografia»), escrito una sola vez.

### geografia-options.ts
- `poolFor` (función): de dónde salen las opciones incorrectas de una pregunta.
- `makeOptions` (función): las opciones de una pregunta: la correcta, las trampas y el resto del pool, mezcladas.
- `selectCorrectAnswer` (función): si una pregunta tiene varias respuestas válidas, elige una.
- `prepare` (función): prepara una pregunta para la partida: respuesta, opciones y etiqueta (ver «Nombres que se repiten»).

### geografia-questions.ts
- `curiosidadInfo` (función): la curiosidad de los datos, como información complementaria.
- `significadoInfo` (función): el significado de una bandera, como información complementaria.
- `prepareText` (función): cambia las marcas de los textos (`{provincia:NN}`…) por los nombres en la forma de la pregunta.
- `autonomiaCapitalExplanation` (función): nota automática de una capital autonómica.
- `autonomiaCapitalQuestions` (función): preguntas de capitales autonómicas.
- `provinciaCapitalExplanation` (función): nota de una capital de provincia, que la relaciona con su comunidad.
- `provinciaCapitalQuestions` (función): preguntas de capitales de provincia (las que no se llaman como la provincia).
- `trapComunidadIds` (función): comunidades que se pueden confundir con la de una provincia (sus vecinas).
- `provinciaComunidadQuestions` (función): preguntas de «¿De qué comunidad autónoma es la provincia de…?».
- `trapProvinciaIds` (función): provincias que se pueden confundir con una (sus vecinas).
- `municipioExplanation` (función): nota automática de un municipio: puesto y población.
- `sameNameExplanation` (función): frase sobre los municipios de otras provincias que se llaman igual.
- `municipioProvinciaQuestions` (función): preguntas de «¿De qué provincia es el municipio de…?».
- `Bandera` (tipo): una bandera de `banderas.json`.
- `AUTONOMIA_BANDERAS` (constante): las banderas de las comunidades y ciudades autónomas.
- `PROVINCIA_BANDERAS` (constante): las banderas de provincia (las aprobadas y en uso).
- `toBanderaKey` (función): clave de una bandera («12» o «p48»).
- `banderaByKey` (función): una bandera por su clave.
- `autonomiaBanderaQuestions` (constante): preguntas de banderas de comunidades y ciudades autónomas.
- `provinciaBanderaQuestions` (constante): preguntas de banderas de provincia.

### geografia-rating.ts
- `geografiaRating` (función): la valoración del resultado de una partida de Geografía.

### geografia-round-questions.ts
- `OPTION_COUNTS` (constante): opciones por pregunta que se pueden elegir (4, 6 u 8).
- `OptionCount` (tipo): uno de esos valores.
- `DEFAULT_OPTION_COUNT` (constante): el de por defecto (4).
- `DEFAULT_NAME_FORMS` (constante): formas de los nombres por defecto (las dos).
- `DEFAULT_TERRITORIOS` (constante): territorios por defecto (comunidades y provincias).
- `RoundParams` (tipo): lo que recibe el motor de Geografía para preparar una partida.
- `questionsIn` (función): las preguntas de una categoría en los territorios marcados.
- `countAvailableQuestions` (función): cuántas preguntas distintas tiene la selección (ver «Nombres que se repiten»).
- `pickQuestions` (función): elige las preguntas de una partida, repartidas entre las categorías.
- `buildRound` (función): elige y prepara las preguntas de una partida.
- `reshuffleRound` (función): otra vuelta de la partida sin límite.
- `buildReviewRound` (función): el repaso de fallos.

### geografia-selection.ts
- `canPlay` (función): si con lo marcado en Opciones se puede jugar.
- `roundParams` (función): pasa lo elegido en Opciones a lo que necesita el motor para la partida (`RoundParams`).
- `selectionKey` (función): lo que decide qué preguntas salen; si cambia, la partida preparada ya no vale.
- `recordKey` (función): clave del récord de la selección.

### geografia-settings.ts
- `GeografiaSettings` (tipo): las opciones guardadas de Geografía.
- `loadGeografiaSettings` (función): comprueba las opciones guardadas y cambia lo que no vale por lo de por defecto.
- `geografiaSettings` (función): las opciones de Geografía, ya comprobadas.

### geografia-territorio.ts
- `NameForms` (tipo): un nombre escrito en todas sus formas.
- `Comunidad` (tipo): una comunidad o ciudad autónoma de `territorio.json`.
- `Provincia` (tipo): una provincia de `territorio.json`.
- `Municipio` (tipo): un municipio de `municipios.json`.
- `AUTONOMIAS` (constante): las 17 comunidades y las 2 ciudades autónomas.
- `COMUNIDADES` (constante): solo las 17 comunidades.
- `PROVINCIAS` (constante): las 52 provincias.
- `MUNICIPIOS` (constante): los municipios del juego, por código INE.
- `POPULATION_YEAR` (constante): año de las cifras de población del INE.
- `autonomia` (función): una comunidad o ciudad autónoma por su código.
- `provincia` (función): una provincia por su código.
- `provinciasOf` (función): las provincias de una comunidad.
- `capitalesOf` (función): las capitales de una comunidad, con todas sus formas.
- `municipioProvinciaId` (función): el código de la provincia de un municipio.
- `isCapital` (función): si un municipio es la capital de su provincia.
- `neighborAutonomias` (función): comunidades que tienen frontera con unas provincias.
- `deAutonomiaText` (función): «de Galicia», «del País Vasco»…
- `poolsFor` (función): las listas de las que salen las opciones incorrectas, en una forma de los nombres.

### geografia-types.ts
- `Question` (tipo): una pregunta del banco de Geografía, antes de prepararla para una partida.
- `RoundQuestion` (tipo): una pregunta de Geografía preparada para jugar.
- `Territorio` (tipo): comunidad o provincia.
- `TERRITORIOS` (constante): los dos territorios, en orden.
- `NameForm` (tipo): una forma de los nombres (oficial o castellano).
- `NAME_FORMS` (constante): las formas, con la oficial primero.
- `Category` (tipo): una categoría (capitales, banderas, divisiones).
- `Pools` (tipo): las listas de las que salen las opciones incorrectas.

## src/sections/geografia/ui

### geografia-banderas.ts
- `banderaUrl` (función): la dirección del archivo de una bandera, por su clave.
- `banderaImage` (función): la imagen de una bandera, con su texto alternativo.
- `banderaQuestionImage` (función): la imagen de una pregunta de Geografía, si tiene bandera.

### geografia-credits.ts
- `renderBanderaCredits` (función): la lista de banderas, con autor y licencia, en los Créditos de Geografía.

### geografia-labels.ts
- `NAME_LABELS` (constante): cómo se presenta cada forma de los nombres en Opciones.
- `TERRITORIO_LABELS` (constante): cómo se presenta cada territorio, en Opciones y en la etiqueta de la pregunta.
- `OPTION_COUNT_DESCRIPTIONS` (constante): la explicación de cada dificultad en Opciones.

### geografia-mode.ts
- `geografiaMode` (función): lo que Geografía da a la partida común (`SectionMode`).

### geografia-section.ts
- `geografiaSection` (constante): lo que Geografía da al juego (`SectionDefinition`).

### geografia-settings-screen.ts
- `createGeografiaSettings` (función): prepara la pantalla de Opciones de Geografía.

### geografia-start-screen.ts
- `renderGeografiaStart` (función): dibuja el inicio de Geografía.

## src/sections/ccse/engine

### ccse-id.ts
- `CCSE_ID` (constante): el id de la sección («ccse»), escrito una sola vez.

### ccse-questions.ts
- `Tarea` (tipo): una tarea del examen (número y nombre).
- `CcseEntry` (tipo): una entrada de `ccse.json`, tal como está (puede estar vacía o a medias).
- `CcseQuestion` (tipo): una pregunta completa, lista para jugar.
- `CcseRoundQuestion` (tipo): una pregunta del examen preparada para una partida, con sus opciones en orden.
- `CcseRoundParams` (tipo): lo que recibe el motor del examen para preparar una partida.
- `ANSWER_LETTERS` (constante): las letras de las respuestas (a, b, c).
- `EntryStatus` (tipo): si una entrada está vacía, completa o a medias (y qué le falta).
- `entryStatus` (función): calcula ese estado.
- `TAREAS` (constante): las cinco tareas.
- `TAREA_IDS` (constante): sus números.
- `tarea` (función): una tarea por su número.
- `tareaName` (función): cómo se nombra una tarea («Tarea 1 · Gobierno, legislación…»).
- `CCSE_ENTRIES` (constante): todas las entradas de la plantilla.
- `CCSE_QUESTIONS` (constante): las preguntas que ya se pueden jugar.
- `tareaQuestions` (función): las preguntas de las tareas marcadas.
- `tareasWithQuestions` (función): las tareas que ya tienen preguntas.
- `countAvailableQuestions` (función): cuántas preguntas hay en las tareas marcadas (ver «Nombres que se repiten»).
- `prepare` (función): prepara una pregunta: baraja las opciones, salvo las de orden fijo.
- `buildRound` (función): las preguntas de una partida, al azar y sin repetir.
- `reshuffleRound` (función): otra vuelta de la partida sin límite.
- `buildReviewRound` (función): el repaso de fallos.

### ccse-rating.ts
- `CCSE_APTO_RATIO` (constante): el aprobado de la prueba real (el 60 %), referencia de la valoración.
- `ccseRating` (función): la valoración del resultado de una partida del examen.

### ccse-selection.ts
- `canPlay` (función): si se puede jugar (alguna tarea marcada con preguntas).
- `selectionKey` (función): lo que decide qué preguntas salen; si cambia, la partida preparada ya no vale.
- `recordKey` (función): clave del récord de la selección.

### ccse-settings.ts
- `CcseSettings` (tipo): las opciones guardadas del examen.
- `loadCcseSettings` (función): comprueba las opciones guardadas y cambia lo que no vale por lo de por defecto.
- `ccseSettings` (función): las opciones del examen, ya comprobadas.

### ccse-simulacro-rules.ts
- `SIMULACRO_DISTRIBUTION` (constante): cuántas preguntas salen de cada tarea (10, 3, 2, 3 y 7).
- `SIMULACRO_QUESTION_COUNT` (constante): el total (25).
- `SIMULACRO_MINUTES` (constante): el tiempo para todo el simulacro (45).
- `SIMULACRO_APTO_HITS` (constante): los aciertos para el apto (15).
- `SIMULACRO_RECORD_KEY` (constante): la clave del mejor resultado del simulacro.

### ccse-simulacro.ts
- `Simulacro` (clase): el simulacro en marcha: qué pregunta se ve, las respuestas y la entrega.
- `SimulacroResult` (tipo): el resultado del simulacro: aciertos, apto, fallos y aciertos por tarea.
- `canDoSimulacro` (función): si hay preguntas de sobra en cada tarea para hacerlo.
- `simulacroQuestions` (función): las preguntas de un simulacro, por tareas y en orden.
- `applySimulacroRecord` (función): apunta el resultado si es el mejor.

## src/sections/ccse/ui

### ccse-mode.ts
- `ccseMode` (función): lo que el examen da a la partida común (`SectionMode`).

### ccse-section.ts
- `ccseSection` (constante): lo que el examen da al juego (`SectionDefinition`).

### ccse-settings-screen.ts
- `createCcseSettings` (función): prepara la pantalla de Opciones del examen.

### ccse-simulacro-screen.ts
- `SimulacroScreen` (tipo): lo que se puede hacer con las pantallas del simulacro desde fuera.
- `simulacroText` (función): qué es el simulacro, para el inicio del examen (sale de sus reglas).
- `renderSimulacroStart` (función): el bloque del simulacro en el inicio del examen.
- `createSimulacroScreen` (función): prepara las pantallas del simulacro y de su resultado.

### ccse-start-screen.ts
- `renderCcseStart` (función): dibuja el inicio del examen.
