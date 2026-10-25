// operacion.js — puntos 5 (precios CSV), 7 (respaldo) y 8 (pedidos)
const Precios = (() => {
  const $ = id => document.getElementById(id);
  let pendiente = [];
  const num = s => { const n = Number(String(s).replace(',','.')); return String(s).trim()!=='' && isFinite(n) ? n : null; };

  // Formato de CSV: codigo,nombre,presentacion,costo,margen
  // (tambien acepta el viejo codigo,nombre,costo,proveedor)
  function parseCSV(t){
    const provs = Store.get().proveedores;
    return t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
      const f = l.split(',').map(s=>(s||'').trim());
      let codigo=f[0]||'', nombre=f[1]||'', presentacion='', costo=null, margen=null, provId=null;
      const f3 = num(f[2]);
      if(f3!=null){                       // codigo,nombre,costo[,margen|proveedor]
        costo=f3;
        const f4=num(f[3]);
        if(f4!=null) margen=f4;
        else if(f[3]) { const pe=provs.find(x=>x.nombre.toLowerCase()===f[3].toLowerCase()); provId=pe?pe.id:null; }
      } else {                            // codigo,nombre,presentacion,costo[,margen]
        presentacion=f[2]||''; costo=num(f[3]); margen=num(f[4]);
      }
      return {codigo, nombre, presentacion, costo, margen, provId};
    }).filter(r => (r.codigo||r.nombre) && (r.costo!=null || r.margen!=null));
  }
  function rubros(){
    const db = Store.get();
    return [...new Set(db.productos.map(p=>p.categoria||'General'))].sort();
  }
  function renderRubro(){
    const r = rubros();
    $('precio-rubro').innerHTML = '<option value="">Todos los rubros</option>'+r.map(x=>`<option>${x}</option>`).join('');
    $('csv-rubro').innerHTML = '<option value="">Sin rubro (primera coincidencia)</option>'+r.map(x=>`<option>${x}</option>`).join('');
    const db = Store.get();
    $('precio-prov').innerHTML = '<option value="">Todos los proveedores</option>'+
      db.proveedores.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
  }
  function verLista(){
    const db = Store.get();
    const f = $('precio-rubro').value;
    const pv = $('precio-prov') ? $('precio-prov').value : '';
    const verOcultos = $('precio-ver-ocultos') && $('precio-ver-ocultos').checked;
    const nom = id => (db.proveedores.find(x=>x.id===id)||{}).nombre||'—';
    const list = db.productos.filter(p =>
      (verOcultos || p.activo!==false) &&
      (!f || p.categoria===f) &&
      (!pv || p.provId===pv));
    const ocultos = db.productos.filter(p=>p.activo===false).length;
    const conAlerta = list.filter(p=>p.alerta).length;
    const valor = Math.round(list.reduce((a,p)=>a+p.precio*p.stock,0));
    const pendientes = new Set(Store.driftPrecio().map(d=>d.p.id))
    $('lista-precios').innerHTML =
      `<p class="hint">${list.length} productos · valor total $${valor.toLocaleString('es-AR')}`+
      (pendientes.size?` · <b>${pendientes.size} con precio pendiente de publicar</b>`:'')+
      (ocultos?` · <b>${ocultos} ocultos</b> (no se ofrecen en caja)`:'')+
      (conAlerta?` · <b>${conAlerta}</b> con precio corregido sobre el Excel`:'')+`</p>`+
      '<table><thead><tr><th>Cód</th><th>Producto</th><th>Pres</th><th>Rubro</th><th>Proveedor</th><th>Costo</th><th>Venta</th><th>M%</th><th></th></tr></thead><tbody>'+
      list.map(p=>{
        const off = p.activo===false;
        const pend = pendientes.has(p.id);
        return `<tr class="${off?'oculto':''}"><td>${p.codigo||'-'}</td>`+
          `<td>${p.nombre}${p.alerta?' <span class="tag warn" title="'+String(p.alerta).replace(/"/g,'')+'">revisar</span>':''}${pend?' <span class="tag info" title="Costo/margen editado en este equipo, todavia no publicado">pendiente</span>':''}</td>`+
          `<td>${p.presentacion||'-'}</td><td>${p.categoria||'-'}</td><td>${nom(p.provId)}</td>`+
          `<td><input class="tab-inp" type="number" min="0" step="0.01" data-id="${p.id}" data-f="costo" value="${p.costo??p.precio}" title="Costo de compra"></td>`+
          `<td>$${p.precio}</td>`+
          `<td><input class="tab-inp" type="number" min="0" step="0.01" data-id="${p.id}" data-f="margen" value="${p.margen==null?'':p.margen}" title="Margen % (lo pones vos; la venta sale de costo x margen)"></td>`+
          `<td><button data-id="${p.id}" data-off="${off?'1':'0'}">${off?'Mostrar':'Ocultar'}</button></td></tr>`;
      }).join('')+'</tbody></table>';
    $('lista-precios').querySelectorAll('button[data-id]').forEach(b=>{
      b.onclick=()=>{ Store.toggleActivo(b.dataset.id, b.dataset.off!=='1'); verLista(); Stock.render(); Caja.refresh(); };
    });
    // Edicion inline: costo y margen se ponen a mano; la venta se calcula sola.
    $('lista-precios').querySelectorAll('input[data-f]').forEach(inp=>{
      inp.addEventListener('change', ()=>{
        const n = Number(String(inp.value).replace(',','.'));
        if(!(n>=0)){ verLista(); return; }
        const db2 = Store.get();
        const p = db2.productos.find(x=>x.id===inp.dataset.id);
        if(!p) return;
        p[inp.dataset.f] = n;
        // El precio de venta NO se edita: sale de costo x margen.
        if(p.costo>0 && p.margen!=null) p.precio = Math.round(p.costo*(1+p.margen/100)*100)/100;
        else if(!(p.precio>0)) p.precio = p.costo;
        Store.import(JSON.stringify(db2));
        verLista(); Stock.render(); Caja.refresh();
      });
    });
    estadoUI();
  }
  // Estado del catalogo compartido: de donde salio la lista que se ve ahora.
  function estadoUI(){
    const box = $('precio-estado'); if(!box) return;
    const e = Store.estadoCatalogo();
    const drift = Store.driftStock();
    const ts = e.aplicado ? new Date(e.aplicado).toLocaleString('es-AR') : '';
    let txt;
    if(e.fuente==='remoto'){
      txt = 'Catálogo: <b>publicado</b> · versión '+e.version+(ts?' · aplicado '+ts:'');
    } else {
      txt = 'Catálogo: <b>respaldo local</b> (no se pudo leer el publicado) — se está trabajando sin conexión.';
    }
    if(drift.length) txt += ' · <b>'+drift.length+'</b> con stock modificado localmente (falta publicar)';
    const dP = Store.driftPrecio ? Store.driftPrecio() : [];
    if(dP.length) txt += ' · <b>'+dP.length+'</b> con precio pendiente de publicar';
    const url = $('precio-url');
    if(url && document.activeElement!==url) url.value = e.url||'';
    box.innerHTML = txt;
  }
  // Descarga el catalogo de este equipo para publicarlo.
  function publicar(){
    const cat = Store.catalogoParaPublicar();
    const blob = new Blob([JSON.stringify(cat,null,1)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogo.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
    alert('Se descargó catalogo.json ('+cat.productos.length+' productos).\n\n'+
      'Para que lo vean los demás equipos, publicá el archivo en el repo:\n\n'+
      '  python tools/publicar-catalogo.py "catalogo.json"\n\n'+
      '(o copialo a data/catalogo.json y commitealo)');
  }
  function init(){
    renderRubro(); verLista(); estadoUI();
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
      alert(`Costos actualizados: ${r.tocados}. No encontrados: ${r.faltan.length?r.faltan.slice(0,15).join(', ')+(r.faltan.length>15?'…':''):'ninguno'}`);
      pendiente=[]; $('csv-prev').innerHTML=''; verLista(); Stock.render(); Caja.refresh();
    };
    const rubrosM = ()=>{ const r=rubros();
      $('margen-rubro').innerHTML='<option value="">Margen a todo</option>'+r.map(x=>`<option>${x}</option>`).join(''); };
    rubrosM();
    $('margen-aplicar').onclick=()=>{
      const propio = $('margen-tipo').value==='propio';
      const m = propio ? 'propio' : Number($('margen').value);
      if(!propio && !(m>=0)){ alert('Margen inválido'); return; }
      const n = Store.aplicarMargen(m, $('margen-rubro').value||null);
      alert(propio ? `Venta recalculada con el margen propio de cada producto (${n} productos)` : `Venta recalculada en ${n} productos (+${m}%)`);
      verLista(); Stock.render(); Caja.refresh();
    };
    $('margen-tipo').addEventListener('change', ()=>{
      $('margen').disabled = $('margen-tipo').value==='propio';
      $('margen').placeholder = $('margen-tipo').value==='propio' ? 'no aplica' : '% uniforme';
    });
    $('margen').disabled = $('margen-tipo').value==='propio';
    $('precio-actualizar').onclick=async ()=>{
      $('precio-estado').textContent='Actualizando…';
      const r = await Store.cargarRemoto();
      estadoUI(); verLista(); Stock.render(); Caja.refresh();
      alert(r.ok ? r.msg : r.msg);
    };
    $('precio-publicar').onclick=publicar;
    $('precio-url-guardar').onclick=()=>{
      Store.setUrlCatalogo($('precio-url').value);
      $('precio-url').value = Store.urlCatalogo();
      alert('URL guardada. Tocá "Actualizar del servidor" para probarla.');
    };
    $('precio-ver').onclick=()=>{ verLista(); estadoUI(); };
    $('precio-rubro').addEventListener('change', verLista);
    $('precio-prov').addEventListener('change', verLista);
    $('precio-ver-ocultos').addEventListener('change', verLista);
    $('precio-print').onclick=()=>window.print();
  }
  return {init, render:verLista};
})();

