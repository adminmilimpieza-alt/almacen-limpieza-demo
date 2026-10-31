const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>Number(value).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
export function prepararRemito(db,carrito=[],clienteId,pago){
 const venta=carrito.length?null:db.ventas?.find(v=>!v.historica&&!v.anulada);
 const source=carrito.length?carrito:venta?.items;
 if(!source?.length)throw new Error('Armá un ticket o registrá una venta antes de imprimir el remito.');
 const items=source.map(i=>({...i}));
 if(items.some(i=>!Number.isFinite(Number(i.precio))||Number(i.precio)<0||!Number.isFinite(Number(i.cant))||Number(i.cant)<=0))throw new Error('El ticket tiene cantidades o precios inválidos.');
 const cliente={...(venta?.clienteSnapshot||db.clientes?.find(c=>c.id===(venta?.clienteId||clienteId))||{nombre:'Mostrador',extra:''})};
 const subtotal=venta?.subtotal??Math.round(items.reduce((sum,i)=>sum+Number(i.precio)*Number(i.cant),0)*100)/100;
 const descuentoPorcentaje=venta?(venta.descuentoPorcentaje||0):(['efectivo','banco'].includes(pago)?10:0);
 const descuento=venta?(venta.descuento||0):Math.round(subtotal*descuentoPorcentaje)/100;
 return {fecha:venta?.fecha||new Date().toISOString(),cliente,items,subtotal,descuento,descuentoPorcentaje,total:venta?.total??Math.round((subtotal-descuento)*100)/100};
}
// A row unit reserves 5 mm; descriptions are split before layout so even a
// single exceptionally long product can continue on the next physical sheet.
export function paginasRemito(remito,capacidad=16){
 const paginas=[];let pagina={filas:[],subtotal:0},usadas=0;
 remito.items.forEach((item,index)=>{
  const descripcion=String(item.nombre??'')+(item.pres&&!String(item.nombre).includes(item.pres)?' · '+item.pres:'');
  const partes=descripcion.match(/[\s\S]{1,64}/g)||[''];
  partes.forEach((texto,parte)=>{
   const unidades=Math.max(1,Math.ceil(texto.length/54));
   if(usadas+unidades>capacidad&&pagina.filas.length){paginas.push(pagina);pagina={filas:[],subtotal:0};usadas=0;}
   const importe=parte===0?Number(item.precio)*Number(item.cant):0;
   pagina.filas.push({item,index,texto,continuacion:parte>0});pagina.subtotal+=importe;usadas+=unidades;
  });
 });
 if(pagina.filas.length)paginas.push(pagina);
 return paginas;
}
export function htmlRemito(remito,capacidad=16){
 const fecha=new Date(remito.fecha).toLocaleDateString('es-AR',{timeZone:'America/Argentina/Cordoba'});
 const paginas=paginasRemito(remito,capacidad);
 return paginas.map((pagina,n)=>{
  const rows=pagina.filas.map(({item:i,index,texto,continuacion})=>`<tr ${continuacion?'class="remito-continuacion"':`data-item="${index}"`}><td class="remito-cantidad">${continuacion?'<small>continuación</small>':escape(Number(i.cant).toLocaleString('es-AR',{maximumFractionDigits:3}))}</td><td class="remito-descripcion">${escape(texto)}</td><td class="remito-importe">${continuacion?'':money(i.precio)}</td><td class="remito-importe">${continuacion?'':money(Number(i.precio)*Number(i.cant))}</td></tr>`).join('');
  return `<div class="remito-hoja"><div class="remito-cabecera"><div class="remito-marca"><img src="data/remito-logo.jpg" alt="Mi Limpieza"><div><strong>REMITO</strong><span>Cel. 3534098633</span><span>Hoja ${n+1}/${paginas.length}</span></div></div><dl><div><dt>Fecha:</dt><dd>${escape(fecha)}</dd></div><div><dt>Nombre:</dt><dd>${escape(remito.cliente.nombre)}</dd></div><div><dt>Dirección:</dt><dd>${escape(remito.cliente.extra||'')}</dd></div></dl></div><table class="remito-detalle"><colgroup><col style="width:10%"><col style="width:56%"><col style="width:17%"><col style="width:17%"></colgroup><thead><tr><th>Cantidad</th><th>Descripción</th><th>Unitario</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="remito-pie"><div><span>SUBTOTAL DE ESTA HOJA</span><strong>$ ${money(pagina.subtotal)}</strong></div>${n===paginas.length-1?`${remito.descuento>0?`<div><span>SUBTOTAL GENERAL</span><strong>$ ${money(remito.subtotal)}</strong></div><div><span>Bonificación por efectivo / transferencia ${escape(remito.descuentoPorcentaje)}%</span><strong>− $ ${money(remito.descuento)}</strong></div>`:''}<div class="remito-total"><span>TOTAL FINAL</span><strong>$ ${money(remito.total)}</strong></div>`:'<p>Continúa en la siguiente hoja. Este subtotal no es el total final.</p>'}</div></div>`;
 }).join('');
}
let printing=false;
async function imprimir(db,carrito,clienteId,pago){
 if(printing)return;printing=true;let cleanup=()=>{};
 try{
  const remito=prepararRemito(db,carrito,clienteId,pago);let box=document.getElementById('remito-print');
  if(!box){box=document.createElement('section');box.id='remito-print';document.body.append(box);}
  const previousStyle=box.style?.cssText;
  const canMeasure=Boolean(box.style&&box.querySelectorAll&&typeof box.getBoundingClientRect==='function');
  const restoreStyle=()=>{if(box.style&&previousStyle!==undefined)box.style.cssText=previousStyle;};
  cleanup=()=>{restoreStyle();box.replaceChildren();};
  try{
   if(canMeasure)box.style.cssText+=';display:block;position:absolute;visibility:hidden;width:198mm;left:-10000px;top:0';
   if(document.fonts?.ready)await document.fonts.ready;
   for(let capacidad=canMeasure?22:16;capacidad>=4;capacidad-=2){
    box.innerHTML=htmlRemito(remito,capacidad);
    const logos=box.querySelectorAll?Array.from(box.querySelectorAll('img')):[box.querySelector('img')];
    await Promise.all(logos.map(logo=>logo?.decode?logo.decode():Promise.resolve()));
    const hojas=canMeasure?Array.from(box.querySelectorAll('.remito-hoja')):[];
    if(!hojas.length||typeof hojas[0].getBoundingClientRect!=='function')break;
    const fits=hojas.every(hoja=>{
     const bounds=hoja.getBoundingClientRect();
     return bounds.height>0&&Array.from(hoja.querySelectorAll('.remito-pie, .remito-detalle tr')).every(el=>el.getBoundingClientRect().bottom<=bounds.bottom+.5);
    });
    if(fits)break;
    if(capacidad===4)throw new Error('El encabezado o los datos son demasiado largos para media hoja. Acortá el nombre o la dirección del cliente antes de imprimir.');
   }
  }finally{restoreStyle();}
  document.body.classList.remove('print-ticket','print-cierre');
  document.body.classList.add('print-remito');
  cleanup=()=>{document.body.classList.remove('print-remito');box.replaceChildren();printing=false;window.removeEventListener('afterprint',cleanup);};
  window.addEventListener('afterprint',cleanup);
  window.print();
 }catch(error){cleanup();printing=false;alert('No se pudo imprimir el remito. '+error.message);}
}
globalThis.Remito={imprimir};
