# Mercado Pago en Cloudflare Free

Diseño acordado en el chat: alojar la web y API con Workers Free y conservar el código en GitHub. D1 guarda solicitudes y estados de cobro. Sin planes pagos ni dominio comprado.

La API requiere una sesión de operador con cookie HttpOnly, Secure y SameSite=Strict. Una clave de operador se carga como secreto en Cloudflare, junto con las credenciales de Mercado Pago. El secreto jamás se sirve al navegador. Cada equipo conserva su identificador en el respaldo local.

Crear un enlace captura el ticket y crea una solicitud pendiente: no crea ingresos ni descuenta stock. El backend calcula el importe y solicita la preferencia con external_reference única. La consulta autenticada verifica el pago directamente con Mercado Pago; opcionalmente un webhook firmado actualiza el estado. Se comparan cuenta receptora, moneda ARS, monto y referencia. Los retornos del navegador no prueban un pago.

El operador registra una venta aprobada en el equipo que generó el enlace. La referencia impide duplicarla en ese equipo; la API restringe el registro a su identificador. Stock y ventas existentes siguen locales y requieren respaldo al cambiar de dirección. La base de cobros no es una migración de todo el sistema.

La publicación puede quedar disponible sin credenciales; en ese caso la API informa que falta configurar y nunca simula enlaces. No se realizan pagos reales durante la configuración. La validez del App ID/Client Secret para cobrar debe verificarse antes de declarar producción habilitada.
