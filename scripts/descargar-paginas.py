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
    "api-san-bartolome-de-tirajana": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=San_Bartolom%C3%A9_de_Tirajana", False),
    "api-arrecife-lanzarote": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Arrecife_%28Lanzarote%29", False),
    "api-arrecife-las-palmas": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Arrecife_%28Las_Palmas%29", False),
    "api-arona": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Arona", False),
    "api-valverde-el-hierro": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Valverde_%28El_Hierro%29", False),
    "api-ciudadela-baleares": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Ciudadela_%28Baleares%29", False),
    "api-albacete": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Albacete", False),
    "api-hellin": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Hell%C3%ADn", False),
    "api-villarrobledo": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Villarrobledo", False),
    "api-arenas-de-san-pedro": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Arenas_de_San_Pedro", False),
    "api-arevalo": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Ar%C3%A9valo", False),
    "api-avila": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=%C3%81vila", False),
    "api-aranda-de-duero": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Aranda_de_Duero", False),
    "api-atapuerca-burgos": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Atapuerca_%28Burgos%29", False),
    "api-burgos": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Burgos", False),
    "api-miranda-de-ebro": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Miranda_de_Ebro", False),
    "api-santo-domingo-de-silos": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Santo_Domingo_de_Silos", False),
    "api-almagro-ciudad-real": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Almagro_%28Ciudad_Real%29", False),
    "api-ciudad-real": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Ciudad_Real", False),
    "api-puertollano": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Puertollano", False),
    "api-tomelloso": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Tomelloso", False),
    "api-valdepenas": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Valdepe%C3%B1as", False),
    "api-cuenca-espana": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Cuenca_%28Espa%C3%B1a%29", False),
    "api-quintanar-del-rey": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Quintanar_del_Rey", False),
    "api-tarancon": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Taranc%C3%B3n", False),
    "api-alovera": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Alovera", False),
    "api-azuqueca-de-henares": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Azuqueca_de_Henares", False),
    "api-guadalajara-espana": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Guadalajara_%28Espa%C3%B1a%29", False),
    "api-siguenza": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Sig%C3%BCenza", False),
    "api-astorga": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Astorga", False),
    "api-leon-espana": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Le%C3%B3n_%28Espa%C3%B1a%29", False),
    "api-ponferrada": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Ponferrada", False),
    "api-san-andres-del-rabanedo": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=San_Andr%C3%A9s_del_Rabanedo", False),
    "api-aguilar-de-campoo": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Aguilar_de_Campoo", False),
    "api-fromista": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Fr%C3%B3mista", False),
    "api-palencia": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Palencia", False),
    "api-villamuriel-de-cerrato": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Villamuriel_de_Cerrato", False),
    "api-alba-de-tormes": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Alba_de_Tormes", False),
    "api-bejar": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=B%C3%A9jar", False),
    "api-ciudad-rodrigo": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Ciudad_Rodrigo", False),
    "api-salamanca": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Salamanca", False),
    "api-santa-marta-de-tormes": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Santa_Marta_de_Tormes", False),
    "api-cuellar": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Cu%C3%A9llar", False),
    "api-el-espinar": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=El_Espinar", False),
    "api-real-sitio-de-san-ildefonso": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Real_Sitio_de_San_Ildefonso", False),
    "api-segovia": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Segovia", False),
    "api-sepulveda": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Sep%C3%BAlveda", False),
    "api-almazan": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Almaz%C3%A1n", False),
    "api-el-burgo-de-osma": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=El_Burgo_de_Osma", False),
    "api-medinaceli": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Medinaceli", False),
    "api-soria": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Soria", False),
    "api-consuegra": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Consuegra", False),
    "api-illescas": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Illescas", False),
    "api-talavera-de-la-reina": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Talavera_de_la_Reina", False),
    "api-toledo": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Toledo", False),
    "api-arroyo-de-la-encomienda": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Arroyo_de_la_Encomienda", False),
    "api-laguna-de-duero": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Laguna_de_Duero", False),
    "api-medina-del-campo": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Medina_del_Campo", False),
    "api-penafiel": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Pe%C3%B1afiel", False),
    "api-simancas": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Simancas", False),
    "api-tordesillas": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Tordesillas", False),
    "api-valladolid": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Valladolid", False),
    "api-benavente-zamora": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Benavente_%28Zamora%29", False),
    "api-puebla-de-sanabria": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Puebla_de_Sanabria", False),
    "api-toro-zamora": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Toro_%28Zamora%29", False),
    "api-zamora": ("https://es.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=Zamora", False),
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
