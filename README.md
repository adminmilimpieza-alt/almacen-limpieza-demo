# Caja + Stock — demo almacén limpieza

Base simple y modular para mostrar mañana. 100% estática → lista para GitHub Pages.

## Qué hace
- **Caja:** buscar producto, armar ticket, cobrar (efectivo/transferencia/cta cte). Descuenta stock y guarda venta.
- **Stock:** alta, edición, borrado, alerta bajo stock (≤5). Datos demo de limpieza.
- **Ventas:** historial de tickets.
- Todo en `localStorage` (sin backend). Módulos: `js/store.js`, `js/caja.js`, `js/stock.js`, `js/app.js`.

## Probar local
```bash
# opción 1: abrir index.html directo
open index.html
# opción 2: servidor local
python3 -m http.server 8000
# → http://localhost:8000
```

## Publicar en GitHub Pages (2 min)
```bash
git add index.html css js README.md
git commit -m "demo caja+stock limpieza"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/NOMBRE-REPO.git
git push -u origin main
# En GitHub: Settings → Pages → Deploy from branch → main / (root) → Save
# URL: https://TU-USUARIO.github.io/NOMBRE-REPO/
```

## Repos revisados (inspiración, descartados por requerir backend)
- `abi-collab/open-pos-inventory-laravelvue` (Laravel+Vue, necesita servidor)
- `Simperfy/pos-inventory-system-ui` (React, necesita build/API)
- `pasinduprabashwara2000/POS-System-HTML-CSS-JS` (estático pero desordenado/inglés)
- Se optó por base propia limpia en español, modular y lista para Pages.

## Siguiente (base para trabajar)
- [ ] Ticket imprimible / factura
- [ ] Cierre de caja diario
- [ ] Proveedores + compras (entradas de stock)
- [ ] Backend real (cuando escale): misma API de `store.js` contra servidor
