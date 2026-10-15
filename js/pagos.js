// pagos.js — punto 1 online: link de pago por venta (Mercado Pago)
// MODO DEMO: genera link simulado + compartir por WhatsApp.
// CABLEADO REAL: implementar /api/mp/crear-preferencia en un backend mínimo
// (Vercel/Cloudflare/Supabase) con MP_ACCESS_TOKEN en secreto, y reemplazar
// Pagos.crearLink por el fetch comentado abajo. Ver README sección Mercado Pago.
const Pagos = (() => {
  const MP_CONFIG = {
    modo: 'demo', // 'demo' | 'real'
    backendURL: '', // ej: 'https://tu-backend.vercel.app/api/mp/crear-preferencia'
    // Webhook (fase 2): tu backend recibe IPN de MP y marca el movimiento conciliado.
  };
  async function crearLink({items, total, medio}) {
    if (MP_CONFIG.modo === 'real' && MP_CONFIG.backendURL) {
      // const r = await fetch(MP_CONFIG.backendURL, {method:'POST',
      //   headers:{'Content-Type':'application/json'},
      //   body: JSON.stringify({items, total})});
      // const j = await r.json(); // {init_point, qr, preference_id}
      // return j;
      throw new Error('Configurar backendURL');
    }
    const id = 'DEMO-' + Date.now().toString(36).toUpperCase();
    return {
      id,
      init_point: 'https://link.mercadopago.com.ar/demo-' + id,
      qr: null,
      demo: true,
      instrucciones: 'Link simulado. Al cablear MP real devuelve el init_point verdadero.'
    };
  }
  function whatsappShare(link, total){
    const txt = encodeURIComponent(`Hola, te paso el link de pago ($${total}): ${link}`);
    return `https://wa.me/?text=${txt}`;
  }
  return {crearLink, whatsappShare, MP_CONFIG};
})();
