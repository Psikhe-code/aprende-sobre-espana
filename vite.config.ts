import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Rutas relativas: el mismo build sirve en un servidor, en GitHub Pages o dentro de la app de Android.
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Geoquiz España",
        short_name: "Geoquiz",
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
        // Todo el juego (código, fuentes y banderas) queda guardado para jugar sin conexión.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"]
      }
    })
  ],
  test: {
    include: ["tests/**/*.test.ts"]
  }
});
