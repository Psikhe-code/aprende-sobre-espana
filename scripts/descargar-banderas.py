"""
Descarga de Wikimedia Commons las banderas de las comunidades y ciudades autónomas,
con su licencia y su autor, para revisarlas antes de usarlas en el juego.

Se ejecuta en GitHub Actions (workflow «Descargar banderas»). Guarda en banderas-wikimedia/:
  - <código INE>-<n>.svg : cada archivo candidato que existe en Commons
  - <código INE>-<n>.ficha.txt : su ficha en Commons (descripción, autor, licencia)
  - info.json            : metadatos de cada candidato (licencia, autor, tamaño, enlace) y
                           resultados de búsqueda con otras versiones disponibles
"""
import json, os, time, traceback, urllib.error, urllib.parse, urllib.request

UA = {"User-Agent": "AprendeSobreEspana/0.1 (https://github.com/Psikhe-code/aprende-sobre-espana)"}
API = "https://commons.wikimedia.org/w/api.php"
OUT = "banderas-wikimedia"

# Candidatos por código INE, en orden de preferencia (la versión oficial primero).
CANDIDATOS = {
    "01": ["Flag of Andalucía.svg", "Flag of Andalusia.svg"],
    "02": ["Flag of Aragon.svg"],
    "03": ["Flag of Asturias.svg"],
    "04": ["Flag of the Balearic Islands.svg"],
    "05": ["Flag of the Canary Islands.svg"],
    "06": ["Flag of Cantabria.svg", "Flag of Cantabria (Official).svg"],
    "07": ["Flag of Castile and León.svg", "Flag of Castilla y León.svg"],
    "08": ["Flag of Castilla-La Mancha.svg", "Flag of Castile-La Mancha.svg"],
    "09": ["Flag of Catalonia.svg"],
    "10": ["Flag of the Valencian Community (2x3).svg", "Flag of the Valencian Community.svg"],
    "11": ["Flag of Extremadura (with coat of arms).svg", "Flag of Extremadura.svg"],
    "12": ["Flag of Galicia.svg", "Flag of Galicia (civil).svg"],
    "13": ["Flag of the Community of Madrid.svg"],
    "14": ["Flag of the Region of Murcia.svg"],
    "15": ["Flag of Navarre.svg"],
    "16": ["Flag of the Basque Country.svg"],
    "17": ["Flag of La Rioja (with coat of arms).svg", "Flag of La Rioja.svg"],
    "18": ["Flag of Ceuta.svg"],
    "19": ["Flag of Melilla.svg"],
}
BUSQUEDA = {
    "01": "Flag of Andalucía", "02": "Flag of Aragon", "03": "Flag of Asturias", "04": "Flag of the Balearic Islands",
    "05": "Flag of the Canary Islands", "06": "Flag of Cantabria", "07": "Flag of Castile and León",
    "08": "Flag of Castilla-La Mancha", "09": "Flag of Catalonia", "10": "Flag of the Valencian Community",
    "11": "Flag of Extremadura", "12": "Flag of Galicia", "13": "Flag of the Community of Madrid",
    "14": "Flag of the Region of Murcia", "15": "Flag of Navarre", "16": "Flag of the Basque Country",
    "17": "Flag of La Rioja", "18": "Flag of Ceuta", "19": "Flag of Melilla",
}


def get(url, params=None):
    if params:
        url += "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    for intento in range(5):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(int(e.headers.get("Retry-After", "30")) + 1)
    raise RuntimeError("Wikimedia sigue limitando las peticiones: " + url)


LOG = []


def log(*args):
    line = " ".join(str(a) for a in args)
    print(line)
    LOG.append(line)


def main():
    os.makedirs(OUT, exist_ok=True)
    info = {}
    todos = [t for ts in CANDIDATOS.values() for t in ts]
    meta = {}
    for i in range(0, len(todos), 20):
        r = json.loads(get(API, {
            "action": "query", "titles": "|".join("File:" + t for t in todos[i:i + 20]), "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
            "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|AttributionRequired",
        }))
        for n in r["query"].get("normalized", []):
            log("normalizado:", n["from"], "→", n["to"])
        for p in r["query"]["pages"]:
            meta[p["title"].removeprefix("File:")] = p
        time.sleep(1)
    log("consultados", len(meta), "títulos")

    for cid, titulos in CANDIDATOS.items():
        info[cid] = {"candidatos": [], "busqueda": []}
        for n, t in enumerate(titulos, 1):
            p = meta.get(t, {})
            if p.get("missing") or "imageinfo" not in p:
                info[cid]["candidatos"].append({"titulo": t, "existe": False})
                continue
            ii = p["imageinfo"][0]
            em = {k: v.get("value") for k, v in ii.get("extmetadata", {}).items()}
            archivo = f"{cid}-{n}.svg"
            try:
                with open(os.path.join(OUT, archivo), "wb") as f:
                    f.write(get(ii["url"]))
                log("descargado", cid, t)
            except Exception as e:
                log("ERROR al descargar", cid, t, repr(e))
                archivo = None
            # Ficha completa del archivo (wikitexto), con el autor aunque no esté en los metadatos
            try:
                w = json.loads(get(API, {"action": "query", "titles": "File:" + t, "prop": "revisions",
                                         "rvprop": "content", "rvslots": "main"}))
                texto = w["query"]["pages"][0]["revisions"][0]["slots"]["main"]["content"]
                with open(os.path.join(OUT, f"{cid}-{n}.ficha.txt"), "w") as f:
                    f.write(texto)
            except Exception as e:
                log("ERROR al leer la ficha", cid, t, repr(e))
            info[cid]["candidatos"].append({
                "titulo": t, "existe": True, "archivo": archivo, "url": ii["url"], "pagina": ii["descriptionurl"],
                "ancho": ii["width"], "alto": ii["height"], "bytes": ii["size"], **em,
            })
            time.sleep(1)
        try:
            r = json.loads(get(API, {"action": "query", "list": "search", "srnamespace": 6, "srlimit": 15,
                                     "srsearch": f'intitle:"{BUSQUEDA[cid]}"'}))
            info[cid]["busqueda"] = [s["title"] for s in r["query"]["search"]]
        except Exception as e:
            log("ERROR en la búsqueda", cid, repr(e))
        time.sleep(1)

    with open(os.path.join(OUT, "info.json"), "w") as f:
        json.dump(info, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: [c["titulo"] for c in v["candidatos"] if c["existe"]] for k, v in info.items()}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log(traceback.format_exc())
        raise
    finally:
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, "log.txt"), "w") as f:
            f.write("\n".join(LOG) + "\n")
