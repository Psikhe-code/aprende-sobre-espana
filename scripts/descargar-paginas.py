"""
Descarga páginas web (y, si se pide, las imágenes y PDF que enlazan) para poder leerlas desde
el entorno de Claude, que no puede abrir muchas webs directamente: webs oficiales de gobiernos y
diputaciones, Flags of the World, boletines oficiales, Wikipedia…

Se ejecuta en GitHub Actions (workflow «Descargar páginas»), solo al subir la rama temporal
paginas-descarga. Esa rama no se mezcla con main: se crea desde main, se edita la lista PAGINAS
de abajo, se sube, y cuando se ha leído lo descargado se borra.

Las peticiones se identifican solo con el nombre del proyecto y el enlace al repositorio.
No se envía ningún dato personal.

Guarda en paginas-descargadas/:
  - <nombre>.<ext>          : cada página o documento de la lista (html, pdf, txt…)
  - <nombre>-<n>.<ext>      : imágenes y PDF enlazados desde una página, si se pidió seguirlos
  - indice.json             : de dónde sale cada archivo, y los errores
"""
import json, os, re, time, traceback, urllib.parse, urllib.request
from html.parser import HTMLParser

UA = {"User-Agent": "Mozilla/5.0 (compatible; AprendeSobreEspana/0.1; +https://github.com/Psikhe-code/aprende-sobre-espana)"}
OUT = "paginas-descargadas"
MAX_BYTES = 25 * 1024 * 1024
MAX_ENLACES = 40
EXT = re.compile(r"\.(svg|png|jpe?g|gif|webp|pdf)(\?|$)", re.I)

# Qué descargar: nombre del archivo (sin extensión) → (dirección, ¿seguir imágenes y PDF enlazados?).
# Ejemplos (los dos primeros, probados al crear esta herramienta):
#   "fotw-teruel": ("https://www.fotw.info/flags/es-ar-te.html", True),
#   "wikipedia-banderas-provincias": ("https://en.wikipedia.org/w/index.php?title=List_of_provincial_flags_of_Spain&action=raw", False),
#   "simbolos-asturias": ("https://www.asturias.es/…/simbolos-principado-asturias", True),
PAGINAS = {
    "wiki-gijon": ("https://es.wikipedia.org/w/index.php?title=Gij%C3%B3n&action=raw", False),
    "wiki-oviedo": ("https://es.wikipedia.org/w/index.php?title=Oviedo&action=raw", False),
    "wiki-aviles": ("https://es.wikipedia.org/w/index.php?title=Avil%C3%A9s&action=raw", False),
    "wiki-cangas-de-onis": ("https://es.wikipedia.org/w/index.php?title=Cangas_de_On%C3%ADs&action=raw", False),
    "wiki-llanes": ("https://es.wikipedia.org/w/index.php?title=Llanes&action=raw", False),
    "wiki-palma-de-mallorca": ("https://es.wikipedia.org/w/index.php?title=Palma_de_Mallorca&action=raw", False),
    "wiki-ibiza": ("https://es.wikipedia.org/w/index.php?title=Ibiza_%28ciudad%29&action=raw", False),
    "wiki-calvia": ("https://es.wikipedia.org/w/index.php?title=Calvi%C3%A1&action=raw", False),
    "wiki-mahon": ("https://es.wikipedia.org/w/index.php?title=Mah%C3%B3n&action=raw", False),
    "wiki-ciudadela-de-menorca": ("https://es.wikipedia.org/w/index.php?title=Ciudadela_de_Menorca&action=raw", False),
    "wiki-manacor": ("https://es.wikipedia.org/w/index.php?title=Manacor&action=raw", False),
    "wiki-las-palmas-de-gran-canaria": ("https://es.wikipedia.org/w/index.php?title=Las_Palmas_de_Gran_Canaria&action=raw", False),
    "wiki-telde": ("https://es.wikipedia.org/w/index.php?title=Telde&action=raw", False),
    "wiki-santa-lucia-de-tirajana": ("https://es.wikipedia.org/w/index.php?title=Santa_Luc%C3%ADa_de_Tirajana&action=raw", False),
    "wiki-arrecife": ("https://es.wikipedia.org/w/index.php?title=Arrecife&action=raw", False),
    "wiki-puerto-del-rosario": ("https://es.wikipedia.org/w/index.php?title=Puerto_del_Rosario&action=raw", False),
    "wiki-san-bartolome-de-tirajana": ("https://es.wikipedia.org/w/index.php?title=San_Bartolom%C3%A9_de_Tirajana&action=raw", False),
    "wiki-santa-cruz-de-tenerife": ("https://es.wikipedia.org/w/index.php?title=Santa_Cruz_de_Tenerife&action=raw", False),
    "wiki-san-cristobal-de-la-laguna": ("https://es.wikipedia.org/w/index.php?title=San_Crist%C3%B3bal_de_La_Laguna&action=raw", False),
    "wiki-arona": ("https://es.wikipedia.org/w/index.php?title=Arona_%28Santa_Cruz_de_Tenerife%29&action=raw", False),
    "wiki-puerto-de-la-cruz": ("https://es.wikipedia.org/w/index.php?title=Puerto_de_la_Cruz&action=raw", False),
    "wiki-santa-cruz-de-la-palma": ("https://es.wikipedia.org/w/index.php?title=Santa_Cruz_de_La_Palma&action=raw", False),
    "wiki-san-sebastian-de-la-gomera": ("https://es.wikipedia.org/w/index.php?title=San_Sebasti%C3%A1n_de_La_Gomera&action=raw", False),
    "wiki-santander": ("https://es.wikipedia.org/w/index.php?title=Santander_%28Espa%C3%B1a%29&action=raw", False),
    "wiki-torrelavega": ("https://es.wikipedia.org/w/index.php?title=Torrelavega&action=raw", False),
    "wiki-castro-urdiales": ("https://es.wikipedia.org/w/index.php?title=Castro-Urdiales&action=raw", False),
    "wiki-santillana-del-mar": ("https://es.wikipedia.org/w/index.php?title=Santillana_del_Mar&action=raw", False),
    "wiki-comillas": ("https://es.wikipedia.org/w/index.php?title=Comillas&action=raw", False),
    "wiki-laredo": ("https://es.wikipedia.org/w/index.php?title=Laredo_%28Cantabria%29&action=raw", False),
}


