// Todos los formatos comparten la misma instantánea del informe visible.
const Reportes = (() => {
  const $=id=>document.getElementById(id);
  const datos=import('./reportes-datos.mjs');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let actual=null;
  const opts=()=>({tipo:$('rep-tipo')?.value||'ventas',desde:$('rep-desde')?.value||'',hasta:$('rep-hasta')?.value||'',clienteId:$('rep-cli')?.value||'',listaId:$('rep-lista')?.value||'',incluirHistoricas:$('rep-historicas')?.checked||false});
  function tabla(columnas,filas) {
    return `<div class="rep-tabla"><table><thead><tr>${columnas.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map(f=>`<tr>${f.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function compras(informe) {
    const grupos=new Map();
    informe.filas.forEach(f=>{const key=f[0];if(!grupos.has(key))grupos.set(key,[]);grupos.get(key).push(f);});
    return [...grupos.values()].map(filas=>{
      const f=filas[0];
      return `<details class="rep-compra" open><summary>${esc(f[1])} · ${esc(f[2])} · $${esc(f[8])} · ${esc(f[3])}</summary>${tabla(['Producto','Cantidad','Precio unitario','Subtotal'],filas.map(i=>i.slice(4,8)))}${f[9]?`<p>Notas: ${esc(f[9])}</p>`:''}</details>`;
    }).join('');
  }
  function mostrar(informe) {
    actual=informe;
    const contenido=opts().tipo==='historial'?compras(informe):tabla(informe.columnas,informe.filas);
    $('rep-informe').innerHTML=`<h3>${esc(informe.titulo)}</h3><p>${esc(informe.subtitulo)}</p>${informe.resumen.map(s=>`<p>${esc(s)}</p>`).join('')}${contenido}${informe.filas.length?'':'<p>No hay datos para estos filtros.</p>'}`;
    document.querySelectorAll('[data-rep-export]').forEach(b=>b.disabled=false);
  }
  async function ver() {
    if(!$('rep-informe'))return;
    const op=opts();
    if(op.desde&&op.hasta&&op.desde>op.hasta){alert('La fecha desde debe ser anterior o igual a hasta.');return;}
    mostrar((await datos).crearInforme(Store.get(),op));
  }
  function opciones(id,entries,primera) {
    const el=$(id);if(!el)return; const prev=el.value;
    el.innerHTML=(primera?`<option value="">${esc(primera)}</option>`:'')+entries.map(e=>`<option value="${esc(e.id)}">${esc(e.nombre)}</option>`).join('');
    if([...el.options].some(o=>o.value===prev))el.value=prev;
  }
  function filtros() {
    const tipo=$('rep-tipo')?.value;
    document.querySelectorAll('[data-rep-fechas]').forEach(el=>el.hidden=!['ventas','historial','caja','proveedores'].includes(tipo));
    document.querySelectorAll('[data-rep-cliente]').forEach(el=>el.hidden=!['ventas','historial','clientes','precios'].includes(tipo));
    if($('rep-lista-wrap'))$('rep-lista-wrap').hidden=tipo!=='precios';
    if($('rep-historicas-wrap'))$('rep-historicas-wrap').hidden=tipo!=='ventas';
  }
  async function render() {
    if($('rep-tipo')){
      const db=Store.get(); const helpers=await datos;
      opciones('rep-cli',db.clientes||[],'Todos los clientes');
      opciones('rep-anterior-cli',db.clientes||[],'Elegir cliente');
      opciones('rep-lista',helpers.listas(db));
      opciones('rep-anterior-producto',(db.productos||[]).map(p=>({...p,nombre:p.nombre+(p.activo===false?' (oculto)':'')})),'Elegir producto');
      filtros(); await ver();
    }
    renderVentas();
  }
  function renderVentas() {
    const box=$('ventas');if(!box)return;const db=Store.get();box.replaceChildren();
    const ventas=(db.ventas||[]).filter(v=>!v.historica).slice(0,50);
    if(!ventas.length){box.textContent='Todavía no hay ventas operativas.';return;}
    ventas.forEach(v=>{
      const row=document.createElement('div');row.className='venta';
      row.innerHTML=`<b>${esc(new Date(v.fecha).toLocaleString('es-AR'))}</b> · ${esc(v.pago)} · ${esc(db.clientes.find(c=>c.id===v.clienteId)?.nombre||'Mostrador')} · <b>$${esc(v.total)}</b>${v.anulada?' · anulada':''}<br>${(v.items||[]).map(i=>`${esc(i.nombre)} × ${esc(i.cant)}`).join(', ')}`;
      if(!v.anulada&&v.id){const b=document.createElement('button');b.textContent='Anular';b.onclick=async()=>{if(confirm(`¿Anular venta de $${v.total}? Vuelve el stock.`)){try{await Store.anularVenta(v.id);Stock.render();Caja.refresh();await render();}catch(e){alert(e.message);}}};row.append(b);}
      box.append(row);
    });
  }
  function agregarLinea() {
    const db=Store.get(),p=db.productos.find(p=>p.id===$('rep-anterior-producto').value);
    if(!p){alert('Elegí un producto.');return;}
    const existing=[...$('rep-anterior-lineas').children].find(row=>row.dataset.producto===p.id);if(existing){const n=existing.querySelector('[data-cant]');n.value=Number(n.value)+1;return;}
    const row=document.createElement('div');row.className='rep-linea';row.dataset.producto=p.id;
    row.innerHTML=`<span>${esc(p.nombre)}</span><label>Cantidad <input data-cant type="number" min="0.001" step="any" value="1" required></label><label>Precio unitario <input data-precio type="number" min="0" step="any" value="${esc(p.precio)}" required></label><button type="button">Quitar</button>`;
    row.querySelector('button').onclick=()=>row.remove();$('rep-anterior-lineas').append(row);
  }
  async function guardarAnterior(event) {
    event.preventDefault();const form=event.currentTarget,b=form.querySelector('[type=submit]');
    const items=[...$('rep-anterior-lineas').children].map(row=>({id:row.dataset.producto,nombre:Store.get().productos.find(p=>p.id===row.dataset.producto)?.nombre||'',cant:Number(row.querySelector('[data-cant]').value),precio:Number(row.querySelector('[data-precio]').value)}));
    if(!$('rep-anterior-cli').value||!$('rep-anterior-fecha').value||!items.length||items.some(i=>!Number.isFinite(i.cant)||i.cant<=0||!Number.isFinite(i.precio)||i.precio<0)){alert('Completá cliente, fecha y al menos un producto con cantidad y precio válidos.');return;}
    b.disabled=true;
    try{await Store.registrarCompraHistorica({clienteId:$('rep-anterior-cli').value,fecha:$('rep-anterior-fecha').value,items,notas:$('rep-anterior-notas').value});$('rep-cli').value=$('rep-anterior-cli').value;$('rep-tipo').value='historial';$('rep-desde').value='';$('rep-hasta').value='';$('rep-anterior-lineas').replaceChildren();$('rep-anterior-notas').value='';$('rep-anterior-estado').textContent='Compra histórica registrada. No modificó caja, stock ni deuda.';filtros();await ver();}catch(e){alert(e.message);}finally{b.disabled=false;}
  }
  async function init() {
    if(!$('rep-tipo')){renderVentas();return;}
    $('rep-ver').onclick=ver;
    ['rep-tipo','rep-desde','rep-hasta','rep-cli','rep-lista','rep-historicas'].forEach(id=>$(id).addEventListener('change',async()=>{
      if(id==='rep-cli'){$('rep-lista').value=Store.get().clientes.find(c=>c.id===$('rep-cli').value)?.listaPrecioId||'mostrador';}
      filtros(); await ver();
    }));
    document.querySelectorAll('[data-rep-export]').forEach(b=>b.onclick=async()=>{if(!actual)return;try{b.disabled=true;if(b.dataset.repExport==='imprimir')await ExportarInforme.imprimir(actual);else await ExportarInforme.exportar(b.dataset.repExport,actual);}catch(e){alert(e.message);}finally{b.disabled=false;}});
    $('rep-anterior-agregar').onclick=agregarLinea;$('rep-anterior-form').onsubmit=guardarAnterior;
    const hoy=(await datos).fechaArgentina(new Date());$('rep-desde').value=hoy;$('rep-hasta').value=hoy;$('rep-anterior-fecha').max=hoy;
    await render();
  }
  async function verHistorial(clienteId) {
    await render();
    Panel.go('mod-reportes');
    $('rep-tipo').value='historial';$('rep-cli').value=clienteId;
    $('rep-desde').value='';$('rep-hasta').value='';
    filtros();await ver();
  }
  return {init,render,renderVentas,verHistorial};
})();
