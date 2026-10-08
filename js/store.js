// store.js — capa de datos modular (localStorage). Base para crecer a backend real.
const Store = (() => {
  const KEY = 'limpieza_demo_v1';
  const seed = [
    {id:'p1', nombre:'Lavandina x 5L', categoria:'Piso', precio:3500, stock:20},
    {id:'p2', nombre:'Detergente x 5L', categoria:'Cocina', precio:4200, stock:15},
    {id:'p3', nombre:'Desodorante piso x 5L', categoria:'Piso', precio:3800, stock:12},
    {id:'p4', nombre:'Jabón líquido manos x 5L', categoria:'Baño', precio:5000, stock:8},
    {id:'p5', nombre:'Limpiavidrios x 5L', categoria:'Vidrios', precio:4500, stock:6},
    {id:'p6', nombre:'Bolsa residuo 80x110 x10u', categoria:'Accesorios', precio:2800, stock:30},
    {id:'p7', nombre:'Trapo piso', categoria:'Accesorios', precio:1500, stock:25},
    {id:'p8', nombre:'Cloro granulado x 5kg', categoria:'Pileta', precio:18000, stock:4},
  ];
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw){ localStorage.setItem(KEY, JSON.stringify({productos:seed, ventas:[]})); return {productos:seed, ventas:[]}; }
      return JSON.parse(raw);
    }catch{ return {productos:seed, ventas:[]}; }
  }
  function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
  return {
    get(){ return load(); },
    reset(){ localStorage.setItem(KEY, JSON.stringify({productos:seed, ventas:[]})); },
    upsertProducto(p){
      const db = load();
      const i = db.productos.findIndex(x=>x.id===p.id);
      if(i>=0) db.productos[i]=p; else db.productos.push(p);
      save(db);
    },
    eliminar(id){
      const db = load();
      db.productos = db.productos.filter(x=>x.id!==id);
      save(db);
    },
    // Venta: items [{id,nombre,precio,cant}], pago, total
    cobrar(items, pago){
      const db = load();
      for(const it of items){
        const p = db.productos.find(x=>x.id===it.id);
        if(!p || p.stock < it.cant) throw new Error('Sin stock: '+(it.nombre||it.id));
      }
      for(const it of items){ db.productos.find(x=>x.id===it.id).stock -= it.cant; }
      const total = items.reduce((a,i)=>a+i.precio*i.cant,0);
      db.ventas.unshift({fecha:new Date().toISOString(), items, pago, total});
      save(db);
      return total;
    }
  };
})();
