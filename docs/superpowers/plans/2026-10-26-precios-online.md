# Plan de precios compartidos
Diseño: docs/superpowers/specs/2026-10-26-precios-online.md.
- [x] Pruebas de API con D1 real SQLite: autorización, validación, concurrencia y lectura entre sesiones.
- [x] API de mapa singleton con revisión e inicialización idempotente en primer guardado autorizado (sin migración manual).
- [x] Store: aplicar solo precios preservando cambios locales y movimientos durante peticiones; evitar reversión desde catálogo estático.
- [x] Interfaz: guardar y compartir, sesión de operador, pendientes y actualización automática.
- [ ] Pruebas, compilación, despliegue gratuito y comprobación pública.
