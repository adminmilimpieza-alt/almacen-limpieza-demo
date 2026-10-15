// caja.js — módulo Caja (punto 1: ventas + ingresos/egresos + conciliación)
const Caja = (() => {
  let carrito = [];
  const $ = id => document.getElementById(id);
  const icono = p => p.icono || (typeof ICONOS!=='undefined' && (ICONOS[p.categoria]||ICONOS.General)) || '🧹';
  function renderCatalogo(filtro=''){
    const db = Store.get();
    const box = $('catalogo'); box.innerHTML='';
    db.productos
      .filter(p => (p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')).toLowerCase().includes(filtro.toLowerCase()))
      .forEach(p=>{
        const d = document.createElement('div'); d.className='card';
        d.innerHTML = `<div class="img">${icono(p)}</div><b>${p.nombre}</b><span>${p.codigo||''} · ${p.categoria} · stock ${p.stock}</span><br><span>$${p.precio}</span>`;
        const b = document.createElement('button'); b.textContent = p.stock>0 ? 'Agregar' : 'Sin stock'; b.disabled = p.stock<=0;
        b.onclick = ()=>{ agregar(p); };
        d.appendChild(b); box.appendChild(d);
      });
  }
  function agregar(p){
    const it = carrito.find(x=>x.id===p.id);
    if(it){ if(it.cant+1 > p.stock){ alert('No hay más stock'); return; } it.cant++; }
    else carrito.push({id:p.id, nombre:p.nombre, precio:p.precio, cant:1});
    renderCarrito();
  }
  function renderCarrito(){
    const box = $('carrito'); box.innerHTML='';
    carrito.forEach((it,idx)=>{
      const d = document.createElement('div');
      d.innerHTML = `${it.nombre} x${it.cant} — $${it.precio*it.cant} `;
      const menos = document.createElement('button'); menos.textContent='-';
      menos.onclick=()=>{ it.cant--; if(it.cant<=0) carrito.splice(idx,1); renderCarrito(); };
      const mas = document.createElement('button'); mas.textContent='+';
      mas.onclick=()=>{ const p = Store.get().productos.find(x=>x.id===it.id); if(it.cant+1>p.stock){alert('No hay más stock');return;} it.cant++; renderCarrito(); };
      d.appendChild(menos); d.appendChild(mas); box.appendChild(d);
    });
    $('total').textContent = carrito.reduce((a,i)=>a+i.precio*i.cant,0);
  }
  function renderClientes(){
    const db = Store.get();
    $('f-cliente').innerHTML = db.clientes.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
  }
  function renderMovimientos(){
    const db = Store.get();
    const box = $('movimientos'); box.innerHTML='';
    if(!db.movimientos.length){ box.innerHTML='<p class="hint">Sin movimientos todavía.</p>'; return; }
    db.movimientos.slice(0,30).forEach(m=>{
      const d = document.createElement('div'); d.className='venta';
      const f = new Date(m.fecha).toLocaleString('es-AR');
      const signo = m.tipo==='ingreso'?'+':'−';
      d.innerHTML = `<input type="checkbox" ${m.conciliado?'checked':''} title="Conciliado MP/Banco"> <b>${signo}$${m.monto}</b> ${m.tipo} · ${m.medio} · ${m.concepto} <br><span class="hint">${f}</span>`;
      d.querySelector('input').onchange = e=>{ Store.conciliar(m.id, e.target.checked); Reportes.render(); };
      box.appendChild(d);
    });
  }
  function init(){
    renderCatalogo(); renderCarrito(); renderClientes(); renderMovimientos();
    $('buscar').addEventListener('input', e=>renderCatalogo(e.target.value));
    $('vaciar').onclick = ()=>{ carrito=[]; renderCarrito(); };
    $('cobrar').onclick = ()=>{
      if(!carrito.length){ alert('Carrito vacío'); return; }
      try{
        const total = Store.cobrar(carrito, $('pago').value, $('f-cliente').value);
        alert('Venta cobrada: $'+total);
        carrito=[]; renderCarrito(); renderCatalogo($('buscar').value);
        Stock.render(); renderMovimientos(); Reportes.render();
      }catch(e){ alert(e.message); }
    };
    $('m-agregar').onclick = ()=>{
      const monto = Number($('m-monto').value);
      if(!($('m-concepto').value.trim()) || !(monto>0)){ alert('Concepto y monto'); return; }
      Store.addMovimiento({tipo:$('m-tipo').value, medio:$('m-medio').value, concepto:$('m-concepto').value.trim(), monto});
      $('m-concepto').value=''; $('m-monto').value='';
      renderMovimientos(); Reportes.render();
    };
  }
  return {init, refresh:()=>{renderCatalogo($('buscar').value); renderCarrito(); renderClientes(); renderMovimientos();}};
})();
