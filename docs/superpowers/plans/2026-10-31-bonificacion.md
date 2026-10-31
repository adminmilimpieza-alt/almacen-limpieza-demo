# Bonificación automática del 10%

Alcance confirmado por el usuario: al elegir efectivo o transferencia se aplica automáticamente el 10% al total completo; visible antes de confirmar y en ticket. Otros medios no reciben descuento. Este cambio no importa la lista nueva ni implementa los envases, que pertenecen al pedido anterior pendiente.

Implementación: calcular subtotal, descuento monetario redondeado a centavos y neto en Store.cobrar, que también ejecuta el servidor; guardar los tres importes y porcentaje; usar total neto para movimientos/deuda; mostrar vista previa por medio de pago; imprimir valores guardados al reimprimir y no recalcular ventas viejas. Conservar validación de precio de lista y cantidades del servidor. Anular devuelve stock y anula el movimiento neto original.

Verificación: siete casos nuevos de efectivo, transferencia, cuenta, Mercado Pago, redondeo, remito y compatibilidad histórica; prueba del servidor con lista mayorista actualizada a neto 810 desde subtotal 900. Conjunto completo: 132 pruebas aprobadas. Build correcto. Publicar mediante la rama existente vinculada a Cloudflare y verificar assets v40 sin registrar ventas reales.
