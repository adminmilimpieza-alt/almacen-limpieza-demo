# No aplicar y verificación de venta al cambiar costo

Alcance autorizado: puntos 1 y 2 del audio. Packs/unidades pendiente de confirmación; no se cambian conversiones ni precios de producción.

- No aplicar es una exclusión reversible para la comparación actual, respetada por actualización individual, selección y Aplicar todos. Volver a incluir permite reconsiderar. Una nueva comparación/archivo reinicia las exclusiones.
- La regla central ya incrementa la venta al subir costo y conserva venta al bajar. No se reprodujo el reporte de venta inalterada ante un aumento con el código actual. Se verificó por API y se mejora visibilidad: venta actual → nueva y aviso con costo/venta antes/después confirmados.
- Prueba de navegador: dos filas de CSV, excluir una reduce Aplicar todos de 2 a 1, fila gris y opción de volver a incluir. El diálogo nativo de confirmación bloqueó la automatización; el guardado se verificó por la API de la misma base aislada.
- API local: costo 670→720 confirma venta 1005→1080; producto excluido conserva costo 1050 y venta1575. Baja720→650 conserva venta1080 y sube margen. Prueba de servidor incluye precios particulares y lectura posterior.
- 109 pruebas automatizadas pasan; build y diff-check. Captura de interfaz de prueba fuera del repositorio.
