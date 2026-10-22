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
    const pv = $('stk-prov-filtro') ? $('stk-prov-filtro').value : '';
    const verOcultos = $('stk-ver-ocultos') && $('stk-ver-ocultos').checked;
    const rubros = [...new Set(db.productos.map(p=>p.categoria||'General'))].sort();
    $('stk-rubro').innerHTML = '<option value="">Todos los rubros</option>'+rubros.map(x=>`<option ${x===r?'selected':''}>${x}</option>`).join('');
    $('stk-prov').innerHTML = '<option value="">Elegí proveedor…</option>'+
      db.proveedores.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
    const pf = $('stk-prov-filtro');
    if(pf) pf.innerHTML = '<option value="">Todos los proveedores</option>'+
      db.proveedores.map(x=>`<option ${x.id===pv?'selected':''}>${x.nombre}</option>`).join('');
    return db.productos.filter(p =>
      (verOcultos || p.activo!==false) &&
      (!r || (p.categoria||'General')===r) &&
      (!pv || p.provId===pv) &&
      (!q || (p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')+' '+(p.presentacion||'')).toLowerCase().includes(q)));
  }
  function render(){
    const db = Store.get();
    const tb = $('tabla-stock'); tb.innerHTML='';
    const list = filtros();
    const drift = new Set(Store.driftStock().map(d=>d.p.id));
    const pend = new Set(Store.driftPrecio().map(d=>d.p.id));
    $('stk-count').textContent = `${list.length} de ${db.productos.length} productos`+
      (drift.size?` · ${drift.size} con stock modificado localmente (sin publicar)`:'')+
      (pend.size?` · ${pend.size} con precio pendiente de publicar`:'');
    list.forEach(p=>{
      const tr = document.createElement('tr');
      if(p.stock<=5) tr.className='bajo';
      const prov = (Store.get().proveedores.find(x=>x.id===p.provId)||{}).nombre||'—';
      const tdF = document.createElement('td'); tdF.className='td-foto';
      if(p.foto){ const im = document.createElement('img'); im.src=p.foto; im.alt=''; tdF.appendChild(im); }
      tr.appendChild(tdF);
      const oculto = p.activo===false;
      if(oculto) tr.classList.add('oculto');
      const local = drift.has(p.id);
      const pendiente = pend.has(p.id);
      tr.insertAdjacentHTML('beforeend', `<td>${p.codigo||'-'}</td><td>${p.nombre}${pendiente?' <span class="tag info" title="Costo/venta editado en este equipo, todavia no publicado">pendiente</span>':''}</td><td>${p.presentacion||'-'}</td><td>${p.categoria||'-'}</td><td>${prov}</td><td>$${p.costo??p.precio}</td><td>$${p.precio}</td><td>${p.margen==null?'-':p.margen+'%'}</td><td>${p.stock}${local?' <span class="tag info" title="Stock modificado en este equipo, todavia no publicado">local</span>':''}</td><td>${oculto?'<span class="tag warn">oculto</span>':'<span class="tag ok">visible</span>'}</td>`);
      const td = document.createElement('td'); td.style.whiteSpace='nowrap';
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ editId=p.id; $('modal-titulo').textContent='Editar producto';
        $('f-codigo').value=p.codigo||''; $('f-nombre').value=p.nombre; $('f-cat').value=p.categoria||'';
        $('f-pres').value=p.presentacion||'';
        $('f-costo').value=(p.costo??p.precio); $('f-precio').value=p.precio;
        $('f-margen').value=(p.margen==null?'':p.margen); $('f-stock').value=p.stock;
        // El costo/precio/margen se administran en el panel Precios, no aca.
        $('f-costo').disabled=true; $('f-precio').disabled=true; $('f-margen').disabled=true;
        $('f-activo').checked = !oculto;
        fotoActual = p.foto||p.img||''; pintarFoto();
        fillProv($('f-prov'), p.provId); $('modal').showModal(); };
      const bV = document.createElement('button'); bV.textContent=oculto?'Mostrar':'Ocultar';
      bV.onclick=()=>{ Store.toggleActivo(p.id, oculto); render(); Caja.refresh(); };
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=()=>{ if(confirm('Borrar '+p.nombre+'?')){ Store.eliminar(p.id); render(); Caja.refresh(); } };
      td.appendChild(bE); td.appendChild(bV); td.appendChild(bD); tr.appendChild(td); tb.appendChild(tr);
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
      $('f-codigo').value=''; $('f-nombre').value=''; $('f-cat').value=''; $('f-pres').value='';
      $('f-costo').value=''; $('f-precio').value=''; $('f-margen').value=''; $('f-stock').value='10';
      $('f-costo').disabled=false; $('f-precio').disabled=false; $('f-margen').disabled=false;
      $('f-activo').checked = true;
      fotoActual=''; pintarFoto();
 $('modal').showModal(); };
    $('reset').onclick=()=>{ if(confirm('Volver al catálogo importado? Se pierden los cambios de precios, stock y ventas.')){ Store.reset(); render(); Caja.refresh(); Reportes.render(); Entidades.render(); } };
    $('stk-q').addEventListener('input', render);
    $('stk-rubro').addEventListener('change', render);
    $('stk-prov-filtro').addEventListener('change', render);
    $('stk-ver-ocultos').addEventListener('change', render);
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
      // Editando: costo/precio/margen se mantienen (se cambian en el panel Precios).
      const p = Object.assign({}, cur||{}, {
        id: editId || 'p'+Date.now(), codigo:$('f-codigo').value.trim(),
        nombre:$('f-nombre').value.trim(), categoria:$('f-cat').value.trim(),
        presentacion:$('f-pres').value.trim(),
        costo: cur?cur.costo:Number($('f-costo').value),
        precio: cur?cur.precio:Number($('f-precio').value),
        margen: cur?((cur.margen==null)?null:cur.margen):(($('f-margen').value===''?null:Number($('f-margen').value))),
        stock:Number($('f-stock').value),
        activo: $('f-activo').checked,
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
