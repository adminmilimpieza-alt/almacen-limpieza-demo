# Mi Limpieza · Guía de uso online

Usar únicamente https://milimpieza.adminmilimpieza.workers.dev/. Ingresar la clave de operador en cada equipo. Todos ven el mismo negocio; para operar hace falta Internet. El aviso superior indica si hay conexión y permite **Actualizar datos** o cerrar sesión.

## Qué se comparte
Productos, precios, fotos, stock y visibilidad; clientes con dirección, teléfono, cumpleaños y deuda; proveedores; ventas y anulaciones; pedidos y recepciones; turnos de caja, movimientos, conciliación y reportes. Los equipos reciben cambios en unos 5 segundos. Si hay un formulario abierto, la actualización de su contenido se posterga para no borrar lo que se está escribiendo. Si otro equipo cambió datos antes de guardar, se solicita actualizar y revisar.

La caja es única y compartida: una apertura se ve en todos los equipos. El carrito que todavía no se cobró es propio de cada equipo. Al confirmar una venta, el servidor registra venta, movimiento/deuda y descuento de stock juntos. Los demás equipos ven el resultado confirmado.

## Clientes y productos
Guardar en el formulario confirma online; al fallar la conexión el formulario permanece abierto. Los nuevos registros aparecen en los demás equipos. No se permite eliminar clientes, proveedores o productos con operaciones asociadas; se puede ocultar un producto.

## Precios
En **Módulos → Precios**, buscar por nombre o código y editar costo/margen. La venta se calcula sola. Cada edición se guarda online al terminar el campo. Para importar CSV, desplegar **Cargar una lista CSV**, elegir archivo/rubro, **Revisar archivo** y **Aplicar lista**. Columnas: `codigo,nombre,presentacion,costo,margen`, separadas por comas y punto para decimales. El archivo actualiza productos existentes. **Actualizar precios** consulta la última versión; no hay un paso adicional de publicar en GitHub.

## Fotos
Cargar una imagen en la edición de producto y Guardar. Si la foto no pudo subirse, el producto no se confirma y el editor permanece abierto. Para recuperar imágenes antiguas, **Stock → Fotos compartidas y recuperación** permite elegir un respaldo JSON: solo recupera imágenes de productos coincidentes, sin restaurar datos de caja ni reemplazar fotos online ya existentes.

## Mercado Pago
Armar el ticket y generar un enlace. Generarlo no registra una venta ni descuenta stock. Los enlaces se ven en todos los equipos del negocio. **Verificar pago** consulta Mercado Pago; cuando está aprobado, **Registrar venta pagada** vuelve a verificarlo y confirma la venta/stock en el servidor una sola vez. Se requiere una caja abierta. La vuelta desde Mercado Pago por sí sola no confirma el pago. Los enlaces vencen a las 24 horas; las comisiones se concilian aparte del importe bruto. Anular una venta en el sistema no reembolsa dinero: eso se gestiona en Mercado Pago.

## Si se corta Internet
No continuar cobrando mientras el sistema no confirme conexión. Si se informa que el resultado de una operación no pudo confirmarse, no repetirla: usar **Actualizar datos** para consultar/reintentar la misma operación de manera segura. El ticket queda bloqueado hasta resolver un cobro incierto. Guardar nuevamente no crea una copia del mismo cobro pendiente.

## Remitos
**Imprimir remito** usa el ticket actual o la última venta guardada si el ticket está vacío. Usa el logo/plantilla REMITO entregados: fecha, cliente, dirección, cantidades, descripción, unitario y total, en A4. Imprimir no vuelve a cobrar ni registra una venta. En una caja compartida, «última venta» es la más reciente de todo el negocio.

## Respaldos y piloto
Los datos se guardan en Cloudflare. **Módulos → Respaldo → Descargar respaldo** permite guardar una copia adicional del negocio. La restauración local y el reinicio están desactivados para no reemplazar datos compartidos. El piloto online inicia desde el catálogo publicado, conserva fotos/precios que ya estaban en el servidor y no mezcla automáticamente bases antiguas de navegadores. Las copias locales anteriores de Workers se conservan separadas y GitHub Pages ofrece descargar su respaldo antes de ir a Workers.
