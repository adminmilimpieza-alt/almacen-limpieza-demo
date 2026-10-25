# Cobros con Mercado Pago — Mi Limpieza

Usar la aplicación de Cloudflare: https://milimpieza.adminmilimpieza.workers.dev/

## Antes de usar la nueva dirección

En el equipo donde se usa la demo anterior, abrir **Módulos → Respaldo → Descargar respaldo**. Conservar el archivo JSON y restaurarlo en la nueva dirección desde **Módulos → Respaldo → Restaurar**. La nueva dirección no puede leer los datos guardados por la anterior.

La prueba técnica dejó un turno cerrado con saldo cero y un enlace pendiente sin pagar. No es una venta. El enlace caduca a las 24 horas y no debe compartirse con clientes.

## Generar y compartir un cobro

1. Abrir el turno desde **Módulos → Turno de caja**.
2. En caja, abrir **Cobros de Mercado Pago** e iniciar sesión con la clave de operador.
3. Usar **Ver cuenta receptora** para comprobar que corresponde al negocio.
4. Armar el ticket y asignar el cliente.
5. Pulsar **Generar link de pago**. El ticket queda capturado en el cobro pendiente y se retira del carrito. Esto todavía no suma ingresos ni descuenta stock.
6. Usar **Compartir por WhatsApp** para preparar el mensaje y enviarlo al cliente. También se puede copiar o abrir el enlace.

## Confirmar y registrar

1. Volver a **Cobros de Mercado Pago** en el equipo que generó el enlace.
2. Pulsar **Verificar pago**. El sistema consulta directamente Mercado Pago y comprueba que la cuenta, la referencia, la moneda y el importe coincidan.
3. Cuando figure **Pago aprobado**, pulsar **Registrar venta pagada**. Debe haber una caja abierta y stock suficiente. Se registra la venta y su ingreso bruto y se descuenta stock una vez.
4. Si ya figura **Venta registrada**, no cobrar el mismo ticket otra vez con el botón general **Cobrar**.

El regreso desde Mercado Pago, un mensaje de WhatsApp o una captura de pantalla no confirman el pago. Actualmente la verificación se realiza con el botón; las notificaciones automáticas requieren configurar el webhook en Mercado Pago Developers.

## Datos y respaldo

- Los cobros se guardan en el servidor, incluso si la computadora está apagada. No se actualizan los registros locales de venta y stock hasta registrar la venta aprobada.
- Ventas, stock y turnos siguen guardados en cada navegador. Descargar respaldo diario. No limpiar los datos del navegador sin conservar una copia.
- El respaldo incluye el identificador del equipo usado para recuperar sus cobros. No usar simultáneamente el mismo respaldo en dos cajas activas.
- Las comisiones de Mercado Pago se concilian aparte: el ingreso registrado es bruto.
- Anular una venta local no devuelve dinero en Mercado Pago. Los reembolsos deben gestionarse en la cuenta del negocio y reflejarse luego en el sistema.
- Si una generación falla con resultado incierto, revisar los cobros en Mercado Pago antes de emitir un segundo enlace.

## Costos

El alojamiento está configurado con Workers Free y D1 Free y una dirección gratuita. No se contrató un plan pago. Se aplican los límites de esos servicios. Las comisiones que Mercado Pago cobre por los pagos son independientes del alojamiento.

## Fotos compartidas online

En **Módulos → Stock**, las fotos nuevas se comprimen y se guardan online al pulsar **Guardar** en el producto. La carga usa la misma sesión de operador que los cobros. Otros navegadores muestran las fotos sin necesitar la clave; la clave se pide para modificarlas.

Las fotos se actualizan al abrir, al volver a la pestaña y cada minuto mientras esté visible. Para ver un cambio de inmediato, abrir **Fotos compartidas y recuperación → Actualizar fotos online**. Se identifica cada presentación por código, rubro y presentación; el ID local no interviene.

Si falla la conexión o la sesión venció, la foto queda explícitamente **pendiente en ese navegador**. Iniciar sesión y usar **Subir fotos pendientes de este equipo**. No limpiar los datos del navegador antes de recuperar las pendientes. Si también cambió la imagen en otro equipo, revisar con **Editar**; reemplazar una foto diferente requiere confirmación.

### Recuperar fotos que ya habían cargado

- Si se ven en el mismo navegador de la dirección Cloudflare, abrir **Stock → Fotos compartidas y recuperación → Subir fotos pendientes de este equipo**. Antes de subir se descarga una copia JSON solo de esas fotos.
- Si están en otra computadora o en la dirección anterior de GitHub Pages, abrir allí **Respaldo → Descargar respaldo**. En Cloudflare, ir a **Stock → Fotos compartidas y recuperación**, elegir ese JSON y pulsar **Recuperar fotos del respaldo**. No hace falta restaurar todo el respaldo.
- Solo se envían las imágenes y los identificadores de productos reconocidos. No se importan ventas, clientes, precios ni stock. Las fotos online ya existentes (incluidas las que se quitaron) no se pisan con una recuperación antigua.
- Si un producto no existe en este equipo, se informa como no coincidente; primero debe estar disponible en el catálogo correspondiente.
- Las fotos que solo existen en un navegador inaccesible no pueden recuperarse desde el servidor. El equipo original o su respaldo son necesarios.

Se usa D1 Free ya contratado, sin activar otros servicios: hasta 2000 identidades y 150 KB por JPEG comprimido. Las imágenes son de hasta 480 × 480 píxeles. Los respaldos antiguos con imágenes PNG/WebP se convierten a JPEG al subirlos. Esto comparte fotografías; ventas, stock y altas de productos siguen con su funcionamiento actual por navegador/catálogo.
