# Notas para Claude

Contexto y decisiones del proyecto. El README explica el código; aquí van las reglas de trabajo y el porqué de las decisiones.

## Proyecto

- **Aprende sobre España** (repositorio `Psikhe-code/aprende-sobre-espana`). El juego se llamaba antes «Geoquiz España»; al cambiar el nombre también cambió la clave del guardado (ahora `aprende-sobre-espana`), y el usuario aceptó perder los récords de entonces.
- Juego de preguntas tipo test, hecho con TypeScript + Vite, publicado en GitHub Pages y pensado para acabar como app de Android con Capacitor.
- Ahora tiene tres categorías, **Capitales**, **Banderas** y **Divisiones**, y una opción de **territorio** (comunidades, provincias o las dos) que decide qué preguntas de cada categoría salen. De provincias solo hay, por ahora, las 8 capitales que no se llaman como su provincia, con trampas que se sortean en cada partida: la capital y las ciudades conocidas de provincias cercanas, y las de la propia provincia (en Asturias: Santander, Torrelavega, León, Ponferrada, Lugo, A Coruña, Ferrol, Gijón, Avilés…). Las trampas tienen que ser nombres relativamente conocidos que de verdad confundan; en las vascas, todas las ciudades vascas. Además, siempre sale como opción el nombre de la provincia («Asturias»): decidido así, aunque el jugador acabe sabiendo que nunca es la respuesta, porque esas excepciones son justo lo que se quiere enseñar. La rama `prototipo-v0.1` guarda el prototipo anterior con 8 categorías (provincias, ríos, relieve, costas…) para recuperarlas más adelante, ya con los criterios de abajo.

## Reglas de trabajo

- **Privacidad:** no uses nunca el correo electrónico del usuario en ningún sitio: commits, cabeceras, archivos ni servicios externos. Los commits van firmados como `Psikhe-code <350356863+Psikhe-code@users.noreply.github.com>`. No escribas su nombre real en ningún sitio.
- **Tus cambios, siempre en una rama y con un pull request.** El PR es el momento en que el usuario revisa lo que has hecho; él lo mezcla. No subas nada directamente a `main`. Cada PR lleva una explicación clara en español de qué cambia y cómo se ha comprobado, con lo que se vio al probarlo en el navegador (capturas si ayudan).
- **Los cambios del usuario** pueden ir directamente a `main` si son pequeños, como corregir una nota o una errata; edita desde github.dev. Para cambios más grandes o que toquen varios archivos, recomiéndale una rama. Si un cambio suyo en `main` hace fallar los tests (la publicación se para), avísale y propón el arreglo en un PR.
- **Enlaces de prueba por PR** (Netlify, Cloudflare Pages…): descartados por ahora, porque trabaja solo y aún no hay jugadores. Reconsiderarlo si eso cambia. Para probar una rama sin mezclarla, la opción es Codespaces.
- **Si el usuario solo pregunta, responde sin cambiar nada.** Haz cambios cuando los pida.
- El usuario está aprendiendo GitHub y programación. Explica en lenguaje claro, en español, sin dar por sabidos los términos técnicos.
- **Comprobaciones antes de un PR, según el tipo de cambio** (para no gastar tiempo ni tokens de más):
  - Textos, notas, trampas o datos: solo `npx tsc --noEmit` y `npm test`. Sin tests nuevos ni navegador.
  - Lógica del motor (cómo se eligen preguntas u opciones): lo anterior y tests nuevos de esa lógica.
  - Pantalla o diseño: lo anterior y probar el juego en un navegador (Playwright), en móvil y escritorio, con las capturas justas.
- **Los tests comprueban reglas, no copian contenido:** las expectativas se calculan a partir de los datos («las trampas son las capitales de las provincias de `trampas`»), no se escriben a mano («las trampas de Asturias son Santander, León…»). Así, cambiar una nota o una trampa en los JSON no obliga a tocar los tests. Los textos que genera el código (notas automáticas) sí se comprueban palabra por palabra.
- Interfaz, datos, documentación y mensajes de commit, en español.
- **Versión:** cada PR sube la versión de `package.json` (`npm version X.Y.Z --no-git-tag-version`) y el PR dice cuál trae. Acordado con el usuario: en esta primera etapa todo va en 0.1.x, subiendo solo el último número en cada PR; el del medio, en hitos grandes (recuperar las categorías del prototipo, la app de Android…); 1.0, cuando el usuario lo dé por terminado. La versión y la fecha de publicación se ven al pie del inicio.

