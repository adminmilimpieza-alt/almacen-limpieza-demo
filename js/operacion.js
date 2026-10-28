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
    if($('csv-rubro')) $('csv-rubro').innerHTML = '<option value="">Sin rubro (primera coincidencia)</option>'+r.map(x=>`<option>${x}</option>`).join('');
    const db = Store.get();
    $('precio-prov').innerHTML = '<option value="">Todos los proveedores</option>'+
      db.proveedores.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
  }
  function verLista(){
    if(typeof ListasPrecios!=='undefined') ListasPrecios.render();
    const db = Store.get();
    const listaId=$('precio-lista')?.value||'mostrador';
    const lista=Store.listarListasPrecios().find(l=>l.id===listaId);
    const f = $('precio-rubro').value;
    const normal=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const query=normal($('precio-buscar')?.value).trim();
    const pv = $('precio-prov') ? $('precio-prov').value : '';
    const verOcultos = $('precio-ver-ocultos') && $('precio-ver-ocultos').checked;
    const list = db.productos.filter(p =>
      (verOcultos || p.activo!==false) &&
      (!query || normal([p.codigo,p.nombre,p.presentacion].join(' ')).includes(query)) &&
      (!f || p.categoria===f) &&
      (!pv || p.provId===pv));
    const ocultos = db.productos.filter(p=>p.activo===false).length;
    const conAlerta = list.filter(p=>p.alerta).length;

    const pendientes = new Set(Store.driftPrecio().map(d=>d.p.id))
    $('lista-precios').innerHTML =
      `<p class="hint">${list.length} productos`+
      (pendientes.size?` · <b>${pendientes.size} con cambios pendientes de compartir</b>`:'')+
      (ocultos?` · <b>${ocultos} ocultos</b> (no se ofrecen en caja)`:'')+
      (conAlerta?` · <b>${conAlerta}</b> con precio corregido sobre el Excel`:'')+`</p>`+
      (!list.length?'<p class="hint">No encontramos productos. Probá con otro nombre o código y revisá los filtros en Opciones avanzadas.</p>':'')+
      '<div class="precios-tabla"><table><thead><tr><th>Producto</th><th>Costo ($)</th><th>Margen (%)</th><th>Venta ($)</th><th class="precios-extra">Visibilidad</th></tr></thead><tbody>'+
      list.map(p=>{
        const off = p.activo===false;
        const venta=Store.precioEnLista(p.id,listaId);
        const margen=Number(p.costo)>0 ? Math.round((venta/Number(p.costo)-1)*10000)/100 : '';
        const override=listaId!=='mostrador' && Object.prototype.hasOwnProperty.call(lista?.precios||{},p.id);
        const pend = pendientes.has(p.id);
        return `<tr class="${off?'oculto':''}">`+
          `<td>${p.nombre}${p.alerta?' <span class="tag warn" title="'+String(p.alerta).replace(/"/g,'')+'">revisar</span>':''}${pend?' <span class="tag info" title="Costo/margen editado en este equipo, todavía no compartido">pendiente</span>':''}<small class="precios-producto-dato">${p.codigo||'Sin código'} · ${p.presentacion||p.categoria||''}</small></td>`+

          `<td><input class="tab-inp" type="number" min="0" step="0.01" data-id="${p.id}" data-f="costo" ${listaId!=='mostrador'?'disabled':''} value="${p.costo??p.precio}" title="Costo de compra"></td>`+
          `<td><input class="tab-inp" type="number" min="-100" step="0.01" data-id="${p.id}" data-f="margen" value="${margen}" title="Margen sobre el costo; cambiarlo recalcula la venta"></td>`+
          `<td><input class="tab-inp" type="number" min="0" step="0.01" data-id="${p.id}" data-f="precio" value="${venta}" title="Precio final de venta">${listaId!=='mostrador'?(override?'<button data-restablecer="'+p.id+'">Usar Mostrador</button>':'<small>Hereda Mostrador</small>'): ''}</td>`+
          `<td class="precios-extra"><button data-id="${p.id}" data-off="${off?'1':'0'}">${off?'Mostrar':'Ocultar'}</button></td></tr>`;
      }).join('')+'</tbody></table></div>';
    $('lista-precios').querySelectorAll('button[data-restablecer]').forEach(b=>{ b.onclick=async()=>{try{await Store.restablecerPrecioLista(listaId,b.dataset.restablecer);verLista();Caja.refresh();}catch(err){alert(err.message);}}; });
    $('lista-precios').querySelectorAll('button[data-id]').forEach(b=>{
      b.onclick=async ()=>{ try{ await Store.toggleActivo(b.dataset.id, b.dataset.off!=='1'); verLista(); Stock.render(); Caja.refresh(); }catch(err){ alert(err.message); } };
    });
    // Edicion inline: costo y margen se ponen a mano; la venta se calcula sola.
    $('lista-precios').querySelectorAll('input[data-f]').forEach(inp=>{
      inp.addEventListener('change', async ()=>{
        const n = Number(String(inp.value).replace(',','.'));
        if(!Number.isFinite(n)||n<(inp.dataset.f==='margen'?-100:0)){ verLista(); return; }
        try{ await Store.editarPrecioLista(listaId,inp.dataset.id,inp.dataset.f,n);
          verLista(); Stock.render(); Caja.refresh();
        }catch(err){ alert(err.message); verLista(); }
      });
    });
    estadoUI();
    if(typeof PreciosOnline!=='undefined') PreciosOnline.estado();
  }
  // Estado del catalogo compartido: de donde salio la lista que se ve ahora.
  function estadoUI(){
    const box = $('precio-estado'); if(!box) return;
    if(typeof OnlineBusiness!=='undefined' && OnlineBusiness.activo){
      box.textContent='Catálogo del negocio online. Los precios y el stock se guardan y comparten al confirmar cada cambio.';
      return;
    }
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
    if(dP.length) txt += ' · <b>'+dP.length+'</b> con cambios pendientes de compartir';
    const url = $('precio-url');
    if(url && document.activeElement!==url) url.value = e.url||'';
    box.innerHTML = txt;
  }
  function init(){
    if(typeof ListasPrecios!=='undefined') ListasPrecios.init();
    renderRubro(); verLista(); estadoUI();
    $('precio-lista')?.addEventListener('change',verLista);
    $('precio-buscar').addEventListener('input',verLista);
    $('precios-avanzadas').addEventListener('toggle',()=>{ $('mod-precios').classList.toggle('precios-mostrar-extra',$('precios-avanzadas').open); });
    if($('csv-ver')) $('csv-ver').onclick=()=>{
      const f = $('csv').files[0]; if(!f){alert('Elegí un CSV');return;}
      const r = new FileReader();
      r.onload=()=>{ pendiente=parseCSV(r.result);
        $('csv-prev').innerHTML = `<p class="hint">${pendiente.length} filas. Primeras:</p><pre>${pendiente.slice(0,5).map(x=>JSON.stringify(x)).join('\n')}</pre>`; };
      r.readAsText(f);
    };
    if($('csv-aplicar')) $('csv-aplicar').onclick=async ()=>{
      try{
      if(!pendiente.length){alert('Primero previsualizá');return;}
      const r = await Store.actualizarPrecios(pendiente, $('csv-rubro').value||null);
      alert(`Costos actualizados: ${r.tocados}. No encontrados: ${r.faltan.length?r.faltan.slice(0,15).join(', ')+(r.faltan.length>15?'…':''):'ninguno'}`);
      pendiente=[]; $('csv-prev').innerHTML=''; verLista(); Stock.render(); Caja.refresh();
      }catch(err){ alert(err.message); }
    };
    const rubrosM = ()=>{ const r=rubros();
      $('margen-rubro').innerHTML='<option value="">Margen a todo</option>'+r.map(x=>`<option>${x}</option>`).join(''); };
    rubrosM();
    $('margen-aplicar').onclick=async ()=>{
      try{
      const selectedLista=$('precio-lista')?.value||'mostrador';
      const propio = $('margen-tipo').value==='propio';
      const m = propio ? 'propio' : Number($('margen').value);
      if(!propio && !(m>=0)){ alert('Margen inválido'); return; }
      if(selectedLista!=='mostrador'&&propio){alert('Para cambiar varios precios de esta lista, elegí Margen uniforme.');return;}
      if(!confirm('¿Recalcular los precios de la lista seleccionada con este margen?'))return;
      const n=selectedLista==='mostrador'?await Store.aplicarMargen(m,$('margen-rubro').value||null):await Store.aplicarMargenLista(selectedLista,m,$('margen-rubro').value||null);
      alert(propio ? `Venta recalculada con el margen propio de cada producto (${n} productos)` : `Venta recalculada en ${n} productos (+${m}%)`);
      verLista(); Stock.render(); Caja.refresh();
      }catch(err){ alert(err.message); }
    };
    $('margen-tipo').addEventListener('change', ()=>{
      $('margen').disabled = $('margen-tipo').value==='propio';
      $('margen').placeholder = $('margen-tipo').value==='propio' ? 'no aplica' : '% uniforme';
    });
    $('margen').disabled = $('margen-tipo').value==='propio';
    $('precio-actualizar').onclick=async ()=>{
      $('precio-estado').textContent='Actualizando…';
      try{ const r = await Store.cargarRemoto();
      estadoUI(); verLista(); Stock.render(); Caja.refresh();
      alert(r.msg); }catch(err){ estadoUI(); alert(err.message); }
    };

    $('precio-url-guardar').onclick=async ()=>{
      try{ await Store.setUrlCatalogo($('precio-url').value);
      $('precio-url').value = Store.urlCatalogo();
      alert('URL guardada. Tocá "Actualizar del servidor" para probarla.'); }catch(err){ alert(err.message); }
    };
    $('precio-ver').onclick=()=>{ verLista(); estadoUI(); };
    $('precio-rubro').addEventListener('change', verLista);
    $('precio-prov').addEventListener('change', verLista);
    $('precio-ver-ocultos').addEventListener('change', verLista);
    $('precio-print').onclick=()=>ExportarInforme.imprimir(ListasPrecios.informe($('precio-lista')?.value||'mostrador'));
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
    const selectedProv=$('ped-prov').value,selectedProd=$('ped-prod').value;
    $('ped-prov').innerHTML = db.proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('') || '<option value="">(alta un proveedor)</option>';
    $('ped-prod').innerHTML = db.productos.map(p=>`<option value="${p.id}">${p.codigo||''} · ${p.nombre} (stock ${p.stock})</option>`).join('');
    if(db.proveedores.some(p=>p.id===selectedProv)) $('ped-prov').value=selectedProv;
    if(db.productos.some(p=>p.id===selectedProd)) $('ped-prod').value=selectedProd;
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
        b.onclick=async ()=>{
          try{
            await Store.recibirPedido(p.id, wrap.querySelector('input').value, wrap.querySelector('select').value);
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
      del.onclick=async ()=>{ if(confirm('Borrar pedido?')){ try{ await Store.delPedido(p.id); render(); }catch(err){ alert(err.message); } } };
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
    $('ped-agregar').onclick=async ()=>{
      if(!$('ped-prov').value || !lineas.length){ alert('Proveedor y al menos una línea'); return; }
      const button=$('ped-agregar'); if(button.disabled)return; button.disabled=true;
      const snapshot=JSON.stringify(lineas);
      try{ await Store.upsertPedido({id:crypto.randomUUID(), provId:$('ped-prov').value, items:lineas.map(l=>({...l})), estado:'pendiente', fecha:new Date().toISOString()});
      if(JSON.stringify(lineas)===snapshot) lineas=[]; render(); }catch(err){ alert(err.message); }
      finally{button.disabled=false;}
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
      if(typeof OnlineBusiness!=='undefined' && OnlineBusiness.activo){ alert('El negocio online no se puede reemplazar. Guardá el respaldo antiguo por separado.'); return; }
      const f = $('bk-file').files[0]; if(!f){alert('Elegí un JSON');return;}
      const r = new FileReader();
      r.onload=async ()=>{ try{ await Store.import(r.result); alert('Respaldo restaurado');
        Stock.render(); Caja.refresh(); Entidades.render(); Pedidos.render(); Reportes.render(); info();
        if(typeof Fotos!=='undefined')Fotos.refresh().catch(()=>{});
      }catch{ alert('Archivo inválido'); } };
      r.readAsText(f);
    };
  }
  return {init};
})();
