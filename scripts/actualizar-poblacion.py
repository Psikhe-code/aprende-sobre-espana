"""
Actualiza la población y el puesto de cada municipio de src/data/municipios.json con un archivo del INE.

El INE publica cada año las cifras oficiales de población de todos los municipios (a 1 de enero),
en el archivo pobmun.zip (https://www.ine.es/pob_xls/pobmun.zip), que trae un Excel por año:
pobmun25.xlsx, pobmun26.xlsx… Desde el entorno de Claude no se puede abrir la web del INE: se descarga
con la herramienta de páginas (rama paginas-descarga, ver el README).

Uso:  python3 scripts/actualizar-poblacion.py pobmun26.xlsx 2026

Cambia solo «poblacion» y «puesto» de cada municipio, y el año en «datosPoblacion». Los nombres y los
motivos no se tocan. Al terminar avisa si algún municipio entra o sale de los tres más poblados de su
provincia: los que salen necesitan un «motivo» para seguir en el juego, y los que entran hay que añadirlos.
"""
import json, sys
import openpyxl

ARCHIVO = "src/data/municipios.json"


def leer_ine(ruta):
    """Población de cada municipio del Excel del INE, por código (cinco cifras: provincia y municipio)."""
    filas = openpyxl.load_workbook(ruta, read_only=True).active.iter_rows(values_only=True)
    pob = {}
    for f in filas:
        if f[0] and f[2] and str(f[0]).isdigit() and isinstance(f[4], int):
            pob[f"{f[0]}{f[2]}"] = f[4]
    return pob


def puestos(pob):
    """Puesto de cada municipio en su provincia, de más a menos habitantes."""
    out = {}
    for prov in {c[:2] for c in pob}:
        orden = sorted((c for c in pob if c[:2] == prov), key=lambda c: -pob[c])
        for i, c in enumerate(orden):
            out[c] = i + 1
    return out


def escribir(datos):
    """Escribe el JSON con una línea por campo, y los nombres en una sola línea (como territorio.json)."""
    j = lambda x: json.dumps(x, ensure_ascii=False)
    lineas = ["{", f'  "datosPoblacion": {j(datos["datosPoblacion"])},', '  "municipios": [']
    for i, m in enumerate(datos["municipios"]):
        campos = ",\n".join(f"      {j(k)}: {j(v)}" for k, v in m.items())
        lineas.append("    {\n" + campos + "\n    }" + ("," if i < len(datos["municipios"]) - 1 else ""))
    lineas += ["  ]", "}"]
    with open(ARCHIVO, "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")


def main(ruta, año):
    datos = json.load(open(ARCHIVO, encoding="utf-8"))
    pob = leer_ine(ruta)
    rango = puestos(pob)
    for m in datos["municipios"]:
        if m["id"] not in pob:
            print("AVISO: no está en el archivo del INE:", m["id"], m["nombre"]["oficial"])
            continue
        antes = m.get("puesto")
        m["poblacion"], m["puesto"] = pob[m["id"]], rango[m["id"]]
        if antes and (antes <= 3) != (m["puesto"] <= 3):
            print(f"AVISO: {m['nombre']['oficial']} pasa del puesto {antes} al {m['puesto']}")
    tienen = {m["id"] for m in datos["municipios"]}
    for c, p in rango.items():
        if p <= 3 and c not in tienen:
            print(f"AVISO: falta {c}, que ahora es el {p}.º más poblado de su provincia")
    datos["datosPoblacion"]["año"] = int(año)
    escribir(datos)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
