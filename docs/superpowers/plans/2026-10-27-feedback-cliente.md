# Implementación del feedback piloto
- [x] Impresión A5 con paginación explícita, pruebas de todos los artículos y total dentro de cada media hoja.
- [x] Reglas centrales: precio final editable, listas y asignación; política de costos elegida y compras históricas sin efectos financieros. Pruebas SQL/CAS y precios de caja/MP.
- [x] Interfaz listas por cliente + precios efectivos en caja.
- [x] Importador XLSX/XLS/CSV/PDF textual, selección de hoja/columnas, comparación y aplicación explícita.
- [x] Reportes por fechas/cliente, exportación enfocada PDF/Excel/CSV y listado de precios comercial.
- [x] Pruebas completas, revisión, interfaz DOM y vista de impresión en navegador local; despliegue y verificación sin modificar ventas reales.

## Evidencia de validación

- 100 pruebas automatizadas; build y diff-check.
- Dos interfaces completas con Worker/SQLite aislado: cliente/producto/caja/venta y stock compartidos.
- Navegador local: crear lista propia, leer Excel original (hoja Lista PRECIO y Costo/Lt.), lector PDF textual, descargar PDF/XLSX de Stock. PDF renderizado y revisado visualmente.
- Remito de 43 productos: todas las páginas medidas en navegador; tabla y pie contenidos en 135 mm de alto. Capturas en docs/feedback-*.png; son datos ficticios locales.
- Revisión independiente sin bloqueantes pendientes; regresiones de presentaciones incompatibles y volúmenes decimales cubiertas.
- No se aplicaron precios del proveedor ni ventas de prueba en producción.
