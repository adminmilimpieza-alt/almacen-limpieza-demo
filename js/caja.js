// caja.js — módulo Caja (punto 1: ventas + ingresos/egresos + conciliación)
// Venta fraccionada: el código interno es el mismo por producto; la presentación
// (1L / 5L) se elige en la tarjeta o en la línea. Si el ticket suma 5 litros
// sueltos, se optimiza solo al bidón de 5L cuando conviene.
const Caja = (() => {
  let carrito = []; // {id,nombre,precio,cant,pres}
  const $ = id => document.getElementById(id);
  const pres = p => p.categoria==='Líquidos 5L' ? '5L' : (p.categoria==='Líquidos 1L' ? '1L' : 'U');
  const variantes = code => Store.get().productos.filter(x=>(x.codigo||'')===code);
  function nombreBase(p){ return p.nombre.replace(/\s*1\s*Lt\.?\s*$/i,''); }
  function prod(id){ return Store.get().productos.find(x=>x.id===id); }
  function sugerencias(q){
    const box = $('sugerencias'); if(!box) return;
    const f = (q||'').trim().toLowerCase();
    if(!f){ cerrarSugerencias(); return; }
    const db = Store.get();
    const seen = new Set(); const out = [];
    db.productos
      .filter(p => (p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')).toLowerCase().includes(f))
      .forEach(p=>{ if(seen.has(p.codigo) || out.length>=8) return; seen.add(p.codigo); out.push(p); });
    box.innerHTML='';
    if(!out.length){ cerrarSugerencias(); return; }
    out.forEach(p=>{
      const vars = variantes(p.codigo).sort((a,b)=>pres(a).localeCompare(pres(b)));
      const row = document.createElement('div'); row.className='sug';
      const info = document.createElement('div'); info.className='sug-info';
      info.innerHTML = `<b>${nombreBase(vars[0])}</b><small>${p.codigo||''} · ${vars.map(v=>pres(v)+':'+v.stock).join(' / ')}</small>`;
      row.appendChild(info);
      vars.forEach(v=>{
        const b = document.createElement('button'); b.className='sug-btn';
        b.textContent = (vars.length>1 ? pres(v)+' · ' : '') + (v.stock>0 ? '$'+v.precio : 'Sin stock');
        b.disabled = v.stock<=0;
        b.onmousedown = e=>e.preventDefault();
        b.onclick = ()=>{ agregar(v); cerrarSugerencias(); const s=$('scan'); if(s){ s.value=''; s.focus(); } };
        row.appendChild(b);
      });
      box.appendChild(row);
    });
    box._items = [...box.querySelectorAll('button:not([disabled])')];
    box.hidden = false;
  }
  function cerrarSugerencias(){ const box=$('sugerencias'); if(!box) return; box.hidden=true; box._items=[]; }
  function primerSugerencia(){ const box=$('sugerencias'); const it = box && box._items && box._items[0]; if(it){ it.click(); return true; } return false; }
  function agregar(p){
    const enCarro = carrito.filter(x=>x.id===p.id).reduce((a,i)=>a+i.cant,0);
    if(enCarro+1 > p.stock){ alert('No hay más stock'); return; }
    const it = carrito.find(x=>x.id===p.id);
    if(it) it.cant++;
    else carrito.push({id:p.id, nombre:p.nombre, precio:p.precio, cant:1, pres:pres(p), codigo:p.codigo});
    optimizar(false);
    renderCarrito();
  }
  // Si se juntan 5 litros sueltos del mismo código y hay bidón con stock,
  // se convierte solo y avisa el ahorro. Standard de venta fraccionada.
  function optimizar(silencioso){
    const db = Store.get();
    let ahorro = 0; const avisos = [];
    const bases = [...new Set(carrito.map(i=>i.codigo).filter(Boolean))];
    bases.forEach(code=>{
      const v1 = db.productos.find(p=>p.codigo===code && p.categoria==='Líquidos 1L');
      const v5 = db.productos.find(p=>p.codigo===code && p.categoria==='Líquidos 5L');
      if(!v1 || !v5) return;
      const lin1 = carrito.filter(i=>i.id===v1.id);
      const tot1 = lin1.reduce((a,i)=>a+i.cant,0);
      if(tot1 < 5) return;
      const bid = Math.floor(tot1/5), resto = tot1%5;
      if(v5.stock < bid) return;
      const antes = tot1*v1.precio, ahora = bid*v5.precio + resto*v1.precio;
      if(ahora >= antes) return;
      carrito = carrito.filter(i=>i.id!==v1.id);
      if(resto>0) carrito.push({id:v1.id, nombre:v1.nombre, precio:v1.precio, cant:resto, pres:'1L', codigo:code});
      const l5 = carrito.find(i=>i.id===v5.id);
      if(l5) l5.cant += bid;
      else carrito.push({id:v5.id, nombre:v5.nombre, precio:v5.precio, cant:bid, pres:'5L', codigo:code});
      ahorro += antes-ahora;
      avisos.push(`${nombreBase(v1)}: ${tot1}x1L → ${bid}x5L${resto?` + ${resto}x1L`:''}`);
    });
    if(ahorro>0 && !silencioso) flash(`Se pasó a bidón 5L y ahorrás $${ahorro}. ${avisos.join(' · ')}`);
    return ahorro;
  }
  function otraPres(it){
    const vars = variantes(it.codigo).filter(v=>v.id!==it.id);
    return vars[0]||null;
  }
  function renderCarrito(){
    const box = $('carrito'); box.innerHTML='';
    if(!carrito.length){ box.innerHTML='<tr class="vacio"><td colspan="4" class="hint">Sin líneas. Escaneá el primer producto.</td></tr>'; }
    carrito.forEach((it,idx)=>{
      const d = document.createElement('tr');
      const cod = document.createElement('td'); cod.className='c-cod'; cod.textContent = it.codigo||'';
      const info = document.createElement('td'); info.className='c-desc';
      info.innerHTML = `<b>${it.nombre}</b> <span class="tag info">${it.pres||''}</span><div class="hint">$${it.precio} c/u</div>`;
      const qty = document.createElement('td'); qty.className='c-cant';
      const menos = document.createElement('button'); menos.textContent='−';
      menos.onclick=()=>{ it.cant--; if(it.cant<=0) carrito.splice(idx,1); renderCarrito(); };
      const n = document.createElement('b'); n.textContent = 'x'+it.cant;
      const mas = document.createElement('button'); mas.textContent='+';
      mas.onclick=()=>{ const p = prod(it.id); if(!p) return;
        const enCarro = carrito.filter(x=>x.id===it.id).reduce((a,i)=>a+i.cant,0);
        if(enCarro+1>p.stock){alert('No hay más stock');return;} it.cant++; optimizar(false); renderCarrito(); };
      qty.appendChild(menos); qty.appendChild(n); qty.appendChild(mas);
      const alt = otraPres(it);
      if(alt){
        const sw = document.createElement('button'); sw.textContent='⇄ '+pres(alt); sw.title='Cambiar a presentación '+pres(alt);
        sw.onclick=()=>{
          const enCarro = carrito.filter(x=>x.id===alt.id).reduce((a,i)=>a+i.cant,0);
          if(enCarro+it.cant > alt.stock){ alert('Sin stock en '+pres(alt)); return; }
          const ex = carrito.find(x=>x.id===alt.id);
          if(ex){ ex.cant += it.cant; carrito.splice(idx,1); }
          else { it.id=alt.id; it.nombre=alt.nombre; it.precio=alt.precio; it.pres=pres(alt); }
          optimizar(false); renderCarrito();
        };
        qty.appendChild(sw);
      }
      const tot = document.createElement('td'); tot.className='c-total'; tot.textContent = '$'+(it.precio*it.cant);
      d.appendChild(cod); d.appendChild(info); d.appendChild(qty); d.appendChild(tot); box.appendChild(d);
    });
    $('total').textContent = carrito.reduce((a,i)=>a+i.precio*i.cant,0);
    const n = carrito.reduce((a,i)=>a+i.cant,0);
    $('nitems').textContent = n + (n===1?' ítem':' ítems');
    const sc = box.closest('.ticket-scroll'); if(sc) sc.scrollTop = sc.scrollHeight;
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
    clearTimeout(flash._t); flash._t = setTimeout(()=>{ box.innerHTML=''; }, 2600);
  }
  // El código interno es el mismo en 1L y 5L: el escáner suma la presentación
  // de 1L por defecto (venta suelta) y en el ticket se puede cambiar a 5L.
  function scanAgregar(codigo){
    const code = (codigo||'').trim(); if(!code) return false;
    const vars = variantes(code);
    if(!vars.length) return false;
    const p = vars.find(v=>v.categoria==='Líquidos 1L') || vars[0];
    const enCarro = carrito.filter(x=>x.id===p.id).reduce((a,i)=>a+i.cant,0);
    if(p.stock<=0){ flash(`Sin stock: ${p.nombre}`); if(typeof Beep!=='undefined')Beep.err(); return true; }
    if(enCarro+1 > p.stock){ flash(`No hay más stock: ${p.nombre}`); if(typeof Beep!=='undefined')Beep.err(); return true; }
    const it = carrito.find(x=>x.id===p.id);
    if(it) it.cant++;
    else carrito.push({id:p.id, nombre:p.nombre, precio:p.precio, cant:1, pres:pres(p), codigo:p.codigo});
    optimizar(false);
    renderCarrito();
    flash(`Agregado: ${p.nombre} (${pres(p)})`);
    if(typeof Beep!=='undefined')Beep.ok();
    return true;
  }
  function init(){
    renderCarrito(); renderClientes(); renderMovimientos();
    const scan = $('scan');
    const intentar = v => {
      const code = (v||'').trim(); if(!code) return;
      if(scanAgregar(code)){ cerrarSugerencias(); scan.value=''; scan.focus(); return; }
      if(primerSugerencia()) return;
      flash(`Código no encontrado: ${code}`); if(typeof Beep!=='undefined')Beep.err(); scan.select();
    };
    scan.addEventListener('input', ()=>sugerencias(scan.value));
    scan.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); intentar(scan.value); }
      else if(e.key==='Escape'){ cerrarSugerencias(); scan.value=''; }
    });
    scan.addEventListener('change', ()=>{ if(document.activeElement!==scan) intentar(scan.value); });
    document.addEventListener('click', e=>{ if(!e.target.closest('.scan-wrap')) cerrarSugerencias(); });
    document.getElementById('pos-left').addEventListener('click', e=>{
      if(e.target.tagName!=='INPUT' && e.target.tagName!=='SELECT' && e.target.tagName!=='BUTTON') scan.focus();
    });
    setTimeout(()=>scan.focus(), 300);
    if(typeof ScanCam!=='undefined') ScanCam.init('scan', code=>{ scan.value=code; intentar(code); });
    $('vaciar').onclick = ()=>{ carrito=[]; renderCarrito(); scan.focus(); };
    $('t-print').onclick = ()=>{ document.body.classList.add('print-ticket'); window.print(); };
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
      try{
        const monto = Number($('m-monto').value);
        if(!($('m-concepto').value.trim()) || !(monto>0)){ alert('Concepto y monto'); return; }
        Store.addMovimiento({tipo:$('m-tipo').value, medio:$('m-medio').value, concepto:$('m-concepto').value.trim(), monto});
        $('m-concepto').value=''; $('m-monto').value='';
        renderMovimientos(); Reportes.render();
      }catch(e){ alert(e.message); }
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
  return {init, refresh:()=>{renderCarrito(); renderClientes(); renderMovimientos(); if(typeof Turnos!=='undefined') Turnos.status();}};
})();
