// store.js — capa de datos modular (localStorage). Base para crecer a backend real.
// Catálogo real parcial de Mi Limpieza (Fernando Miretti, Villa María):
// rubros Líquidos 5L / Líquidos 1L / Accesorios, con códigos internos y EAN.
// La lista del proveedor trae COSTO; el precio de venta sale de costo + margen.
const ICONOS = {
  'Líquidos 5L': '#E1F3FE', 'Líquidos 1L': '#E1F3FE', 'Accesorios': '#F7F6F3',
  'Piso': '#EDF3EC', 'Cocina': '#E1F3FE', 'Baño': '#FBF3DB', 'Vidrios': '#E1F3FE',
  'Pileta': '#E1F3FE', 'Ropa': '#FDEBEC', 'General': '#F7F6F3'
};
const Store = (() => {
  const KEY = 'limpieza_demo_v10';
  // [codigo, nombre, categoria, costo] — venta inicial = costo; se aplica margen en Precios.
  const SEED = [
    ['509','CLORO PURO','Líquidos 5L',7000],
    ['482','LAVANDINA CONCENTRADA (50% Concent. Cloro)','Líquidos 5L',5000],
    ['790','LAVANDINA ROPA BLANCA','Líquidos 5L',6700],
    ['793','LAVANDINA ROPA COLOR','Líquidos 5L',6100],
    ['6976','LAVANDINA GEL PERFUMADA (50% Concent. AntiHongo)','Líquidos 5L',7900],
    ['788','BLANQUEADOR OPTICO','Líquidos 5L',5700],
    ['795','QUITAMANCHAS','Líquidos 5L',7500],
    ['798','QUITAMANCHAS OXI','Líquidos 5L',8300],
    ['531','QUITASARRO LIQUIDO CONCENTRADO','Líquidos 5L',10100],
    ['13172','DETERGENTE INDUSTRIAL (Alto poder desengrasante)','Líquidos 5L',10800],
    ['483','DETERGENTE PREMIUM (Acción amoniacal)','Líquidos 5L',9200],
    ['494','DETERGENTE LIMON','Líquidos 5L',6700],
    ['462','JABON LIQUIDO TOCADOR Coco/Vainilla c/desinfectante','Líquidos 5L',10500],
    ['463','JABON LIQUIDO TOCADOR Dove c/desinfectante','Líquidos 5L',10500],
    ['724','DESENGRASANTE ROJO','Líquidos 5L',9100],
    ['729','DESENGRASANTE INDUSTRIAL','Líquidos 5L',10000],
    ['846','LIMPIADOR CREMOSO','Líquidos 5L',11000],
    ['690','LIQUIDO P/ LAMPAZOS perf. y siliconado','Líquidos 5L',45750],
    ['549','CERA AUTOBRILLO NEGRA','Líquidos 5L',12700],
    ['552','CERA AUTOBRILLO ROJA','Líquidos 5L',12700],
    ['489','CERA AUTOBRILLO NATURAL','Líquidos 5L',8500],
    ['603','CERA PROFESIONAL NEGRA','Líquidos 5L',27500],
    ['488','CERA PROFESIONAL NATURAL','Líquidos 5L',22500],
    ['425','PORCELANATO LIQUIDO','Líquidos 5L',11300],
    ['672','BRILLO PARA BALDE PERFUMADO','Líquidos 5L',10500],
    ['3820','JABON P/ROPA CON SUAVIZANTE','Líquidos 5L',8600],
    ['418','JABON P/ROPA 12% MATERIA ACTIVA','Líquidos 5L',9700],
    ['13286','JABON P/ROPA ULTRA PERFUMADO','Líquidos 5L',12500],
    ['13240','JABON LIQ. P/ROPA ULTRA PERFUMADO ROSE 1Lt','Líquidos 5L',12500],
    ['421','JABON P/ROPA OXI LIMPIEZA PROFUNDA','Líquidos 5L',13400],
    ['80','LAVA MATIC','Líquidos 5L',16700],
    ['13277','SUAVIZANTE ECOPLUS Celeste','Líquidos 5L',6300],
    ['13287','SUAVIZANTE ULTRA PERFUMADO','Líquidos 5L',11600],
    ['535','SUAVIZANTE PLUS BLANCO','Líquidos 5L',8000],
    ['655','PERFUME P/ROPA AL ALCOHOL','Líquidos 5L',37500],
    ['523','LIMPIA VIDRIOS','Líquidos 5L',7000],
    ['938','DESODORANTE Y DESINFECTANTE P/PISO','Líquidos 5L',5000],
    ['7559','ALCOHOL PURO 70º','Líquidos 5L',26700],
    ['731','DESTAPA CAÑERIAS SODA CAUSTICA 25%','Líquidos 5L',13800],
    ['711','DERRIBANTE DE INSECTOS','Líquidos 5L',4500],
    ['509','CLORO PURO 1Lt','Líquidos 1L',1700],
    ['482','LAVANDINA CONCENTRADA 1Lt','Líquidos 1L',1300],
    ['790','LAVANDINA ROPA BLANCA 1Lt','Líquidos 1L',1700],
    ['793','LAVANDINA ROPA COLOR 1Lt','Líquidos 1L',1500],
    ['6976','LAVANDINA GEL PERFUMADA 1Lt','Líquidos 1L',1900],
    ['788','BLANQUEADOR OPTICO 1Lt','Líquidos 1L',1400],
    ['795','QUITAMANCHAS 1Lt','Líquidos 1L',1800],
    ['798','QUITAMANCHAS OXI 1Lt','Líquidos 1L',2000],
    ['531','QUITASARRO LIQUIDO 1Lt','Líquidos 1L',2300],
    ['13172','DETERGENTE INDUSTRIAL 1Lt','Líquidos 1L',2500],
    ['672','BRILLO PARA BALDE PERFUMADO 1Lt','Líquidos 1L',2400],
    ['3820','JABON P/ROPA CON SUAVIZANTE 1Lt','Líquidos 1L',2000],
    ['418','JABON P/ROPA 12% 1Lt','Líquidos 1L',2200],
    ['13286','JABON ULTRA PERFUMADO 1Lt','Líquidos 1L',2800],
    ['13240','JABON ULTRA ROSE 1Lt','Líquidos 1L',2800],
    ['421','JABON OXI 1Lt','Líquidos 1L',3000],
    ['80','LAVA MATIC 1Lt','Líquidos 1L',3600],
    ['13277','SUAVIZANTE ECOPLUS 1Lt','Líquidos 1L',1600],
    ['13287','SUAVIZANTE ULTRA 1Lt','Líquidos 1L',2600],
    ['535','SUAVIZANTE PLUS BLANCO 1Lt','Líquidos 1L',1900],
    ['655','PERFUME ROPA ALCOHOL 1Lt','Líquidos 1L',7800],
    ['523','LIMPIA VIDRIOS 1Lt','Líquidos 1L',1500],
    ['938','DESODORANTE P/PISO 1Lt','Líquidos 1L',1300],
    ['7559','ALCOHOL PURO 70º 1Lt','Líquidos 1L',5600],
    ['731','DESTAPA CAÑERIAS 1Lt','Líquidos 1L',3000],
    ['711','DERRIBANTE INSECTOS 1Lt','Líquidos 1L',1200],
    ['13270-500','PERCARBONATO DE SODIO 500gr','Líquidos 1L',7300],
    ['13270-1KG','PERCARBONATO DE SODIO 1Kg','Líquidos 1L',14500],
    ['7791828000046','PAPEL HIGIENICO Felpita SH 4x30','Accesorios',1600],
    ['7791828900520','PAPEL HIGIENICO Felpita DH 12x30','Accesorios',8600],
    ['7730973550013','PAPEL HIGIENICO Celeste SH 16x30','Accesorios',6000],
    ['730973550747','PAPEL HIGIENICO Job DH 4x30','Accesorios',2200],
    ['730973550693','PAPEL HIGIENICO Job DH 12x30','Accesorios',7400],
    ['7791828000626','ROLLO COCINA CartaBella x3','Accesorios',1600],
    ['7791828900537','ROLLO COCINA Felpita + Conveniente x3','Accesorios',1900],
    ['3069','ROLLO DE COCINA Miraflor 250 Paños','Accesorios',1600],
    ['7791828900377','ROLLO COCINA Felipita Maxi 200 paños','Accesorios',2400],
    ['736684229139','NEW PEL SERV TISSUE 1000U 32X27 COD 52','Accesorios',11100],
    ['105280','SERVILLETAS 30X30','Accesorios',10500],
    ['1036','BOBINA INDUSTRIAL S/C x200m 20cm','Accesorios',6300],
    ['3080','BOBINA INDUSTRIAL SH x200m x24cm','Accesorios',8000],
    ['7798183150126','REJILLA MULTIPROPOSITO EXTRA 35x45','Accesorios',1000],
    ['7798159880170','YOU REJILLA ESPONJA','Accesorios',1100],
    ['7798159881733','YOU REJILLA AMERICANA LIVIANA','Accesorios',800],
    ['7798136920998','FIBRAN PAÑO P/PISO ESTRELLITA GRIS 48x60','Accesorios',900],
    ['7791297013028','Paño/Piso NIDO DE ABEJA ECO 48x56','Accesorios',1900],
    ['PAÑO','PAÑO AMARILLO MULTIUSO','Accesorios',500],
    ['7791297003005','FRANELA NARANJA','Accesorios',1200],
    ['7798024459234','MR TRAPO ESPONJA ACERO 10GR','Accesorios',500],
    ['7798024459258','MR TRAPO ESPONJA ACERO 30GR','Accesorios',1000],
    ['7794440002238','VIRULANA ESPONJA ACERO BRONCE','Accesorios',1600],
    ['7793253038526','MORTIMER ESPONJA DOBLE CARA','Accesorios',2400],
    ['7798159881047','YOU LANA ACERO (x10 Unid)','Accesorios',1000],
    ['7798159881887','YOU ESPONJA ECONOMICA','Accesorios',500],
    ['7798126372851','MR TRAPO ESPONJA LISA (x Unid)','Accesorios',600],
    ['7793253038106','MORTIMER ESPONJA CUADRICULADA (x Unid)','Accesorios',1900],
    ['7790520028709','CERAMICOL LUSTRAMUEBLES ORIG 360CC','Accesorios',6200],
    ['7790520028747','BLEM LUSTRAMUEBLES ORIG 360ML','Accesorios',6800],
    ['7791290795778','CIF DESINFECTANTE AERO ORIG 360CC','Accesorios',4300],
    ['7791290795792','CIF DESINFECTANTE AERO CITRICA 360CC','Accesorios',4300],
    ['7791290795785','CIF DESINFECTANTE AERO LAVANDA 360CC','Accesorios',4300],
    ['791290796805','CIF DESINFECTANTE AERO SANDALO 360CC','Accesorios',4300],
    ['7790520995285','LYSOFORM ORIGINAL 360CC','Accesorios',5300],
    ['7793253004248','POETT AMBIENTE FLORES PRIMAVERA 360CC','Accesorios',4500],
    ['7793253004231','POETT AMBIENTE LAVANDA 360CC','Accesorios',4500],
    ['793253005061','AYUDIN DESINF. AERO FRESCURA MATINAL 360CC','Accesorios',4800],
    ['793253005078','AYUDIN DESINF. AERO BEBE 360CC','Accesorios',4800],
    ['7793253005153','SELTON ACCION INST ROJO','Accesorios',5100],
    ['7791290794221','CIF LIMP CREMA ORIG 750ML','Accesorios',4700],
    ['7791290794238','CIF LIMP CREMA ORIG 375GR','Accesorios',2700],
    ['7797390495396','SANCHEZ ESCOBILLON AZTECA','Accesorios',2400],
    ['7797160000027','ARGENTUM ESCOBILLON VENUS 4 HILERAS','Accesorios',4500],
    ['7798413499322','GANGA ESCOBILLON LAQUEADO MONARCA','Accesorios',4100],
    ['798065720102','HACENDOSA PALA C/CABO ECO','Accesorios',2500],
    ['7798310620508','COLORES SECADOR DG','Accesorios',1800],
    ['7798065720140','HACENDOSA SECADOR DG 40cm','Accesorios',2300],
    ['7792459013160','LA GAUCHITA SECADOR DG AQUA SPLASH','Accesorios',4200],
    ['7794129005406','SANCHEZ PASACERA PLAST COCO','Accesorios',1800],
    ['7798076450364','BOLSAPLAST 45X60X10','Accesorios',600],
    ['7798076450388','BOLSAPLAST 60X90X10','Accesorios',1100],
    ['798076450418','BOLSAPLAST 80X100 X10','Accesorios',1600],
    ['7794321006119','GUANTE TASCK Trad Amar L/9','Accesorios',1700],
    ['7794321006102','GUANTE TASCK Trad Amar M/8','Accesorios',1700],
    ['7798159881351','GUANTE YOU Amar S','Accesorios',1500],
    ['798024452136','MR TRAPO MOPA ALGODON GRIS','Accesorios',2900],
    ['798024450767','MR TRAPO MOPA ALGODON BLANCO','Accesorios',2900],
    ['H-1MET','METEORA GATILLOS BCO TRANS','Accesorios',500],
    ['798134070688','SIGNO JABON EN PAN 150Gr','Accesorios',700],
    ['790828103313','GIGANTE JABON EN PAN 200Gr','Accesorios',1500],
    ['30X30','LUMAHOME PAÑO MICROFIBRA ROJO 30x30','Accesorios',900],
    ['40X40V','LUMAHOME PAÑO MICROFIBRA VERDE 40x40','Accesorios',1500],
    ['40X40','LUMAHOME PAÑO MICROFIBRA AZUL 40x40','Accesorios',1500],
    ['798024451566','MR TRAPO MANTEL DE MESA 1.40x2.80','Accesorios',4000],
    ['CABO150','SANCHES CABO DE MADERA 1.50 MTS','Accesorios',1800],
    ['798159880941','YOU BROCHE DE PLASTICO','Accesorios',1200],
    ['000113','BALDE PLASTICO 10 Lts','Accesorios',3500],
    ['7793071000200','COLORES CESTO C/TAPA VAIVEN 8L','Accesorios',6400],
    ['7793071006820','COLORES CESTO C/TAPA 8L','Accesorios',4400],
    ['742832596039','GAVA CESTO BASURA NEGRO 15L','Accesorios',15200],
    ['7793071003089','COLORES CESTO VAIVEN PREMIUM 40L','Accesorios',25500],
    ['7793071003126','COLORES CESTO TAPA PLANA 60L','Accesorios',33500],
    ['7793071002822','COLORES CESTO P/ROPA RECT CALADO','Accesorios',19000],
    ['7793071002808','COLORES CESTO P/ROPA REDONDO CALADO','Accesorios',11700],
    ['136','GAVA CESTO DE ROPA 32L','Accesorios',9500],
    ['742832595896','GAVA FUENTON 25L','Accesorios',5200],
    ['742832595995','GAVA FUENTON 11L','Accesorios',3400],
    ['742832595858','GAVA PALANGANA 8L','Accesorios',2700],
    ['7792459000856','LA GAUCHITA LIMPIAVIDRIOS AQUA SPLASH','Accesorios',7200],
    ['7792459000115','LA GAUCHITA LIMPIAVIDRIOS C/CABO','Accesorios',4900],
    ['7792459790115','LA GAUCHITA PLUMERO MICROFIBRA','Accesorios',4200],
    ['7797578000305','PLUMERO PLUMA N30','Accesorios',16800],
    ['7797160505058','ARGENTUM PLUMERO DE TECHO','Accesorios',4000],
    ['LAMP5','LAMPAZO BLANCO 500GR C/CABO','Accesorios',2600],
    ['763571775783','GAVA CEPILLO LAVA ESPALDA CLOTILDE','Accesorios',1900],
    ['ESP','SANCHEZ CEPILLO LAVAESPALDA','Accesorios',2500],
    ['7897750786420','ALKLIN ESCOBILLA BAÑO C/DEPOSITO','Accesorios',5000],
    ['7797160001017','ARGENTUM ESCOBILLA BAÑO WC C/DEPOSITO','Accesorios',4700],
    ['7896030617003','LINEA BELLA ESCOBILLA BAÑO SFRESH','Accesorios',1500],
    ['7896030616600','CEPILLO PRACTIC LINEA BELLA','Accesorios',1500],
    ['7797160100765','ARGENTUM CEPILLO DE MANO M76','Accesorios',1800],
    ['7792459401080','ASAPRACTIC CEPILLO P/ROPA','Accesorios',1700],
    ['7896030615207','CEPILLO P/ROPA LAVATTA LINEA BELLA','Accesorios',1400],
    ['7792459790160','LA GAUCHITA RODILLO QUITA PELUSA x60','Accesorios',5500],
    ['7797160700057','ARGENTUM SOPAPA FUELLE C/MANGO','Accesorios',3700],
    ['7897750793497','BRILHEX SOPAPA C/CABO 17.5cm','Accesorios',3500],
    ['7798065720478','HACENDOSA PALETA MATA MOSCA','Accesorios',700],
    ['7798241799045','SCHEZ BARRE HOJAS PLAST','Accesorios',1800],
    ['4563','SANCHEZ CABO ALUMINIO 1.20m','Accesorios',1800],
    ['7798448170104','SANCHEZ CABO EXTENSIBLE GLICK 3m','Accesorios',12000],
    ['7798353736396','METEORA MOPA RECT MICROF C/CABO EXT','Accesorios',8300],
    ['7797483004177','METEORA BARRAL CORTINA 70-120','Accesorios',7000],
    ['7798353730899','METEORA CORTINA BAÑO DOBLE 180x180','Accesorios',5200],
    ['7798178170931','URBAN FRESH CANASTA LIQ FLORAL 50gr','Accesorios',3200],
    ['7798178170924','URBAN FRESH CANASTA LIQ LAVANDA 50gr','Accesorios',3200],
    ['7798178171082','URBAN FRESH CANASTA LIQ LIMON 50gr','Accesorios',3200],
    ['7798178172539','URBAN FRESH CANASTA SOL LAVANDA 50gr','Accesorios',4000],
    ['7798178172522','URBAN FRESH CANASTA SOL LIMON 50gr','Accesorios',4000],
    ['7798178171112','URBAN FRESH BLOQUE MOCHILA 50gr A','Accesorios',1900],
    ['7798178171105','URBAN FRESH BLOQUE MOCHILA 50gr B','Accesorios',3000],
  ];
  const seed = () => ({productos: SEED.map((r,i)=>({id:'p'+(i+1), codigo:r[0], nombre:r[1], categoria:r[2], costo:r[3], precio:r[3], stock:10, provId:null})),
    ventas:[], clientes:[{id:'c1', nombre:'Mostrador', tel:'', extra:'', deuda:0}],
    proveedores:[], movimientos:[], pedidos:[], turnos:[]});
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw){ const d=seed(); localStorage.setItem(KEY, JSON.stringify(d)); return d; }
      const db = JSON.parse(raw);
      db.productos=db.productos||[]; db.ventas=db.ventas||[];
      db.clientes=db.clientes||seed().clientes; db.proveedores=db.proveedores||[];
      db.movimientos=db.movimientos||[]; db.pedidos=db.pedidos||[]; db.turnos=db.turnos||[];
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
    // La lista del proveedor trae COSTO: se actualiza por código o nombre.
    // El código interno se repite entre 1L y 5L: la lista (categoría) decide.
    actualizarPrecios(lista, categoria){ // [{codigo?,nombre?,precio=costo}]
      const db=load(); let tocados=0, faltan=[];
      lista.forEach(r=>{
        const costo=Number(r.precio); if(!(costo>=0)) return;
        const pool = categoria ? db.productos.filter(x=>x.categoria===categoria) : db.productos;
        let p = r.codigo ? pool.find(x=>(x.codigo||'').toLowerCase()===String(r.codigo).toLowerCase())
                         : pool.find(x=>x.nombre.toLowerCase()===String(r.nombre||'').toLowerCase());
        if(p){ p.costo=costo; if(r.provId) p.provId=r.provId; tocados++; } else faltan.push(r.codigo||r.nombre||'?');
      });
      save(db); return {tocados, faltan};
    },
    // Precio de venta = costo + margen%. Redondea a $100.
    aplicarMargen(pct, soloRubro){
      const db=load(); let n=0;
      db.productos.forEach(p=>{
        if(soloRubro && p.categoria!==soloRubro) return;
        p.precio = Math.round((p.costo*(1+pct/100))/100)*100; n++;
      });
      save(db); return n;
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
  };
})();
