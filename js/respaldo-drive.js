// Tokens and client secrets never enter this screen or the browser's storage.
const RespaldoDrive=(()=>{
 const $=id=>document.getElementById(id);
 let busy=false;
 async function request(path,options={}){const response=await fetch('/api/respaldo-drive/'+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers}});const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar Drive.');return data;}
 function pending(message){$('drive-estado').textContent=message;$('drive-conectar').hidden=true;$('drive-copiar').disabled=true;}
 async function render(){if(!$('drive-estado')||busy)return;try{
  const status=await request('status');$('drive-email').value=status.email;
  $('drive-estado').textContent=status.message+(status.lastSuccess?' Última copia verificada: '+new Date(status.lastSuccess).toLocaleString('es-AR')+'.':' Sin copias verificadas.')+(status.lastError?' Último error: '+status.lastError:'');
  $('drive-conectar').hidden=!status.configured;$('drive-conectar').textContent=status.connected?'Volver a conectar cuenta':'Conectar cuenta de Google';$('drive-copiar').disabled=!status.connected;
  $('drive-instrucciones').hidden=status.configured;
  const folder=$('drive-carpeta');folder.replaceChildren();
  if(status.folderId&&/^[\w-]+$/.test(status.folderId)){const link=document.createElement('a');link.href='https://drive.google.com/drive/folders/'+status.folderId;link.target='_blank';link.rel='noopener';link.textContent='Abrir carpeta de respaldos';folder.append(link);}
 }catch(error){pending(error.message+' Todavía no se confirmó una conexión de respaldo.');}}
 function init(){const module=$('mod-respaldo');if(!module||$('respaldo-drive'))return;
  const box=document.createElement('section');box.id='respaldo-drive';
  box.innerHTML='<h3>Respaldo en Google Drive</h3><p>Destino: carpeta «Mi Limpieza · Respaldos» en la cuenta elegida. Se crea al realizar la primera copia. Incluye los datos del negocio y las fotos recuperables. Copia diaria después de conectar la cuenta.</p><form id="drive-config"><label>Correo de destino <input id="drive-email" type="email" required maxlength="254" autocomplete="email" value="milimpiezainsumos@gmail.com"></label><button type="submit">Guardar correo</button></form><p id="drive-estado" role="status" aria-live="polite">Consultando conexión…</p><p id="drive-instrucciones">Falta configurar las credenciales de Google en el servidor. Luego podrás autorizar esta cuenta desde aquí. Por ahora usá Descargar respaldo; ninguna copia se está enviando automáticamente a Drive.</p><p id="drive-carpeta"></p><div class="listas-acciones"><a id="drive-conectar" href="/api/respaldo-drive/connect" hidden>Conectar cuenta de Google</a><button id="drive-copiar" type="button" disabled>Hacer copia ahora</button><button id="drive-actualizar" type="button">Consultar estado</button></div>';
  module.append(box);
  $('drive-config').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;try{await Store.configurarRespaldoDrive({email:$('drive-email').value.trim()});$('drive-estado').textContent='Correo guardado. Consultando conexión…';}catch(error){pending(error.message);}finally{busy=false;await render();}};
  $('drive-copiar').onclick=async()=>{if(busy)return;busy=true;$('drive-copiar').disabled=true;$('drive-estado').textContent='Preparando y verificando la copia en Drive…';try{await request('copy',{method:'POST'});}catch(error){pending(error.message);}finally{busy=false;await render();}};
  $('drive-actualizar').onclick=render;render();
 }
 return {init,render};
})();