## Decisiones sobre los datos

- Todo se identifica por **código INE**: comunidades `01`–`17`, ciudades autónomas `18` (Ceuta) y `19` (Melilla), provincias `01`–`52`. Los archivos van **ordenados por código** y los tests lo comprueban.
- **Nombres en todas sus formas, aunque coincidan, con la oficial primero:** `{ "oficial": "Girona", "castellano": "Gerona" }`. Castellano = forma recomendada por la RAE para textos en español. Oficial = denominación oficial (INE/BOE). La estructura está pensada para añadir más formas (p. ej. inglés).
- En Opciones, el jugador marca qué formas quiere (oficial, castellano o las dos; por defecto, las dos). Cada pregunta sale **entera** en una forma, sorteada si hay varias, y al responder se muestran las otras formas del nombre.
- Las repeticiones en una partida se comparan **por lugar** (`answerKey`), no por cómo se escribe.
- Ceuta y Melilla son `tipo: "ciudad"`. Salen en capitales (su capital es la propia ciudad, con una nota que lo explica) y en banderas. El enunciado de banderas es igual para todas («comunidad o ciudad autónoma») para no delatar la respuesta.
- Capitales: el pool son todas las capitales (autonómicas y de provincia); las trampas, las capitales de provincia de la misma comunidad (en Ceuta y Melilla, la otra ciudad). Además, una trampa fija que sale siempre (`trampasCapital`): el nombre de la comunidad como si fuera una ciudad (Andalucía, Cantabria, Rioja en vez de La Rioja), algo parecido (La Mancha, León, Euskadi) o sus islas (Mallorca; Gran Canaria o Tenerife). En Aragón se sortea entre «Aragón» y «Jaca», su primera capital. No la llevan Madrid, Murcia, Valencia, Ceuta y Melilla, porque ahí la capital se llama como la comunidad; en esas cinco se hace lo contrario: ciudades reales y conocidas como trampas sorteadas (`ciudadesTrampa`): Alcalá de Henares, Aranjuez y El Escorial; Cartagena; Elche y Benidorm; y para Ceuta y Melilla, compartidas, Tetuán, Tánger, Nador, Alhucemas, Algeciras y Tarifa.
- Los esquemas JSON de `src/data/schema/` documentan cada campo; los JSON no admiten comentarios.

## Banderas

- Son las versiones **oficiales de Wikimedia Commons**, con escudo cuando la oficial lo lleva, y se muestran con su proporción real.
- Van en **SVG** (decisión del usuario: nítidas en cualquier pantalla), **limpias con SVGO** (`npm run limpiar-bandera -- <archivo>`, solo las nuevas; un test lo comprueba). Comprobado punto a punto que la limpieza no cambia nada visible. Se probó WebP para las de provincia y se descartó.
- `banderas.json` tiene dos listas, `comunidades` y `provincias`, como `territorio.json`; las imágenes, en `banderas/comunidades/` y `banderas/provincias/`. Criterio del usuario: estandarizar la forma de hacer las cosas salvo que haya un motivo concreto.
- Cada bandera guarda su `fuente` (archivo, enlace, autor, licencia) en `banderas.json`. Las CC BY / CC BY-SA exigen autor, y aparecen en la pantalla de Créditos.
- Cada bandera tiene `descripcion` (cómo es, en lenguaje sencillo) y `significado` (una idea por línea). Criterios acordados para el significado:
  - Cada nota se entiende sola, sin dar por leídas las demás. Las que comparten las barras de Aragón usan la misma frase.
  - Se cuenta directamente, sin «según la ley…» ni «según el acuerdo…». Lo dudoso o tradicional se marca con «se suele decir», «según la tradición» o «según una leyenda», y lo que no tiene explicación, con «no hay una explicación clara».
  - Palabras sencillas: «bandera» en vez de «pendón» o «estandarte», «cuadros» en vez de «cuarteles».
  - El nombre propio de la bandera (senyera, ikurriña…) va en la última línea.
  - Antes de proponer un texto, comprobar las fuentes; si no hay respaldo, decirlo.
