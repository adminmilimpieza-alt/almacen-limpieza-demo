# Mi Limpieza · Guía de uso online

Usar únicamente https://milimpieza.adminmilimpieza.workers.dev/. Ingresar la clave de operador en cada equipo. Todos ven el mismo negocio; para operar hace falta Internet. El aviso superior indica si hay conexión y permite **Actualizar datos** o cerrar sesión.

## Qué se comparte
Productos, precios, fotos, stock y visibilidad; clientes con dirección, teléfono, cumpleaños y deuda; proveedores; ventas y anulaciones; pedidos y recepciones; turnos de caja, movimientos, conciliación y reportes. Los equipos reciben cambios en unos 5 segundos. Si hay un formulario abierto, la actualización de su contenido se posterga para no borrar lo que se está escribiendo. Si otro equipo cambió datos antes de guardar, se solicita actualizar y revisar.

La caja es única y compartida: una apertura se ve en todos los equipos. El carrito que todavía no se cobró es propio de cada equipo. Al confirmar una venta, el servidor registra venta, movimiento/deuda y descuento de stock juntos. Los demás equipos ven el resultado confirmado.

## Clientes y productos
Guardar en el formulario confirma online; al fallar la conexión el formulario permanece abierto. Los nuevos registros aparecen en los demás equipos. No se permite eliminar clientes, proveedores o productos con operaciones asociadas; se puede ocultar un producto.

## Precios
En **Módulos → Precios**, buscar por nombre o código y editar costo, margen o **precio final**. Al redondear la venta, el margen se recalcula. Cada edición se guarda online al terminar el campo.

**Lista de precios** permite elegir Mostrador (predeterminada), Revendedores o una lista propia. En **Administrar y compartir listas**, escribir un nombre y pulsar **Nueva lista**. Los productos sin precio particular heredan Mostrador; editar su precio o margen crea un precio propio y **Usar Mostrador** lo restablece. En **Clientes**, asignar la lista al cliente. Caja usa esa lista al elegirlo; si se cambia el cliente con un ticket armado, pide confirmar la actualización de los precios. Las ventas anteriores conservan sus importes.

### Importar la lista completa del proveedor
Para reemplazar el catálogo con la última planilla del proveedor: **Precios → Importar la lista completa del proveedor · Excel**. Elegir el archivo y pulsar **Leer la lista**. El sistema lee cada sección (`Proveedor: UNIBLANC`, `GEMORA`, `ACUAMAR`, `PURA QUIMICA`, `DON EMILIO`), arma el nombre y la presentación de cada producto y muestra el resumen antes de tocar nada: nuevos, con cambios, sin cambios, sin costo en la lista y los que salen.

Al confirmar **Importar la lista al negocio**, el servidor agrega lo nuevo, actualiza costo, margen, proveedor y categoría de lo que ya existe y **oculta** (no borra) lo que salió de la lista. Nunca modifica stock, fotos ni ventas: el stock se cuenta y las fotos se suben aparte. La operación queda registrada una sola vez, aunque se reintente.

- Los precios y la venta son los de la planilla. El envase (columna Costo/Botella) ya está incluido en la venta: se guarda el costo equivalente (venta ÷ (1 + margen)) para que la app reproduzca ese precio, y queda aclarado en la alerta del producto.
- Si la planilla trae la venta pero no el costo, se conserva el costo ya cargado y se actualiza la venta. Si el producto es nuevo y no tiene costo, se saltea y se informa para cargarlo a mano.
- Si cambia sólo la forma de escribir la presentación (1 Lt / 1 Kg) y el código es el mismo, se actualiza el producto existente en lugar de crear otro.
- Los productos ocultos se pueden volver a mostrar desde Stock; no se pierden.

Después de importar, revisar los avisos, cargar el stock real y subir las fotos de los productos nuevos.

### Comparar con el proveedor
Abrir **Comparar lista del proveedor**, elegir Excel (.xlsx/.xls), CSV o PDF con texto. El sistema sugiere hoja, encabezado y columnas; revisar especialmente **Costo del proveedor**, después pulsar **Comparar sin modificar precios**. Rojo: aumentó; verde: bajó; igual: sin cambio. Los desconocidos, duplicados o dudosos requieren revisión o asignación manual. Nunca se modifica nada por cargar el archivo.

La vista inicial **Sólo nuestros productos** oculta los artículos ajenos al catálogo. Se puede filtrar sólo aumentos, bajas o iguales. **Actualizar costo** aplica una fila; la tabla muestra venta actual → nueva y ganancia actual/resultante. **No aplicar** conserva costo y venta y excluye esa fila de las aplicaciones individuales y masivas de la comparación actual. **Volver a incluir** deshace esa exclusión. Las exclusiones se reinician al cargar otro archivo o iniciar una nueva comparación. Al aplicar una sola fila, el aviso muestra costo y venta antes/después según los datos confirmados online.

