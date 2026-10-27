# Fotos compartidas y recuperación

El usuario autorizó avanzar con almacenamiento online de las fotos y recuperar las existentes. Se mantiene Cloudflare Free y la base D1 ya vinculada. Se descarta R2 para no introducir activaciones ni facturación adicional y se limita cada JPEG comprimido a 150 KB, con hasta 2000 identidades (menos de 300 MB de imágenes).

Las fotos se identifican por código, rubro y presentación, nunca por el ID local que cambia entre equipos. Productos sin código usan el nombre. La API pública solo permite leer miniaturas y sus revisiones, sin exponer datos de ventas/clientes. Cambiar imágenes requiere la sesión de operador y mismo origen. Guardados concurrentes usan revisión esperada; la migración solo inserta fotos ausentes y jamás pisa una existente, incluida una foto quitada.

La interfaz confirma guardado online. Si falla la conexión mantiene la foto local con aviso de pendiente y permite reintentar; no finge una subida exitosa. La consulta online preserva fotografías locales antiguas pendientes de migrar. Se sincroniza al abrir, volver a la pestaña, cada minuto mientras esté visible y con actualización manual.

Hay dos recuperaciones explícitas: subir fotos de este navegador o leer un respaldo JSON y enviar solo las fotos de productos reconocidos, sin restaurar ventas/stock/clientes. El navegador antiguo debe exportar el respaldo si las fotos solo existen allí. No se limpian sus datos ni se puede recuperar información de un dispositivo inaccesible.

Verificación: tests de API contra SQLite, autenticación, revisión concurrente, tamaño/formato, claves estables, preservación de fotos locales y propagación de eliminaciones; emulador local y dos sesiones independientes en la aplicación desplegada. Se usan fotos de prueba identificables y no se modifican fotos reales para probar.
