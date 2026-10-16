// stock.js — módulo Stock (punto 2) + historial ventas en Reportes
const Stock = (() => {
  const $ = id => document.getElementById(id);
  let editId = null;
  function render(){
    const db = Store.get();
    const tb = $('tabla-stock'); tb.innerHTML='';
    db.productos.forEach(p=>{
      const tr = document.createElement('tr');
      if(p.stock<=5) tr.className='bajo';
      const prov = (Store.get().proveedores.find(x=>x.id===p.provId)||{}).nombre||'—';
      tr.innerHTML = `<td>${p.codigo||'-'}</td><td>${p.nombre}</td><td>${p.categoria||'-'}</td><td>${prov}</td><td>$${p.costo??p.precio}</td><td>$${p.precio}</td><td>${p.stock}</td>`;
      const td = document.createElement('td');
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ editId=p.id; $('modal-titulo').textContent='Editar producto';
        $('f-codigo').value=p.codigo||''; $('f-nombre').value=p.nombre; $('f-cat').value=p.categoria||'';
        $('f-costo').value=(p.costo??p.precio); $('f-precio').value=p.precio; $('f-stock').value=p.stock;
        fillProv($('f-prov'), p.provId); $('modal').showModal(); };
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=()=>{ if(confirm('Borrar '+p.nombre+'?')){ Store.eliminar(p.id); render(); Caja.refresh(); } };
      td.appendChild(bE); td.appendChild(bD); tr.appendChild(td); tb.appendChild(tr);
    });
  }
  function fillProv(sel, cur){
    const db = Store.get();
    sel.innerHTML = '<option value="">— Sin proveedor —</option>' +
      db.proveedores.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
    sel.value = cur||'';
  }
  function init(){
    render();
    $('nuevo').onclick=()=>{ editId=null; $('modal-titulo').textContent='Nuevo producto';
      $('f-codigo').value=''; $('f-nombre').value=''; $('f-cat').value=''; $('f-costo').value=''; $('f-precio').value=''; $('f-stock').value='10';
 $('modal').showModal(); };
    $('reset').onclick=()=>{ if(confirm('Volver a datos demo?')){ Store.reset(); render(); Caja.refresh(); Reportes.render(); Entidades.render(); } };
    $('guardar-prod').onclick=()=>{
      const p = { id: editId || 'p'+Date.now(), codigo:$('f-codigo').value.trim(),
        nombre:$('f-nombre').value.trim(), categoria:$('f-cat').value.trim(),
        costo:Number($('f-costo').value), precio:Number($('f-precio').value), stock:Number($('f-stock').value),
};
      if(!p.nombre || !(p.costo>=0) || !(p.precio>=0)){ alert('Faltan datos'); return; }
      Store.upsertProducto(p); render(); Caja.refresh();
    };
  }
  return {init, render};
})();

// Ventas render vive en Reportes pero se expone para compatibilidad
const Ventas = (() => {
  function render(){ if(typeof Reportes!=='undefined') Reportes.renderVentas(); }
  return {render};
})();
