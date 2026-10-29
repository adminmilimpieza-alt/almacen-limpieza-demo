# Mi Limpieza · negocio online

Aplicación de caja para un negocio, publicada en https://milimpieza.adminmilimpieza.workers.dev/. Cloudflare Workers + D1, sin servicios de pago adicionales. GitHub Pages se retira como aplicación y deja acceso a Workers y exportación del respaldo antiguo.

## Funcionamiento

Todos los equipos autenticados consultan y modifican una misma base: productos/precios/fotos/stock/visibilidad, clientes/deudas/cumpleaños, proveedores, ventas/anulaciones, pedidos/recepciones, turnos/movimientos/conciliación y reportes. Una sola caja compartida. El carrito sin cobrar es propio de cada equipo. No se aceptan escrituras sin conexión ni snapshots locales como fuente de verdad.

- `js/store.js`: factory de reglas de negocio compartida entre navegador y Worker. Proxy del cliente envía mutadores online y usa una copia de lectura para consultas.
- `worker/business.mjs`: `GET /api/business?since=revision` y `POST /api/business`. Ambos requieren sesión. POST además exige mismo origen, UUID idempotente, revisión vigente y un comando permitido.
- `business_meta`: revisión y contador de operaciones; `business_records`: registros por colección/id; `business_operations`: recibos idempotentes. Se inicializan de forma idempotente en el primer acceso autenticado; se parte del catálogo publicado, sin importar bases locales anteriores.
- Cada comando se aplica a una copia en memoria y se confirma en un lote D1 atómico con comparación de revisión. Si otro equipo cambió la base, el lote no escribe datos. Ventas, stock, deuda y movimientos se confirman juntos. Una operación repetida con el mismo UUID no se repite.
- El cliente sondea cada 5 segundos; sin cambios solo se consulta una fila de revisión. Mientras se edita un formulario no se reconstruye su contenido. Se preservan cliente/filtros seleccionados y se reintenta la presentación diferida.
- Un resultado incierto queda identificado en sessionStorage y se resuelve con el mismo UUID antes de permitir otra escritura. Durante un cobro pendiente se bloquea el ticket. Los datos del piloto local se conservan separados del caché de lectura online.

## Precios y fotos

Costo, margen y precio final se guardan online al terminar de editar. Listas nombradas con precios particulares e herencia de Mostrador; cada cliente puede tener una lista. El comparador local XLSX/XLS/CSV/PDF textual aplica sólo cambios confirmados y coincide por código/nombre y presentación; los duplicados y dudosos no se aplican automáticamente. Aumentos de costo mantienen margen real; bajas mantienen venta. El botón Actualizar precios consulta el negocio. `/api/prices` antiguo responde 410 para evitar dos fuentes de verdad. `shared_prices` previo solo se lee para incorporar precios al crear la base central.

Las imágenes usan `product_photos` y `/api/photos`, JPEG hasta 150 KB, comprimido en el navegador a 480×480. Las referencias se guardan con los productos. Las fotos son públicas; las escrituras requieren sesión y revisión. Las recuperaciones de respaldos antiguos insertan solo imágenes ausentes y no restauran información financiera. Las bajas lógicas impiden que un respaldo viejo reponga una foto quitada.

## Cobros Mercado Pago

Credenciales solo en secretos de Workers: `ADMIN_PASSWORD` de al menos 16 caracteres y `MP_CLIENT_ID`/`MP_CLIENT_SECRET`, o `MP_ACCESS_TOKEN`. No se incluyen en archivos ni en la web. Se usa cookie HttpOnly Secure SameSite con vigencia de 12 horas y control de intentos de inicio de sesión.

Los enlaces y estados se comparten entre todos los operadores autenticados. El dispositivo se conserva como referencia de creación, no restringe visibilidad. La lista se consulta cada 10 segundos, con paginación de 50 registros. Registrar una venta aprobada vuelve a consultar Mercado Pago y usa la misma transacción central para stock/venta/movimiento y `orders.registered_at`. Los reintentos usan el recibo previo. No se captura dinero desde este código; se genera un enlace de Checkout Pro. Las comisiones y reembolsos se concilian por separado.

`MP_WEBHOOK_SECRET` es opcional. Mientras no esté configurado, la aprobación se consulta con Verificar pago. La vuelta del checkout no confirma un pago.

## Impresión

Imprimir remito usa el diseño de la hoja REMITO aportada por el cliente, con logo original y teléfono. Se imprime el carrito actual o la última venta compartida si está vacío. A5 horizontal (210 × 148 mm), páginas explícitas con medición del contenido, cantidades, descripciones, precios unitarios y total final. Excluye ventas históricas/anuladas al buscar la última venta. No modifica ventas ni stock.

## Desarrollo y publicación

```sh
npm test
npm run build
npm run dev
```

Build prepara `dist` con solo web/JS/CSS/datos públicos. Worker y secretos no van en los activos. `wrangler.jsonc` vincula `milimpieza-cobros`; aplicar `migrations/0001.sql` y `0002.sql` al crear una instalación nueva para cobros/fotos. Las tablas centrales se crean tras acceso autenticado. Usar `.dev.vars` ignorado para credenciales falsas locales. Las utilidades históricas de importar catálogo siguen siendo útiles para generar la semilla, no para sincronizar una caja en operación.

Cloudflare despliega la rama `codex/mercadopago-cloudflare` del repositorio del cliente. La página de GitHub `main` contiene únicamente el aviso de traslado y respaldo antiguo. No fusionar esa página de aviso encima de la aplicación de Workers.

Guía de operación: [GUIA-COBROS.md](GUIA-COBROS.md).

## Informes e historial

Modelos puros en `js/reportes-datos.mjs`; exportación de la instantánea elegida mediante `js/exportar-informe.js` a PDF, XLSX, CSV o impresión. Listas comerciales excluyen datos internos. Historial por cliente y fechas; compras anteriores guardadas como históricas sin efectos de stock, deuda o caja. Los formatos grandes paginan en PDF. Dependencias locales y licencias en `js/vendor/README.md`.

## Archivos web en servicio interno

Para evitar el error10013 de assets-upload-session del Worker histórico, `milimpieza-web` sirve `dist` por un Service Binding privado `ASSETS` al Worker principal `milimpieza`. Su configuración no incluye D1 ni secretos, y desactiva workers.dev y preview URLs. La API y los secretos permanecen en el principal; las solicitudes de archivos se reenvían sin cookies, autorización ni parámetros del checkout.

`npm run deploy` construye, publica primero `wrangler.web.jsonc` y sólo después `wrangler.jsonc`. En Cloudflare Builds el comando de deploy debe ser `npm run deploy`; el de build sigue siendo `npm ci && npm test && npm run build`. La URL pública permanece igual. Para desarrollo local, `npm run dev` inicia ambas configuraciones.

Referencia oficial: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/