Para listas UNIBLANC **X Lt. / K**, se detecta **Por litro o kilo**: el precio del proveedor se multiplica por los litros o kilos de cada presentación propia. Ejemplo: $650/litro equivale a $650 en 1 litro y $3.250 en 5 litros. La botella se maneja aparte y no se suma al costo del líquido; en Excel se toma Costo/Lt., no Costo/Botella. Revisar la base de costo antes de comparar. Si la presentación es desconocida, el precio es cero o hay duplicados, la fila queda para revisión sin aplicar automáticamente.

### Precio por pack o por unidad
Si el nombre menciona pack, caja o X12 UNID, la fila queda pendiente de **Confirmar cotización**. En **Precio por unidad / pack**, elegir:

- **Ya es por la unidad que vendo**: conserva el importe del archivo, aunque el nombre mencione un pack.
- **Es el precio total del pack; vendo por unidad**: ingresar unidades por pack (por ejemplo 12). Divide el importe y muestra el costo unitario y la venta resultante. Ejemplo: $21.240 ÷ 12 = $1.770 por unidad.

La sugerencia del nombre se revisa; nunca divide por sí sola. Si el archivo no menciona pack, se puede abrir el mismo control y elegirlo manualmente. Cantidades faltantes o inválidas bloquean la aplicación. Se puede elegir **No aplicar** en una fila pendiente. Esta elección es propia de la comparación actual, y el costo confirmado sí se guarda online al aplicarlo. Las conversiones de granel por litro/kg se mantienen separadas.

Aplicar un cambio, los seleccionados o todos los coincidentes requiere confirmación. Si el costo sube, la venta mantiene su margen real y sube proporcionalmente (también los precios particulares); si baja, mantiene la venta y mejora el margen. Se pueden redondear los precios después. Los PDF escaneados como imagen necesitan una versión Excel o con texto seleccionable.

### Compartir listas y obtener informes
En **Módulos → Reportes**, elegir ventas, stock, clientes, historial de un cliente o lista de precios. Elegir fechas (hasta inclusive), cliente o lista según corresponda, y **Ver informe**. PDF, Excel, CSV e impresión contienen únicamente el informe mostrado. La lista para clientes incluye precios de venta, sin costos, márgenes ni deudas. También se puede imprimir o exportar CSV desde Precios.

En Clientes, **Ver compras** abre el historial: compras por fecha, productos y productos frecuentes. **Cargar compra anterior** incorpora fecha, productos, cantidades y precios históricos sin descontar stock, crear deuda ni mover caja. Los reportes de ventas normales excluyen esas compras salvo que se marque incluirlas. El stock es el actual al consultar, no una reconstrucción histórica.

## Fotos
Cargar una imagen en la edición de producto y Guardar. Si la foto no pudo subirse, el producto no se confirma y el editor permanece abierto. Para recuperar imágenes antiguas, **Stock → Fotos compartidas y recuperación** permite elegir un respaldo JSON: solo recupera imágenes de productos coincidentes, sin restaurar datos de caja ni reemplazar fotos online ya existentes.

## Mercado Pago
Armar el ticket y generar un enlace. Generarlo no registra una venta ni descuenta stock. Los enlaces se ven en todos los equipos del negocio. **Verificar pago** consulta Mercado Pago; cuando está aprobado, **Registrar venta pagada** vuelve a verificarlo y confirma la venta/stock en el servidor una sola vez. Se requiere una caja abierta. La vuelta desde Mercado Pago por sí sola no confirma el pago. Los enlaces vencen a las 24 horas; las comisiones se concilian aparte del importe bruto. Anular una venta en el sistema no reembolsa dinero: eso se gestiona en Mercado Pago.

## Si se corta Internet
No continuar cobrando mientras el sistema no confirme conexión. Si se informa que el resultado de una operación no pudo confirmarse, no repetirla: usar **Actualizar datos** para consultar/reintentar la misma operación de manera segura. El ticket queda bloqueado hasta resolver un cobro incierto. Guardar nuevamente no crea una copia del mismo cobro pendiente.

## Remitos
**Imprimir remito** usa el ticket actual o la última venta vigente no histórica guardada si el ticket está vacío. Usa el logo/plantilla REMITO entregados: fecha, cliente, dirección, cantidades, descripción, unitario y total, en media hoja A4 (A5 horizontal, 210 × 148 mm). Elegir papel A5, escala 100 % y desactivar encabezados/pies del navegador. Los pedidos largos continúan en otras medias hojas, con total final. Imprimir no vuelve a cobrar ni registra una venta. En una caja compartida, «última venta» es la más reciente de todo el negocio.

## Respaldos y piloto
Los datos se guardan en Cloudflare. **Módulos → Respaldo → Descargar respaldo** permite guardar una copia adicional del negocio. La restauración local y el reinicio están desactivados para no reemplazar datos compartidos. El piloto online inicia desde el catálogo publicado, conserva fotos/precios que ya estaban en el servidor y no mezcla automáticamente bases antiguas de navegadores. Las copias locales anteriores de Workers se conservan separadas y GitHub Pages ofrece descargar su respaldo antes de ir a Workers.
