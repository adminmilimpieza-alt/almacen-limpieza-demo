const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>Number(value).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
export function prepararRemito(db,carrito=[],clienteId){
 const venta=carrito.length?null:db.ventas?.[0];
 const source=carrito.length?carrito:venta?.items;
 if(!source?.length)throw new Error('Armá un ticket o registrá una venta antes de imprimir el remito.');
 const items=source.map(i=>({...i}));
 if(items.some(i=>!Number.isFinite(Number(i.precio))||Number(i.precio)<0||!Number.isFinite(Number(i.cant))||Number(i.cant)<=0))throw new Error('El ticket tiene cantidades o precios inválidos.');
 const cliente={...(db.clientes?.find(c=>c.id===(venta?.clienteId||clienteId))||{nombre:'Mostrador',extra:''})};
 return {fecha:venta?.fecha||new Date().toISOString(),cliente,items,total:venta?.total??items.reduce((sum,i)=>sum+Number(i.precio)*Number(i.cant),0)};
}
export function htmlRemito(remito){
 const fecha=new Date(remito.fecha).toLocaleDateString('es-AR',{timeZone:'America/Argentina/Cordoba'});
 const rows=remito.items.map(i=>`<tr><td class="remito-cantidad">${escape(Number(i.cant).toLocaleString('es-AR',{maximumFractionDigits:3}))}</td><td class="remito-descripcion">${escape(i.nombre)}${i.pres&&!String(i.nombre).includes(i.pres)?' · '+escape(i.pres):''}</td><td class="remito-importe">${money(i.precio)}</td><td class="remito-importe">${money(Number(i.precio)*Number(i.cant))}</td></tr>`).join('');
 const blanks=Array.from({length:Math.max(0,14-remito.items.length)},()=>'<tr class="remito-vacio"><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('');
 return `<div class="remito-hoja"><div class="remito-cabecera"><div class="remito-marca"><img src="data/remito-logo.jpg" alt="Mi Limpieza"><div><strong>REMITO</strong><span>Cel. 3534098633</span></div></div><dl><div><dt>Fecha:</dt><dd>${escape(fecha)}</dd></div><div><dt>Nombre:</dt><dd>${escape(remito.cliente.nombre)}</dd></div><div><dt>Dirección:</dt><dd>${escape(remito.cliente.extra||'')}</dd></div></dl></div><table class="remito-detalle"><colgroup><col style="width:12%"><col style="width:54%"><col style="width:17%"><col style="width:17%"></colgroup><thead><tr><th>Cantidad</th><th>Descripción</th><th>Unitario</th><th>Total</th></tr></thead><tbody>${rows}${blanks}</tbody><tbody class="remito-total"><tr><th colspan="3">TOTAL</th><td class="remito-importe">$ ${money(remito.total)}</td></tr></tbody></table></div>`;
}
let printing=false;
async function imprimir(db,carrito,clienteId){
 if(printing)return;printing=true;let cleanup=()=>{};
 try{
  const remito=prepararRemito(db,carrito,clienteId);let box=document.getElementById('remito-print');
  if(!box){box=document.createElement('section');box.id='remito-print';document.body.append(box);}
  box.innerHTML=htmlRemito(remito);
  const logo=box.querySelector('img');if(logo?.decode)await logo.decode();
  if(document.fonts?.ready)await document.fonts.ready;
  document.body.classList.remove('print-ticket','print-cierre');
  document.body.classList.add('print-remito');
  cleanup=()=>{document.body.classList.remove('print-remito');box.replaceChildren();printing=false;window.removeEventListener('afterprint',cleanup);};
  window.addEventListener('afterprint',cleanup);
  window.print();
 }catch(error){cleanup();printing=false;alert('No se pudo imprimir el remito. '+error.message);}
}
globalThis.Remito={imprimir};
