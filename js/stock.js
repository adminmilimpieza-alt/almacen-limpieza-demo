// stock.js — módulo Stock
const Stock = (() => {
  const $ = id => document.getElementById(id);
  let editId = null;
  function render(){
    const db = Store.get();
    const tb = $('tabla-stock'); tb.innerHTML='';
    db.productos.forEach(p=>{
      const tr = document.createElement('tr');
      if(p.stock<=5) tr.className='bajo';
      tr.innerHTML = `<td>${p.nombre}</td><td>${p.categoria||'-'}</td><td>$${p.precio}</td><td>${p.stock}</td>`;
      const td = document.createElement('td');
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ editId=p.id; $('modal-titulo').textContent='Editar producto';
        $('f-nombre').value=p.nombre; $('f-cat').value=p.categoria||'';
        $('f-precio').value=p.precio; $('f-stock').value=p.stock;
        $('modal').showModal(); };
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=()=>{ if(confirm('Borrar '+p.nombre+'?')){ Store.eliminar(p.id); render(); Caja.refresh(); } };
      td.appendChild(bE); td.appendChild(bD); tr.appendChild(td); tb.appendChild(tr);
    });
  }
  function init(){
    render();
    $('nuevo').onclick=()=>{ editId=null; $('modal-titulo').textContent='Nuevo producto';
      $('f-nombre').value=''; $('f-cat').value=''; $('f-precio').value=''; $('f-stock').value='10';
      $('modal').showModal(); };
    $('reset').onclick=()=>{ if(confirm('Volver a datos demo?')){ Store.reset(); render(); Caja.refresh(); Ventas.render(); } };
    $('guardar-prod').onclick=()=>{
      const p = { id: editId || 'p'+Date.now(),
        nombre:$('f-nombre').value.trim(), categoria:$('f-cat').value.trim(),
        precio:Number($('f-precio').value), stock:Number($('f-stock').value) };
      if(!p.nombre || !(p.precio>=0)){ alert('Faltan datos'); return; }
      Store.upsertProducto(p); render(); Caja.refresh();
    };
  }
  return {init, render};
})();

// ventas — historial simple
const Ventas = (() => {
  function render(){
    const db = Store.get();
    const box = document.getElementById('ventas'); box.innerHTML='';
    if(!db.ventas.length){ box.innerHTML='<p class="hint">Todavía no hay ventas.</p>'; return; }
    db.ventas.slice(0,50).forEach(v=>{
      const d = document.createElement('div'); d.className='venta';
      const f = new Date(v.fecha).toLocaleString('es-AR');
      d.innerHTML = `<b>${f}</b> · ${v.pago} · <b>$${v.total}</b><br>` +
        v.items.map(i=>`${i.nombre} x${i.cant}`).join(', ');
      box.appendChild(d);
    });
  }
  return {render};
})();
