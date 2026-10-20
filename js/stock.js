// stock.js — módulo Stock (punto 2) + historial ventas en Reportes
const Stock = (() => {
  const $ = id => document.getElementById(id);
  let editId = null, fotoActual = '';
  function normalizarFoto(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=>{
        const img = new Image();
        img.onload = ()=>{
          const lado = Math.min(img.width, img.height), size = 480;
          const c = document.createElement('canvas'); c.width = c.height = size;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, (img.width-lado)/2, (img.height-lado)/2, lado, lado, 0, 0, size, size);
          res(c.toDataURL('image/jpeg', .72));
        };
        img.onerror = ()=>rej(new Error('No se pudo leer la imagen'));
        img.src = fr.result;
      };
      fr.onerror = ()=>rej(new Error('No se pudo leer el archivo'));
      fr.readAsDataURL(file);
    });
  }
  function pintarFoto(){
    const prev = $('foto-prev'), del = $('foto-del');
    if(fotoActual){
      prev.classList.remove('vacia');
      prev.innerHTML = `<img src="${fotoActual}" alt="">`;
    } else {
      prev.classList.add('vacia');
      prev.innerHTML = '<span>Sin foto</span>';
    }
    if(del) del.disabled = !fotoActual;
  }
  function filtros(){
    const db = Store.get();
    const q = ($('stk-q').value||'').toLowerCase(), r = $('stk-rubro').value;
    const rubros = [...new Set(db.productos.map(p=>p.categoria||'General'))].sort();
    $('stk-rubro').innerHTML = '<option value="">Todos los rubros</option>'+rubros.map(x=>`<option ${x===r?'selected':''}>${x}</option>`).join('');
    $('stk-prov').innerHTML = '<option value="">Elegí proveedor…</option>'+
      db.proveedores.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
    return db.productos.filter(p =>
      (!r || (p.categoria||'General')===r) &&
      (!q || (p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')).toLowerCase().includes(q)));
  }
  function render(){
    const db = Store.get();
    const tb = $('tabla-stock'); tb.innerHTML='';
    const list = filtros();
    $('stk-count').textContent = `${list.length} de ${db.productos.length} productos`;
    list.forEach(p=>{
      const tr = document.createElement('tr');
      if(p.stock<=5) tr.className='bajo';
      const prov = (Store.get().proveedores.find(x=>x.id===p.provId)||{}).nombre||'—';
      const tdF = document.createElement('td'); tdF.className='td-foto';
      if(p.foto){ const im = document.createElement('img'); im.src=p.foto; im.alt=''; tdF.appendChild(im); }
      tr.appendChild(tdF);
      tr.insertAdjacentHTML('beforeend', `<td>${p.codigo||'-'}</td><td>${p.nombre}</td><td>${p.categoria||'-'}</td><td>${prov}</td><td>$${p.costo??p.precio}</td><td>$${p.precio}</td><td>${p.stock}</td>`);
      const td = document.createElement('td');
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ editId=p.id; $('modal-titulo').textContent='Editar producto';
        $('f-codigo').value=p.codigo||''; $('f-nombre').value=p.nombre; $('f-cat').value=p.categoria||'';
        $('f-costo').value=(p.costo??p.precio); $('f-precio').value=p.precio; $('f-stock').value=p.stock;
        fotoActual = p.foto||p.img||''; pintarFoto();
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
      fotoActual=''; pintarFoto();
 $('modal').showModal(); };
    $('reset').onclick=()=>{ if(confirm('Volver a datos demo?')){ Store.reset(); render(); Caja.refresh(); Reportes.render(); Entidades.render(); } };
    $('stk-q').addEventListener('input', render);
    $('stk-rubro').addEventListener('change', render);
    $('stk-assign').onclick=()=>{
      const pid = $('stk-prov').value;
      if(!pid){ alert('Elegí un proveedor'); return; }
      const list = filtros();
      if(!list.length){ alert('Nada filtrado'); return; }
      const nom = (Store.get().proveedores.find(x=>x.id===pid)||{}).nombre||'';
      if(!confirm(`Asignar ${nom} a ${list.length} productos?`)) return;
      const db = Store.get();
      list.forEach(p=>{ const real = db.productos.find(x=>x.id===p.id); if(real) real.provId = pid; });
      Store.import(JSON.stringify(db));
      render(); Caja.refresh(); Reportes.render();
    };
    $('foto-pick').onclick=()=>$('f-foto').click();
    $('f-foto').addEventListener('change', async ev=>{
      const f = ev.target.files && ev.target.files[0];
      if(!f) return;
      try{ fotoActual = await normalizarFoto(f); pintarFoto(); }
      catch(err){ alert(err.message); }
      ev.target.value='';
    });
    $('foto-del').onclick=()=>{ fotoActual=''; pintarFoto(); };
    $('guardar-prod').onclick=()=>{
      const db = Store.get();
      const cur = editId && db.productos.find(x=>x.id===editId);
      const p = Object.assign({}, cur||{}, {
        id: editId || 'p'+Date.now(), codigo:$('f-codigo').value.trim(),
        nombre:$('f-nombre').value.trim(), categoria:$('f-cat').value.trim(),
        costo:Number($('f-costo').value), precio:Number($('f-precio').value), stock:Number($('f-stock').value),
        provId: $('f-prov').value || ((cur&&cur.provId)||''),
        foto: fotoActual || ''
      });
      if(!p.nombre || !(p.costo>=0) || !(p.precio>=0)){ alert('Faltan datos'); return; }
      try{ Store.upsertProducto(p); }catch(err){ alert(err && err.name==='QuotaExceededError' ? 'Sin espacio para más fotos en este dispositivo.' : err.message); return; }
      render(); Caja.refresh();
    };
  }
  return {init, render};
})();

// Ventas render vive en Reportes pero se expone para compatibilidad
const Ventas = (() => {
  function render(){ if(typeof Reportes!=='undefined') Reportes.renderVentas(); }
  return {render};
})();
