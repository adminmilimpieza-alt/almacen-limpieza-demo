// caja.js — módulo Caja (punto 1: ventas + ingresos/egresos + conciliación)
const Caja = (() => {
  let carrito = [];
  const $ = id => document.getElementById(id);
  const colorRubro = cat => (typeof ICONOS!=='undefined' && (ICONOS[cat]||ICONOS.General)) || '#F7F6F3';
  const monograma = p => ((p.codigo||p.nombre||'?').replace(/[^A-Za-z0-9]/g,'').slice(0,3)||'?').toUpperCase();
  function renderCatalogo(filtro=''){
    const db = Store.get();
    const box = $('catalogo'); box.innerHTML='';
    db.productos
      .filter(p => (p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')).toLowerCase().includes(filtro.toLowerCase()))
      .forEach(p=>{
        const d = document.createElement('div'); d.className='card';
        d.innerHTML = `<div class="mono" style="background:${colorRubro(p.categoria)}">${monograma(p)}</div><b>${p.nombre}</b><div class="meta">${p.codigo||''} · ${p.categoria} · stock ${p.stock}</div><div class="price">$${p.precio}</div>`;
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
    if(!carrito.length){ box.innerHTML='<p class="hint">Sin líneas. Escaneá el primer producto.</p>'; }
    carrito.forEach((it,idx)=>{
      const d = document.createElement('div'); d.className='linea';
      const info = document.createElement('div');
      info.innerHTML = `<b>${it.nombre}</b><div class="hint">$${it.precio} c/u</div>`;
      const qty = document.createElement('div'); qty.className='qty';
      const menos = document.createElement('button'); menos.textContent='−';
      menos.onclick=()=>{ it.cant--; if(it.cant<=0) carrito.splice(idx,1); renderCarrito(); };
      const n = document.createElement('b'); n.textContent = 'x'+it.cant;
      const mas = document.createElement('button'); mas.textContent='+';
      mas.onclick=()=>{ const p = Store.get().productos.find(x=>x.id===it.id); if(it.cant+1>p.stock){alert('No hay más stock');return;} it.cant++; renderCarrito(); };
      qty.appendChild(menos); qty.appendChild(n); qty.appendChild(mas);
      const tot = document.createElement('div'); tot.className='price'; tot.textContent = '$'+(it.precio*it.cant);
      d.appendChild(info); d.appendChild(qty); d.appendChild(tot); box.appendChild(d);
    });
    $('total').textContent = carrito.reduce((a,i)=>a+i.precio*i.cant,0);
    const n = carrito.reduce((a,i)=>a+i.cant,0);
    $('nitems').textContent = n + (n===1?' ítem':' ítems');
    box.scrollTop = box.scrollHeight;
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
  function flash(msg){
    const box = $('scan-flash'); if(!box) return;
    box.innerHTML = `<div class="flash">${msg}</div>`;
    clearTimeout(flash._t); flash._t = setTimeout(()=>{ box.innerHTML=''; }, 1800);
  }
  // Escáner USB = cuña de teclado: escribe el código rapidísimo + Enter.
  // Enter con código exacto suma directo al ticket; si no, filtra el catálogo.
  function scanAgregar(codigo){
    const code = (codigo||'').trim(); if(!code) return false;
    const db = Store.get();
    const p = db.productos.find(x=>(x.codigo||'').toLowerCase()===code.toLowerCase());
    if(p){
      if(p.stock<=0){ flash(`Sin stock: ${p.nombre}`); return true; }
      const it = carrito.find(x=>x.id===p.id);
      const enCarro = it?it.cant:0;
      if(enCarro+1 > p.stock){ flash(`No hay más stock: ${p.nombre}`); return true; }
      if(it) it.cant++; else carrito.push({id:p.id, nombre:p.nombre, precio:p.precio, cant:1});
      renderCarrito(); flash(`Agregado: ${p.nombre} (x${enCarro+1})`);
      return true;
    }
    return false;
  }
  function init(){
    renderCatalogo(); renderCarrito(); renderClientes(); renderMovimientos();
    const scan = $('scan'), manual = $('buscar2');
    // Línea 2: búsqueda manual de respaldo (código o nombre), no suma sola.
    manual.addEventListener('input', e=>renderCatalogo(e.target.value));
    // Línea 1: escáner. Enter con código exacto suma directo; si no existe,
    // avisa y deja el foco listo para reintentar o ir a la línea 2.
    const intentar = v => {
      const code = (v||'').trim(); if(!code) return;
      if(scanAgregar(code)){ scan.value=''; }
      else { flash(`Código no encontrado: ${code}. Buscalo en la línea 2.`); scan.select(); }
    };
    scan.addEventListener('keydown', e=>{ if(e.key==='Enter') intentar(scan.value); });
    // Algunas pistolas configuran sufijo TAB en vez de Enter.
    scan.addEventListener('change', ()=>{ if(document.activeElement!==scan) intentar(scan.value); });
    // El campo vive con foco: el escáner escribe donde haya foco.
    document.getElementById('pos-left').addEventListener('click', e=>{
      if(e.target.tagName!=='INPUT' && e.target.tagName!=='SELECT' && e.target.tagName!=='BUTTON') scan.focus();
    });
    setTimeout(()=>scan.focus(), 300);
    if(typeof ScanCam!=='undefined') ScanCam.init('scan', code=>{ scan.value=code; intentar(code); });
    $('vaciar').onclick = ()=>{ carrito=[]; renderCarrito(); scan.focus(); };
    $('cobrar').onclick = ()=>{
      if(!carrito.length){ alert('Carrito vacío'); return; }
      try{
        const total = Store.cobrar(carrito, $('pago').value, $('f-cliente').value);
        alert('Venta cobrada: $'+total);
        carrito=[]; renderCarrito(); scan.focus();
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
    $('linkmp').onclick = async ()=>{
      if(!carrito.length){ alert('Armá el ticket primero'); return; }
      const total = carrito.reduce((a,i)=>a+i.precio*i.cant,0);
      const btn = $('linkmp'); btn.disabled = true; btn.textContent = 'Generando…';
      try{
        const link = await Pagos.crearLink({items:carrito, total, medio:'mercadopago'});
        Store.addMovimiento({tipo:'ingreso', medio:'mercadopago',
          concepto:'Link MP '+(link.demo?'(demo) ':'')+link.id+' — pendiente de acreditación',
          monto:total, conciliado:false});
        renderMovimientos(); Reportes.render();
        $('linkmp-out').innerHTML =
          `<div class="venta"><b>Link de pago ${link.demo?'(simulado)':''}</b><br>`+
          `<a href="${link.init_point}" target="_blank">${link.init_point}</a><br>`+
          `<span class="hint">ID: ${link.id} · Queda como movimiento NO conciliado hasta que MP avise el pago (webhook fase 2).</span><br>`+
          `<a href="${Pagos.whatsappShare(link.init_point, total)}" target="_blank"><button class="primary">Pasar al cliente por WhatsApp</button></a></div>`;
      }catch(e){ alert('No se pudo generar: '+e.message); }
      btn.disabled = false; btn.textContent = 'Generar link de pago (demo)';
    };
  }
  return {init, refresh:()=>{renderCatalogo($('buscar2').value); renderCarrito(); renderClientes(); renderMovimientos();}};
})();
