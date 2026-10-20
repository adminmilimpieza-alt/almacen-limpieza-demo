#!/usr/bin/env python3
"""
publicar-catalogo.py — publica el catálogo que se descargó desde el panel de Precios.

Uso:
    python tools/publicar-catalogo.py "C:\\Users\\...\\Downloads\\catalogo.json"
    python tools/publicar-catalogo.py ~/Downloads/catalogo.json --no-push
    python tools/publicar-catalogo.py ~/Downloads/catalogo.json --repo ../otra-copia

Qué hace:
  1. valida el archivo descargado (que tenga productos y los campos claves)
  2. lo compara con el publicado y muestra qué precios/costos cambian
  3. lo copia a data/catalogo.json del repo
  4. hace commit y push (desactivable con --no-push)

Después del push, el resto de los equipos lo toma al abrir la app
(busca "Actualizar del servidor" en el panel de Precios).
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO_REL = os.path.join("data", "catalogo.json")


def die(msg, code=1):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(code)


def buscar_git():
    """El git del PATH puede estar roto (falta una DLL). Busca uno que funcione."""
    candidatos = [os.environ.get("GIT_BIN"), shutil.which("git"),
                  os.path.join(os.path.expanduser("~"), "AppData", "Local", "hermes", "git", "cmd", "git.exe"),
                  r"C:\Program Files\Git\cmd\git.exe",
                  r"C:\Program Files\Git\bin\git.exe"]
    for c in candidatos:
        if not c or not os.path.isfile(c):
            continue
        r = subprocess.run([c, "--version"], capture_output=True, text=True)
        if r.returncode == 0 and "git version" in (r.stdout or ""):
            return c
    return None


GIT = buscar_git()


def git(repo, *args):
    if not GIT:
        die("no se encontro un git funcional. Pasalo con la variable GIT_BIN o arregla el PATH.")
    return subprocess.run([GIT, "-C", repo] + list(args), capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("archivo", help="ruta del catalogo.json descargado del panel")
    ap.add_argument("--repo", default=RAIZ, help="raiz del repo (default: la de este script)")
    ap.add_argument("--no-push", action="store_true", help="deja el commit sin subir")
    ap.add_argument("--mensaje", default=None, help="mensaje del commit")
    args = ap.parse_args()

    repo = os.path.abspath(args.repo)
    origen = os.path.abspath(os.path.expanduser(args.archivo))
    destino = os.path.join(repo, DESTINO_REL)

    if not os.path.isfile(origen):
        die("no existe el archivo: " + origen)
    if not os.path.isdir(os.path.join(repo, ".git")):
        die("no es un repo git: " + repo)

    # ---- 1. validar ----
    try:
        with open(origen, encoding="utf-8") as f:
            cat = json.load(f)
    except Exception as e:
        die("el archivo no es un JSON valido: " + str(e))

    prods = cat.get("productos")
    if not isinstance(prods, list) or not prods:
        die("el JSON no tiene la lista 'productos'")
    for i, p in enumerate(prods):
        for campo in ("codigo", "nombre", "categoria", "costo", "precio"):
            if campo not in p:
                die("producto #%d sin el campo '%s'" % (i, campo))
    print("Archivo OK: %d productos, %d proveedores, version %s"
          % (len(prods), len(cat.get("proveedores") or []), cat.get("version", "?")))

    # ---- 2. comparar con lo publicado ----
    viejo = None
    if os.path.isfile(destino):
        try:
            with open(destino, encoding="utf-8") as f:
                viejo = json.load(f)
        except Exception:
            viejo = None

    if viejo:
        def idx(d):
            return {(p.get("codigo", ""), p.get("categoria", ""), p.get("presentacion", "")): p
                    for p in d.get("productos", [])}
        a, b = idx(viejo), idx(cat)
        cambios_precio, cambios_costo, cambios_stock = [], [], []
        nuevos, quitados = [], []
        for k, p in b.items():
            v = a.get(k)
            if not v:
                nuevos.append(p)
                continue
            if round(float(v.get("precio", 0)), 2) != round(float(p.get("precio", 0)), 2):
                cambios_precio.append((k[0], p.get("nombre", "")[:40], v.get("precio"), p.get("precio")))
            if round(float(v.get("costo", 0)), 2) != round(float(p.get("costo", 0)), 2):
                cambios_costo.append((k[0], p.get("nombre", "")[:40], v.get("costo"), p.get("costo")))
            if round(float(v.get("stock", 0)), 2) != round(float(p.get("stock", 0)), 2):
                cambios_stock.append((k[0], p.get("nombre", "")[:40], v.get("stock"), p.get("stock")))
        for k in a:
            if k not in b:
                quitados.append(k[0])
        print("\n--- Cambios a publicar ---")
        print("  precio : %d" % len(cambios_precio))
        for c in cambios_precio[:20]:
            print("     %-12s %-42s %s -> %s" % (c[0], c[1], c[2], c[3]))
        if len(cambios_precio) > 20:
            print("     ... y %d mas" % (len(cambios_precio) - 20))
        print("  costo  : %d" % len(cambios_costo))
        for c in cambios_costo[:20]:
            print("     %-12s %-42s %s -> %s" % (c[0], c[1], c[2], c[3]))
        if len(cambios_costo) > 20:
            print("     ... y %d mas" % (len(cambios_costo) - 20))
        print("  stock  : %d" % len(cambios_stock))
        for c in cambios_stock[:20]:
            print("     %-12s %-42s %s -> %s" % (c[0], c[1], c[2], c[3]))
        if len(cambios_stock) > 20:
            print("     ... y %d mas" % (len(cambios_stock) - 20))
        print("  nuevos : %d   quitados: %d" % (len(nuevos), len(quitados)))
        if nuevos:
            print("     " + ", ".join(str(p.get("codigo")) for p in nuevos[:20]))
        if not (cambios_precio or cambios_costo or cambios_stock or nuevos or quitados):
            print("  (sin cambios)")

    # ---- 3. copiar ----
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    shutil.copyfile(origen, destino)
    print("\nCopiado a %s" % os.path.relpath(destino, repo))

    # ---- 4. commit + push ----
    msg = args.mensaje or ("precios: publica el catalogo (%d productos, %s)"
                           % (len(prods), cat.get("version", "?")))
    r = git(repo, "add", DESTINO_REL)
    if r.returncode != 0:
        die("git add fallo: " + r.stderr)
    r = git(repo, "status", "--porcelain", DESTINO_REL)
    if not r.stdout.strip():
        print("No hay cambios para commitear: el publicado ya era igual.")
        return
    r = git(repo, "commit", "-m", msg)
    if r.returncode != 0:
        die("git commit fallo: " + r.stderr)
    print("\n" + r.stdout.strip())

    if args.no_push:
        print("\n(--no-push: el commit quedo local, no se subio)")
        return
    r = git(repo, "push")
    if r.returncode != 0:
        die("git push fallo: " + r.stderr + "\n(Quedo commiteado local; proba de nuevo o --no-push)")
    print("\n" + r.stdout.strip())
    print("\nPublicado. Los demas equipos lo toman con 'Actualizar del servidor' (o al abrir la app).")


if __name__ == "__main__":
    main()
