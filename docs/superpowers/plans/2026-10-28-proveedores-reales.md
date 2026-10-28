# Comparación con archivos reales de proveedores

Decisión del usuario: Excel sólo como referencia/comparación, sin reemplazar catálogo. Botella separada del costo del líquido. No aplicar precios de los archivos en producción.

- [x] Reproducir lectura de mayorista y granel: encabezados Artículo/Precio c/Imp y Codigo Descripcion unidos; formato monetario US y AR.
- [x] Reconstruir filas por posiciones y reconocer precio por litro/kg; convertir a cada presentación propia, sin botella. Presentaciones desconocidas y precio cero requieren revisión.
- [x] Vista inicial sólo coincidencias propias, filtros aumentos/bajas/iguales, costo actual/nuevo, venta y ganancia antes/después. Aplicación explícita por fila/selección/todos.
- [x] Pruebas del parser, presentaciones y costos; navegador local con ambos PDF completos y aplicación de una baja sobre base SQLite aislada. La venta permanece idéntica y el resultado queda sin cambios.
- [x] Excel real inspeccionado: Costo/Lt. y costo de botella separados; 269 filas válidas de costo. No se importó al negocio real.
- [ ] Publicación y verificación de activos nuevos sin cambios de datos de producción.

En catálogo semilla de prueba: mayorista 2.198 filas y 83 coincidencias; granel 214 filas y 89 presentaciones propias. Estas cantidades dependen del catálogo de cada momento y no se prometen como cifras del negocio real.
