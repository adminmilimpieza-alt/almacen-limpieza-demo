// store.js - capa de datos modular (localStorage). Base para crecer a backend real.
// Catalogo REAL de Mi Limpieza importado una vez desde la lista de precios del
// proveedor (tools/importar-precios.py -> js/catalogo.js). Desde aca el catalogo
// se administra desde el panel: editar valores, ocultar/mostrar, agregar, borrar.
//   costo  = costo de compra (columna E del Excel)
//   precio = precio de venta (columna C del Excel, ya incluye el margen)
//   margen = % de ganancia del proveedor sobre ese producto (columna F)
const ICONOS = {
  'Líquidos 5L': '#E1F3FE', 'Líquidos 1L': '#E1F3FE', 'Accesorios': '#F7F6F3',
  'Piso': '#EDF3EC', 'Cocina': '#E1F3FE', 'Baño': '#FBF3DB', 'Vidrios': '#E1F3FE',
  'Pileta': '#E1F3FE', 'Ropa': '#FDEBEC', 'General': '#F7F6F3'
};
const Store = (() => {
  // Version 11: el catalogo viene importado (js/catalogo.js). No se edita a mano.
  // Cada producto: {codigo, nombre, detalle, categoria, presentacion, provId,
  //                 costo, precio, margen, alerta, stock, activo, foto}
  const KEY = 'almacen_mi_limpieza_v11';
  const CATALOGO_SEED = (typeof CATALOGO !== 'undefined') ? CATALOGO : {productos:[], proveedores:[]};
  const redondear10 = v => Math.round(v/10)*10;
  const redondear2 = v => Math.round(v*100)/100;
  const seed = () => ({
    productos: CATALOGO_SEED.productos.map((r,i)=>({
      id:'p'+(i+1), codigo:r.codigo||'', nombre:r.nombre||'', detalle:r.detalle||'',
      categoria:r.categoria||'Accesorios', presentacion:r.presentacion||'', provId:r.provId||'',
      costo:Number(r.costo)||0, precio:Number(r.precio)||0,
      margen:(r.margen==null?null:Number(r.margen)), alerta:r.alerta||'',
      stock:(r.stock==null?10:r.stock), activo:(r.activo!==false), foto:''
    })),
    ventas:[], clientes:[{id:'c1', nombre:'Mostrador', tel:'', extra:'', deuda:0}],
    proveedores: CATALOGO_SEED.proveedores.map(p=>({id:p.id, nombre:p.nombre, tel:'', notas:p.notas||''})),
    movimientos:[], pedidos:[], turnos:[],
    // catalogo: estado del catalogo publicado (fuente unica de verdad compartida)
    catalogo:{version:'', origen:'', url:'', aplicado:'', stockBase:{}},
    // cfg: ajustes de la app
    cfg:{urlCatalogo:''}
  });
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw){ return migrar(); }
      const db = JSON.parse(raw);
      db.productos=db.productos||[]; db.ventas=db.ventas||[];
      db.clientes=db.clientes||seed().clientes; db.proveedores=db.proveedores||[];
      db.movimientos=db.movimientos||[]; db.pedidos=db.pedidos||[]; db.turnos=db.turnos||[];
      db.productos.forEach(p=>{ if(p.activo==null) p.activo=true; if(p.stock==null) p.stock=0; });
      db.catalogo = db.catalogo || {version:'', origen:'', url:'', aplicado:'', stockBase:{}};
      db.catalogo.stockBase = db.catalogo.stockBase || {};
      db.cfg = db.cfg || {urlCatalogo:''};
      return db;
    }catch{ return seed(); }
  }
  // Si habia datos de la version demo (v10), se conservan (ventas, clientes,
  // movimientos, pedidos, turnos) y se reemplaza elcatalogo de productos por el
  // importado, respetando el stock que ya se habia cargado.
  function migrar(){
    const nuevo = seed();
    let viejo = null;
    try{ viejo = JSON.parse(localStorage.getItem('limpieza_demo_v10')||'null'); }catch{}
    if(!viejo){ save(nuevo); return nuevo; }
    const stockViejo = {}, stockViejoSinPres = {};
    (viejo.productos||[]).forEach(p=>{
      const cod = p.codigo||'';
      stockViejo[cod+'|'+p.categoria+'|'+(p.presentacion||'')] = p.stock;
      stockViejoSinPres[cod+'|'+p.categoria] = p.stock;
    });
    nuevo.productos.forEach(p=>{
      const cod = p.codigo||'';
      const k1 = cod+'|'+p.categoria+'|'+(p.presentacion||'');
      const k2 = cod+'|'+p.categoria;
      if(stockViejo[k1]!=null) p.stock = stockViejo[k1];
      else if(stockViejoSinPres[k2]!=null) p.stock = stockViejoSinPres[k2];
    });
    ['ventas','clientes','proveedores','movimientos','pedidos','turnos'].forEach(k=>{
      if(Array.isArray(viejo[k]) && viejo[k].length) nuevo[k] = viejo[k];
    });
    if(viejo.catalogo) nuevo.catalogo = Object.assign(nuevo.catalogo, viejo.catalogo);
    if(viejo.cfg) nuevo.cfg = Object.assign(nuevo.cfg, viejo.cfg);
    save(nuevo);
    return nuevo;
  }
  function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
  // ===== CATALOGO COMPARTIDO =====
  // Fuente unica de verdad = data/catalogo.json publicado en el repo.
  // La app lo baja al abrir; si no puede, sigue con el respaldo embebido
  // (js/catalogo.js) y avisa que esta working offline.
  // Cada dispositivo conserva SUS ventas y SU stock: el remoto manda en los datos
  // del catalogo (costo, precio, margen, nombre, rubro, proveedor).
  const RUTA_CATALOGO = 'data/catalogo.json';
  const clave = p => (p.codigo||'')+'|'+(p.categoria||'')+'|'+(p.presentacion||'');

  function urlCatalogo(){
    let u='';
    try{ const db=load(); u=(db.cfg&&db.cfg.urlCatalogo)||''; }catch(e){}
    if(u) return u;
    if(typeof location==='undefined' || location.protocol==='file:') return '';
    return RUTA_CATALOGO;
  }
  function setUrlCatalogo(u){
    const db=load(); db.cfg = db.cfg||{}; db.cfg.urlCatalogo=(u||'').trim(); save(db);
  }
  // De donde viene el catalogo que se esta usando ahora.
  function estadoCatalogo(){
    const db=load(); const c=db.catalogo||{};
    return {
      version:c.version||'', origen:c.origen||'', url:c.url||urlCatalogo(),
      aplicado:c.aplicado||'', fuente: c.version?'remoto':'embebido',
      stockBase: c.stockBase||{}
    };
  }
  // Aplica el catalogo publicado encima del local.
  // - costo/precio/margen/nombre/rubro/proveedor: los del remoto (verdad compartida)
  // - visible/oculto: se respeta la decision LOCAL (cada equipo puede tapar algo)
  // - stock: manda el remoto SOLO donde este equipo no movio nada; si movio, queda
  //   el local y se marca la diferencia para que el deposito la concilie.
  function aplicarRemoto(j){
    const db=load();
    const previos={};
    db.productos.forEach(p=>{
      if(p.proveedorNombre==null && p.provId) p.proveedorNombre=(db.proveedores.find(x=>x.id===p.provId)||{}).nombre||'';
      previos[clave(p)]=p;
    });
    const stockBase={}; const precioBase={}; const drift=[]; const driftP=[]; const locales=[];
    const out=[];
    const base0S=(db.catalogo&&db.catalogo.stockBase)||{};
    const base0P=(db.catalogo&&db.catalogo.precioBase)||{};
    const dif=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))>0.004;
    const difM=(x,y)=>((x==null?null:Math.round(Number(x)*100))!==(y==null?null:Math.round(Number(y)*100)));
    j.productos.forEach((r,i)=>{
      const k=(r.codigo||'')+'|'+(r.categoria||'')+'|'+(r.presentacion||'');
      const prev=previos[k];
      const p={
        id: prev?prev.id:'p'+(Date.now()+i),
        codigo:r.codigo||'', nombre:r.nombre||'', detalle:r.detalle||'',
        categoria:r.categoria||'Accesorios', presentacion:r.presentacion||'',
        provId:r.provId||'', proveedorNombre:r.prov||(prev?prev.proveedorNombre:''),
        costo:Number(r.costo)||0, precio:Number(r.precio)||0,
        margen:(r.margen==null?null:Number(r.margen)), alerta:r.alerta||'',
        stock:Number(r.stock)||0,
        activo: prev? (prev.activo!==false) : (r.activo!==false),
        foto: prev? (prev.foto||'') : ''
      };
      const basePrev = prev ? base0S[k] : undefined;
      if(prev && basePrev!=null && basePrev!==prev.stock){
        p.stock = prev.stock;
        drift.push({id:p.id, codigo:p.codigo, nombre:p.nombre, local:p.stock, publicado:basePrev});
      }
      // Si este equipo edito costo/precio/margen antes de publicar, quedan los locales.
      const pbPrev = prev ? base0P[k] : undefined;
      if(prev && pbPrev!=null &&
         (dif(prev.costo,pbPrev.costo)||dif(prev.precio,pbPrev.precio)||difM(prev.margen,pbPrev.margen))){
        p.costo=prev.costo; p.precio=prev.precio; p.margen=(prev.margen==null?null:prev.margen);
        driftP.push({id:p.id, codigo:p.codigo, nombre:p.nombre, publicado:pbPrev.precio, local:p.precio});
      }
      stockBase[k]=p.stock;
      precioBase[k]={costo:p.costo, precio:p.precio, margen:(p.margen==null?null:p.margen)};
      out.push(p);
    });
    // productos que solo existen en este equipo (agregados a mano): se conservan
    const remotas=new Set(j.productos.map(r=>(r.codigo||'')+'|'+(r.categoria||'')+'|'+(r.presentacion||'')));
    db.productos.forEach(p=>{
      const k=clave(p);
      if(previos[k] && !remotas.has(k)){ out.push(p); locales.push(p); }
    });
    db.productos=out;
    if(j.proveedores && j.proveedores.length){
      db.proveedores=j.proveedores.map(p=>({id:p.id, nombre:p.nombre, tel:p.tel||'', notas:p.notas||''}));
    }
    db.catalogo = db.catalogo||{};
    db.catalogo.version=j.version||'';
    db.catalogo.origen=j.origen||'';
    db.catalogo.url=urlCatalogo();
    db.catalogo.aplicado=new Date().toISOString();
    db.catalogo.stockBase=stockBase;
    db.catalogo.precioBase=precioBase;
    save(db);
    return {productos:out.length, drift:drift, driftP:driftP, locales:locales};
  }
  // Descarga el catalogo publicado. {ok, msg, drift}
  async function cargarRemoto(){
    const url=urlCatalogo();
    if(!url) return {ok:false, msg:'Sin URL de catalogo (abierto con file://). Se usa el respaldo local.'};
    try{
      const sep=url.includes('?')?'&':'?';
      const r=await fetch(url+sep+'t='+Date.now(), {cache:'no-store'});
      if(!r.ok) return {ok:false, msg:'No se pudo leer el catalogo (HTTP '+r.status+')'};
      const j=await r.json();
      if(!j || !Array.isArray(j.productos) || !j.productos.length) return {ok:false, msg:'Catalogo vacio o con formato inesperado'};
      const res=aplicarRemoto(j);
      let msg='Catalogo actualizado: '+res.productos+' productos';
      if(res.drift.length) msg+=' · '+res.drift.length+' con diferencia de stock';
      if(res.driftP.length) msg+=' · '+res.driftP.length+' con precio pendiente de publicar';
      return {ok:true, msg:msg, drift:res.drift};
    }catch(e){
      return {ok:false, msg:'Sin conexion o no se pudo leer el catalogo: '+(e&&e.message||e)};
    }
  }
  // El catalogo tal como esta en este dispositivo, listo para publicar.
  function catalogoParaPublicar(){
    const db=load();
    const provNombre=id => (db.proveedores.find(x=>x.id===id)||{}).nombre||'';
    return {
      version:new Date().toISOString().replace(/\.\d+Z$/,'Z'),
      generado:'panel de precios',
      origen:(db.catalogo&&db.catalogo.origen)||'',
      proveedores:db.proveedores.map(p=>({id:p.id, nombre:p.nombre, tel:p.tel||'', notas:p.notas||''})),
      productos:db.productos.map(p=>({
        codigo:p.codigo, nombre:p.nombre, detalle:p.detalle||'',
        presentacion:p.presentacion||'', categoria:p.categoria,
        prov:provNombre(p.provId), provId:p.provId,
        costo:p.costo, precio:p.precio, margen:p.margen, alerta:p.alerta||'',
        stock:p.stock, activo:p.activo!==false
      }))
    };
  }
  // Productos donde el stock local se aparto del publicado.
  function driftStock(){
    const db=load(); const base=(db.catalogo&&db.catalogo.stockBase)||{};
    const out=[];
    db.productos.forEach(p=>{
      const k=clave(p);
      if(base[k]!=null && base[k]!==p.stock) out.push({p:p, publicado:base[k], local:p.stock, dif:p.stock-base[k]});
    });
    return out;
  }
  // Productos donde el costo/precio/margen local se aparto del publicado.
  function driftPrecio(){
    const db=load(); const base=(db.catalogo&&db.catalogo.precioBase)||{};
    const out=[];
    const dif=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))>0.004;
    const difM=(x,y)=>((x==null?null:Math.round(Number(x)*100))!==(y==null?null:Math.round(Number(y)*100)));
    db.productos.forEach(p=>{
      const k=clave(p); const b=base[k];
      if(b!=null && (dif(p.costo,b.costo)||dif(p.precio,b.precio)||difM(p.margen,b.margen)))
        out.push({p:p, publicado:b.precio, local:p.precio});
    });
    return out;
  }
  return {
    get(){ return load(); },
    reset(){ const d=seed(); save(d); },
    export(){ return JSON.stringify(load(), null, 2); },
    import(json){ save(JSON.parse(json)); },
    upsertProducto(p){ const db=load(); const i=db.productos.findIndex(x=>x.id===p.id);
      if(i>=0)db.productos[i]=p; else db.productos.push(p); save(db); },
    eliminar(id){ const db=load(); db.productos=db.productos.filter(x=>x.id!==id); save(db); },
    // Actualiza costo / precio / margen de productos ya cargados.
    // El codigo se repite entre 1L y 5L: se desambigua por categoria y presentacion.
    // lista: [{codigo?, nombre?, presentacion?, costo?, precio?, margen?, provId?}]
    actualizarPrecios(lista, categoria){
      const db=load(); let tocados=0; const faltan=[];
      lista.forEach(r=>{
        const pool = categoria ? db.productos.filter(x=>x.categoria===categoria) : db.productos;
        let p=null;
        if(r.codigo){
          const cod=String(r.codigo).toLowerCase();
          const pres=r.presentacion?String(r.presentacion).toLowerCase():null;
          p=pool.find(x=>String(x.codigo||'').toLowerCase()===cod && (!pres || String(x.presentacion||'').toLowerCase()===pres));
          if(!p) p=pool.find(x=>String(x.codigo||'').toLowerCase()===cod);
        }
        if(!p && r.nombre){
          const nom=String(r.nombre).toLowerCase();
          p=pool.find(x=>String(x.nombre||'').toLowerCase()===nom);
        }
        if(!p){ faltan.push(r.codigo||r.nombre||'?'); return; }
        if(r.costo!=null && r.costo!=='') p.costo=Number(r.costo);
        if(r.margen!=null && r.margen!=='') p.margen=Number(r.margen);
        if(r.precio!=null && r.precio!=='') p.precio=Number(r.precio);
        else if(r.costo!=null && r.costo!=='' && p.margen!=null) p.precio=redondear2(p.costo*(1+p.margen/100));
        if(r.provId) p.provId=r.provId;
        tocados++;
      });
      save(db); return {tocados, faltan};
    },
    // Precio de venta = costo + margen%.
    // pct === 'propio' usa el margen que trae cada producto del proveedor.
    // Margen uniforme: redondea a $10. Margen propio: mantiene el precio del Excel.
    aplicarMargen(pct, soloRubro){
      const db=load(); let n=0;
      const propio = (pct==='propio' || pct==='');
      db.productos.forEach(p=>{
        if(soloRubro && p.categoria!==soloRubro) return;
        if(propio){
          if(p.margen==null) return;
          p.precio = redondear2(p.costo*(1+p.margen/100));
        } else {
          p.precio = redondear10(p.costo*(1+Number(pct)/100));
        }
        n++;
      });
      save(db); return n;
    },
    // Ocultar / mostrar un producto (no se borra, deja de ofrecerse en caja).
    toggleActivo(id, valor){
      const db=load(); const p=db.productos.find(x=>x.id===id);
      if(p){ p.activo = (valor==null) ? !p.activo : !!valor; save(db); }
      return p;
    },
    turnoAbierto(){ return load().turnos.find(t=>t.estado==='abierto')||null; },
    ultimoCerrado(){ return load().turnos.find(t=>t.estado==='cerrado')||null; },
    abrirTurno(saldo){
      const db=load();
      if(db.turnos.some(t=>t.estado==='abierto')) throw new Error('Ya hay una caja abierta');
      if(!(saldo>=0)) throw new Error('Saldo inicial inválido');
      db.turnos.unshift({id:'t'+Date.now(), apertura:new Date().toISOString(), saldo_inicial:saldo, estado:'abierto'});
      save(db);
    },
    // Esperado por medio para un turno (ventas generan movimientos con turnoId).
    resumenTurno(t){
      const db=load();
      const movs=db.movimientos.filter(m=>m.turnoId===t.id && !m.anulado);
      const porMedio={};
      movs.forEach(m=>{ porMedio[m.medio]=porMedio[m.medio]||{ing:0,egr:0}; porMedio[m.medio][m.tipo==='ingreso'?'ing':'egr']+=m.monto; });
      const ef=porMedio.efectivo||{ing:0,egr:0};
      return {movs, porMedio, esperadoEfectivo:t.saldo_inicial+ef.ing-ef.egr};
    },
    cerrarTurno(conteo, notas){
      const db=load();
      const t=db.turnos.find(x=>x.estado==='abierto'); if(!t) throw new Error('No hay caja abierta');
      const r=this.resumenTurno(t);
      const dif={};
      ['efectivo','mercadopago','banco'].forEach(m=>{
        const pm=r.porMedio[m]||{ing:0,egr:0};
        const esp = m==='efectivo' ? t.saldo_inicial+pm.ing-pm.egr : pm.ing-pm.egr;
        dif[m]={esperado:esp, contado:conteo[m]||0, diferencia:(conteo[m]||0)-esp};
      });
      t.cierre=new Date().toISOString(); t.conteo=conteo; t.diferencia=dif; t.notas=notas||''; t.estado='cerrado';
      save(db); return t;
    },
    cobrar(items, pago, clienteId){
      const db=load();
      const turno=db.turnos.find(t=>t.estado==='abierto');
      if(!turno) throw new Error('Abrí la caja primero (panel Turno)');
      for(const it of items){ const p=db.productos.find(x=>x.id===it.id);
        if(!p||p.stock<it.cant) throw new Error('Sin stock: '+(it.nombre||it.id)); }
      for(const it of items){ db.productos.find(x=>x.id===it.id).stock-=it.cant; }
      const total=items.reduce((a,i)=>a+i.precio*i.cant,0);
      const vid='v'+Date.now();
      const cid=clienteId||'c1';
      const v={id:vid, fecha:new Date().toISOString(), items, pago, total, clienteId:cid, turnoId:turno.id};
      db.ventas.unshift(v);
      if(pago==='cuenta'){
        // Cuenta corriente: no entra plata, queda como deuda del cliente.
        const c=db.clientes.find(x=>x.id===cid); if(c) c.deuda=(c.deuda||0)+total;
      } else {
        db.movimientos.unshift({id:'m'+Date.now(), fecha:v.fecha, tipo:'ingreso', medio:pago, concepto:'Venta', monto:total, conciliado:false, turnoId:turno.id, ventaId:vid});
      }
      save(db); return total;
    },
    anularVenta(id){
      const db=load();
      const v=db.ventas.find(x=>x.id===id);
      if(!v) throw new Error('Venta no encontrada');
      if(v.anulada) throw new Error('Ya estaba anulada');
      for(const it of v.items){ const pr=db.productos.find(x=>x.id===it.id); if(pr) pr.stock+=it.cant; }
      v.anulada=true; v.fechaAnulacion=new Date().toISOString();
      if(v.pago==='cuenta'){
        const c=db.clientes.find(x=>x.id===v.clienteId); if(c) c.deuda=Math.max(0,(c.deuda||0)-v.total);
      } else {
        const m=db.movimientos.find(x=>x.ventaId===id); if(m) m.anulado=true;
      }
      save(db);
    },
    // Cobrar deuda de cuenta corriente: recién ahí entra el ingreso a caja.
    cobrarDeuda(clienteId, monto, medio){
      const db=load();
      const turno=db.turnos.find(t=>t.estado==='abierto');
      if(!turno) throw new Error('Abrí la caja primero (panel Turno)');
      const c=db.clientes.find(x=>x.id===clienteId); if(!c) throw new Error('Cliente no encontrado');
      monto=Number(monto); if(!(monto>0)) throw new Error('Monto inválido');
      if(monto>(c.deuda||0)) throw new Error('El monto supera la deuda ($'+c.deuda+')');
      c.deuda-=monto;
      db.movimientos.unshift({id:'m'+Date.now(), fecha:new Date().toISOString(), tipo:'ingreso', medio, concepto:'Cobro cuenta · '+c.nombre, monto, conciliado:false, turnoId:turno.id});
      save(db);
    },
    addMovimiento(m){ const db=load();
      const turno=db.turnos.find(t=>t.estado==='abierto');
      if(!turno) throw new Error('Abrí la caja primero (panel Turno)');
      m.turnoId=turno.id; m.id=m.id||'m'+Date.now(); m.fecha=m.fecha||new Date().toISOString(); m.conciliado=!!m.conciliado; db.movimientos.unshift(m); save(db); },
    conciliar(id, v){ const db=load(); const m=db.movimientos.find(x=>x.id===id); if(m){m.conciliado=!!v; save(db);} },
    upsertEntidad(col, e){ const db=load(); const i=db[col].findIndex(x=>x.id===e.id);
      if(i>=0)db[col][i]=e; else db[col].push(e); save(db); },
    delEntidad(col, id){ const db=load(); db[col]=db[col].filter(x=>x.id!==id); save(db); },
    upsertPedido(p){ const db=load(); const i=db.pedidos.findIndex(x=>x.id===p.id);
      if(i>=0)db.pedidos[i]=p; else db.pedidos.unshift(p); save(db); },
    // Recibir pedido: entra el stock y, si se pagó, sale el egreso.
    recibirPedido(id, montoPagado, medio){
      const db=load();
      const turno=db.turnos.find(t=>t.estado==='abierto');
      const p=db.pedidos.find(x=>x.id===id); if(!p) throw new Error('Pedido no encontrado');
      if(p.estado!=='pendiente') throw new Error('El pedido ya estaba recibido');
      (p.items||[]).forEach(it=>{ const pr=db.productos.find(x=>x.id===it.id); if(pr) pr.stock+=Number(it.cant)||0; });
      p.estado='recibido'; p.fechaRecibido=new Date().toISOString();
      montoPagado=Number(montoPagado)||0;
      if(montoPagado>0){
        if(!turno) throw new Error('Para registrar el pago abrí la caja primero');
        const prov=(db.proveedores.find(x=>x.id===p.provId)||{}).nombre||'Proveedor';
        db.movimientos.unshift({id:'m'+Date.now(), fecha:new Date().toISOString(), tipo:'egreso', medio:medio||'efectivo', concepto:'Compra '+prov, monto:montoPagado, conciliado:false, turnoId:turno.id});
        p.montoPagado=montoPagado; p.medioPago=medio||'efectivo';
      }
      save(db);
    },
    delPedido(id){ const db=load(); db.pedidos=db.pedidos.filter(x=>x.id!==id); save(db); },

    // --- catalogo compartido ---
    urlCatalogo, setUrlCatalogo, estadoCatalogo, aplicarRemoto,
    cargarRemoto, catalogoParaPublicar, driftStock, driftPrecio,
  };
})();
