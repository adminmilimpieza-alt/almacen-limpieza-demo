// Shared price publication. Product stock, sales and photos never leave this module.
const PreciosOnline=(()=>{
 const $=id=>document.getElementById(id);let busy=false,reading=null;
 async function api(method='GET',data){
  const r=await fetch('/api/prices',{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  let value;try{value=await r.json();}catch{throw new Error('Usá la dirección de Cloudflare para compartir precios.');}
  if(!r.ok){if(r.status===401)$('precios-login').hidden=false;throw Object.assign(new Error(value.error||'No se pudieron compartir los precios.'),{status:r.status});}return value;
 }
 function estado(message=''){
  const state=Store.get().preciosOnline,pending=Store.preciosPendientes().length;
  $('precios-online-estado').textContent=(pending?`Cambios pendientes: ${pending}. Guardá para compartirlos. `:state?.revision?'Precios compartidos. ':'Sin cambios pendientes. ')+(state?.conflicts?.length?'Revisá los cambios de otro equipo antes de compartir. ':'')+message;
 }
 function render(){Precios.render();Stock.render();Caja.refresh();}
 async function refresh(){
  if(busy)return;if(reading)return reading;
  const editing=()=>{const a=document.activeElement;return !!document.querySelector('dialog[open]')||!!(a&&['INPUT','SELECT','TEXTAREA'].includes(a.tagName)&&a.closest('#mod-precios, #mod-stock'));};
  if(editing())return;
  reading=(async()=>{const data=await api();if(editing())return;const previous=JSON.stringify(Store.get().productos);Store.aplicarPreciosOnline(data);if(previous!==JSON.stringify(Store.get().productos))render();estado();})().catch(e=>{estado('No se pudo actualizar: '+e.message);throw e;}).finally(()=>reading=null);return reading;
 }
 async function guardar(){
  if(busy)return;busy=true;$('precio-publicar').disabled=true;
  try{
   if(reading)await reading;
   const state=Store.get().preciosOnline;if(!state)throw new Error('Primero pulsá Actualizar del servidor para consultar la lista online.');
   if(state.conflicts?.length&&!confirm('Otro equipo cambió precios que también editaste acá. ¿Confirmás compartir los valores de este equipo para esos productos?'))return;
   const rows=Store.preciosPendientes();if(!rows.length){estado('No hay cambios para compartir.');return;}
   const saved=await api('PUT',{expectedRevision:state.revision,entries:rows});
   Store.aplicarPreciosOnline(saved);$('precios-login').hidden=true;render();estado('Precios guardados y compartidos. Los otros equipos se actualizan en hasta 30 segundos.');
  }catch(e){estado('No se compartieron los cambios: '+e.message);if(e.status===409){busy=false;await refresh().catch(()=>{});estado('La lista cambió en otro equipo. Se conservaron tus cambios; revisalos y volvé a compartir.');}}
  finally{busy=false;$('precio-publicar').disabled=false;}
 }
 function init(){
  $('precio-publicar').onclick=guardar;$('precio-actualizar').onclick=()=>refresh().catch(()=>{});
  $('precios-login-form').onsubmit=async e=>{e.preventDefault();const input=$('precios-password'),password=input.value;input.value='';try{const r=await fetch('/api/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const value=await r.json();if(!r.ok)throw new Error(value.error||'No se pudo iniciar sesión.');$('precios-login').hidden=true;await guardar();}catch(error){estado(error.message);}};
  window.addEventListener('focus',()=>refresh().catch(()=>{}));window.addEventListener('online',()=>refresh().catch(()=>{}));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{});});
  setInterval(()=>{if(!document.hidden)refresh().catch(()=>{});},30000);refresh().catch(()=>{});
 }
 return {init,refresh,estado};
})();
PreciosOnline.init();
