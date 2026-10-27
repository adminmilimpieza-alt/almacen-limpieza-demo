// One authenticated business. The browser cache is a read model, never a write authority.
const OnlineBusiness=(()=>{
 const KEY='milimpieza-business-cache-v1',PENDING='milimpieza-operacion-pendiente';
 let state=null,revision=null,busy=false,reading=null,started=false,connected=false,initializedUI=false,needsRender=false;
 let resolveReady;const ready=new Promise(resolve=>resolveReady=resolve);
 const $=id=>document.getElementById(id);
 function status(message){const el=$('negocio-estado');if(el)el.textContent=message;}
 function gate(message){$('negocio-acceso').hidden=false;$('negocio-acceso-estado').textContent=message;connected=false;}
 function editing(){if(document.querySelector('dialog[open]'))return true;const a=document.activeElement;if(a&&['scan','precio-buscar','stk-q'].includes(a.id))return false;return !!(a&&['INPUT','SELECT','TEXTAREA'].includes(a.tagName)&&a.closest('main, #panel-overlay'));}
 function renderAll(){
  needsRender=true;if(!initializedUI||editing())return;needsRender=false;
  try{Stock.render();Precios.render();Entidades.render();Pedidos.render();Turnos.render();Reportes.render();Caja.refresh();}catch(error){console.error('No se pudo actualizar una vista',error);}
 }

 function cache(packet){
  if(!packet.state)return;needsRender=true;state=structuredClone(packet.state);revision=packet.revision;
  state.cfg={};state.preciosOnline={revision,entries:state.productos.map(p=>({product:p,costo:p.costo,margen:p.margen,precio:p.precio})),conflicts:[]};
  try{localStorage.setItem(KEY,JSON.stringify(state));}catch{status('Datos online recibidos. No se pudo guardar la copia de lectura en este navegador.');}
 }
 async function request(path,options={}){
  const r=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});
  let data;try{data=await r.json();}catch{throw new Error('El servidor no respondió. Conservá la ventana y reintentá.');}
  if(!r.ok){if(r.status===401)gate('Ingresá la clave de operador para ver los datos del negocio.');throw Object.assign(new Error(data.error||'No se pudo guardar online.'),{status:r.status});}return data;
 }
 function pending(){try{return JSON.parse(sessionStorage.getItem(PENDING)||'null');}catch{return null;}}
 async function send(payload){
  let error;
  for(let attempt=0;attempt<2;attempt++){
   try{const data=await request(payload.op==='mp-register'?'/api/mp/orders/'+encodeURIComponent(payload.args[0])+'/register':'/api/business',{method:'POST',body:JSON.stringify(payload.op==='mp-register'?{id:payload.id,revision:payload.revision}:payload)});cache(data);sessionStorage.removeItem(PENDING);connected=true;return data;}
   catch(e){error=e;if(e.status&&e.status<500){sessionStorage.removeItem(PENDING);throw e;}}
  }
  throw error;
 }
 async function recover(){
  const payload=pending();if(!payload)return false;
  status('Verificando una operación pendiente de confirmar…');
  try{await send(payload);if(payload.op==='cobrar'&&typeof Caja!=='undefined')Caja.confirmarRecuperacion(payload.args[0]);if(typeof Caja!=='undefined')Caja.bloquearTicket(false);status('La operación pendiente se confirmó online. Revisá los datos antes de volver a operar.');return true;}
  catch(e){if(e.status===409||e.status===400){sessionStorage.removeItem(PENDING);cache(await request('/api/business'));if(typeof Caja!=='undefined')Caja.bloquearTicket(false);status('La operación pendiente no se guardó. Revisá los datos y volvé a intentarlo.');return true;}throw e;}
 }
 async function refresh(force=false){
  if(busy||reading)return reading;if(!force&&editing())return;
  reading=(async()=>{const packet=await request('/api/business'+(revision?'?since='+encodeURIComponent(revision):''));if(!force&&editing())return packet;const changed=!packet.unchanged;cache(packet);connected=true;$('negocio-acceso').hidden=true;resolveReady();if(changed||needsRender)renderAll();if(changed&&globalThis.Fotos)Fotos.refresh().catch(()=>{});if(!pending())status('Todo guardado online · los equipos comparten el mismo negocio.');return packet;})().catch(e=>{connected=false;status('Sin conexión confirmada: no se guardarán operaciones. '+e.message);throw e;}).finally(()=>reading=null);return reading;
 }
 async function mutate(op,args){
  if(busy)throw new Error('Esperá a que termine de guardarse la operación anterior.');
  if(!state||!connected||navigator.onLine===false)throw new Error('Necesitás conexión y sesión de operador. Actualizá los datos antes de continuar.');
  busy=true;status('Guardando online…');
  try{
   if(reading)await reading;
   if(pending()){await recover();throw new Error('Se revisó una operación pendiente. Comprobá el resultado antes de repetirla.');}
   args=structuredClone(args);
   if(op==='cobrarDeuda'||op==='recibirPedido')args[1]=Number(args[1]);
   const payload={id:crypto.randomUUID(),revision,op,args};
   sessionStorage.setItem(PENDING,JSON.stringify(payload));
   const data=await send(payload);status('Guardado online.');setTimeout(renderAll,0);return data.result;
  }catch(error){
   if(error.status===409){busy=false;await refresh(true).catch(()=>{});}
   status(pending()?'No se pudo confirmar el resultado. No repitas la operación: pulsá Actualizar datos para verificarla.':error.message);throw error;
  }finally{busy=false;}
 }
 function applyPhotos(patches){
  if(!state)return false;let changed=false;
  for(const patch of patches){const p=state.productos.find(p=>p.id===patch.id);if(!p||(p.foto||'')!==patch.previousFoto||p.fotoOnlineRevision!==patch.previousRevision)continue;for(const field of ['foto','fotoOnlineKey','fotoOnlineRevision','fotoPendiente'])p[field]=patch[field];changed=true;}
  if(changed)try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}return changed;
 }
 async function init(){
  if(started)return ready;started=true;
  // Preserve the previous local pilot once; it is never merged into the business.
  try{const old=localStorage.getItem('almacen_mi_limpieza_v11');if(old&&!localStorage.getItem('milimpieza-respaldo-piloto'))localStorage.setItem('milimpieza-respaldo-piloto',old);}catch{}
  $('negocio-login').onsubmit=async e=>{
   e.preventDefault();const input=$('negocio-clave'),password=input.value;input.value='';$('negocio-entrar').disabled=true;
   try{await request('/api/login',{method:'POST',body:JSON.stringify({password})});await refresh(true);if(pending())await recover();}
   catch(error){$('negocio-acceso-estado').textContent=error.message;}
   finally{$('negocio-entrar').disabled=false;}
  };
  $('negocio-actualizar').onclick=async()=>{if(busy)return;try{if(pending())await recover();await refresh(true);}catch(e){status(e.message);}};
  $('negocio-salir').onclick=async()=>{try{await request('/api/logout',{method:'POST'});location.reload();}catch(e){status(e.message);}};
  window.addEventListener('offline',()=>{connected=false;status('Sin conexión: las operaciones están bloqueadas hasta reconectar.');});
  window.addEventListener('online',()=>refresh(true).catch(()=>{}));window.addEventListener('focus',()=>refresh().catch(()=>{}));
  document.addEventListener('focusout',()=>setTimeout(()=>{if(needsRender)renderAll();},0));
  document.addEventListener('close',()=>setTimeout(()=>{if(needsRender)renderAll();},0),true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{});});
  setInterval(()=>{if(!document.hidden)refresh().catch(()=>{});},5000);
  try{await refresh(true);if(pending())await recover();}catch(error){gate(error.status===401?'Ingresá la clave de operador para entrar al negocio online.':'No se pudo conectar. Verificá Internet y volvé a ingresar.');}
  return ready;
 }
 return {activo:true,ready,init,refresh,mutate,hasPending:()=>!!pending(),read(method,args){const raw=JSON.stringify(state);const memory={getItem:()=>raw,setItem(){throw new Error('La consulta intentó modificar datos.');}};const store=MiLimpiezaStoreFactory(memory);return store[method](...args);},get:()=>structuredClone(state||{productos:[],clientes:[],proveedores:[],ventas:[],movimientos:[],pedidos:[],turnos:[],cfg:{},catalogo:{}}),applyPhotos,uiReady(){initializedUI=true;renderAll();},revision:()=>revision};
})();
globalThis.OnlineBusiness=OnlineBusiness;
