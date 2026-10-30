// Importa la lista completa de precios del proveedor al negocio online.
// Sólo describe y muestra: la escritura ocurre cuando el operador confirma.
import {leerLista} from './lista-proveedor.mjs';

const ImportarLista=(()=>{
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
 let lectura=null,filas=[],bytes=null,nombreArchivo='',working=false;

 const estado=t=>{if($('cat-estado'))$('cat-estado').textContent=t;};
 const habilitar=()=>{const listo=!!lectura&&!working;if($('cat-aplicar'))$('cat-aplicar').disabled=!listo;$('cat-leer').disabled=working||!bytes;};

 function clasificar(){
  return Store.clasificarImportacion(filas);
 }

 function render(){
  const {resultado,salen}=clasificar();
  const cuenta=estado=>resultado.filter(r=>r.estado===estado).length;
  const nuevos=cuenta('nuevo'),cambian=cuenta('actualiza'),iguales=cuenta('igual'),sinCosto=cuenta('sin-costo');
  const ocultar=$('cat-ocultar').checked?salen.length:0;
  $('cat-resumen').innerHTML=`<p><strong>${resultado.length} productos</strong> en la lista · <strong>${nuevos}</strong> nuevos · <strong>${cambian}</strong> con cambios · ${iguales} sin cambios${sinCosto?` · <strong>${sinCosto}</strong> sin costo en la lista`:''}${ocultar?` · <strong>${ocultar}</strong> se ocultarían`:''}</p>`+
   `<p class="hint">Proveedores de la lista: ${lectura.proveedores.map(p=>esc(p)).join(' · ')}</p>`+
   (lectura.avisos.length?`<details><summary>${lectura.avisos.length} avisos para revisar</summary><ul>${lectura.avisos.slice(0,60).map(a=>`<li>${esc(a)}</li>`).join('')}</ul></details>`:'');
  const visibles=resultado.filter(r=>r.estado!=='igual').slice(0,200);
  $('cat-tabla').innerHTML=resultado.length?`<div class="prov-scroll"><table><thead><tr><th>Producto de la lista</th><th>Proveedor</th><th>Presentación</th><th>Costo</th><th>Venta</th><th>Estado</th></tr></thead><tbody>${visibles.map(({fila,actual,estado})=>`<tr class="prov-${estado==='nuevo'?'baja':'sube'}"><td>${esc(fila.codigo)} · ${esc(fila.nombre)}<small>Fila ${fila.fila}</small></td><td>${esc(fila.provNombre)}</td><td>${esc(fila.presentacion)}</td><td>${fila.costo==null?'sin costo':'$'+money(fila.costo)}</td><td>${actual&&Number(actual.precio)!==Number(fila.precio)?`$${money(actual.precio)} → `:''}$${money(fila.precio)}</td><td>${estado==='nuevo'?'Nuevo':estado==='actualiza'?'Se actualiza':estado==='sin-costo'?'Falta costo':'Sin cambios'}</td></tr>`).join('')}</tbody></table></div>${resultado.filter(r=>r.estado!=='igual').length>200?'<p class="hint">Se muestran los primeros 200 cambios.</p>':''}`:'';
  if(salen.length)$('cat-tabla').insertAdjacentHTML('beforeend',`<details><summary>${salen.length} productos que salen de la lista</summary><ul>${salen.slice(0,80).map(p=>`<li>${esc(p.codigo)} · ${esc(p.nombre)} · ${esc(p.presentacion)}</li>`).join('')}</ul></details>`);
  habilitar();
 }

 async function leer(){
  if(!bytes||working)return;
  working=true;habilitar();estado('Leyendo la planilla…');
  try{
   const X=await ExportarInforme.cargarExcel();
   const libro=X.read(bytes,{type:'array',cellDates:false,sheetRows:30000});
   let elegida=libro.SheetNames[0],rows=null;
   for(const hoja of libro.SheetNames){
    const prueba=X.utils.sheet_to_json(libro.Sheets[hoja],{header:1,defval:'',raw:true,blankrows:true,range:0}).slice(0,40);
    if(prueba.some(f=>String(f[0]??'').trim().toLowerCase()==='codigo'&&/descripcion/i.test(String(f[1]??'')))){elegida=hoja;break;}
   }
   rows=X.utils.sheet_to_json(libro.Sheets[elegida],{header:1,defval:'',raw:true,blankrows:true});
   if(rows.length>5000)throw new Error('La planilla supera 5.000 filas. Revisá que sea la lista del proveedor.');
   lectura=leerLista(rows);
   if(!lectura.filas.length)throw new Error('No se encontraron productos. Revisá que la hoja sea la lista con secciones por proveedor.');
   if(lectura.filas.length>2000)throw new Error('La lista tiene más de 2.000 productos; dividila antes de importar.');
   filas=lectura.filas;
   estado(`Listo: ${filas.length} productos leídos de "${nombreArchivo||elegida}". Todavía no se guardó nada.`);
   render();
  }catch(error){
   lectura=null;filas=[];$('cat-resumen').replaceChildren();$('cat-tabla').replaceChildren();
   estado(error.message);
  }finally{working=false;habilitar();}
 }

 async function aplicar(){
  if(!lectura||working)return;
  const {resultado,salen}=clasificar();
  const nuevos=resultado.filter(r=>r.estado==='nuevo').length,cambian=resultado.filter(r=>r.estado==='actualiza').length,sinCosto=resultado.filter(r=>r.estado==='sin-costo').length;
  const ocultar=$('cat-ocultar').checked;
  const detalle=`${nuevos} nuevos, ${cambian} actualizados${sinCosto?`, ${sinCosto} sin precio completo`:''}${ocultar?`, ${salen.length} ocultos`:''}`;
  if(!confirm(`¿Importar la lista al negocio? Se guardarán ${resultado.length} productos: ${detalle}. No se toca el stock, las fotos ni las ventas.`))return;
  working=true;habilitar();estado('Guardando online…');
  try{
   const payload={filas:filas.map(({codigo,nombre,detalle:desc,presentacion,categoria,provNombre,costo,margen,precio,aviso,clave})=>({codigo,nombre,detalle:desc,presentacion,categoria,provNombre,costo,margen,precio,aviso,clave})),ocultarFaltantes:ocultar};
   const r=await OnlineBusiness.mutate('importarCatalogo',[payload]);
   estado(`Listo: ${r.creados} productos nuevos, ${r.actualizados} actualizados, ${r.iguales} sin cambios, ${r.ocultados} ocultos${r.sinCosto?`, ${r.sinCosto} sin costo completo (no se crearon)`:''}${r.proveedores.length?`. Proveedores nuevos: ${r.proveedores.join(', ')}`:''}.`);
   lectura=null;filas=[];bytes=null;nombreArchivo='';$('cat-archivo').value='';$('cat-resumen').replaceChildren();$('cat-tabla').replaceChildren();
   if(typeof Precios!=='undefined')Precios.render();
   if(typeof Stock!=='undefined')Stock.render();
   if(typeof Caja!=='undefined')Caja.refresh();
  }catch(error){estado('No se importó: '+error.message);}
  finally{working=false;habilitar();}
 }

 function init(){
  if(!$('cat-archivo'))return;
  $('cat-archivo').onchange=async()=>{
   const file=$('cat-archivo').files[0];bytes=null;lectura=null;filas=[];
   $('cat-resumen').replaceChildren();$('cat-tabla').replaceChildren();habilitar();
   if(!file)return;
   if(file.size>15*1024*1024){estado('El archivo supera 15 MB.');return;}
   bytes=await file.arrayBuffer();nombreArchivo=file.name;
   estado(`Archivo elegido: ${file.name}. Pulsá "Leer la lista" para revisarla.`);
   habilitar();
  };
  $('cat-leer').onclick=leer;
  $('cat-ocultar').onchange=()=>{if(lectura)render();};
  $('cat-aplicar').onclick=aplicar;
 }
 return {init};
})();

if(globalThis.OnlineBusiness)OnlineBusiness.ready.then(()=>ImportarLista.init());
else ImportarLista.init();
