// stock.js — módulo Stock (punto 2) + historial ventas en Reportes
const Stock = (() => {
  const $ = id => document.getElementById(id);
  let editId = null, fotoActual = '', fotoBase=null, precioEditado=false, ultimoCampo='f-costo', gananciaExacta=null, costoUnidadExacto=null, litrosPrevios=0, envaseMostrado=0, adicionalesActuales=[];
  function normalizarFoto(file){
    if(typeof Fotos!=='undefined')return Fotos.normalizarFoto(file);
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
  function rubrosDelCatalogo(productos){
    return [...new Set(productos.map(p=>p.categoria||'General'))].sort((a,b)=>a.localeCompare(b,'es'));
  }
  function cargarRubrosEditor(productos){
    const lista=$('rubros-producto');
    lista.innerHTML='';
    const rubros=rubrosDelCatalogo(productos);
    if(!rubros.includes('Adicionales'))rubros.push('Adicionales');
    for(const nombre of rubros){
      const option=document.createElement('option');
      option.value=nombre;
      lista.appendChild(option);
    }
  }
  function filtros(){
    const db = Store.get();
    const q = ($('stk-q').value||'').toLowerCase(), r = $('stk-rubro').value;
    const pv = $('stk-prov-filtro') ? $('stk-prov-filtro').value : '';
    const verOcultos = $('stk-ver-ocultos') && $('stk-ver-ocultos').checked;
    const rubros = rubrosDelCatalogo(db.productos);
    $('stk-rubro').innerHTML = '<option value="">Todos los rubros</option>'+rubros.map(x=>`<option ${x===r?'selected':''}>${x}</option>`).join('');
    const assigned=$('stk-prov').value;
    $('stk-prov').innerHTML = '<option value="">Elegí proveedor…</option>'+
      db.proveedores.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
    if(db.proveedores.some(x=>x.id===assigned)) $('stk-prov').value=assigned;
    const pf = $('stk-prov-filtro');
    if(pf) pf.innerHTML = '<option value="">Todos los proveedores</option>'+
      db.proveedores.map(x=>`<option value="${x.id}" ${x.id===pv?'selected':''}>${x.nombre}</option>`).join('');
    return db.productos.filter(p =>
      (verOcultos || p.activo!==false) &&
      (!r || (p.categoria||'General')===r) &&
      (!pv || p.provId===pv) &&
      (!q || (p.nombre+' '+(p.codigo||'')+' '+(p.categoria||'')+' '+(p.presentacion||'')).toLowerCase().includes(q)));
  }
  function render(){
    const db = Store.get();
    if(typeof Promociones!=='undefined') Promociones.render();
    const tb = $('tabla-stock'); tb.innerHTML='';
    const list = filtros();
    cargarRubrosEditor(db.productos);
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
      tr.insertAdjacentHTML('beforeend', `<td>${p.codigo||'-'}</td><td>${p.nombre}${pendiente?' <span class="tag info" title="Costo/venta editado en este equipo, todavia no publicado">pendiente</span>':''}</td><td>${p.presentacion||'-'}</td><td>${p.categoria||'-'}</td><td>${prov}</td><td>$${p.costo??p.precio}</td><td>$${Store.precioEnLista(p.id)}${p.envaseId?'<small>'+(/5\s*l/i.test(p.presentacion||p.nombre)&&p.incluirEnvaseDefecto===false?'Sin bidón por defecto':'Envase incluido')+'</small>':''}</td><td>${p.margen==null?'-':mostrado(p.margen)+'%'}</td><td>${p.stock}${local?' <span class="tag info" title="Stock modificado en este equipo, todavia no publicado">local</span>':''}</td><td>${oculto?'<span class="tag warn">oculto</span>':'<span class="tag ok">visible</span>'}</td>`);
      const td = document.createElement('td'); td.style.whiteSpace='nowrap';
      const bE = document.createElement('button'); bE.textContent='Editar';
      bE.onclick=()=>{ editId=p.id;fotoBase={...p}; $('modal-titulo').textContent='Editar producto';
        $('f-codigo').value=p.codigo||''; $('f-nombre').value=p.nombre; $('f-cat').value=p.categoria||'';
        $('f-pres').value=p.presentacion||'';
        $('f-incluir-envase').checked=p.incluirEnvaseDefecto!==false;
        adicionalesActuales=(p.adicionales||[]).map(c=>({...c}));renderAdicionales();
        iniciarPrecio(p);
        $('f-stock').value=p.stock;
        $('f-activo').checked = !oculto;
        fotoActual = p.foto||p.img||''; pintarFoto();
        fillProv($('f-prov'), p.provId); $('modal').showModal(); };
      const bV = document.createElement('button'); bV.textContent=oculto?'Mostrar':'Ocultar';
      bV.onclick=async ()=>{ try{ await Store.toggleActivo(p.id, oculto); render(); Caja.refresh(); }catch(err){ alert(err.message); } };
      const bD = document.createElement('button'); bD.textContent='Borrar';
      bD.onclick=async ()=>{ if(confirm('Borrar '+p.nombre+'?')){ try{ await Store.eliminar(p.id); render(); Caja.refresh(); }catch(err){ alert(err.message); } } };
      td.appendChild(bE); td.appendChild(bV); td.appendChild(bD); tr.appendChild(td); tb.appendChild(tr);
    });
  }
  function envaseEditor(){
    const db=Store.get(),p=db.productos.find(p=>p.id===editId);
    const categoria=$('f-cat').value,presentacion=$('f-pres').value,nombre=$('f-nombre').value;
    const pres=String(presentacion||nombre).toUpperCase();
    let id;
    if(p&&categoria===(p.categoria||'')&&presentacion===(p.presentacion||''))id=p.envaseId;
    else if(['Líquidos 1L','Líquidos 5L','Pileta'].includes(categoria)){
      const tipo=/(?:^|\s)1\s*(?:L|LT|LTS)\b/.test(pres)?'botellaId':/(?:^|\s)5\s*(?:L|LT|LTS)\b/.test(pres)?'bidonId':null;
      id=tipo&&db.catalogo?.envases?.[tipo];
    }
    if(/(?:^|\s)5\s*(?:L|LT|LTS)\b/.test(pres)&&!$('f-incluir-envase').checked)id=null;
    const envase=db.productos.find(e=>e.id===id);
    const precioEnvase=envase?Number(envase.precio):p?.envaseId===id&&id?Store.precioEnvase(p.id):0;
    return precioEnvase+adicionalesActuales.reduce((sum,c)=>sum+(Number(db.productos.find(x=>x.id===c.id)?.precio)||0)*c.cant,0);
  }
  function renderAdicionales(){
    const db=Store.get(),select=$('f-adicional'),box=$('f-adicionales');
    select.innerHTML='<option value="">Elegí un adicional…</option>';
    const envases=Object.values(db.catalogo?.envases||{});
    db.productos.filter(p=>p.id!==editId&&p.activo!==false&&(String(p.categoria||'').trim().toLowerCase()==='adicionales'||envases.includes(p.id))&&!p.envaseId&&!(p.adicionales||[]).length&&!adicionalesActuales.some(c=>c.id===p.id)).forEach(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.nombre+' · $'+p.precio;select.appendChild(option);});
    box.innerHTML='';adicionalesActuales.forEach((c,i)=>{const p=db.productos.find(x=>x.id===c.id);const row=document.createElement('div'),label=document.createElement('span'),remove=document.createElement('button');label.textContent=(p?.nombre||'Adicional no encontrado')+' · '+c.cant+' unidad(es) · $'+(Number(p?.precio)||0)*c.cant+' ';remove.type='button';remove.textContent='Quitar';remove.onclick=()=>{adicionalesActuales.splice(i,1);renderAdicionales();cambiarEnvase();};row.appendChild(label);row.appendChild(remove);box.appendChild(row);});
  }
  const camposPrecio=['f-costo','f-margen','f-iva','f-financiero','f-precio','f-precio-redondeado'];
  const esPrecio=id=>id==='f-precio'||id==='f-precio-redondeado';
  const monto=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'});
  const numero=id=>String($(id).value).trim()===''?NaN:Number($(id).value);
  const mostrado=valor=>Number(valor.toFixed(2));
  function litrosPresentacion(){
    const match=$('f-pres').value.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:l|lt|lts|litro|litros)\.?$/i);
    return match?Number(match[1].replace(',','.')):0;
  }
  function actualizarOpcionesPrecio(){
    const litros=litrosPresentacion();
    $('f-costo-litro-opcion').hidden=!(litros>0);
    if(!litros)$('f-costo-litro').checked=false;
    const pres=$('f-pres').value||$('f-nombre').value;
    $('f-incluir-envase').parentElement.hidden=!(['Líquidos 1L','Líquidos 5L','Pileta'].includes($('f-cat').value)&&/5\s*l/i.test(pres));
  }
  function calcularEditor(campo, objetivo=numero(campo)){
    return Store.previsualizarPrecioProducto({
      costo:costoUnidadExacto*($('f-costo-litro').checked?litrosPresentacion():1),
      iva:$('f-iva').value===''?0:numero('f-iva'),
      margen:gananciaExacta??0,
      costoFinanciero:$('f-financiero').checked?10:0,
      envasePrecio:envaseEditor(),
      precioFinal:objetivo,
      modo:esPrecio(campo)?'precioFinal':'costo'
    });
  }
  function renderDesglose(r,error=''){
    const detalle=$('f-precio-detalle');
    detalle.className=error||r?.margen<0?'hint precio-aviso':'hint';
    detalle.textContent=error||[
      $('f-iva').value===''?'IVA sin definir. Se usa 0% en el cálculo hasta elegir una tasa.':'',
      r?.margen===null?'Con costo cero no se puede calcular el porcentaje de ganancia.':'',
      r?.margen<0?'Ganancia negativa: el precio no cubre el costo.':''
    ].filter(Boolean).join(' ');
    const desglose=$('f-precio-desglose');
    desglose.innerHTML='';
    if(!r)return;
    const lineas=[
      ['Costo de compra',r.costo],['Importe de ganancia',r.gananciaImporte],
      ['Costo más ganancia',r.costoConGanancia],['IVA aplicado',r.ivaImporte],
      ['Subtotal con IVA',r.subtotalIVA],['Costo financiero aplicado',r.financieroImporte],
      ...(r.envasePrecio?[['Envases y adicionales',r.envasePrecio]]:[]),
      ['Precio calculado',r.precioFinal],['Precio redondeado',numero('f-precio-redondeado')]
    ];
    for(const [nombre,valor] of lineas){
      const titulo=document.createElement('dt'), importe=document.createElement('dd');
      titulo.textContent=nombre; importe.textContent=monto.format(valor);
      desglose.appendChild(titulo);desglose.appendChild(importe);
    }
  }
  function mostrarGanancia(ganancia){
    gananciaExacta=ganancia;
    $('f-margen').value=ganancia===null?'':Number(ganancia.toFixed(6));
  }
  function iniciarPrecio(p){
    precioEditado=false;ultimoCampo='f-costo';
    $('f-costo-litro').checked=false;
    $('f-costo').value=p?(p.costo??p.precio):'';
    costoUnidadExacto=numero('f-costo');
    $('f-iva').value=p?(p.iva==null?'':String(p.iva)):'0';
    $('f-financiero').checked=p?.costoFinanciero!==0;
    mostrarGanancia(p?.margen??0);
    actualizarOpcionesPrecio();
    litrosPrevios=litrosPresentacion();
    envaseMostrado=envaseEditor();
    const precio=p?mostrado(Number(p.precio)+envaseMostrado):'';
    $('f-precio').value=precio;
    $('f-precio-redondeado').value=precio;
    if(!p){renderDesglose();return;}
    try{
      const r=calcularEditor('f-precio');
      mostrarGanancia(r.margen);
      renderDesglose(r);
    }catch(error){renderDesglose(null,error.message);}
  }
  function recalcularPrecio(campo){
    precioEditado=true;
    ultimoCampo=campo;
    if(campo==='f-costo')costoUnidadExacto=numero('f-costo');
    if(campo==='f-margen')gananciaExacta=numero('f-margen');
    try{
      const r=calcularEditor(campo);
      if(esPrecio(campo))mostrarGanancia(r.margen);
      for(const id of ['f-precio','f-precio-redondeado']){
        if(id!==campo)$(id).value=mostrado(r.precioFinal);
      }
      renderDesglose(r);
    }catch(error){
      for(const id of ['f-precio','f-precio-redondeado'])if(id!==campo)$(id).value='';
      renderDesglose(null,error.message);
    }
  }
  function cambiarEnvase(){
    actualizarOpcionesPrecio();
    const nuevoEnvase=envaseEditor();
    const cambio=nuevoEnvase-envaseMostrado;
    envaseMostrado=nuevoEnvase;
    if(precioEditado&&!esPrecio(ultimoCampo)){recalcularPrecio(ultimoCampo);return;}
    for(const id of ['f-precio','f-precio-redondeado']){
      if(Number.isFinite(numero(id)))$(id).value=mostrado(numero(id)+cambio);
    }
    try{renderDesglose(calcularEditor('f-precio'));}
    catch(error){renderDesglose(null,precioEditado?error.message:'');}
  }
  function fillProv(sel, cur){
    const db = Store.get();
    sel.innerHTML = '<option value="">— Sin proveedor —</option>' +
      db.proveedores.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
    sel.value = cur||'';
  }
  function init(){
    render();
    if(typeof Promociones!=='undefined') Promociones.init();
    $('form-prod').onsubmit=event=>{event.preventDefault();$('guardar-prod').click();};
    $('cancelar-prod').onclick=()=>$('modal').close();
    $('nuevo').onclick=()=>{ editId=null;fotoBase=null; $('modal-titulo').textContent='Nuevo producto';
      $('f-codigo').value=''; $('f-nombre').value=''; $('f-cat').value=''; $('f-pres').value='';
      $('f-stock').value='10';
      $('f-incluir-envase').checked=true; adicionalesActuales=[];renderAdicionales();
      fillProv($('f-prov'),''); iniciarPrecio();
      $('f-activo').checked = true;
      fotoActual=''; pintarFoto();
 $('modal').showModal(); };
    for(const campo of camposPrecio){
      $(campo).addEventListener(['f-iva','f-financiero'].includes(campo)?'change':'input',()=>recalcularPrecio(campo));
    }
    $('f-costo-litro').addEventListener('change',()=>{
      const litros=litrosPresentacion();
      if(!litros)return;
      costoUnidadExacto=$('f-costo-litro').checked?costoUnidadExacto/litros:costoUnidadExacto*litros;
      $('f-costo').value=Number.isFinite(costoUnidadExacto)?Number(costoUnidadExacto.toFixed(8)):'';
    });
    $('f-pres').addEventListener('input',()=>{
      const litros=litrosPresentacion();
      const porLitro=$('f-costo-litro').checked;
      if(porLitro&&!litros){
        costoUnidadExacto*=litrosPrevios;
        $('f-costo-litro').checked=false;
        $('f-costo').value=Number.isFinite(costoUnidadExacto)?Number(costoUnidadExacto.toFixed(8)):'';
      }
      litrosPrevios=litros;
      cambiarEnvase();
      if(porLitro&&litros)recalcularPrecio('f-pres');
    });
    $('f-cat').addEventListener('input',cambiarEnvase);
    $('f-nombre').addEventListener('input',cambiarEnvase);
    $('f-incluir-envase').addEventListener('change',cambiarEnvase);
    $('f-adicional-agregar').onclick=()=>{const id=$('f-adicional').value;if(!id)return;const p=Store.get().productos.find(x=>x.id===id),actual=Store.get().productos.find(x=>x.id===editId),pres=String($('f-pres').value||$('f-nombre').value).toUpperCase(),tipo=/(?:^|\s)1\s*(?:L|LT|LTS)\b/.test(pres)?'botellaId':/(?:^|\s)5\s*(?:L|LT|LTS)\b/.test(pres)?'bidonId':null,auto=actual?.envaseId||(['Líquidos 1L','Líquidos 5L','Pileta'].includes($('f-cat').value)&&tipo?Store.get().catalogo?.envases?.[tipo]:null);if(id===auto){alert('Este envase ya está vinculado automáticamente al producto.');return;}if(!p)return;adicionalesActuales.push({id,cant:1});renderAdicionales();cambiarEnvase();};
    $('reset').onclick=async ()=>{ if(typeof OnlineBusiness!=='undefined' && OnlineBusiness.activo){ alert('El negocio online no se puede reemplazar. Guardá el respaldo antiguo por separado.'); return; } if(confirm('Volver al catálogo importado? Se pierden los cambios de precios, stock y ventas.')){ try{ await Store.reset(); render(); Caja.refresh(); Reportes.render(); Entidades.render(); }catch(err){ alert(err.message); } } };
    $('stk-q').addEventListener('input', render);
    $('stk-rubro').addEventListener('change', render);
    $('stk-prov-filtro').addEventListener('change', render);
    $('stk-ver-ocultos').addEventListener('change', render);
    $('stk-assign').onclick=async ()=>{
      const pid = $('stk-prov').value;
      if(!pid){ alert('Elegí un proveedor'); return; }
      const list = filtros();
      if(!list.length){ alert('Nada filtrado'); return; }
      const nom = (Store.get().proveedores.find(x=>x.id===pid)||{}).nombre||'';
      if(!confirm(`Asignar ${nom} a ${list.length} productos?`)) return;
      try{ await Store.asignarProveedor(list.map(p=>p.id),pid);
        render(); Caja.refresh(); Reportes.render();
      }catch(err){ alert(err.message); }
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
    $('guardar-prod').onclick=async event=>{
      event.preventDefault();
      const button=$('guardar-prod');if(button.disabled)return;
      const db = Store.get();
      const cur = editId && db.productos.find(x=>x.id===editId);
      let calculo=null;
      if(precioEditado||!cur){
        try{calculo=calcularEditor(ultimoCampo);}
        catch(error){renderDesglose(null,error.message);alert(error.message);return;}
      }
      let p = Object.assign({}, cur||{}, {
        id: editId || crypto.randomUUID(), codigo:$('f-codigo').value.trim(),
        nombre:$('f-nombre').value.trim(), categoria:$('f-cat').value.trim(),
        presentacion:$('f-pres').value.trim(),
        costo: calculo?calculo.costo:cur.costo,
        precio: calculo?mostrado(calculo.precioBase):cur.precio,
        margen: calculo?calculo.margen:cur.margen,
        ...(calculo?{costoFinanciero:calculo.costoFinanciero,...($('f-iva').value===''?{}:{iva:calculo.iva})}:{}),
        incluirEnvaseDefecto:$('f-incluir-envase').checked,
        adicionales:adicionalesActuales.map(c=>({...c})),
        stock:Number($('f-stock').value),
        activo: $('f-activo').checked,
        provId: $('f-prov').value || '',
        foto: fotoActual || ''
      });
      const sinPrecio = editId ? !(p.precio>=0) : !(numero('f-precio-redondeado')>0);
      if(!p.nombre || !(p.costo>=0) || sinPrecio){ alert('Completá nombre, costo y un precio de venta válido'); return; }
      button.disabled=true;button.textContent='Guardando…';
      try{
        if(typeof Fotos==='undefined'){
          if(p.foto!==cur?.foto)throw new Error('Esperá a que cargue la conexión de fotos online.');
        }else{
          try{const draft=await Fotos.prepararEdicion(p,fotoBase,cur);p=draft.product;p=await Fotos.guardar(p,draft.base);}
          catch(error){throw new Error('La foto no se pudo guardar online. Reintentá sin cerrar este formulario. '+error.message);}
        }
        await Store.guardarProductoEdicion(p,fotoBase);render();Caja.refresh();$('modal').close();
        if(typeof Fotos!=='undefined'){
          Fotos.refresh().catch(()=>{});
        }
      }catch(error){alert(error?.name==='QuotaExceededError'?'No hay espacio local. Conservá un respaldo antes de limpiar datos.':error.message);}
      finally{button.disabled=false;button.textContent='Guardar';}
    };
  }
  return {init, render};
})();

// Ventas render vive en Reportes pero se expone para compatibilidad
const Ventas = (() => {
  function render(){ if(typeof Reportes!=='undefined') Reportes.renderVentas(); }
  return {render};
})();
