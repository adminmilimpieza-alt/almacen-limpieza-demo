# Caja, Stock, promociones y listas — revisión del cliente

## Confirmaciones y estado
El 4 de noviembre el usuario pidió los cambios de este documento. Confirmó que el costo se carga SIN IVA y que se debe sumar el IVA elegido (10,5% o 21%). La cuenta de Google Drive confirmada es milimpiezainsumos@gmail.com; la conexión OAuth queda pendiente de autorización. Diseño aprobado por las respuestas del usuario: costo sin IVA, dos porcentajes vinculados y cuenta de respaldo cambiable. Implementación en curso.

Se inspeccionaron index.html, js/caja.js, js/store.js, js/stock.js, js/app.js, js/operacion.js, js/cumple.js y js/listas-precios.js. Actualmente la bonificación es automática; los envases se incluyen siempre; Caja es de una columna con menú lateral. Stock sólo permite cambiar precios al crear; al crear no llena el selector de proveedores. Las listas exportadas no incluyen fotos. El respaldo JSON es manual, sin conexión a Drive. Los cumpleaños tienen calendario y aviso en Caja. Un retiro se puede registrar hoy como egreso con concepto libre.

## 1. Caja y navegación
En escritorio, dos columnas: 40% catálogo con fotos y 60% ticket/cobro. El catálogo tendrá pestañas Productos y Promociones. Cada columna tendrá desplazamiento propio; total, forma de cobro y botón Cobrar estarán accesibles sin bajar toda la página. En celular se usarán pestañas y total/cobro persistentes, sin forzar dos columnas estrechas.

Navegación principal arriba: Caja, Stock, Listas de precios, Clientes, Cumpleaños, Proveedores, Pedidos, Turno, Movimientos, Reportes y Respaldo. Logo real de Mi Limpieza al inicio de Caja. Eliminar el botón Actualizar precios del ticket. Si cambia un precio mientras se arma una venta, avisar antes de confirmar y mostrar el ticket revisado, sin cobrar silenciosamente otro importe.

## 2. Bonificación opcional
Casilla Aplicar bonificación del 10%, inicialmente sin marcar. Disponible sólo al seleccionar efectivo o transferencia. Al cambiar a Mercado Pago o cuenta corriente, queda desactivada y no se aplica. Subtotal, bonificación y total se muestran antes de cobrar y se guardan con la venta; se imprimen en remito y no se recalculan al reimprimir. Se aplica una sola vez al total elegido, incluidos envases y promociones. No modifica ventas anteriores ni cobros de deuda.

## 3. Promociones reales
Crear y editar promociones en Stock: nombre, foto opcional, precio final de la promoción y componentes (producto + cantidad). Ejemplo: dos unidades de un producto por un precio total definido por el cliente; también permitir combinar productos diferentes.

Al vender una promoción, el ticket muestra la promoción y su precio; internamente se descuentan las unidades de cada componente y sus envases correspondientes. Su disponibilidad depende del componente más limitado. Combinar ventas sueltas y promociones requiere validar el stock agregado. Una anulación devuelve los componentes exactos consumidos al vender. Las promociones tienen precio propio y no alteran el precio normal ni los movimientos históricos. El servidor valida precio, componentes y existencias; no acepta un descuento o composición arbitrarios enviados por el navegador.

## 4. Stock: único lugar de edición de producto
Nuevo y Editar producto comparten: código, nombre, rubro, proveedor, presentación, costo de compra sin IVA, ganancia sobre costo (%), margen sobre venta (%), IVA (10,5% o 21%), precio final editable, stock, visibilidad y foto. Proveedor se carga también al crear.

Se interpretó la petición de ganancia sobre venta como un segundo porcentaje vinculado al porcentaje sobre costo. Ejemplo: costo neto $100 y venta neta $150 equivalen a 50% sobre costo y 33,33% sobre venta. Con IVA 21%, el líquido o producto cuesta al público $181,50. Cambiar un porcentaje actualiza el otro y el precio. Editar el precio final recalcula ambos porcentajes. No calcular ganancia sobre el IVA ni sobre el envase agregado.

Para líquidos vinculados: precio final = venta del líquido con su IVA + precio final del envase. El envase conserva su precio propio; no se vuelve a aplicar IVA al precio de envase ya final. Mostrar el desglose sólo en administración. Al ingresar precio final manualmente, separar primero el envase y el IVA para recalcular la ganancia.

