// Configuración de SVGO, el programa que limpia los SVG de las banderas (npm run limpiar-banderas).
// Quita lo que no se ve (datos del programa de dibujo, comentarios, decimales de sobra) sin cambiar el dibujo.
export default {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // El viewBox hace que el dibujo se adapte al tamaño con que se muestra: no se quita.
          removeViewBox: false
        }
      }
    }
  ]
};