class Enlaces(HTMLParser):
    """Recoge imágenes y enlaces a imágenes o PDF de una página."""
    def __init__(self):
        super().__init__()
        self.items = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "img":
            for k in ("src", "data-src"):
                if a.get(k):
                    self.items.append(a[k])
        elif tag == "a" and a.get("href") and EXT.search(a["href"]):
            self.items.append(a["href"])
        elif tag == "meta" and a.get("property") == "og:image" and a.get("content"):
            self.items.append(a["content"])


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
        datos = r.read(MAX_BYTES + 1)
        if len(datos) > MAX_BYTES:
            raise ValueError("archivo demasiado grande")
        return datos, r.headers.get("Content-Type", "")


def extension(url, tipo):
    m = EXT.search(urllib.parse.urlparse(url).path)
    if m:
        return m.group(1).lower().replace("jpeg", "jpg")
    for clave, ext in (("svg", "svg"), ("png", "png"), ("jpeg", "jpg"), ("gif", "gif"), ("webp", "webp"),
                       ("pdf", "pdf"), ("html", "html"), ("json", "json"), ("text/plain", "txt")):
        if clave in tipo:
            return ext
    return "bin"


def guardar(nombre, datos):
    with open(os.path.join(OUT, nombre), "wb") as f:
        f.write(datos)


def main():
    os.makedirs(OUT, exist_ok=True)
    indice = {}
    for nombre, (url, seguir) in PAGINAS.items():
        entrada = indice[nombre] = {"fuente": url, "enlaces": []}
        try:
            datos, tipo = get(url)
        except Exception as e:
            print("ERROR", nombre, url, repr(e))
            entrada["error"] = repr(e)
            continue
        archivo = f"{nombre}.{extension(url, tipo)}"
        guardar(archivo, datos)
        entrada.update(archivo=archivo, tipo=tipo, bytes=len(datos))
        print("descargado", archivo, len(datos))
        if seguir and "html" in tipo:
            p = Enlaces()
            p.feed(datos.decode("utf-8", "replace"))
            vistos, n = set(), 0
            for src in p.items:
                abs_url = urllib.parse.urljoin(url, src.strip())
                if abs_url in vistos or not abs_url.startswith("http") or n >= MAX_ENLACES:
                    continue
                vistos.add(abs_url)
                try:
                    d, t = get(abs_url)
                except Exception as e:
                    entrada["enlaces"].append({"fuente": abs_url, "error": repr(e)})
                    continue
                if len(d) < 2000:  # iconos y píxeles de seguimiento
                    continue
                n += 1
                arch = f"{nombre}-{n}.{extension(abs_url, t)}"
                guardar(arch, d)
                entrada["enlaces"].append({"fuente": abs_url, "archivo": arch, "tipo": t, "bytes": len(d)})
        time.sleep(1)
    with open(os.path.join(OUT, "indice.json"), "w") as f:
        json.dump(indice, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        raise
