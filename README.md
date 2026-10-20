# Caja + Stock — almacén limpieza (Mi Limpieza)

Sistema de caja, stock y lista de precios para **Mi Limpieza**. 100% estática → lista para GitHub Pages.

## Qué hace
- **Caja:** buscar producto, armar ticket, cobrar (efectivo/transferencia/cta cte). Descuenta stock y guarda venta.
- **Stock:** alta, edición, ocultado, borrado, alerta bajo stock (≤5). Filtros por rubro y proveedor.
- **Precios:** catálogo real importado del proveedor; ver lista por rubro/proveedor, imprimir, recalcular venta.
- **Turno de caja:** apertura/cierre con arqueo y diferencias por medio.
- **Clientes / Proveedores / Pedidos / Cumpleaños / Reportes / Respaldo.**
- Todo en `localStorage` (sin backend). Módulos: `js/store.js`, `js/caja.js`, `js/stock.js`, `js/operacion.js`, `js/app.js`.

## Catálogo: importado una vez, se administra desde el panel

La lista de precios del proveedor (`MILIMPIEZA-Lista Precios-MATIAS.xlsx`) se importó **una sola vez**
y quedó en `js/catalogo.js` (respaldo embebido) y en `data/catalogo.json` (**fuente única de verdad**).
Desde ese momento **no se vuelve a leer el Excel**: el catálogo se administra 100% desde el panel.

**Origen del import** — `tools/importar-precios.py` (Python + openpyxl):

```bash
python tools/importar-precios.py "\\servidor\Compartida\...\MILIMPIEZA-Lista Precios-MATIAS.xlsx"
```

Lee el Excel, normaliza y regenera `js/catalogo.js` + `data/catalogo.json`. Es reproducible: si el
proveedor manda una lista nueva, se corre el script y se commitea el catálogo generado.

### Cómo se comparte entre equipos (sin backend)

`data/catalogo.json` es un archivo **público en el repo**. La app lo baja al abrir, así que todos los
equipos ven la misma lista de precios. `js/catalogo.js` queda como respaldo si no hay conexión o si se
abre el `index.html` directo con `file://`.

- **El remoto manda en los datos del catálogo**: costo, precio, margen, nombre, rubro y proveedor.
- **Cada equipo conserva sus ventas y su stock** (son datos reales del local).
- **Ocultar/mostrar es local**: si tapás un producto en tu equipo, el refresco no lo destapa.
- **El stock se publica también**, pero solo pisa lo que este equipo no movió. Si moviste stock, queda
  el tuyo y se marca con la etiqueta *local* hasta que publiques.

### Publicar cambios

1. En **Precios → Publicar cambios** se descarga `catalogo.json` con la lista de este equipo.
2. Se publica en el repo:

```bash
python tools/publicar-catalogo.py "C:\Users\...\Downloads\catalogo.json"
```

El script valida el archivo, **te muestra qué precios/costos/stock cambian**, lo copia a
`data/catalogo.json` y hace commit + push. Con `--no-push` deja el commit local.

3. Los demás equipos lo toman con **Precios → Actualizar del servidor** (o al abrir la app).

Si preferís otra fuente, en **Precios** se puede cambiar la URL del catálogo publicado
(por ejemplo un `raw.githubusercontent.com` o una URL propia).

### Qué trae cada producto

| Campo | Origen | Para qué |
|---|---|---|
| `codigo` | col. A (la de 5 Lts hereda el de 1 Lt) | EAN o código interno |
| `nombre` / `detalle` | col. B | nombre corto para la pantalla, texto original completo |
| `presentacion` | col. D + descripción | 1 Lt / 5 Lts / x Unid (desambigua el código repetido) |
| `categoria` | derivado | `Líquidos 1L` · `Líquidos 5L` · `Accesorios` · `Pileta` |
| `provId` | sección del Excel | UNIBLANC · GEMORA · DON EMILIO |
| `costo` | col. E | **costo de compra** |
| `precio` | col. C | **precio de venta** (ya incluye el margen) |
| `margen` | col. F | % de ganancia del proveedor sobre ese producto |
| `alerta` | — | marca las filas corregidas a mano (ver abajo) |
| `activo` | — | `false` = oculto, no se ofrece en caja |

### Regla de precio del Excel

`Venta = Costo × (1 + margen%)`. La columna E es **siempre el costo del paquete**, nunca el costo
por litro (las fórmulas del Excel están escritas de las dos formas, pero el resultado es el mismo).

### Filas corregidas a mano (16)

El Excel traía datos rotos; el importador los corrige y deja el motivo en `alerta`, visible en el
panel de Precios con la etiqueta **revisar**:

- 8 filas sin costo de compra (r69, r79, r86, r87, r88, r98, r109 y la 71 vacía, que se descarta).
- 8 filas con la fórmula pisada a mano (r48, r72, r73, r83, r92, r94, r97, r100). En varias el Excel
  tenía el **precio de venta en la columna de costo** (p. ej. r92/r94/r100).
