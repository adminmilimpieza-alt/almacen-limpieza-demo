import {photoKey,photoProduct,photoIdentity} from './foto-identidad.mjs';
import {mergePhotos,localPhoto,backupPhotos,preparePhotoEdit} from './fotos-datos.mjs';
const $=id=>document.getElementById(id);
let manifest=[],refreshing=null,working=false,notice='';
const setStatus=text=>{if($('fotos-estado'))$('fotos-estado').textContent=text;};
function counters(){
  const pending=Store.get().productos.filter(p=>localPhoto(p.foto)||p.fotoPendiente).length;
  $('fotos-subir-locales').textContent=`Subir fotos pendientes de este equipo (${pending})`;
  return pending;
}
async function api(path,options={}){
  const r=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});
  let value;try{value=await r.json();}catch{throw new Error('Las fotos online funcionan desde la dirección de Cloudflare.');}
  if(!r.ok){if(r.status===401)$('fotos-login').hidden=false;throw Object.assign(new Error(value.error||'No se pudo guardar la foto online.'),{status:r.status});}
  return value;
}
async function refresh(){
  if(working)return;
  if(refreshing)return refreshing;
  refreshing=(async()=>{
    const data=await api('/api/photos');manifest=data.photos;
    const merged=await mergePhotos(Store.get(),manifest);
    if(merged.changed){Store.actualizarFotos(merged.patches);Stock.render();Caja.refresh();}
    const pending=counters(),online=manifest.filter(p=>!p.deleted).length;
    setStatus(`Fotos online: ${online}. ${pending?`${pending} foto(s) pendientes en este equipo. Usá “Subir fotos pendientes”.`:'Sin fotos locales pendientes.'}${merged.conflicts?' Hay fotos locales distintas de las online: se conservaron para revisar con Editar.':''}${notice?' '+notice:''}`);
  })().catch(error=>{counters();setStatus('No se pudieron actualizar las fotos online. '+error.message);throw error;}).finally(()=>refreshing=null);
  return refreshing;
}
async function normalizarFoto(file){
  const blob=typeof file==='string'?await (await fetch(file)).blob():file;
  if(blob.size>10*1024*1024)throw new Error('La imagen supera 10 MB. Elegí una foto más pequeña.');
  if(!/^image\/(jpeg|png|webp)$/.test(blob.type))throw new Error('Elegí una foto JPEG, PNG o WebP.');
  const url=URL.createObjectURL(blob),img=new Image();
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('No se pudo leer la imagen.'));img.src=url;});
    if(!img.width||!img.height||img.width>20000||img.height>20000)throw new Error('Dimensiones de imagen inválidas.');
    const side=Math.min(img.width,img.height),canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,480,480);ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,480,480);
    let result=canvas.toDataURL('image/jpeg',.72);
    if(result.length>200023)result=canvas.toDataURL('image/jpeg',.5);
    if(result.length>200023)throw new Error('La foto comprimida supera 150 KB. Elegí otra imagen.');
    return result;
  }finally{URL.revokeObjectURL(url);}
}
async function upload(product,photo,expectedRevision,mode='replace'){
  const key=await photoKey(product);
  return api('/api/photos/'+key,{method:'PUT',body:JSON.stringify({product:photoProduct(product),photo,expectedRevision,mode})});
}
async function guardar(product,previous){
  const key=await photoKey(product),same=previous&&key===await photoKey(previous);
  if(same&&product.foto===previous.foto&&!previous.fotoPendiente&&previous.fotoOnlineRevision)return product;
  if(!product.foto&&!previous?.foto&&!previous?.fotoOnlineRevision&&!previous?.fotoPendiente)return product;
  const photo=product.foto?await normalizarFoto(product.foto):'';
  let expectedRevision=same?(previous?.fotoOnlineRevision||null):null;
  if(previous?.fotoPendiente||(localPhoto(previous?.foto)&&!expectedRevision)){
    const remote=(await api('/api/photos')).photos.find(r=>r.key===key);
    if(remote&&remote.revision!==expectedRevision){
      if(!confirm('Ya hay otra foto online para este producto. ¿Querés reemplazarla por la foto de este equipo?'))throw new Error('No se reemplazó la foto online. La foto local se conserva para revisar.');
      expectedRevision=remote.revision;
    }
  }
  const saved=await upload(product,photo,expectedRevision);
  manifest=manifest.filter(r=>r.key!==key).concat(saved);
  $('fotos-login').hidden=true;notice='La última foto se guardó online.';
  return {...product,foto:saved.url,fotoOnlineKey:saved.key,fotoOnlineRevision:saved.revision,fotoPendiente:false};
}
function downloadBackup(rows){
  const url=URL.createObjectURL(new Blob([JSON.stringify({fotos:rows},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='respaldo-fotos-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function migrate(rows,fromBackup=false){
  if(working)return;
  working=true;let uploaded=0,skipped=0,failed=0,unmatched=0,details='';
  $('fotos-subir-locales').disabled=true;$('fotos-recuperar').disabled=true;
  try{
    // Read-only manifest first: do not replace existing photos from old backups.
    const data=await api('/api/photos');manifest=data.photos;
    const current=Store.get().productos,byIdentity=new Map(current.map(p=>[photoIdentity(p),p.id]));
    if(!fromBackup&&rows.length)downloadBackup(backupPhotos({productos:rows}));
    for(let index=0;index<rows.length;index++){
      const source=rows[index],id=byIdentity.get(photoIdentity(source));
      if(!id){unmatched++;continue;}
      const now=Store.get().productos.find(p=>p.id===id);if(!now){unmatched++;continue;}
      setStatus(`Subiendo fotos ${index+1} de ${rows.length}…`);
      const key=await photoKey(source),remote=manifest.find(r=>r.key===key);
      // Only a deliberately edited pending photo may update its known revision.
      const replace=!fromBackup&&source.fotoPendiente;
      if(remote&&!replace){skipped++;continue;}
      try{
        const image=source.foto?await normalizarFoto(source.foto):'';
        const saved=await upload(source,image,replace&&source.fotoOnlineKey===key?(source.fotoOnlineRevision||null):null,replace?'replace':'migrate');
        manifest=manifest.filter(r=>r.key!==key).concat(saved);
        Store.actualizarFotos([{id,previousFoto:now.foto||'',previousRevision:now.fotoOnlineRevision,product:photoProduct(now),foto:saved.url,fotoOnlineKey:saved.key,fotoOnlineRevision:saved.revision,fotoPendiente:false}]);uploaded++;
      }catch(error){
        if(error.status===409){skipped++;continue;}
        if(error.status===401)throw error;
        failed++;details=error.message;
      }
    }
    notice=`Recuperación: ${uploaded} guardadas online, ${skipped} ya existentes o para revisar, ${unmatched} sin producto coincidente, ${failed} con error.${details?' '+details:''}`;
  }catch(error){notice=`Recuperación detenida; ${uploaded} foto(s) subidas. ${error.message}`;}
  finally{working=false;$('fotos-subir-locales').disabled=false;$('fotos-recuperar').disabled=false;Stock.render();Caja.refresh();counters();await refresh().catch(()=>{});}
}
async function init(){
  $('fotos-actualizar').onclick=()=>refresh().catch(()=>{});
  $('fotos-login-form').onsubmit=async event=>{
    event.preventDefault();const input=$('fotos-password'),password=input.value;input.value='';
    try{await api('/api/login',{method:'POST',body:JSON.stringify({password})});$('fotos-login').hidden=true;notice='Sesión de operador iniciada.';await refresh();}
    catch(error){setStatus(error.message);}
  };
  $('fotos-subir-locales').onclick=()=>migrate(Store.get().productos.filter(p=>localPhoto(p.foto)||p.fotoPendiente));
  $('fotos-recuperar').onclick=async()=>{
    const file=$('fotos-respaldo').files[0];if(!file){setStatus('Elegí el respaldo JSON del equipo donde cargaron las fotos.');return;}
    if(file.size>50*1024*1024){setStatus('El respaldo supera 50 MB.');return;}
    try{const rows=backupPhotos(JSON.parse(await file.text()));if(!rows.length){setStatus('Ese respaldo no contiene fotos locales JPEG, PNG o WebP.');return;}await migrate(rows,true);}
    catch(error){setStatus('No se pudo leer el respaldo: '+error.message);}
  };
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{});});
  window.addEventListener('online',()=>refresh().catch(()=>{}));
  window.addEventListener('focus',()=>refresh().catch(()=>{}));
  setInterval(()=>{if(!document.hidden)refresh().catch(()=>{});},60000);
  await refresh().catch(()=>{});
}
globalThis.Fotos={init,refresh,guardar,normalizarFoto,prepararEdicion:preparePhotoEdit,pendientes:counters,avisar:text=>{notice=text;setStatus(text);counters();}};
if(globalThis.OnlineBusiness)OnlineBusiness.ready.then(init);else init();
