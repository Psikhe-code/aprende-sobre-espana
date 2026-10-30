# Geoquiz España

Juego de preguntas sobre geografía de España: provincias, capitales, comunidades, banderas, ríos, relieve y costas.
Partidas de 10 preguntas con opciones, explicación de cada respuesta y repaso de fallos.

Hecho con TypeScript y Vite. Funciona en el navegador, se puede instalar como app (PWA) y funciona sin conexión.

## Puesta en marcha

Necesitas [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install        # instala las dependencias (una sola vez)
npm run dev        # arranca el juego en http://localhost:5173 y se recarga al guardar cambios
```

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm test` | Comprueba el contenido y la lógica del juego (ver [Tests](#tests)) |
| `npm run build` | Comprueba los tipos y genera la versión final en `dist/` |
| `npm run preview` | Sirve la versión de `dist/` para probarla tal cual se publicará |

## Publicación

Cada cambio que se sube a la rama `main` de GitHub se publica solo en GitHub Pages
(`.github/workflows/publicar.yml`): instala, pasa los tests, compila y sube la web.
Si un test falla, no se publica y la web se queda con la última versión buena.
El progreso se ve en la pestaña **Actions** del repositorio.

## Estructura

```
src/
  data/                    ← CONTENIDO (lo que más se edita)
    territorio.json        provincias, capitales y comunidades
    pools.json             listas de las que salen las opciones incorrectas (ríos, picos, islas…)
    preguntas/*.json       preguntas escritas a mano, un archivo por categoría
    banderas.json          trampas y explicación de cada bandera
    banderas/*.svg         una imagen por comunidad
  engine/                  ← LÓGICA DEL JUEGO (sin interfaz)
    territory.ts           carga el territorio y monta los pools
    questions.ts           convierte el JSON y genera las preguntas automáticas (capitales, banderas…)
    options.ts             genera las opciones de cada pregunta
    round.ts               elige las preguntas de una partida
    categories.ts          lista de categorías
    storage.ts             récords y ajustes guardados en el dispositivo
  ui/                      ← INTERFAZ
    app.ts                 pantallas y botones
    styles.css             estilos (tema claro y oscuro)
tests/                     comprobaciones automáticas
public/                    iconos de la app
```

## Cómo funcionan las opciones

Cada pregunta tiene un **tipo de respuesta** (`rio`, `provincia`, `capitalCualquiera`…). Las opciones incorrectas salen de ese pool:

- Algunas son **trampas** fijas: las confusiones típicas (Badajoz como capital de Extremadura).
- Al menos una es siempre **aleatoria** del pool, para que las partidas no se repitan.
- Lo que está en **excluir** nunca sale (por ejemplo, el Gállego en «¿Qué río pasa por Zaragoza?», porque también llega a la ciudad).

El número de opciones es un parámetro (`DEFAULT_OPTIONS` en `src/engine/round.ts`): el mismo contenido sirve para 4, 6 u 8 opciones.

## Añadir o corregir preguntas

Edita el JSON de la categoría en `src/data/preguntas/`. Formato:

```json
{
  "pregunta": "¿Qué río pasa por Zaragoza?",
  "respuesta": "Ebro",
  "tipo": "rio",
  "trampas": ["Segre", "Jalón", "Duero"],
  "explicacion": "El Ebro cruza Zaragoza, donde también desembocan el Gállego y el Huerva.",
  "excluir": ["Gállego", "Huerva"]
}
```

| Campo | Obligatorio | Significado |
| --- | --- | --- |
| `pregunta` | sí | Enunciado |
| `respuesta` | sí | La correcta. Si es una lista, se elige una al azar en cada partida |
| `tipo` | sí | Pool de incorrectas: una clave de `pools.json`, o `provincia`, `capital`, `ciudad`, `comunidad`, `capitalCualquiera`, `isla`. `"num"` genera números dentro de `rango`. `null` = todas las incorrectas salen de `trampas` (pon al menos 7 para que funcione con 8 opciones) |
| `trampas` | no | Incorrectas fijas |
| `explicacion` | sí | Se muestra al responder |
| `excluir` | no | Valores del pool que no deben salir nunca |
| `rango` | solo `num` | `[mínimo, máximo]` |

Después ejecuta `npm test`: si algo no cuadra (un tipo que no existe, una trampa igual a la respuesta…), el test dice qué pregunta falla.

Las preguntas de **capitales de provincia, capitales autonómicas, comunidad de cada provincia y banderas** se generan solas a partir de `territorio.json` y `banderas.json` (ver `src/engine/questions.ts`).

### Añadir una categoría

1. Crea `src/data/preguntas/mi-categoria.json` (o un generador en `questions.ts`).
2. Añádela a la lista de `src/engine/categories.ts`.

Aparece sola en Opciones, y a quien ya tuviera categorías guardadas se le marca automáticamente.

## Banderas

Las de `src/data/banderas/` son **dibujos simplificados** hechos para el prototipo: los colores y franjas son fieles, pero los escudos están simplificados y Andalucía, Extremadura, La Rioja y Galicia van sin escudo.

Para usar las oficiales: descarga el SVG de cada comunidad de Wikimedia Commons (búscalo como «Flag of Andalucía.svg», etc.) y guárdalo con el **mismo nombre de archivo** en `src/data/banderas/`. Revisa la licencia de cada archivo; los símbolos oficiales suelen estar en dominio público. Si las nuevas llevan escudo, actualiza la `nota` en `banderas.json`.

## Tests

`npm test` comprueba, entre otras cosas:

- Que hay 50 provincias y 17 comunidades, cada una con capital y bandera.
- Que todos los tipos de respuesta existen y ninguna trampa coincide con la respuesta.
- Con 4, 6 y 8 opciones, en todas las preguntas: la correcta aparece, no hay duplicados ni excluidos.
- Que en Canarias ninguna de sus dos capitales sale como incorrecta.
- En 300 partidas al azar: 10 preguntas, sin repeticiones y bien repartidas entre categorías.

## Próximos pasos

- **Dificultades**: 4, 6 u 8 opciones (ya soportado por el motor) y respuesta abierta.
- **Desbloqueo de categorías** y progreso por categoría (en `storage.ts`).
- **Banderas oficiales** (ver arriba) y **modo mapa** («toca la provincia») con contornos del Instituto Geográfico Nacional.
- **App de Android** con [Capacitor](https://capacitorjs.com):
  ```bash
  npm install @capacitor/core @capacitor/cli @capacitor/android
  npx cap init "Geoquiz España" es.geoquiz.app --web-dir dist
  npx cap add android
  npm run build && npx cap sync android
  npx cap open android     # abre Android Studio para compilar y probar
  ```
