# Notas para Claude

Contexto y decisiones del proyecto. El README explica el código; aquí van las reglas de trabajo y el porqué de las decisiones.

## Proyecto

- **Aprende sobre España** (repositorio `Psikhe-code/aprende-sobre-espana`). El juego se llama todavía **Geoquiz España** por dentro (título, icono, manifiesto); renombrarlo está pendiente de decidir con el usuario.
- Juego de preguntas tipo test, hecho con TypeScript + Vite, publicado en GitHub Pages y pensado para acabar como app de Android con Capacitor.
- Ahora tiene dos categorías, **Capitales** y **Banderas**, y una opción de **territorio** (comunidades, provincias o las dos) que decide qué preguntas de cada categoría salen. De provincias solo hay, por ahora, las 8 capitales que no se llaman como su provincia, con trampas que se sortean en cada partida: la capital y las ciudades conocidas de provincias cercanas, y las de la propia provincia (en Asturias: Santander, Torrelavega, León, Ponferrada, Lugo, A Coruña, Ferrol, Gijón, Avilés…). Las trampas tienen que ser nombres relativamente conocidos que de verdad confundan; en las vascas, todas las ciudades vascas. Además, siempre sale como opción el nombre de la provincia («Asturias»): decidido así, aunque el jugador acabe sabiendo que nunca es la respuesta, porque esas excepciones son justo lo que se quiere enseñar. La rama `prototipo-v0.1` guarda el prototipo anterior con 8 categorías (provincias, ríos, relieve, costas…) para recuperarlas más adelante, ya con los criterios de abajo.

## Reglas de trabajo

- **Privacidad:** no uses nunca el correo electrónico del usuario en ningún sitio: commits, cabeceras, archivos ni servicios externos. Los commits van firmados como `Psikhe-code <350356863+Psikhe-code@users.noreply.github.com>`. No escribas su nombre real en ningún sitio.
- **Tus cambios, siempre en una rama y con un pull request.** El PR es el momento en que el usuario revisa lo que has hecho; él lo mezcla. No subas nada directamente a `main`. Cada PR lleva una explicación clara en español de qué cambia y cómo se ha comprobado, con lo que se vio al probarlo en el navegador (capturas si ayudan).
- **Los cambios del usuario** pueden ir directamente a `main` si son pequeños, como corregir una nota o una errata; edita desde github.dev. Para cambios más grandes o que toquen varios archivos, recomiéndale una rama. Si un cambio suyo en `main` hace fallar los tests (la publicación se para), avísale y propón el arreglo en un PR.
- **Enlaces de prueba por PR** (Netlify, Cloudflare Pages…): descartados por ahora, porque trabaja solo y aún no hay jugadores. Reconsiderarlo si eso cambia. Para probar una rama sin mezclarla, la opción es Codespaces.
- **Si el usuario solo pregunta, responde sin cambiar nada.** Haz cambios cuando los pida.
- El usuario está aprendiendo GitHub y programación. Explica en lenguaje claro, en español, sin dar por sabidos los términos técnicos.
- Antes de abrir un PR: `npx tsc --noEmit`, `npm test` y probar el juego en un navegador (Playwright), en móvil y escritorio.
- Interfaz, datos, documentación y mensajes de commit, en español.

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
- Cada bandera guarda su `fuente` (archivo, enlace, autor, licencia) en `banderas.json`. Las CC BY / CC BY-SA exigen autor, y aparecen en la pantalla de Créditos.
- Cada bandera tiene `descripcion` (cómo es, en lenguaje sencillo) y `significado` (una idea por línea). Criterios acordados para el significado:
  - Cada nota se entiende sola, sin dar por leídas las demás. Las que comparten las barras de Aragón usan la misma frase.
  - Se cuenta directamente, sin «según la ley…» ni «según el acuerdo…». Lo dudoso o tradicional se marca con «se suele decir», «según la tradición» o «según una leyenda», y lo que no tiene explicación, con «no hay una explicación clara».
  - Palabras sencillas: «bandera» en vez de «pendón» o «estandarte», «cuadros» en vez de «cuarteles».
  - El nombre propio de la bandera (senyera, ikurriña…) va en la última línea.
  - Antes de proponer un texto, comprobar las fuentes; si no hay respaldo, decirlo.
- En las notas, los nombres que cambian según la forma van con marcas (`{provincia:NN}`, `{provincia.capital:NN}`); ver el README.
- Desde el entorno de Claude, Wikimedia limita mucho las peticiones. Para descargar banderas se usa GitHub Actions: subir la rama `banderas-descarga` ejecuta `scripts/descargar-banderas.py` (ver README).

## Pendiente

- Siguiente paso acordado: **pertenencia**. En comunidades, «¿De qué comunidad es la provincia de Soria?» (43 provincias: se quitan las 9 que forman ellas solas una comunidad o ciudad autónoma). En provincias, «¿De qué provincia es Vigo?», que necesita el `ciudades.json`.
- Banderas de provincia: antes, comprobar cuáles tienen bandera oficial y si es de la provincia o de la Diputación.
- Preguntas al revés, como opción, cuando tenga sentido: de la capital a la comunidad, o de la comunidad a elegir entre varias banderas (esta necesita opciones con imagen).

- Renombrar el juego (ahora «Geoquiz España») si el usuario lo decide.
- Optimizar el peso de las banderas: el juego carga unos 2 MB; la de Navarra pesa más de 400 KB.
- Dificultades (4, 6 u 8 opciones, ya admitidas por el motor; trampas más o menos parecidas; respuesta abierta).
- Guardado con estadísticas por categoría y por pregunta (usando los identificadores), y desbloqueo de categorías.
- Recuperar las categorías del prototipo con los criterios actuales. Idea comentada: un `ciudades.json` aparte, con código INE de municipio, al que apunten las capitales.
- App de Android con Capacitor.
