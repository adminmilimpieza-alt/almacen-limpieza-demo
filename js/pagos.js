// Las credenciales de Mercado Pago se guardan exclusivamente en Cloudflare.
const Pagos = (() => {
  let configured=false;
  const $=id=>document.getElementById(id);
  const labels={creating:'Creando enlace',creation_failed:'Creación sin confirmar; revisar en Mercado Pago',pending:'Pendiente de pago',approved:'Pago aprobado',refunded:'Reembolsado',charged_back:'Contracargo',review:'Revisar pago'};
  function deviceId(){
    const db=Store.get();
    if(!db.cfg.mpDeviceId){db.cfg.mpDeviceId=crypto.randomUUID();Store.import(JSON.stringify(db));}
    return db.cfg.mpDeviceId;
  }
  async function api(path,options={}){
    const r=await fetch(path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Device-ID':deviceId(),...options.headers}});
    let result;
    try{result=await r.json();}catch{throw new Error('Este sitio todavía no tiene conectado el servidor de cobros. Usá la dirección de Cloudflare.');}
    if(!r.ok){
      if(r.status===401) $('mp-login').hidden=false;
      throw new Error(result.error||'No se pudo completar la operación.');
    }
    return result;
  }
  function linkElement(url,text){
    const a=document.createElement('a'); a.href=url;a.textContent=text;a.target='_blank';a.rel='noopener noreferrer'; return a;
  }
  function whatsappShare(link,total){return 'https://wa.me/?text='+encodeURIComponent(`Hola, te paso el link de pago ($${total}): ${link}`);}
  function message(text){$('mp-status').textContent=text;}
  function render(orders){
    const box=$('mp-orders');box.replaceChildren();
    if(!orders.length){box.textContent='Todavía no hay enlaces generados en este equipo.';return;}
    orders.forEach(order=>{
      const row=document.createElement('div');row.className='venta';
      const title=document.createElement('b');title.textContent=`$${order.total} · ${labels[order.status]||order.status}`;row.append(title,document.createElement('br'));
      const detail=document.createElement('span');detail.className='hint';detail.textContent=new Date(order.created_at).toLocaleString('es-AR')+' · '+order.items.map(i=>i.nombre+' × '+i.cant).join(', ');row.append(detail,document.createElement('br'));
      if(order.init_point){row.append(linkElement(order.init_point,'Abrir enlace'),' · ',linkElement(whatsappShare(order.init_point,order.total),'Compartir por WhatsApp'),' ');}
      const check=document.createElement('button');check.textContent='Verificar pago';
      check.onclick=async()=>{check.disabled=true;try{await api(`/api/mp/orders/${order.id}/check`,{method:'POST'});await refresh();}catch(e){message(e.message);}finally{check.disabled=false;}};row.append(check);
      const existing=Store.get().ventas.some(v=>v.mpOrderId===order.id);
      if(existing){const done=document.createElement('span');done.textContent=' · Venta registrada';row.append(done);}
      else if(order.status==='approved'){
        const register=document.createElement('button');register.textContent='Registrar venta pagada';
        register.onclick=async()=>{
          if(!confirm('¿Registrar esta venta y descontar el stock? El pago se volverá a verificar con Mercado Pago.'))return;
          register.disabled=true;
          try{
            if(!Store.turnoAbierto())throw new Error('Abrí la caja para registrar la venta.');
            const verified=await api(`/api/mp/orders/${order.id}/register`,{method:'POST'});
            Store.registrarPagoMP(verified);Stock.render();Caja.refresh();Reportes.render();await refresh();message('Venta registrada. El ingreso bruto y el stock se actualizaron.');
          }catch(e){message(e.message);}finally{register.disabled=false;}
        };row.append(register);
      }
      box.append(row);
    });
  }
  async function refresh(){
    const data=await api('/api/mp/orders');$('mp-login').hidden=true;render(data.orders);
  }
  async function crearLink({items,clienteId}){
    if(!configured) throw new Error('Falta configurar el servidor de Mercado Pago.');
    // Keep a request ID across retries to avoid duplicate preferences on double clicks.
    const snapshot=JSON.stringify({items,clienteId});
    let saved;try{saved=JSON.parse(sessionStorage.getItem('mp-request')||'null');}catch{}
    if(!saved||saved.snapshot!==snapshot){saved={id:crypto.randomUUID(),snapshot};sessionStorage.setItem('mp-request',JSON.stringify(saved));}
    const order=await api('/api/mp/orders',{method:'POST',body:JSON.stringify({id:saved.id,items,cliente_id:clienteId})});
    sessionStorage.removeItem('mp-request');try{await refresh();}catch(e){message(e.message);}return order;
  }
  async function init(){
    $('mp-login-form').onsubmit=async event=>{
      event.preventDefault();const input=$('mp-password'),password=input.value;input.value='';
      try{await api('/api/login',{method:'POST',body:JSON.stringify({password})});await refresh();message('Sesión iniciada. Podés generar enlaces y verificar cobros.');}
      catch(e){message(e.message);}
    };
    $('mp-refresh').onclick=()=>refresh().catch(e=>message(e.message));
    $('mp-logout').onclick=async()=>{try{await api('/api/logout',{method:'POST'});$('mp-orders').replaceChildren();$('mp-login').hidden=false;message('Sesión cerrada.');}catch(e){message(e.message);}};
    $('mp-account').onclick=async()=>{try{const account=await api('/api/mp/account');message(`Cuenta receptora: ${account.nickname} · ID ${account.id} · ${account.site_id}. Confirmá que corresponda al cliente antes de cobrar.`);}catch(e){message(e.message);}};
    try{
      const r=await fetch('/api/health',{cache:'no-store'});if(!r.ok)throw new Error();const health=await r.json();
      configured=health.database&&health.operatorConfigured&&health.mercadoPagoConfigured;
      $('linkmp').disabled=!configured;
      message(configured?'Mercado Pago conectado al servidor. Iniciá sesión para cobrar.':'La integración está instalada. Falta cargar la clave de operador y las credenciales de Mercado Pago en Cloudflare.');
      if(configured)try{await refresh();}catch(e){if(!/Iniciá sesión/.test(e.message))message(e.message);}
    }catch{
      $('linkmp').disabled=true;message('Los cobros reales funcionan desde la nueva dirección de Cloudflare.');
    }
    if(new URLSearchParams(location.search).has('pago'))message('El regreso de Mercado Pago no confirma el cobro. Usá “Verificar pago”.');
  }
  return {init,crearLink,whatsappShare,refresh};
})();
