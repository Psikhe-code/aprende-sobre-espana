/**
 * @fileoverview Que la documentación del código no se quede atrás: todo archivo de `src` está en la estructura del README
 * (y el README no nombra archivos que ya no existen), y todo archivo de código empieza con su `@fileoverview`.
 */

import { describe, expect, it } from "vitest";
import readme from "../README.md?raw";

// Solo los nombres de los archivos (no se cargan: sin `eager`, son funciones que nadie llama).
const SRC_FILES = Object.keys(import.meta.glob("../src/**/*")).map((path) => path.replace(/^\.\.\//, ""));

// El código de todo el proyecto, como texto: el juego, los tests, los tests de pantalla y la configuración.
const CODE = import.meta.glob(["../src/**/*.ts", "./**/*.ts", "../screen-tests/**/*.ts", "../*.ts"], {
  eager: true, query: "?raw", import: "default"
}) as Record<string, string>;

/**
 * Lo que dice la sección «Estructura» del README: el árbol entre ``` y ```, con los archivos (cada uno con su ruta
 * completa, sacada de la sangría) y las carpetas que se nombran sin detallar lo que tienen dentro (como `banderas/`).
 */
function readmeTree() {
  const section = readme.slice(readme.indexOf("## Estructura"));
  const tree = section.slice(section.indexOf("```") + 3, section.indexOf("```", section.indexOf("```") + 3));
  const files: string[] = [];
  const folders: { indent: number; path: string; hasChildren: boolean }[] = [];
  const open: { indent: number; path: string }[] = [];
  for (const line of tree.split("\n")) {
    const match = line.match(/^( *)(\S+)/);
    if (!match) continue;
    const indent = match[1].length;
    const name = match[2];
    while (open.length && open[open.length - 1].indent >= indent) open.pop();
    const path = (open.length ? open[open.length - 1].path : "") + name;
    const parent = folders.find((f) => f.path === open[open.length - 1]?.path);
    if (parent) parent.hasChildren = true;
    if (name.endsWith("/")) {
      folders.push({ indent, path, hasChildren: false });
      open.push({ indent, path });
    } else files.push(path);
  }
  return { files, foldersWithoutDetail: folders.filter((f) => !f.hasChildren).map((f) => f.path) };
}

describe("estructura del README", () => {
  const { files, foldersWithoutDetail } = readmeTree();

  it("cada archivo de src está, con su carpeta, en la estructura del README (salvo los de una carpeta que se nombra sin detallar)", () => {
    const missing = SRC_FILES.filter((file) => !files.includes(file) && !foldersWithoutDetail.some((folder) => file.startsWith(folder)));
    // Si falla con un archivo nuevo: añadirlo en «Estructura», en su carpeta, con una línea de para qué sirve.
    expect(missing).toEqual([]);
  });

  it("el README no nombra archivos que ya no existen", () => {
    expect(files.filter((file) => !SRC_FILES.includes(file))).toEqual([]);
  });

  it("las carpetas sin detallar existen", () => {
    expect(foldersWithoutDetail.filter((folder) => folder.startsWith("src/") && !SRC_FILES.some((file) => file.startsWith(folder)))).toEqual([]);
  });
});

describe("comentario inicial", () => {
  it("cada archivo de código empieza con un /** @fileoverview … */ que dice para qué sirve", () => {
    const without = Object.entries(CODE).filter(([, text]) => !/^\/\*\*\n \* @fileoverview \S/.test(text)).map(([path]) => path);
    expect(without).toEqual([]);
    // Que la búsqueda de archivos encuentra de verdad los de cada parte.
    for (const part of ["../src/", "./common/", "./geografia/", "./ccse/", "../screen-tests/", "../vite.config.ts"]) {
      expect(Object.keys(CODE).some((path) => path.startsWith(part)), part).toBe(true);
    }
  });
});
