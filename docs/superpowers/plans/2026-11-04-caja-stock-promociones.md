# Implementación: revisión del cliente de noviembre

Diseño: ../specs/2026-11-04-caja-stock-promociones-design.md. Confirmaciones: costo sin IVA, IVA 10,5%/21% por producto, porcentajes sobre costo y venta vinculados, bonificación opcional, cuenta Drive milimpiezainsumos@gmail.com cambiable.

- [x] Store/Worker: promociones compartidas, componentes canónicos y stock agregado; snapshot de venta y pago MP; anulación/idempotencia; envase opcional en5L.
- [x] Precios: previewIVA, markup/margen, final editable, preservación de IVA/precios desconocidos al editar stock; campos compartidos guardados con detección concurrente.
- [x] UI Caja: 40/60, scroll independiente, menú superior, logo, pestañas de promociones, bonificación opcional, bidón sinstock, fusión de líneas, retiro socio y movimientos filtrados.
- [x] UI Stock y listas: proveedor al crear, editor completo, promos componentes/precio, herramientas costoprecios enStock y módulo comercial separado.
- [x] Fotos comerciales: PDF e impresión con bytes incorporados; bloqueo de URLs externas, fotos ausentes como placeholder; exportaciones tabulares preservadas.
- [x] Drive preparado: autenticaciónOAuth cuenta verificada, tokens cifrados privados, datos/fotos completos, verificación archivo, disparador diario07UTC (04Argentina), UI honesta no conectado.
- [x] Pruebas aisladas de flujo y revisión desktop/móvil; corregida clasificación de bidón suelto como líquido.
- [ ] Publicación y comprobación online sin registrar ventas ficticias ni modificar precios actuales.
- [ ] Drive real: configurar cliente Google y autorizar milimpiezainsumos@gmail.com; no asumir conexión por guardar correo.

## Revisión de integración
Se corrigieron regresiones de IVA en CSV, edición de precio particular sin bidón y bloqueo de navegador anterior al cobro opcional. Las recargas 5L se distinguen en el remito sin agregar un renglón ni importe de envase. Revisión visual real de desktop y móvil completada en entorno local aislado.