const Pedidos = (() => {
  const $ = id => document.getElementById(id);
  let lineas = []; // [{id,cant}] para el pedido en armado
  const nom = id => (Store.get().productos.find(p=>p.id===id)||{}).nombre||'?';
  function telArg(t){
    if(!t) return '';
    let s = String(t).replace(/\D/g,'');
    if(s.startsWith('54')) return s;
    s = s.replace(/^0+/,'');
    if(s.length===10) return '549'+s;
    if(s.length===11 && s.startsWith('9')) return '54'+s;
    return s;
  }
  function textoPedido(p, prov){
    const l = (p.items&&p.items.length)
      ? p.items.map(i=>`- ${nom(i.id)} x${i.cant}`)
      : (p.detalle ? ['- '+p.detalle] : []);
    return `Hola${prov&&prov.nombre?' '+prov.nombre:''}, te paso el pedido:\n\n${l.join('\n')||'- (sin detalle)'}\n\nGracias.`;
  }
  function enviarWA(p, prov){
    const tel = telArg(prov&&prov.tel);
    if(!tel){ alert('El proveedor no tiene teléfono (WhatsApp) cargado.'); return; }
    window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(textoPedido(p,prov)), '_blank', 'noopener');
  }
  function render(){
    const db = Store.get();
    $('ped-prov').innerHTML = db.proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('') || '<option value="">(alta un proveedor)</option>';
    $('ped-prod').innerHTML = db.productos.map(p=>`<option value="${p.id}">${p.codigo||''} · ${p.nombre} (stock ${p.stock})</option>`).join('');
    $('ped-lineas').innerHTML = lineas.length
      ? lineas.map((l,i)=>`<div>${nom(l.id)} x${l.cant} <button data-i="${i}">quitar</button></div>`).join('')
      : '<p class="hint">Agregá líneas al pedido.</p>';
    $('ped-lineas').querySelectorAll('button').forEach(b=>{ b.onclick=()=>{ lineas.splice(Number(b.dataset.i),1); render(); }; });
    const box = $('pedidos'); box.innerHTML='';
    if(!db.pedidos.length){ box.innerHTML='<p class="hint">Sin pedidos.</p>'; return; }
    db.pedidos.forEach(p=>{
      const prov = db.proveedores.find(x=>x.id===p.provId);
      const d = document.createElement('div'); d.className='venta';
      const det = (p.items&&p.items.length) ? p.items.map(i=>`${nom(i.id)} x${i.cant}`).join(', ') : (p.detalle||'');
      d.innerHTML = `<b>${prov?prov.nombre:'Proveedor'}</b> · ${p.estado}` +
        (p.montoPagado?` · pagado $${p.montoPagado} (${p.medioPago})`:'') +
        ` · <span class="hint">${new Date(p.fecha).toLocaleString('es-AR')}</span><br>${det} `;
      if(p.estado==='pendiente'){
        const wrap = document.createElement('span');
        wrap.innerHTML = ` <input type="number" min="0" placeholder="$ pagado" style="max-width:110px"> ` +
          `<select><option value="efectivo">Efectivo</option><option value="mercadopago">Mercado Pago</option><option value="banco">Banco</option></select> `;
        const b = document.createElement('button'); b.textContent='Marcar recibido'; b.className='primary';
        b.onclick=()=>{
          try{
            Store.recibirPedido(p.id, wrap.querySelector('input').value, wrap.querySelector('select').value);
            render(); Stock.render(); Caja.refresh(); Reportes.render();
          }catch(e){ alert(e.message); }
        };
        d.appendChild(wrap); d.appendChild(b);
      }
      const wa = document.createElement('button'); wa.textContent='Enviar por WhatsApp';
      wa.onclick=()=>enviarWA(p, prov);
      if(!prov || !telArg(prov.tel)) wa.disabled = true;
      d.appendChild(wa);
      const del = document.createElement('button'); del.textContent='Borrar';
      del.onclick=()=>{ if(confirm('Borrar pedido?')){ Store.delPedido(p.id); render(); } };
      d.appendChild(del); box.appendChild(d);
    });
  }
  function init(){
    render();
    $('ped-addlin').onclick=()=>{
      const id = $('ped-prod').value, cant = Number($('ped-cant').value)||0;
      if(!id || !(cant>0)){ alert('Producto y cantidad'); return; }
      const ex = lineas.find(l=>l.id===id);
      if(ex) ex.cant += cant; else lineas.push({id, cant});
      render();
    };
    $('ped-agregar').onclick=()=>{
      if(!$('ped-prov').value || !lineas.length){ alert('Proveedor y al menos una línea'); return; }
      Store.upsertPedido({id:'ped'+Date.now(), provId:$('ped-prov').value, items:lineas, estado:'pendiente', fecha:new Date().toISOString()});
      lineas=[]; render();
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
        if(typeof Fotos!=='undefined')Fotos.refresh().catch(()=>{});
      }catch{ alert('Archivo inválido'); } };
      r.readAsText(f);
    };
  }
  return {init};
})();
