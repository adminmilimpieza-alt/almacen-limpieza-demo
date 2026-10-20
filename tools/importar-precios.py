#!/usr/bin/env python3
"""
importar-precios.py — Importador de una sola vez de la lista de precios del
proveedor (MILIMPIEZA-Lista Precios-MATIAS.xlsx) al catálogo de la app.

Genera  js/catalogo.js  con el catalogo normalizado. Es reproducible: si el
Excel cambia, se corre de nuevo y se commitea el catalogo.

Uso:
    python tools/importar-precios.py "\\\\servidor\\Compartida\\...\\MILIMPIEZA-Lista Precios-MATIAS.xlsx"

Estructura del Excel (1 hoja "Lista PRECIO"):
    A=Codigo  B=Descripcion  C=Venta  D=Cant./Lt.  E=Costo compra  F=% Ganancia
    Secciones (filas con A="Codigo"): describen el proveedor/rubro.
    E es SIEMPRE el costo del paquete (validado: Venta = Costo*(1+margen) en 257/265 filas).
"""
import json
import os
import re
import sys
import unicodedata

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl: pip install openpyxl")

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "js", "catalogo.js")

# Secciones del Excel -> (proveedor, rubro/categoria)
SECCIONES = {
    89: ("UNIBLANC", "Pileta"),
    106: ("GEMORA", "Accesorios"),
    227: ("DON EMILIO", "Accesorios"),
}
PROV_INICIAL = ("UNIBLANC", "Liquidos")

# Correcciones sobre filas con dato roto en el Excel.
# Cada entrada documenta la inferencia para que el cliente pueda auditarla.
# (fila_excel, costo, precio, margen, nota)
CORRECCIONES = {
    48: (3887.5, 7775.0, 100, "Venta 8845 no cumplia la formula; costo = E47x5 (formula de la fila)"),
    69: (177.6, 976.8, 450, "Sin costo: toma 1/5 del pack de 5 Lts de la fila 70"),
    72: (583.0, 1166.0, 100, "Costo 2915 > venta 1166 (imposible); costo = venta/(1+margen)"),
    73: (3440.0, 6880.0, 100, "Venta 6880 no cumplia la formula; costo = venta/(1+margen)"),
    79: (3610.0, 7220.0, 100, "Sin costo: venta/(1+margen)"),
    83: (1466.0, 3518.4, 140, "Venta 4588.4 no cumplia la formula; costo = E82x5 (formula de la fila)"),
    86: (713.33, 1070.0, 50, "Sin costo: venta/(1+margen)"),
    87: (160.0, 240.0, 50, "Sin costo: venta/(1+margen)"),
    88: (166.67, 250.0, 50, "Sin costo: venta/(1+margen)"),
    92: (4440.0, 8436.0, 90, "Costo 8436 era en realidad el precio de venta; costo = E91x5"),
    94: (3050.0, 7930.0, 160, "Costo 7930 era en realidad el precio de venta; costo = E93x5"),
    97: (4995.0, 7492.5, 50, "Costo 9990 duplicaba el valor real; costo = 4995 (mitad de la fila 98)"),
    98: (9990.0, 14985.0, 50, "Sin costo ni margen: heredado de la fila 97"),
    100: (6660.0, 19980.0, 200, "Costo 19980 era en realidad el precio de venta; costo = E99x5"),
    109: (0.0, 0.0, None, "Sin dato en el Excel: queda oculto hasta que lo carguen"),
}

# Filas totalmente vacias o sin sentido -> se descartan
DESCARTAR = {71}

PRESENTACIONES = [
    (r"\b10\s*LTS?\.?", "10 Lts"),
    (r"\b5\s*LTS?\.?", "5 Lts"),
    (r"\b1\s*LT\.?", "1 Lt"),
    (r"\b1\s*KGR\.?", "1 Kg"),
    (r"\b500\s*GR\.?", "500 grs"),
    (r"\b250\s*CC\.?", "250 cc"),
    (r"\b360\s*CC\.?", "360 cc"),
    (r"\b750\s*ML\.?", "750 ml"),
]


def normaliza(s):
    """Para comparar: sin acentos, sin puntuacion, mayusculas."""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]", "", s.upper())


def nombre_corto(desc, pres=None):
    """Quita el parentesis de marketing y el texto posterior a la primera frase.
    Si el nombre termina con una presentacion que no corresponde a la real
    (error de copy-paste del Excel) se corrige."""
    d = desc
    if "(" in d:
        d = d.split("(")[0]
    elif ". " in d:
        d = d.split(". ")[0]
    d = re.sub(r"\s+", " ", d).strip()
    d = re.sub(r"[.;,]+$", "", d).strip()
    m = re.search(r"(\d+)\s*(LTS?|LT|KGR|GR|CC|ML)\s*$", d, flags=re.I)
    if m and pres:
        real = re.match(r"(\d+)", pres)
        if real and real.group(1) != m.group(1):
            d = d[:m.start()].strip() + " " + pres
            return d, True
    return d or desc.strip(), False


ENVASES = ("BIDON", "BIDÓN", "BOTELLA", "ENVASE")


def presentacion(desc, lt):
    # La columna "Cant./Lt." manda solo para las presentaciones liquidas
    # (1 Lt / 5 Lts), donde se repite el codigo. En el resto manda la descripcion.
    if isinstance(lt, (int, float)):
        if lt == 1:
            return "1 Lt"
        if lt == 5:
            return "5 Lts"
        if lt == 0.5:
            return "500 grs"
    up = desc.upper()
    for pat, val in PRESENTACIONES:
        if re.search(pat, up):
            return val
    return "x Unid"


