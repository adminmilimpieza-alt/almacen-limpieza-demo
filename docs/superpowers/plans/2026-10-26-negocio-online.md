# Implementación del negocio online
1. Refactorizar Store como factory reutilizable cliente/Worker conservando regresiones y agregar comandos puntuales para precios/asignación.
2. Worker business autenticado: tablas por registro, semilla, revisión CAS, idempotencia, validaciones y pruebas SQL reales de dos sesiones/concurrencia.
3. Adaptar handlers de UI a esperar confirmación online; no vaciar carrito ni cerrar formularios ante error.
4. Adaptador Store de navegador: cache de lectura, sesión, consulta periódica, bloqueo offline y recuperación idempotente. Integrar fotos y precios sin volver a catálogo estático.
5. Cobros MP compartidos, guardar venta solo tras verificación backend. Proteger restauración/reset para no borrar negocio global.
6. Pruebas integradas/revisión; publicar Workers, confirmar endpoints y desactivar GitHub Pages con respaldo.