- En las notas, los nombres que cambian según la forma van con marcas (`{provincia:NN}`, `{provincia.capital:NN}`); ver el README.
- Desde el entorno de Claude, Wikimedia limita mucho las peticiones y muchas webs no se pueden abrir. Para descargar se usa GitHub Actions con ramas temporales que no se mezclan y se borran al terminar (ver README, «Descargas con GitHub Actions»): `banderas-descarga` ejecuta `scripts/descargar-banderas.py` (archivos de Commons: banderas, escudos…) y `paginas-descarga` ejecuta `scripts/descargar-paginas.py` (páginas web, con sus imágenes y PDF si se pide).

## Pendiente

- Divisiones (antes llamada «pertenencia») en comunidades ya está: «¿De qué comunidad autónoma es la provincia de Soria?», 43 provincias (sin las 9 que forman ellas solas una comunidad o ciudad autónoma), con las comunidades vecinas como trampas (campo `vecinas` de cada provincia). En provincias: «¿De qué provincia es el municipio de Vigo?» («municipio» en la pregunta, por decisión del usuario, para que no haya confusión cuando se llaman igual), con los datos de `municipios.json`. El nombre «Divisiones» se eligió porque la categoría va del territorio que contiene a lo que tiene dentro (provincias de cada comunidad, municipios de cada provincia); en la partida, cada pregunta lleva su etiqueta («Municipios de cada provincia»).
- **Municipios** (criterios del usuario): entran siempre los tres más poblados de cada provincia, contando la capital (aunque se llame como la provincia y la pregunta sea fácil), y además los conocidos por historia o cultura, con su `motivo`. La nota se genera con los datos: puesto y población (INE y año) en los tres primeros; población y motivo en los demás. En los motivos, evitar repetir «conocido» (la frase ya dice «pero es muy conocido:»). Pendiente: las `curiosidad` (segunda fase, por comunidades, revisándolas con el usuario y con fuentes), y que las `ciudades` de `territorio.json` (trampas de las capitales) apunten a `municipios.json` (faltan Alcudia, Sóller, Mieres y Durango, que no están entre los municipios). Población: `scripts/actualizar-poblacion.py` con el Excel del INE (descargado con la herramienta de páginas).
- Banderas de provincia: hay 15, las aprobadas formalmente y en uso público (criterio del usuario). Fuera quedan Barcelona (aprobada en 1971, casi sin uso), Lugo (en uso, pero su aprobación de 2006 nunca se publicó) y las que solo se usan sin aprobación (Ávila, Soria, Palencia, Salamanca, Valladolid, León, Huesca, Zaragoza, Málaga, Pontevedra…). Si alguna se aprueba o se confirma su uso, se puede añadir.
- Preguntas al revés, como opción, cuando tenga sentido: de la capital a la comunidad, o de la comunidad a elegir entre varias banderas (esta necesita opciones con imagen).

- Modo sin conexión: decidido, mientras sea web, guardar al abrir solo el código y cada bandera cuando sale por primera vez (no descargar todas de golpe). En la app de Android irán todas dentro. La bandera de la pregunta siguiente se descarga y se dibuja por adelantado (en un móvil lento, las más pesadas pasan de casi 1 s a unas décimas). La primera de cada partida también: la partida se prepara en el inicio y al terminar la anterior.
- Dificultad: ya se elige 4, 6 u 8 opciones en Opciones. Falta la **respuesta abierta** (está en Opciones como «próximamente», sin poder marcarse): decidir cómo comparar lo escrito (tildes, mayúsculas, formas oficial y castellana, «Vitoria» y «Vitoria-Gasteiz»).
- **Puntuación** (idea del usuario, para más adelante; de momento no preocuparse de la puntuación): puntos aparte del récord de aciertos, con tiempo máximo por pregunta y más puntos por ir rápido, multiplicadores por racha, y más puntos por dificultad y por jugar con más categorías a la vez.
- Guardado con estadísticas por categoría y por pregunta (usando los identificadores), y desbloqueo de categorías.
- Recuperar las categorías del prototipo con los criterios actuales, usando `municipios.json` cuando hagan falta ciudades.
- App de Android con Capacitor.