def es_envase(desc):
    return desc.upper().startswith(ENVASES)


def categoria_de(prov, rubro, desc, lt, pres):
    if prov == "UNIBLANC" and rubro == "Liquidos":
        if es_envase(desc):
            return "Accesorios"
        if pres in ("5 Lts", "10 Lts"):
            return "Líquidos 5L"
        return "Líquidos 1L"
    if rubro == "Pileta":
        return "Pileta"
    return "Accesorios"


def lee_excel(ruta):
    wb = openpyxl.load_workbook(ruta, data_only=True)
    ws = wb["Lista PRECIO"]
    items = []
    prov, rubro = PROV_INICIAL
    cod_previo = None
    for r in range(3, ws.max_row + 1):
        a, b, c, d, e, f = (ws.cell(r, col).value for col in range(1, 7))
        if r in SECCIONES:
            prov, rubro = SECCIONES[r]
            cod_previo = None
            continue
        if a == "Codigo" or (isinstance(b, str) and b.lower().startswith("descripcion:")):
            prov, rubro = None, None
            cod_previo = None
            continue
        if all(v in (None, "") for v in (a, b, c, d, e, f)):
            continue
        if a in (None, "") and b in (None, "") and c in (0, None):
            continue
        if b in (None, "") or r in DESCARTAR:
            continue

        cod = a
        if cod in (None, ""):
            cod = cod_previo          # la presentacion de 5L hereda el codigo de la de 1L
        else:
            cod_previo = cod
        cod = str(cod).strip() if cod is not None else None

        desc = re.sub(r"\s+", " ", str(b)).strip()
        pres = presentacion(desc, d)
        cat = categoria_de(prov, rubro, desc, d, pres)
        nom, corr = nombre_corto(desc, pres)
        nota = None
        costo, venta, margen = e, c, f
        if r in CORRECCIONES:
            costo, venta, margen, nota = CORRECCIONES[r]
        if corr:
            nota = (nota + " | " if nota else "") + f'Descripcion decía otra presentacion; corregida a "{pres}"'
        items.append({
            "fila": r, "codigo": cod, "nombre": nom, "detalle": desc,
            "presentacion": pres, "categoria": cat, "prov": prov,
            "costo": round(float(costo), 2) if isinstance(costo, (int, float)) else 0.0,
            "precio": round(float(venta), 2) if isinstance(venta, (int, float)) else 0.0,
            "margen": float(margen) if isinstance(margen, (int, float)) else None,
            "alerta": nota,
        })
    return items


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else None
    if not ruta:
        sys.exit(__doc__)
    items = lee_excel(ruta)

    # clave unica: codigo + categoria + presentacion
    claves = {}
    for it in items:
        k = (normaliza(it["codigo"]), normaliza(it["categoria"]), normaliza(it["presentacion"]))
        if k in claves:
            it["alerta"] = (it["alerta"] or "") + f" Duplica la fila {claves[k]}."
            print(f"AVISO duplicado: fila {it['fila']} repite {k} de la fila {claves[k]}")
        else:
            claves[k] = it["fila"]

    proveedores = sorted({i["prov"] for i in items if i["prov"]})

    cat = {
        "productos": [
            {k: v for k, v in it.items() if k != "fila"} for it in items
        ],
        "proveedores": [{"id": "pv" + str(n + 1), "nombre": p, "tel": "", "notas": ""}
                        for n, p in enumerate(proveedores)],
    }
    # indice proveedor -> id
    prov_id = {p["nombre"]: p["id"] for p in cat["proveedores"]}
    for pr in cat["productos"]:
        pr["provId"] = prov_id.get(pr["prov"], "")
        pr["stock"] = 10
        pr["activo"] = True
        if not pr["costo"] or not pr["precio"]:
            pr["activo"] = False

    cuerpo = json.dumps(cat, ensure_ascii=False, indent=1)
    cabecera = (
        "// catalogo.js — GENERADO por tools/importar-precios.py. No editar a mano.\n"
        "//\n"
        "// Lista de precios del proveedor importada UNA vez (MILIMPIEZA-Lista Precios-MATIAS.xlsx).\n"
        "//   costo   = costo de compra del proveedor\n"
        "//   precio  = precio de venta (ya incluye el margen)\n"
        "//   margen  = % de ganancia del proveedor sobre ese producto\n"
        "//   alerta  = correccion aplicada sobre una fila rota del Excel (revisar)\n"
        "// A partir de aca el catalogo se administra desde el panel: no se vuelve a leer el Excel.\n"
        "const CATALOGO = "
    )
    with open(SALIDA, "w", encoding="utf-8") as f:
        f.write(cabecera + cuerpo + ";\n")

    n_alerta = sum(1 for p in cat["productos"] if p["alerta"])
    print(f"OK  {len(cat['productos'])} productos  ·  {len(proveedores)} proveedores  ·  {n_alerta} con alerta")
    print(f"    -> {SALIDA}")
    for p in cat["proveedores"]:
        n = sum(1 for x in cat["productos"] if x["provId"] == p["id"])
        print(f"       {p['nombre']:<14} {n} productos")
    for p in cat["productos"]:
        if p["alerta"]:
            print(f"       [alerta] {p['codigo']} {p['nombre'][:40]:<42} {p['alerta']}")


if __name__ == "__main__":
    main()