No reasignar IVA ni recalcular en bloque los precios actuales. Los productos existentes conservan el precio publicado hasta que el operador elija la tasa y guarde la edición. No interpretar una tasa faltante como IVA 21%. Una importación que no especifica IVA debe avisarlo y conservar la configuración del producto existente.

Mover las herramientas de costos, comparación con proveedores e importación al módulo Stock. El módulo Listas de precios será separado para administrar los precios particulares, asignaciones y documentos para clientes. Las listas por cliente no cambian de valor como efecto secundario de mover pantallas.

## 5. Bidón opcional para 5 L
Cada producto de 5 L permite definir si incluye bidón por defecto; al vender, el operador puede cambiar Incluir bidón para esa línea. Con bidón se suma su precio vigente y se consume una unidad. Sin bidón se cobra el líquido y no se consume envase. Conservar por defecto la inclusión actual hasta que el operador la cambie. El precio vigente del bidón es editable desde Stock; el ejemplo actual es $1.070.

Se deben poder vender el mismo líquido con y sin bidón en una misma compra como líneas distintas. La validación agregada de stock y las promociones deben respetar la elección. La botella de 1 L continúa incluida automáticamente. El remito mantiene una línea por producto/opción sin renglón de envase aparte.

## 6. Movimientos y retiro de socio
Filtros por fecha, Todos/Ingresos/Egresos, medio de pago y concepto. Mostrar total ingresos, total egresos y saldo neto para los filtros visibles. Verde para ingresos y rojo para egresos, conservando texto y signos para distinguirlos sin depender del color. Mostrar todos los movimientos del filtro con paginación, sin limitar silenciosamente a los últimos 30.

Agregar categoría Retiro de socio como egreso; no registrarlo como venta ni devolución y no modificar stock. Guardar concepto, monto, fecha y medio de salida. La clasificación es operativa del sistema, sin hacer reclasificaciones de movimientos anteriores.

## 7. Cumpleaños
Aviso visible en Caja con nombres y acceso al calendario. Mostrar quién cumple al elegir un día, y una lista del mes junto al calendario. Mantener el acceso manual a WhatsApp; no enviar mensajes automáticamente. Usar la fecha de Argentina.

## 8. Listas para clientes con fotos
Pestaña independiente Listas de precios. Imprimir y descargar un PDF con foto, nombre, presentación y precio final de la lista elegida. Incluir las fotos en el documento para que el cliente pueda abrirlo sin sesión de operador. No exponer endpoints privados ni incluir costos, márgenes, stock, deuda o datos de otros clientes. Mantener exportación Excel/CSV tabular cuando corresponda. Productos sin foto usan un espacio uniforme que no rompa el documento.

## 9. Respaldo
Hoy Descargar respaldo genera un JSON en el equipo; no se envía a ningún Drive. Para automatizar, conectar una cuenta elegida expresamente por el cliente y una carpeta de destino. La autorización a Drive debe hacerse con la cuenta destinataria y con el acceso necesario a la carpeta. Registrar fecha de última copia exitosa, destino y errores; no mostrar respaldo exitoso antes de verificar que el archivo existe. El respaldo debe contemplar datos y fotos recuperables, sin credenciales ni secretos de Mercado Pago. La frecuencia propuesta es una copia diaria y una copia manual adicional cuando se necesite.

La conexión a Drive es independiente del resto de las funciones; no dar por configurado ese destino hasta completar su autorización. Seguir en servicios gratuitos y no habilitar un plan pago.

## Secuencia de entrega y verificación
1. Modelo de precios e IVA, bonificación elegida, opción de envase y promociones; pruebas de cálculos, stock agregado, anulación, idempotencia y Mercado Pago.
2. Pantalla 40/60, navegación superior, logo y editor completo en Stock; verificar escritorio/celular, etiquetas y cobro accesible.
3. Movimientos, retiros y cumpleaños; verificar filtros, totales, calendario y ausencia de envíos automáticos.
4. Listas con fotos; revisar PDF y comprobar que se abre sin autenticación ni datos internos.
5. Drive tras conectar la cuenta; verificar copia y recuperación en un entorno aislado.

Respaldar el negocio antes de cambios persistentes. Mantener IDs, fotos, stock y ventas anteriores. Probar con datos aislados antes de publicar, y comprobar la versión online sin registrar ventas ficticias en producción.

## Alternativas de presentación
- Recomendada: pestañas Productos/Promociones en el 40% y ticket permanente en el 60%; facilita vender sin abandonar Caja.
- Alternativa: Promociones como un módulo aparte; simplifica el catálogo, pero obliga a cambiar de pantalla para vender una oferta.
