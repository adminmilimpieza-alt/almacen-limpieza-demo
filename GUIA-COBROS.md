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