- 1 descripción con la presentación equivocada por copy-paste (r49 decía "5 Lt" en la fila de 1 Lt).

**Estas correcciones son inferencias: hay que confirmarlas contra la lista del proveedor.**

## Desde el panel

- **Cambiar valores:** Stock → *Editar*. Se edita código, nombre, rubro, presentación, costo, precio, margen, stock y visibilidad.
- **Ocultar / mostrar:** Stock → *Ocultar* (o la casilla *Visible* del modal). Un producto oculto no aparece en la caja ni en los reportes, pero no se borra.
- **Agregar / borrar:** Stock → *+ Nuevo producto* / *Borrar*.
- **Precios:** *Ver lista* filtra por rubro y proveedor; *Ocultar/Mostrar* desde la misma tabla; *Imprimir* saca la lista en papel.
- **Margen:** *Margen propio de cada producto* recalcula la venta con el margen del proveedor (reproduce el precio del Excel). *Margen uniforme* aplica un % a todo.
- **Catálogo compartido:** *Actualizar del servidor* baja el publicado; *Publicar cambios* descarga el de este equipo para subirlo.
- **Recargar precios:** se sigue pudiendo subir un CSV (`codigo,nombre,presentacion,costo,margen`) por si llega una lista nueva.

## Migración

Si el navegador tenía la versión demo (`limpieza_demo_v10`), al abrir la app se conservan **ventas,
clientes, movimientos, pedidos y turnos**, y se reemplaza el catálogo de productos por el importado
respetando el stock que ya se había cargado.

## Probar local
```bash
# opción 1: abrir index.html directo
open index.html
# opción 2: servidor local
python -m http.server 8000
# → http://localhost:8000
```

## Publicar en GitHub Pages (2 min)
```bash
git add index.html css js README.md tools
git commit -m "catalogo importado del proveedor"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/NOMBRE-REPO.git
git push -u origin main
# En GitHub: Settings → Pages → Deploy from branch → main / (root) → Save
```

## Repos revisados (inspiración, descartados por requerir backend)
- `abi-collab/open-pos-inventory-laravelvue` (Laravel+Vue, necesita servidor)
- `Simperfy/pos-inventory-system-ui` (React, necesita build/API)
- `pasinduprabashwara2000/POS-System-HTML-CSS-JS` (estático pero desordenado/inglés)
- Se optó por base propia limpia en español, modular y lista para Pages.

## Qué cubre (8 puntos del cliente)
1. **Caja I/E + conciliación:** ventas + movimientos manuales por medio (efectivo/MP/banco), tildado conciliado. Conciliación automática con MP/Banco = fase 2 (requiere backend + APIs).
2. **Control de Stock:** alta/baja, ocultado, alerta ≤5, código + rubro + proveedor.
3. **Clientes:** alta y asignación a cada venta.
4. **Proveedores:** alta y pedidos asociados.
5. **Lista de precios:** catálogo real importado del proveedor + administración desde el panel. PDF directo = fase 2.
6. **Reportes:** caja diaria/período por medio, historial por cliente y por proveedor, stock general/por rubro valorizado, lista de precios general/por rubro (imprimible).
7. **Respaldo diario:** export/import JSON + contador. Automático en servidor = fase 2.
8. **Pedidos:** registro por proveedor con estado pendiente/recibido.

## Link de pago por venta (Mercado Pago)
Demo: en Caja, botón **🔗 Generar link de pago** → crea link simulado + botón
**Pasar al cliente por WhatsApp** + movimiento MP *no conciliado* (el stock se
descuenta al Cobrar/entregar, no al generar el link).

Cableado real (fase 2, backend mínimo requerido — Pages es estático y no puede
guardar el `MP_ACCESS_TOKEN`):
1. Cuenta MP del vendedor + credencial `MP_ACCESS_TOKEN` (https://www.mercadopago.com.ar/developers).
2. Endpoint `POST /api/mp/crear-preferencia {items, total}` → SDK `mercadopago`:
   `preference.create({items, back_urls, notification_url, external_reference})` → devuelve `init_point`.
3. En `js/pagos.js`: `MP_CONFIG.modo='real'`, `backendURL` apuntando al endpoint.
4. Webhook `POST /api/mp/webhook` recibe IPN (`payment` aprobado) → marca el
   movimiento conciliado (y opcionalmente descuenta stock si se vende solo online).
5. QR: MP devuelve también `qr_code` para mostrar en mostrador.

## Siguiente (base para trabajar)
- [ ] Ticket imprimible / factura
- [ ] Confirmar con el proveedor las 16 filas corregidas del import
- [ ] Backend real (cuando escale): misma API de `store.js` contra servidor
      (hoy cada dispositivo tiene su propia lista en `localStorage`)
