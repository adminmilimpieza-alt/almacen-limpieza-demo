import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture(product,extra={}){
 const nodes=new Map(), created=[],saved=[],alerts=[];
 function element(){return {value:'',checked:false,disabled:false,innerHTML:'',textContent:'',children:[],parentElement:{},style:{},classList:{add(){},remove(){}},addEventListener(name,fn){this[name]=fn;},appendChild(child){this.children.push(child);},insertAdjacentHTML(){},showModal(){this.open=true;},close(){this.open=false;}};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const db={productos:product?[product]:[],proveedores:[{id:'pv',nombre:'Proveedor Uno'}],...extra};
 const preview=x=>{let markup=x.margen;const net=x.modo==='precioFinal'?(x.precioFinal-x.envasePrecio)/(1+x.iva/100):x.modo==='margenVenta'?x.costo/(1-x.margenVenta/100):x.costo*(1+markup/100);markup=(net/x.costo-1)*100;return {costo:x.costo,iva:x.iva,margen:markup,margenVenta:(net-x.costo)/net*100,precioBase:net*(1+x.iva/100),precioFinal:net*(1+x.iva/100)+x.envasePrecio};};
 const context=vm.createContext({document:{getElementById:get,createElement(){const e=element();created.push(e);return e;}},Store:{get:()=>db,driftStock:()=>[],driftPrecio:()=>[],precioEnLista:id=>{const p=db.productos.find(p=>p.id===id);return Number(p.precio)+(p.envaseId?1070:0);},precioEnvase:()=>product?.envaseId?1070:0,previsualizarPrecioProducto:preview,guardarProductoEdicion:async p=>saved.push(p)},Fotos:{prepararEdicion:async p=>({product:p}),guardar:async p=>p,refresh:async()=>{}},Caja:{refresh(){}},crypto:{randomUUID:()=> 'new'},alert:x=>alerts.push(x)});
 vm.runInContext(readFileSync(new URL('../js/stock.js',import.meta.url),'utf8')+';globalThis.api=Stock',context);context.api.init();
 return {get,created,saved,alerts};
}
test('editar sólo stock conserva precio e IVA desconocido sin asignar una tasa',async()=>{
 const f=fixture({id:'p',nombre:'Legado',costo:100,precio:185,margen:50,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();f.get('f-stock').value=9;
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved.length,1);assert.equal(f.saved[0].precio,185);assert.equal(f.saved[0].iva,undefined);assert.equal(f.saved[0].stock,9);
});
test('editar precio final de un producto anterior no exige inventar su IVA',async()=>{
 const f=fixture({id:'p',nombre:'Legado',costo:100,precio:185,margen:50,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();f.get('f-precio').value='250';f.get('f-precio').input();
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved.length,1);assert.equal(f.saved[0].precio,250);assert.equal(f.saved[0].iva,undefined);assert.equal(f.saved[0].stock,3);
});
test('nuevo producto carga proveedor y exige elegir IVA para guardar precio',async()=>{
 const f=fixture();f.get('nuevo').onclick();assert.match(f.get('f-prov').innerHTML,/Proveedor Uno/);
 f.get('f-nombre').value='Nuevo';f.get('f-costo').value=100;f.get('f-margen').value=50;f.get('f-costo').input();
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved.length,0);assert.match(f.alerts[0],/IVA/);
 f.get('f-iva').value='21';f.get('f-iva').change();await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved.length,1);assert.equal(f.saved[0].iva,21);assert.equal(f.saved[0].precio,181.5);
});
test('precio final manual separa IVA y envase antes de guardar líquido',async()=>{
 const f=fixture({id:'p',nombre:'Líquido',presentacion:'5 L',envaseId:'e',costo:100,precio:181.5,margen:50,iva:21,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();f.get('f-precio').value=1312;f.get('f-precio').input();
 assert.ok(Math.abs(Number(f.get('f-margen').value)-100)<0.001);
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,242);assert.equal(f.saved[0].incluirEnvaseDefecto,true);
});

test('nuevo líquido usa el envase configurado y quitar bidón conserva el precio del líquido',async()=>{
 const f=fixture(null,{productos:[{id:'bidon',nombre:'Bidón',precio:1070}],catalogo:{envases:{bidonId:'bidon'}}});
 f.get('nuevo').onclick();f.get('f-nombre').value='Limpiador';f.get('f-cat').value='Líquidos 5L';f.get('f-pres').value='5 L';f.get('f-pres').input();
 f.get('f-costo').value=100;f.get('f-margen').value=50;f.get('f-iva').value='21';f.get('f-iva').change();
 assert.equal(Number(f.get('f-precio').value),1251.5);
 f.get('f-incluir-envase').checked=false;f.get('f-incluir-envase').change();assert.equal(Number(f.get('f-precio').value),181.5);
 f.get('f-incluir-envase').checked=true;f.get('f-incluir-envase').change();assert.equal(Number(f.get('f-precio').value),1251.5);
 f.get('f-incluir-envase').checked=false;f.get('f-incluir-envase').change();
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,181.5);assert.equal(f.saved[0].incluirEnvaseDefecto,false);
});
test('cambiar sólo la opción de bidón conserva precio e IVA legado',async()=>{
 const f=fixture({id:'p',nombre:'Líquido',presentacion:'5 L',envaseId:'e',costo:100,precio:185,margen:50,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();assert.equal(Number(f.get('f-precio').value),1255);
 f.get('f-incluir-envase').checked=false;f.get('f-incluir-envase').change();assert.equal(Number(f.get('f-precio').value),185);
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,185);assert.equal(f.saved[0].iva,undefined);assert.equal(f.saved[0].incluirEnvaseDefecto,false);
});
test('la sugerencia no cambia el precio hasta aplicarla y admite un importe elegido',async()=>{
 const f=fixture({id:'p',nombre:'Producto',costo:100,precio:181.5,margen:50,iva:21,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();
 assert.equal(Number(f.get('f-precio-redondeado').value),180);
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved[0].precio,181.5);
 f.get('f-precio-redondeado').value='200';f.get('f-aplicar-redondeado').onclick();
 assert.equal(Number(f.get('f-precio').value),200);
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved[1].precio,200);
});
test('agregar un adicional suma su precio y guarda la selección sin cambiar la base',async()=>{
 const f=fixture({id:'p',nombre:'Producto',costo:100,precio:181.5,margen:50,iva:21,stock:3},{productos:[{id:'p',nombre:'Producto',costo:100,precio:181.5,margen:50,iva:21,stock:3},{id:'spray',nombre:'Pulverizador',categoria:'Adicionales',precio:100,costo:50,stock:10}]});
 f.created.find(e=>e.textContent==='Editar').onclick();f.get('f-adicional').value='spray';f.get('f-adicional-agregar').onclick();assert.equal(Number(f.get('f-precio').value),281.5);
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,181.5);assert.equal(f.saved[0].adicionales[0].id,'spray');assert.equal(f.saved[0].adicionales[0].cant,1);
});
