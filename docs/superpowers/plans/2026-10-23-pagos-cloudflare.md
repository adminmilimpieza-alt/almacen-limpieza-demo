# Implementación de pagos en Cloudflare

Objetivo: desplegar con costo de alojamiento cero y habilitar enlaces verificables cuando se carguen credenciales válidas.

1. Tests de validación monetaria, autenticación, coincidencia de pagos y registro único de venta. Ejecutar con `node --test` antes y después de implementar.
2. `worker/index.mjs`: API autenticada, token propio o Client Credentials, preferencias y consultas a MP. `worker/security.mjs`: sesión y firma de notificaciones. `migrations/0001.sql`: cobros y límites de acceso.
3. `js/pagos.js`: sesión, solicitudes y lista de cobros con renderizado por DOM. `js/store.js`: registro local idempotente de venta aprobada. `js/caja.js`: congelar ticket al generar enlace, sin ingreso anticipado. `index.html`: estado y cobros.
4. `tools/build.mjs`, `package.json`, `wrangler.jsonc`: publicar solo archivos web y enrutar API al Worker. Configurar D1 en el panel gratuito. No publicar secretos, herramientas ni documentación interna.
5. Verificar tests, build, migraciones y API local. Publicar rama y desplegar una vista funcional; cargar secretos con intervención del usuario y comprobar cuenta/preferencia antes de habilitar cobros reales.

La ejecución continúa en esta sesión por autorización del usuario para configurar todo. No requiere nuevos agentes.
