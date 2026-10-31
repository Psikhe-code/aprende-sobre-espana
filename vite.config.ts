import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import paquete from "./package.json";

export default defineConfig({
  // Rutas relativas: el mismo build sirve en un servidor, en GitHub Pages o dentro de la app de Android.
  base: "./",
  // Versión (la de package.json) y momento de la publicación: se muestran al pie de la pantalla de inicio.
  define: {
    __VERSION__: JSON.stringify(paquete.version),
    __PUBLICADO__: JSON.stringify(new Date().toISOString())
  },
  plugins: [
    VitePWA({
      // "prompt": la versión nueva espera a que el juego decida cuándo aplicarla (ver src/main.ts).
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Aprende sobre España",
        short_name: "Aprende España",
        description: "Juego de preguntas sobre geografía de España",
        lang: "es",
        start_url: "./",
        display: "standalone",
        background_color: "#edf1eb",
        theme_color: "#14243a",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // Modo sin conexión: al abrir el juego se guarda solo lo imprescindible (código, estilos, fuentes e iconos).
        // Las banderas no se descargan todas de golpe: cada una se guarda la primera vez que sale en una partida
        // (runtimeCaching, abajo), así que sin conexión funcionan las que ya se han visto.
        // Cuando sea una app de Android, todas las banderas irán dentro de la app.
        globPatterns: ["**/*.{js,css,html,png,woff2}", "icon.svg"],
        runtimeCaching: [
          {
            // Las imágenes de assets/ llevan en el nombre una huella de su contenido (navarra-DPTmvb2U.svg):
            // si una bandera cambia, cambia su nombre, así que la copia guardada nunca queda vieja.
            urlPattern: ({ url }) => /\/assets\/[^/]+\.svg$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "banderas", expiration: { maxEntries: 100 } }
          }
        ]
      }
    })
  ],
  test: {
    include: ["tests/**/*.test.ts"]
  }
});
