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

const app = startApp();

// Modo sin conexión. Cuando se publica una versión nueva, se descarga en segundo plano
// pero solo se aplica (recargando) en el inicio u opciones: nunca a mitad de partida.
if ("serviceWorker" in navigator) {
  try {
    let pending = false;
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        pending = true;
        if (app.isIdle()) void updateSW(true);
      }
    });
    app.onIdle(() => { if (pending) void updateSW(true); });
  } catch {
    // Sin service worker el juego funciona igual, solo necesita conexión.
  }
}
