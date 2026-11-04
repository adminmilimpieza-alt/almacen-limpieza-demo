import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('lista compartida sólo incluye identificación y venta efectiva',()=>{
 const context=vm.createContext({document:{getElementById:()=>null},Store:{listarListasPrecios:()=>[{id:'mostrador',nombre:'Mostrador'},{id:'r',nombre:'Mayorista'}],get:()=>({productos:[{id:'p',codigo:'A',nombre:'Jabón',presentacion:'1L',precio:100,costo:50,margen:100},{id:'x',activo:false}]}),precioEnLista:()=>80}});
 vm.runInContext(readFileSync(new URL('../js/listas-precios.js',import.meta.url),'utf8')+';globalThis.api=ListasPrecios',context);
 const report=context.api.informe('r'); assert.equal(report.titulo,'Lista de precios · Mayorista');assert.deepEqual(Array.from(report.filas[0]),['A','Jabón','1L',80]);assert.equal(report.filas.length,1);assert.doesNotMatch(JSON.stringify(report),/costo|margen|deuda/i);
});
function cajaFixture(){
 let cliente='minorista',price=10;
 const productos=[{id:'u',codigo:'A',nombre:'Jabón 1L',categoria:'Líquidos 1L',stock:30,precio:100},{id:'b',codigo:'A',nombre:'Jabón 5L',categoria:'Líquidos 5L',stock:10,precio:400}];
 const context=vm.createContext({document:{getElementById:id=>id==='f-cliente'?{value:cliente}:null},Store:{disponibilidadVenta:id=>productos.find(p=>p.id===id)?.stock||0,comprobarStockVenta:()=>{},get:()=>({productos}),precioParaCliente:(id,c)=>id==='b'?(c==='mayorista'?30:40):(c==='mayorista'?6:price)},alert:()=>{},setTimeout:()=>{},clearTimeout:()=>{}});
 let source=readFileSync(new URL('../js/caja.js',import.meta.url),'utf8');
 source=source.replace('function renderCarrito(){','function renderCarrito(){ return;');
 source=source.replace('return {init, confirmarRecuperacion,','return {agregar, cambiarEnvase, scanAgregar, optimizar, items:()=>carrito, init, confirmarRecuperacion,');
 vm.runInContext(source+';globalThis.api=Caja',context);
 return {api:context.api,productos,cliente:v=>cliente=v,price:v=>price=v};
}
test('escáner y optimización 5L usan la lista del cliente',()=>{
 const f=cajaFixture();f.cliente('mayorista');
 for(let i=0;i<5;i++)f.api.scanAgregar('A');
 assert.equal(f.api.items().length,1);assert.equal(f.api.items()[0].id,'u'); // 5 × 6 equals the bidón: no unnecessary conversion.
 const retail=cajaFixture(); for(let i=0;i<5;i++)retail.api.scanAgregar('A');
 assert.equal(retail.api.items()[0].id,'b');assert.equal(retail.api.items()[0].precio,40);
});
test('refrescar un precio no modifica las líneas ya armadas',()=>{
 const f=cajaFixture();f.api.agregar(f.productos[0]);f.price(99);f.api.agregar(f.productos[0]);assert.equal(f.api.items()[0].precio,10);assert.equal(f.api.items()[0].cant,2);
});

test('cinco botellas con envase vinculado conservan su presentación',()=>{const f=cajaFixture();f.productos[0].envaseId='botella';for(let i=0;i<5;i++)f.api.scanAgregar('A');assert.equal(f.api.items().length,1);assert.equal(f.api.items()[0].id,'u');assert.equal(f.api.items()[0].cant,5);});

test('el mismo líquido 5L admite líneas con y sin bidón',()=>{
 const f=cajaFixture();f.api.agregar(f.productos[1],true);f.api.agregar(f.productos[1],false);f.api.agregar(f.productos[1],true);
 const items=f.api.items();assert.equal(items.length,2);assert.equal(items[0].incluirEnvase,true);assert.equal(items[0].cant,2);assert.equal(items[1].incluirEnvase,false);assert.equal(items[1].cant,1);
});
test('promoción conserva su identidad y cantidad en el ticket',()=>{
 const f=cajaFixture(),promo={id:'promo-a',tipo:'promo',nombre:'Combo',precio:90};f.api.agregar(promo);f.api.agregar(promo);
 const items=f.api.items();assert.equal(items.length,1);assert.equal(items[0].id,'promo-a');assert.equal(items[0].tipo,'promo');assert.equal(items[0].cant,2);assert.equal(items[0].pres,'Promo');
});


test('cambiar bidón reúne las cantidades en una única línea por opción',()=>{
 const f=cajaFixture();f.api.agregar(f.productos[1],true);f.api.agregar(f.productos[1],false);f.api.cambiarEnvase(f.api.items()[1],true);
 const items=f.api.items();assert.equal(items.length,1);assert.equal(items[0].incluirEnvase,true);assert.equal(items[0].cant,2);
});
