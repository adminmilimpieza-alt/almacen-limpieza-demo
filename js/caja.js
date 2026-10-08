// caja.js — módulo Caja
const Caja = (() => {
  let carrito = []; // {id,nombre,precio,cant}
  const $ = id => document.getElementById(id);
  function renderCatalogo(filtro=''){
    const db = Store.get();
    const box = $('catalogo'); box.innerHTML='';
    db.productos
      .filter(p => (p.nombre+' '+p.categoria).toLowerCase().includes(filtro.toLowerCase()))
      .forEach(p=>{
        const d = document.createElement('div'); d.className='card';
        d.innerHTML = `<b>${p.nombre}</b><span>${p.categoria} · stock ${p.stock}</span><br><span>$${p.precio}</span>`;
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
  function init(){
    renderCatalogo(); renderCarrito();
    $('buscar').addEventListener('input', e=>renderCatalogo(e.target.value));
    $('vaciar').onclick = ()=>{ carrito=[]; renderCarrito(); };
    $('cobrar').onclick = ()=>{
      if(!carrito.length){ alert('Carrito vacío'); return; }
      try{
        const total = Store.cobrar(carrito, $('pago').value);
        alert('Venta cobrada: $'+total);
        carrito=[]; renderCarrito(); renderCatalogo($('buscar').value);
        Stock.render(); Ventas.render();
      }catch(e){ alert(e.message); }
    };
  }
  return {init, refresh:()=>{renderCatalogo(document.getElementById('buscar').value); renderCarrito();}};
})();
