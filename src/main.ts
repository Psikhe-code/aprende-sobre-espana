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
import { RECARGA_POR_ACTUALIZACION, startApp } from "./ui/app";

const app = startApp();

// Modo sin conexión. Cuando se publica una versión nueva, se descarga en segundo plano
// pero solo se aplica (recargando) en el inicio u opciones: nunca a mitad de partida.
if ("serviceWorker" in navigator) {
  try {
    let pending = false;
    // Antes de recargar, si el jugador está dentro de una sección, se apunta para que siga en ella (app.ts).
    const actualizar = () => {
      try {
        if (!app.enMenu()) sessionStorage.setItem(RECARGA_POR_ACTUALIZACION, "1");
      } catch { /* sin sessionStorage, se abre el menú */ }
      void updateSW(true);
    };
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        pending = true;
        if (app.isIdle()) actualizar();
      }
    });
    app.onIdle(() => { if (pending) actualizar(); });
  } catch {
    // Sin service worker el juego funciona igual, solo necesita conexión.
  }
}
