# Respaldo de Mi Limpieza en Google Drive

El correo inicial de destino es **milimpiezainsumos@gmail.com**. El operador puede cambiarlo desde Respaldo. Guardar un correo no conecta la cuenta y no confirma una copia.

## Estado de entrega

El código admite autorización Google, copia manual y ejecución diaria. **La conexión real queda pendiente hasta configurar una aplicación OAuth y autorizar la cuenta.** No hay credenciales Google incluidas en el repositorio. No se habilita un servicio pago ni se registran copias ficticias.

## Configuración necesaria

1. En un proyecto Google existente o gratuito, habilitar Google Drive API y crear un cliente OAuth de tipo aplicación web. Configurar la pantalla de consentimiento y, si está en pruebas, agregar el correo destinatario como usuario de prueba. Google puede hacer vencer los permisos de una aplicación en pruebas; para copias permanentes revisar su estado de publicación.
2. Registrar exactamente `https://DOMINIO-REAL/api/respaldo-drive/callback` como URI de redirección autorizada.
3. Configurar en Cloudflare `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (secreto) y `GOOGLE_REDIRECT_URI` con esa URI. Mantener `ADMIN_PASSWORD` configurada; también interviene en el cifrado de los permisos almacenados.
4. Publicar el sitio con el endpoint y el disparador diario. Desde Respaldo, guardar el correo, iniciar sesión de operador y elegir Conectar cuenta de Google. Autorizar **la misma cuenta que figura en el destino**.
5. Elegir Hacer copia ahora. El sistema crea una carpeta propia llamada **Mi Limpieza · Respaldos** en esa cuenta. Revisar el enlace de carpeta y abrir el JSON. El permiso `drive.file` limita el acceso a archivos creados o autorizados para esta aplicación; no habilita lectura general del Drive.

La aplicación solicita `openid email` para verificar la identidad y `drive.file` para crear sus archivos. Google devuelve el correo real: no se confía solamente en el texto escrito por el operador. La autorización es de uso único, vence en diez minutos y está vinculada al navegador y a una sesión de operador válida. Dos cookies transitorias HttpOnly/Secure/SameSite=Lax permiten el regreso de Google sin cambiar la cookie principal SameSite=Strict.

Los refresh tokens se cifran con AES-GCM y se guardan únicamente en D1. No se incluyen en respuestas, almacenamiento del navegador ni copias. Cambiar el secreto OAuth o la clave de operador exige reconectar. Cambiar la cuenta de destino también exige una autorización nueva.

## Copias y recuperación

Cada archivo contiene versión de formato, fecha, colecciones del negocio y fotos JPEG completas codificadas en base64, con clave, revisión y estado de eliminación. No depende de una sesión del operador para recuperar las fotos. No incluye tablas de sesiones, permisos OAuth, claves de Mercado Pago, límites de acceso ni credenciales del servidor.

Sólo se muestra «última copia verificada» después de volver a consultar en Google el ID, carpeta y tamaño del archivo creado. Los errores se conservan para el operador. El disparador diario omite el día que ya tiene una copia exitosa; una copia manual puede hacerse igualmente. Una exclusión temporal evita dos copias simultáneas. Si no hay credenciales o cuenta conectada, el disparador no hace nada y no informa éxito.

El JSON de Drive tiene un contenedor `format: milimpieza-respaldo-drive`, `version: 1`, `data` y `photos`. Para una restauración controlada, descargar el archivo, comprobar versión y fecha, restaurar `data` con el procedimiento de importación del negocio y recuperar las fotos JPEG de `photos` por sus claves/revisiones. **El botón actual de importar un respaldo local no interpreta automáticamente este contenedor**: no usarlo directamente sin extraer y revisar `data`. Antes de restaurar en producción, hacer copia local y una prueba aislada con ventas, clientes, stock y fotos. No se implementa una restauración destructiva automática.

Esta primera implementación admite hasta 10 MB por archivo completo (datos y fotos en base64). Si se excede, detiene la operación con un error explícito y conserva la fecha anterior; nunca sube sólo una parte del negocio. Para catálogos mayores se requiere una carga segmentada/resumible antes de habilitar las copias. No se borran copias anteriores. Revisar periódicamente el espacio gratuito de la cuenta. Un error de cuota no modifica el negocio y no actualiza la fecha de éxito.

## Integración

- Worker: importar `handleDriveBackup` y `runDriveBackup`; delegar `/api/respaldo-drive/*` al primero. Registrar un disparador cron diario que ejecute el segundo usando `ctx.waitUntil` y registre cualquier fallo, sin imprimir secretos.
- Navegador: cargar `js/respaldo-drive.js` e invocar `RespaldoDrive.init()` después de `OnlineBusiness.init()`.
- Store: `configurarRespaldoDrive({email})` conserva la selección en `catalogo.respaldoDrive.email` y debe cambiar `catalogo.respaldoDrive.revision` cada vez que cambia el correo.
- D1: las tablas privadas se crean con `CREATE TABLE IF NOT EXISTS`; no se requieren permisos o tablas del negocio nuevos.

Referencias oficiales: [OAuth para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server), [permisos de Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [subida de archivos](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [consulta de archivo](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get).
