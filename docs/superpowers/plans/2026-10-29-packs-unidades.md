# Comparación por pack y venta por unidad

El usuario confirma punto 3: distinguir cotización del pack y por unidad. El nombre X12 no demuestra que el importe sea un pack; el operador debe confirmar.

- Por fila, cotización unitario/pack y cantidad entera de unidades (2..100000). Sugerir cantidad de nombres X12 UNID, PACK/CAJA, sin convertir automáticamente.
- Si hay indicio de pack, bloquear aplicación hasta confirmar. Mostrar importe original y división explícita al convertir. Conversión por fila, admitiendo archivos mixtos. No aplicar y Volver a incluir se mantienen.
- Al aplicar se envía sólo el costo unitario al comando central existente; mismas reglas de aumento/baja y actualización de listas; no mueve stock. Granel por litro/kg no se divide por pack.
- Corregido matching por volumen de nombre cuando presentación dice x Unid (ej. 375 GR).
- 116 pruebas pasan. Navegador local: filas pendientes no aplicables, pack21240/12→1770, precio ya unitario1890 no se divide. API SQLite aislada confirma costo1770/venta2301 y stock sin cambios.
- Publicación pendiente de verificar. El intento anterior del commit21c123b falló en assets-upload-session con error interno10013 de Cloudflare; no es un fallo de pruebas ni del build.
