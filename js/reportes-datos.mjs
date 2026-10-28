const numero = v => Number.isFinite(Number(v)) ? Number(v) : 0;
export function fechaArgentina(valor) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) return String(valor);
  const d = new Date(valor);
  if (!Number.isFinite(d.getTime())) return '';
  const partes = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const p = Object.fromEntries(partes.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function enRango(fecha, desde='', hasta='') {
  const dia = fechaArgentina(fecha);
  return !!dia && (!desde || dia >= desde) && (!hasta || dia <= hasta);
}
export function listas(db) { return [{id:'mostrador',nombre:'Mostrador'},...(db.listasPrecios||[]).filter(l=>l.id!=='mostrador')]; }
export function precioLista(db,p,id='mostrador') {
  const particular = (db.listasPrecios||[]).find(l=>l.id===id)?.precios?.[p.id];
  return id!=='mostrador' && particular != null && Number.isFinite(Number(particular)) ? Number(particular) : numero(p.precio);
}
export function crearInforme(db,op={}) {
  const tipo=op.tipo||'ventas', clientes=db.clientes||[], productos=db.productos||[];
  const cliente=clientes.find(c=>c.id===op.clienteId);
  const listaId=op.listaId||cliente?.listaPrecioId||'mostrador';
  const nombreLista=listas(db).find(l=>l.id===listaId)?.nombre||'Mostrador';
  const informe={titulo:'',subtitulo:'',columnas:[],filas:[],resumen:[]};
  const ventas=(db.ventas||[]).filter(v=>!v.anulada&&!v.anulado&&enRango(v.fecha,op.desde,op.hasta)&&(!op.clienteId||v.clienteId===op.clienteId));
  const periodo=`Desde ${op.desde||'el inicio'} hasta ${op.hasta||'hoy'} · fechas de Argentina`;
  if(tipo==='precios') {
    Object.assign(informe,{titulo:`Lista de precios · ${nombreLista}`,subtitulo:cliente?`Para ${cliente.nombre}`:'Precios de venta',columnas:['Código','Producto','Presentación','Venta'],filas:productos.filter(p=>p.activo!==false).map(p=>[p.codigo||'',p.nombre,p.presentacion||'',precioLista(db,p,listaId)])});
  } else if(tipo==='clientes') {
    Object.assign(informe,{titulo:'Clientes · uso interno',subtitulo:'Contiene datos privados y deuda actual',columnas:['Cliente','Teléfono','Dirección','Referencia','Rol','Lista asignada','Deuda actual'],filas:clientes.filter(c=>!op.clienteId||c.id===op.clienteId).map(c=>[c.nombre,c.tel||'',c.extra||c.direccion||'',c.ref||'',c.rol||'—',listas(db).find(l=>l.id===(c.listaPrecioId||'mostrador'))?.nombre||'Mostrador',numero(c.deuda)])});
  } else if(tipo==='caja') {
    const movimientos=(db.movimientos||[]).filter(m=>!m.anulado&&enRango(m.fecha,op.desde,op.hasta)).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));
    const ingreso=movimientos.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+numero(m.monto),0);
    const egreso=movimientos.filter(m=>m.tipo==='egreso').reduce((s,m)=>s+numero(m.monto),0);
    Object.assign(informe,{titulo:'Caja por período',subtitulo:periodo,columnas:['Fecha','Tipo','Medio','Concepto','Ingreso','Egreso'],filas:movimientos.map(m=>[fechaArgentina(m.fecha),m.tipo,m.medio||'',m.concepto||'',m.tipo==='ingreso'?numero(m.monto):'',m.tipo==='egreso'?numero(m.monto):'']),resumen:[`Ingresos: $${ingreso.toFixed(2)} · Egresos: $${egreso.toFixed(2)} · Neto: $${(ingreso-egreso).toFixed(2)}`]});
  } else if(tipo==='proveedores') {
    const eventos=[];
    for(const p of db.pedidos||[]) {
      if(p.anulado||p.anulada)continue;
      const proveedor=(db.proveedores||[]).find(x=>x.id===p.provId)?.nombre||'Sin proveedor';
      if(enRango(p.fecha,op.desde,op.hasta)) {
        const items=p.items?.length?p.items:[{nombre:p.detalle||'Sin detalle',cant:''}];
        items.forEach(i=>eventos.push([fechaArgentina(p.fecha),'Pedido',p.id||'',proveedor,p.estado||'',i.nombre||productos.find(x=>x.id===i.id)?.nombre||'',i.cant??'','','']));
      }
      const fechaPago=p.fechaPago||p.fechaRecibido;
      if(numero(p.montoPagado)>0&&enRango(fechaPago,op.desde,op.hasta))eventos.push([fechaArgentina(fechaPago),'Pago',p.id||'',proveedor,p.estado||'','Pago de pedido','',p.medioPago||'',numero(p.montoPagado)]);
    }
    eventos.sort((a,b)=>b[0].localeCompare(a[0]));
    Object.assign(informe,{titulo:'Pedidos y pagos a proveedores',subtitulo:periodo+' · pagos por fecha de pago o recepción registrada',columnas:['Fecha','Registro','Pedido','Proveedor','Estado','Detalle','Cantidad','Medio de pago','Pagado'],filas:eventos,resumen:[`Pagos del período: $${eventos.reduce((s,f)=>s+numero(f[8]),0).toFixed(2)}`]});
  } else if(tipo==='stock') {
    Object.assign(informe,{titulo:'Stock actual',subtitulo:'Existencias al '+new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'}).format(new Date())+' (Argentina); no es stock histórico',columnas:['Código','Producto','Presentación','Stock','Venta'],filas:productos.filter(p=>p.activo!==false).map(p=>[p.codigo||'',p.nombre,p.presentacion||'',numero(p.stock),numero(p.precio)])});
  } else if(tipo==='historial') {
    Object.assign(informe,{titulo:`Historial de compras · ${cliente?.nombre||'Todos los clientes'}`,subtitulo:periodo,columnas:['Compra','Fecha','Cliente','Tipo','Producto','Cantidad','Precio unitario','Subtotal','Total compra','Notas']});
    const frecuentes=new Map();
    ventas.sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).forEach((v,index)=>{
      const vistos=new Set();
      for(const [linea,i] of (v.items||[]).entries()) {
        informe.filas.push([v.id||index+1,fechaArgentina(v.fecha),clientes.find(c=>c.id===v.clienteId)?.nombre||'Sin cliente',v.historica?'Histórica':'Operativa',i.nombre,numero(i.cant),numero(i.precio),numero(i.cant)*numero(i.precio),linea===0?numero(v.total):'',v.notas||'']);
        const key=i.id||i.nombre; const f=frecuentes.get(key)||{nombre:i.nombre,cantidad:0,compras:0}; f.cantidad+=numero(i.cant); if(!vistos.has(key)){f.compras++;vistos.add(key);} frecuentes.set(key,f);
      }
    });
    informe.resumen=[`${ventas.length} compras · Total: $${ventas.reduce((s,v)=>s+numero(v.total),0).toFixed(2)}`,'Productos habituales (hasta 10, por compras y unidades): '+([...frecuentes.values()].sort((a,b)=>b.compras-a.compras||b.cantidad-a.cantidad).slice(0,10).map(f=>`${f.nombre} (${f.compras} compras · ${f.cantidad} unidades)`).join(' · ')||'sin compras')];
  } else {
    const operativas=ventas.filter(v=>op.incluirHistoricas||!v.historica);
    Object.assign(informe,{titulo:'Ventas por período',subtitulo:periodo+(op.incluirHistoricas?' · incluye compras históricas':' · sólo ventas operativas'),columnas:['Fecha','Cliente','Pago','Tipo','Total'],filas:operativas.map(v=>[fechaArgentina(v.fecha),clientes.find(c=>c.id===v.clienteId)?.nombre||'Mostrador',v.historica?'Sin efecto financiero':v.pago||'',v.historica?'Histórica':'Operativa',numero(v.total)]),resumen:[`${operativas.length} ventas · Total: $${operativas.reduce((s,v)=>s+numero(v.total),0).toFixed(2)}`]});
  }
  return informe;
}
