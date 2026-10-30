// Fuentes incluidas en el proyecto (solo alfabeto latino): el juego no depende de internet.
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/literata/latin-500.css";
import "@fontsource/literata/latin-600.css";
import "./ui/styles.css";

import { registerSW } from "virtual:pwa-register";
import { startApp } from "./ui/app";

startApp();

// Modo sin conexión: guarda el juego en el dispositivo y lo actualiza solo.
if ("serviceWorker" in navigator) {
  try {
    registerSW({ immediate: true });
  } catch {
    // Sin service worker el juego funciona igual, solo necesita conexión.
  }
}
