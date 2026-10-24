// caja.js — módulo Caja (punto 1: ventas + ingresos/egresos + conciliación)
// Venta fraccionada: el código interno es el mismo por producto; la presentación
// (1L / 5L) se elige en la tarjeta o en la línea. Si el ticket suma 5 litros
// sueltos, se optimiza solo al bidón de 5L cuando conviene.
const Caja = (() => {
  let carrito = []; // {id,nombre,precio,cant,pres}
  const $ = id => document.getElementById(id);
  const pres = p => p.categoria==='Líquidos 5L' ? '5L' : (p.categoria==='Líquidos 1L' ? '1L' : 'U');
  const variantes = code => Store.get().productos.filter(x=>(x.codigo||'')===code && x.activo!==false);
  function nombreBase(p){ return p.nombre.replace(/\s*(1|5|10)\s*(Lt|Lts|L)\b\.?\s*$/i,'').trim(); }
  function prod(id){ return Store.get().productos.find(x=>x.id===id); }
  const norm = s => (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // Icono por tipo de producto para la foto demo (si el producto no tiene URL de imagen).
  const EMOJIS = [
    [/cloro|lavandina|blanqueador|alcohol|desinfect|desodorante|aerosol|lysoform|poett|ayudin|cif/i,'🧪'],
    [/papel|rollo|servilleta|bobina|tissue/i,'🧻'],
    [/esponja|virulana|acero|rejilla|paño|trapo|franela|mopa|microfibra/i,'🧽'],
    [/escob|cepillo|secador|pala|lampazo|plumero|sopapa|barre|pasar|mata mosca|cabo/i,'🧹'],
    [/balde|cesto|canasta|fuenton|palangana|bolsa/i,'🪣'],
    [/guante/i,'🧤'],
    [/jabon|jabón/i,'🧼'],
    [/suavizante|perfume|brillo|cera/i,'✨'],
    [/vidrio|ventana|cortina|barral/i,'🪟'],
    [/detergente|desengrasante|quitamancha|quitasarro|limpiador|limpia/i,'🧴'],
    [/insect|derribante|mosca/i,'🪳'],
    [/destapa|cañer|soda/i,'🚿'],
    [/percarbonato|oxi/i,'🫧']
  ];
  function placeholder(p){
    const emoji = (EMOJIS.find(([re])=>re.test(p.nombre||''))||[null,'🫧'])[1];
    const bg = (typeof ICONOS!=='undefined' && ICONOS[p.categoria]) || '#F7F6F3';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${bg}"/><text x="120" y="140" font-size="108" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function renderCatalogo(q){
    const box = $('catalogo'); if(!box) return;
    const f = norm(q);
    const db = Store.get();
    const list = db.productos.filter(p => p.activo!==false && (!f || norm(p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')+' '+(p.presentacion||'')).includes(f)));
    const count = $('catalogo-count');
    if(count) count.textContent = f ? `${list.length} resultado${list.length===1?'':'s'}` : `${list.length} productos`;
    box.innerHTML='';
    if(!list.length){ box.innerHTML='<p class="hint catalogo-empty">Nada coincide con la búsqueda.</p>'; return; }
    list.forEach(p=>{
      const card = document.createElement('button'); card.type='button'; card.className='prod-card';
      if(p.stock<=0) card.classList.add('sin-stock');
      else if(p.stock<=5) card.classList.add('bajo-stock');
      card.disabled = p.stock<=0;
      const img = document.createElement('img'); img.loading='lazy'; img.alt = p.nombre;
      img.src = p.foto || p.img || placeholder(p);
      img.onerror = ()=>{ img.onerror=null; img.src = placeholder(p); };
      const body = document.createElement('div'); body.className='pc-body';
      const nm = document.createElement('span'); nm.className='pc-name'; nm.textContent = p.nombre;
      const meta = document.createElement('span'); meta.className='pc-meta';
      const cod = document.createElement('span'); cod.textContent = p.codigo||'—';
      const price = document.createElement('span'); price.className='pc-price'; price.textContent = '$'+p.precio;
      meta.appendChild(cod); meta.appendChild(price);
      const st = document.createElement('span'); st.className='pc-stock';
      st.textContent = p.stock>0 ? 'Stock: '+p.stock : 'Sin stock';
      body.appendChild(nm); body.appendChild(meta); body.appendChild(st);
      card.appendChild(img); card.appendChild(body);
      card.onclick = ()=>{ agregar(p); flash('Agregado: '+p.nombre+' ('+pres(p)+')'); };
      box.appendChild(card);
    });
  }
  function sugerencias(q){
    const box = $('sugerencias'); if(!box) return;
    const f = norm(q).trim();
    if(!f){ cerrarSugerencias(); return; }
    const db = Store.get();
    const seen = new Set(); const out = [];
    db.productos
      .filter(p => p.activo!==false && norm(p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')+' '+(p.presentacion||'')).includes(f))
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
        b.onclick = ()=>{ agregar(v); cerrarSugerencias(); const s=$('scan'); if(s){ s.value=''; s.focus(); } renderCatalogo(''); };
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
      const v1 = db.productos.find(p=>p.codigo===code && p.categoria==='Líquidos 1L' && p.activo!==false);
      const v5 = db.productos.find(p=>p.codigo===code && p.categoria==='Líquidos 5L' && p.activo!==false);
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
  function catDe(it){
    const p = prod(it.id);
    if(p && p.categoria) return p.categoria;
    return it.pres==='1L' ? 'Líquidos 1L' : (it.pres==='5L' ? 'Líquidos 5L' : '');
  }
  function categoriaAlterna(cat){
    return cat==='Líquidos 1L' ? 'Líquidos 5L' : (cat==='Líquidos 5L' ? 'Líquidos 1L' : '');
  }
  function otraPres(it){
    const destino = categoriaAlterna(catDe(it));
    if(!destino) return null;
    const vars = variantes(it.codigo).filter(v=>v.id!==it.id);
    return vars.find(v=>v.categoria===destino) || vars[0] || null;
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
        const sw = document.createElement('button'); sw.textContent='→ '+pres(alt); sw.title='Cambiar a '+pres(alt); sw.setAttribute('aria-label','Cambiar a presentación '+pres(alt));
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
  function esCumpleHoy(nac){
    if(!nac) return false;
    const p = String(nac).split('-').map(Number), h = new Date();
    return p[1]===h.getMonth()+1 && p[2]===h.getDate();
  }
  function renderClientes(){
    const db = Store.get();
    $('f-cliente').innerHTML = db.clientes.map(c=>{
      const ref = (c.ref || c.extra) ? ' · '+(c.ref || c.extra) : '';
      const cumple = esCumpleHoy(c.nac) ? ' 🎂' : '';
      return `<option value="${c.id}">${c.nombre}${ref}${cumple}</option>`;
    }).join('');
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
    renderCarrito(); renderClientes(); renderMovimientos(); renderCatalogo('');
    const scan = $('scan');
    const intentar = v => {
      const code = (v||'').trim(); if(!code) return;
      if(scanAgregar(code)){ cerrarSugerencias(); scan.value=''; scan.focus(); renderCatalogo(''); return; }
      if(primerSugerencia()) return;
      flash(`Código no encontrado: ${code}`); if(typeof Beep!=='undefined')Beep.err(); scan.select();
    };
    scan.addEventListener('input', ()=>{ sugerencias(scan.value); renderCatalogo(scan.value); });
    scan.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); intentar(scan.value); }
      else if(e.key==='Escape'){ cerrarSugerencias(); scan.value=''; renderCatalogo(''); }
    });
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
      if(!Store.turnoAbierto()){ alert('Abrí la caja primero.'); return; }
      const items=carrito.map(i=>({...i}));
      const btn=$('linkmp');btn.disabled=true;btn.textContent='Generando…';
      // Freeze the ticket while its immutable payment snapshot is created.
      const controls=[...document.querySelectorAll('#pos-left button, #pos-left input, #pos-left select, #pos-right button, #pos-right input, #pos-right select')];
      const previous=controls.map(el=>el.disabled);controls.forEach(el=>el.disabled=true);
      try{
        const order=await Pagos.crearLink({items,clienteId:$('f-cliente').value});
        carrito=[];renderCarrito();
        const out=$('linkmp-out');out.replaceChildren();
        const text=document.createElement('p');text.textContent='Enlace generado por $'+order.total+'. El cobro está pendiente. Verificá el pago y registrá la venta en “Cobros de Mercado Pago”.';
        const a=document.createElement('a');a.href=order.init_point;a.textContent='Abrir enlace de pago';a.target='_blank';a.rel='noopener noreferrer';out.append(text,a);
      }catch(e){alert('No se pudo generar: '+e.message);}
      finally{controls.forEach((el,i)=>el.disabled=previous[i]);btn.disabled=false;btn.textContent='Generar link de pago';}
    };
  }
  return {init, refresh:()=>{renderCarrito(); renderClientes(); renderMovimientos(); renderCatalogo($('scan')?$('scan').value:''); if(typeof Turnos!=='undefined') Turnos.status();}};
})();
