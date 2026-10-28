import test from 'node:test';
import assert from 'node:assert/strict';
import {crearInforme,enRango,fechaArgentina} from '../js/reportes-datos.mjs';
const db={clientes:[{id:'c',nombre:'Ana',tel:'123',listaPrecioId:'rev',deuda:80}],listasPrecios:[{id:'rev',nombre:'Revendedores',precios:{p:20}}],productos:[{id:'p',codigo:'A',nombre:'Jabón',presentacion:'1 litro',precio:30,costo:12,margen:150,stock:8},{id:'q',nombre:'Paño',precio:10,costo:2,stock:9}],ventas:[{id:'v',clienteId:'c',fecha:'2026-10-28T02:59:59.999Z',total:60,items:[{id:'p',nombre:'Jabón',cant:2,precio:30}]},{id:'h',clienteId:'c',historica:true,fecha:'2026-10-27',total:25,items:[{id:'p',nombre:'Jabón',cant:1,precio:25}]},{id:'a',clienteId:'c',anulada:true,fecha:'2026-10-27',total:999,items:[]}]};
test('fechas inclusivas usan día argentino y último milisegundo',()=>{
 assert.equal(fechaArgentina('2026-10-28T02:59:59.999Z'),'2026-10-27');
 assert.equal(enRango('2026-10-28T02:59:59.999Z','2026-10-27','2026-10-27'),true);
 assert.equal(enRango('2026-10-28T03:00:00.000Z','2026-10-27','2026-10-27'),false);
 assert.equal(enRango('inválida'),false);
});
test('ventas excluyen anuladas e históricas salvo inclusión explícita',()=>{
 const op={tipo:'ventas',desde:'2026-10-27',hasta:'2026-10-27'};
 assert.equal(crearInforme(db,op).filas.length,1);
 assert.equal(crearInforme(db,{...op,incluirHistoricas:true}).filas.length,2);
 assert.equal(crearInforme(db,{...op,clienteId:'otro'}).filas.length,0);
});
test('lista para compartir incluye precio asignado y herencia sin datos privados',()=>{
 const informe=crearInforme(db,{tipo:'precios',clienteId:'c'});
 assert.deepEqual(informe.columnas,['Código','Producto','Presentación','Venta']);
 assert.deepEqual(informe.filas,[['A','Jabón','1 litro',20],['','Paño','',10]]);
 assert.equal(/costo|margen|stock|deuda/i.test(JSON.stringify(informe)),false);
 assert.equal(crearInforme(db,{tipo:'precios'}).filas[0][3],30);
});
test('historial conserva cada fecha, detalle, precio previo y total de compra',()=>{
 const informe=crearInforme(db,{tipo:'historial',clienteId:'c'});
 assert.equal(informe.filas.length,2);
 assert.equal(informe.filas.find(f=>f[0]==='v')[6],30);
 assert.equal(informe.filas.find(f=>f[0]==='v')[8],60);
 assert.equal(informe.filas.find(f=>f[0]==='h')[3],'Histórica');
 assert.match(informe.resumen[1],/Jabón \(2 compras · 3 unidades\)/);
 assert.equal(crearInforme(db,{tipo:'historial',clienteId:'c',desde:'2026-10-28'}).filas.length,0);
});
test('informe privado de clientes contiene contacto, rol, lista y deuda',()=>{
 assert.deepEqual(crearInforme(db,{tipo:'clientes',clienteId:'c'}).filas,[['Ana','123','','','—','Revendedores',80]]);
});
test('caja filtra fechas y anulados y calcula ingresos egresos y neto',()=>{
 const informe=crearInforme({...db,movimientos:[{fecha:'2026-10-27',tipo:'ingreso',monto:100},{fecha:'2026-10-28T02:59:59Z',tipo:'egreso',monto:30},{fecha:'2026-10-27',tipo:'ingreso',monto:200,anulado:true},{fecha:'2026-10-28T03:00:00Z',tipo:'egreso',monto:60}]},{tipo:'caja',desde:'2026-10-27',hasta:'2026-10-27'});
 assert.equal(informe.filas.length,2);assert.match(informe.resumen[0],/Ingresos: \$100.00 · Egresos: \$30.00 · Neto: \$70.00/);
});
test('proveedores separa fecha del pedido y fecha de pago sin duplicar importe por producto',()=>{
 const informe=crearInforme({...db,proveedores:[{id:'pr',nombre:'Proveedor'}],pedidos:[{id:'p1',provId:'pr',fecha:'2026-10-01',fechaRecibido:'2026-10-27',estado:'recibido',items:[{nombre:'Jabón',cant:2},{nombre:'Paño',cant:3}],montoPagado:80,medioPago:'efectivo'}]},{tipo:'proveedores',desde:'2026-10-27',hasta:'2026-10-27'});
 assert.equal(informe.filas.length,1);assert.equal(informe.filas[0][1],'Pago');assert.equal(informe.filas[0][8],80);
});
test('historial muestra total sólo en primera línea de cada compra',()=>{
 const informe=crearInforme({...db,ventas:[{id:'multi',fecha:'2026-10-27',total:50,items:[{nombre:'A',cant:1,precio:20},{nombre:'B',cant:1,precio:30}]}]},{tipo:'historial'});
 assert.deepEqual(informe.filas.map(f=>f[8]),[50,'']);
});
test('habituales limita diez productos y prioriza compras antes de cantidad',()=>{
 const ventas=Array.from({length:14},(_,n)=>({id:'v'+n,fecha:'2026-10-27',total:1,items:[{id:'p'+n,nombre:'Producto '+n,cant:100-n,precio:1}]}));
 ventas.push({id:'extra',fecha:'2026-10-27',total:1,items:[{id:'p13',nombre:'Producto 13',cant:1,precio:1}]});
 const resumen=crearInforme({...db,ventas},{tipo:'historial'}).resumen[1];
 assert.ok(resumen.indexOf('Producto 13')<resumen.indexOf('Producto 0'));
 assert.equal((resumen.match(/\d+ unidades\)/g)||[]).length,10);
});
test('stock identifica fecha y hora de la instantánea argentina',()=>{
 assert.match(crearInforme(db,{tipo:'stock'}).subtitulo,/Existencias al .+ \(Argentina\)/);
});
