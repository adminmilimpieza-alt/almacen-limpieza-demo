// store.js — capa de datos modular (localStorage). Base para crecer a backend real.
// Cubre los 8 puntos del cliente en versión demo: caja I/E + conciliación manual,
// stock, clientes, proveedores, precios (CSV por código/nombre — PDF en fase 2),
// reportes, respaldo JSON, pedidos.
const ICONOS = {
  'Piso': '#EDF3EC', 'Cocina': '#E1F3FE', 'Baño': '#FBF3DB', 'Vidrios': '#E1F3FE',
  'Accesorios': '#F7F6F3', 'Pileta': '#E1F3FE', 'Ropa': '#FDEBEC', 'General': '#F7F6F3'
};
const Store = (() => {
  const KEY = 'limpieza_demo_v3';
  const seedProductos = [
    {id:'p1', codigo:'LAV-5L', nombre:'Lavandina x 5L', categoria:'Piso', precio:3500, stock:20},
    {id:'p2', codigo:'DET-5L', nombre:'Detergente x 5L', categoria:'Cocina', precio:4200, stock:15},
    {id:'p3', codigo:'DES-5L', nombre:'Desodorante piso x 5L', categoria:'Piso', precio:3800, stock:12},
    {id:'p4', codigo:'JAB-5L', nombre:'Jabón líquido manos x 5L', categoria:'Baño', precio:5000, stock:8},
    {id:'p5', codigo:'VID-5L', nombre:'Limpiavidrios x 5L', categoria:'Vidrios', precio:4500, stock:6},
    {id:'p6', codigo:'BOL-80110', nombre:'Bolsa residuo 80x110 x10u', categoria:'Accesorios', precio:2800, stock:30},
    {id:'p7', codigo:'TRA-PISO', nombre:'Trapo piso', categoria:'Accesorios', precio:1500, stock:25},
    {id:'p8', codigo:'CLO-5KG', nombre:'Cloro granulado x 5kg', categoria:'Pileta', precio:18000, stock:4},
    {id:'p9', codigo:'SUA-5L', nombre:'Suavizante ropa x 5L', categoria:'Ropa', precio:5200, stock:10},
    {id:'p10', codigo:'ESC-PALA', nombre:'Escoba + pala', categoria:'Accesorios', precio:6500, stock:7},
  ];
  const seed = () => ({productos:seedProductos, ventas:[],
    clientes:[{id:'c1', nombre:'Mostrador', tel:'', dir:''}],
    proveedores:[], movimientos:[], pedidos:[]});
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw){ const d=seed(); localStorage.setItem(KEY, JSON.stringify(d)); return d; }
      const db = JSON.parse(raw);
      db.productos=db.productos||[]; db.ventas=db.ventas||[];
      db.clientes=db.clientes||seed().clientes; db.proveedores=db.proveedores||[];
      db.movimientos=db.movimientos||[]; db.pedidos=db.pedidos||[];
      return db;
    }catch{ return seed(); }
  }
  function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
  return {
    get(){ return load(); },
    reset(){ const d=seed(); save(d); },
    export(){ return JSON.stringify(load(), null, 2); },
    import(json){ save(JSON.parse(json)); },
    upsertProducto(p){ const db=load(); const i=db.productos.findIndex(x=>x.id===p.id);
      if(i>=0)db.productos[i]=p; else db.productos.push(p); save(db); },
    eliminar(id){ const db=load(); db.productos=db.productos.filter(x=>x.id!==id); save(db); },
    // Actualización masiva de precios por código o nombre (base del punto 5; CSV hoy, PDF fase 2)
    actualizarPrecios(lista){ // [{codigo?,nombre?,precio}]
      const db=load(); let tocados=0, faltan=[];
      lista.forEach(r=>{
        const precio=Number(r.precio); if(!(precio>=0)) return;
        let p = r.codigo ? db.productos.find(x=>(x.codigo||'').toLowerCase()===String(r.codigo).toLowerCase())
                         : db.productos.find(x=>x.nombre.toLowerCase()===String(r.nombre||'').toLowerCase());
        if(p){ p.precio=precio; tocados++; } else faltan.push(r.codigo||r.nombre||'?');
      });
      save(db); return {tocados, faltan};
    },
    cobrar(items, pago, clienteId){
      const db=load();
      for(const it of items){ const p=db.productos.find(x=>x.id===it.id);
        if(!p||p.stock<it.cant) throw new Error('Sin stock: '+(it.nombre||it.id)); }
      for(const it of items){ db.productos.find(x=>x.id===it.id).stock-=it.cant; }
      const total=items.reduce((a,i)=>a+i.precio*i.cant,0);
      const v={fecha:new Date().toISOString(), items, pago, total, clienteId:clienteId||'c1'};
      db.ventas.unshift(v);
      db.movimientos.unshift({id:'m'+Date.now(), fecha:v.fecha, tipo:'ingreso', medio:pago, concepto:'Venta', monto:total, conciliado:false});
      save(db); return total;
    },
    // Punto 1: movimientos manuales de caja (ingresos/egresos in situ u online)
    addMovimiento(m){ const db=load(); m.id=m.id||'m'+Date.now(); m.fecha=m.fecha||new Date().toISOString(); m.conciliado=!!m.conciliado; db.movimientos.unshift(m); save(db); },
    conciliar(id, v){ const db=load(); const m=db.movimientos.find(x=>x.id===id); if(m){m.conciliado=!!v; save(db);} },
    // Puntos 3 y 4
    upsertEntidad(col, e){ const db=load(); const i=db[col].findIndex(x=>x.id===e.id);
      if(i>=0)db[col][i]=e; else db[col].push(e); save(db); },
    delEntidad(col, id){ const db=load(); db[col]=db[col].filter(x=>x.id!==id); save(db); },
    // Punto 8: pedidos a proveedores
    upsertPedido(p){ const db=load(); const i=db.pedidos.findIndex(x=>x.id===p.id);
      if(i>=0)db.pedidos[i]=p; else db.pedidos.unshift(p); save(db); },
    delPedido(id){ const db=load(); db.pedidos=db.pedidos.filter(x=>x.id!==id); save(db); },
  };
})();
