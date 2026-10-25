# Implementación autorizada: fotos online

1. Tests primero: `tests/photos.test.mjs`, con SQLite real para la tabla y Worker Request/Response; `tests/photo-sync.test.mjs` para combinar foto remota y foto local sin perder datos.
2. `migrations/0002.sql`: tabla de miniaturas, revisión y baja lógica. `worker/photos.mjs`: GET manifiesto/imagen y PUT autenticado con comparación de revisión y límites. Integrar en Worker antes del control de dispositivo de pagos.
3. `js/foto-identidad.mjs`: clave estable común servidor/navegador; `js/fotos-datos.mjs`: combinación y selección segura de candidatas. `js/fotos.mjs`: sesión existente, refresco, carga y recuperación desde navegador o JSON.
4. `js/stock.js`: guardar foto online, conservar pendientes y mensajes claros. `js/store.js`: preservar revisión de fotos en actualización del catálogo. `index.html`: controles y estado de sincronización, módulo de fotos; build copia shared si corresponde.
5. Ejecutar tests/build, migración local, prueba de API y dos navegadores. Revisar de forma independiente antes de publicar. Crear las tablas remotas sin tocar cobros y desplegar por la rama existente. Actualizar guía y PR.

Ejecución en esta sesión según el pedido de avanzar; no requiere crear otro proyecto ni un servicio pago.
