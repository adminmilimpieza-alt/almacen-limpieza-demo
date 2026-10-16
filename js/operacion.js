// operacion.js — puntos 5 (precios CSV), 7 (respaldo) y 8 (pedidos)
const Precios = (() => {
  const $ = id => document.getElementById(id);
  let pendiente = [];
  function parseCSV(t){
    return t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
      const [codigo,nombre,precio] = l.split(',').map(s=>(s||'').trim());
      return {codigo:codigo||'', nombre:nombre||'', precio};
    }).filter(r=>r.precio!=='' && (r.codigo||r.nombre));
  }
  function rubros(){
    const db = Store.get();
    return [...new Set(db.productos.map(p=>p.categoria||'General'))].sort();
  }
  function renderRubro(){
    const r = rubros();
    $('precio-rubro').innerHTML = '<option value="">Todos los rubros</option>'+r.map(x=>`<option>${x}</option>`).join('');
  }
  function verLista(){
    const db = Store.get();
    const f = $('precio-rubro').value;
    const list = db.productos.filter(p=>!f||p.categoria===f);
    $('lista-precios').innerHTML = '<table><thead><tr><th>Cód</th><th>Producto</th><th>Rubro</th><th>Costo</th><th>Venta</th></tr></thead><tbody>'+
      list.map(p=>`<tr><td>${p.codigo||'-'}</td><td>${p.nombre}</td><td>${p.categoria||'-'}</td><td>$${p.costo??p.precio}</td><td>$${p.precio}</td></tr>`).join('')+'</tbody></table>';
  }
  function init(){
    renderRubro(); verLista();
    $('csv-ver').onclick=()=>{
      const f = $('csv').files[0]; if(!f){alert('Elegí un CSV');return;}
      const r = new FileReader();
      r.onload=()=>{ pendiente=parseCSV(r.result);
        $('csv-prev').innerHTML = `<p class="hint">${pendiente.length} filas. Primeras:</p><pre>${pendiente.slice(0,5).map(x=>JSON.stringify(x)).join('\n')}</pre>`; };
      r.readAsText(f);
    };
    $('csv-aplicar').onclick=()=>{
      if(!pendiente.length){alert('Primero previsualizá');return;}
      const r = Store.actualizarPrecios(pendiente, $('csv-rubro').value||null);
      alert(`Costos actualizados: ${r.tocados}. No encontrados: ${r.faltan.length?r.faltan.join(', '):'ninguno'}`);
      pendiente=[]; $('csv-prev').innerHTML=''; verLista(); Stock.render(); Caja.refresh();
    };
    const rubrosM = ()=>{ const db=Store.get();
      const r=[...new Set(db.productos.map(p=>p.categoria||'General'))].sort();
      $('margen-rubro').innerHTML='<option value="">Margen a todo</option>'+r.map(x=>`<option>${x}</option>`).join(''); };
    rubrosM();
    $('margen-aplicar').onclick=()=>{
      const m = Number($('margen').value);
      if(!(m>=0)){ alert('Margen inválido'); return; }
      const n = Store.aplicarMargen(m, $('margen-rubro').value||null);
      alert(`Venta recalculada en ${n} productos (+${m}%)`);
      verLista(); Stock.render(); Caja.refresh();
    };
    $('precio-ver').onclick=verLista;
    $('precio-print').onclick=()=>window.print();
  }
  return {init};
})();

const Pedidos = (() => {
  const $ = id => document.getElementById(id);
  function render(){
    const db = Store.get();
    $('ped-prov').innerHTML = db.proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('') || '<option value="">(alta un proveedor)</option>';
    const box = $('pedidos'); box.innerHTML='';
    if(!db.pedidos.length){ box.innerHTML='<p class="hint">Sin pedidos.</p>'; return; }
    db.pedidos.forEach(p=>{
      const prov = db.proveedores.find(x=>x.id===p.provId);
      const d = document.createElement('div'); d.className='venta';
      d.innerHTML = `<b>${prov?prov.nombre:'Proveedor'}</b> · ${p.estado} · <span class="hint">${new Date(p.fecha).toLocaleString('es-AR')}</span><br>${p.detalle} `;
      const b = document.createElement('button'); b.textContent = p.estado==='pendiente'?'Marcar recibido':'Reabrir';
      b.onclick=()=>{ p.estado = p.estado==='pendiente'?'recibido':'pendiente'; Store.upsertPedido(p); render(); };
      const del = document.createElement('button'); del.textContent='Borrar';
      del.onclick=()=>{ if(confirm('Borrar pedido?')){ Store.delPedido(p.id); render(); } };
      d.appendChild(b); d.appendChild(del); box.appendChild(d);
    });
  }
  function init(){
    render();
    $('ped-agregar').onclick=()=>{
      const det = $('ped-detalle').value.trim();
      if(!$('ped-prov').value || !det){ alert('Proveedor y detalle'); return; }
      Store.upsertPedido({id:'ped'+Date.now(), provId:$('ped-prov').value, detalle:det, estado:'pendiente', fecha:new Date().toISOString()});
      $('ped-detalle').value=''; render();
    };
  }
  return {init, render};
})();

const Respaldo = (() => {
  const $ = id => document.getElementById(id);
  function init(){
    const info = ()=>{ const db=Store.get();
      $('bk-info').innerHTML = `<p class="hint">Productos: ${db.productos.length} · Ventas: ${db.ventas.length} · Clientes: ${db.clientes.length} · Movimientos: ${db.movimientos.length} · Pedidos: ${db.pedidos.length}</p>`; };
    info();
    $('bk-export').onclick=()=>{
      const blob = new Blob([Store.export()], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'respaldo-'+new Date().toISOString().slice(0,10)+'.json';
      a.click(); info();
    };
    $('bk-import').onclick=()=>{
      const f = $('bk-file').files[0]; if(!f){alert('Elegí un JSON');return;}
      const r = new FileReader();
      r.onload=()=>{ try{ Store.import(r.result); alert('Respaldo restaurado');
        Stock.render(); Caja.refresh(); Entidades.render(); Pedidos.render(); Reportes.render(); info();
      }catch{ alert('Archivo inválido'); } };
      r.readAsText(f);
    };
  }
  return {init};
})();
