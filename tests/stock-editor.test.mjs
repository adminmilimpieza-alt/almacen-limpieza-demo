import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import '../js/store.js';
function fixture(product,extra={}){
 const nodes=new Map(), created=[],saved=[],alerts=[];
 function element(){return {value:'',checked:false,disabled:false,innerHTML:'',textContent:'',children:[],parentElement:{},style:{},classList:{add(){},remove(){}},addEventListener(name,fn){this[name]=fn;},appendChild(child){this.children.push(child);},insertAdjacentHTML(){},showModal(){this.open=true;},close(){this.open=false;}};}
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const db={productos:product?[product]:[],proveedores:[{id:'pv',nombre:'Proveedor Uno'}],...extra};
 const preview=globalThis.MiLimpiezaStoreFactory({}).previsualizarPrecioProducto;
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
test('nuevo producto permite IVA cero y aplica costo financiero del 10%',async()=>{
 const f=fixture();f.get('nuevo').onclick();assert.match(f.get('f-prov').innerHTML,/Proveedor Uno/);
 f.get('f-nombre').value='Nuevo';f.get('f-costo').value=100;f.get('f-margen').value=50;f.get('f-margen').input();f.get('f-costo').input();
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved.length,1);assert.equal(f.saved[0].iva,0);assert.equal(f.saved[0].precio,165);
 f.get('f-iva').value='21';f.get('f-iva').change();await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved.length,2);assert.equal(f.saved[1].iva,21);assert.equal(f.saved[1].precio,199.65);
});
test('precio final manual separa IVA y envase antes de guardar líquido',async()=>{
 const f=fixture({id:'p',nombre:'Líquido',presentacion:'5 L',envaseId:'e',costo:100,precio:181.5,margen:50,iva:21,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();f.get('f-precio').value=1312;f.get('f-precio').input();
 assert.ok(Math.abs(Number(f.get('f-margen').value)-81.818182)<0.001);
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,242);assert.equal(f.saved[0].incluirEnvaseDefecto,true);
});

test('nuevo líquido usa el envase configurado y quitar bidón conserva el precio del líquido',async()=>{
 const f=fixture(null,{productos:[{id:'bidon',nombre:'Bidón',precio:1070}],catalogo:{envases:{bidonId:'bidon'}}});
 f.get('nuevo').onclick();f.get('f-nombre').value='Limpiador';f.get('f-cat').value='Líquidos 5L';f.get('f-pres').value='5 L';f.get('f-pres').input();
 f.get('f-costo').value=100;f.get('f-costo').input();f.get('f-margen').value=50;f.get('f-margen').input();f.get('f-iva').value='21';f.get('f-iva').change();
 assert.equal(Number(f.get('f-precio').value),1269.65);
 f.get('f-incluir-envase').checked=false;f.get('f-incluir-envase').change();assert.equal(Number(f.get('f-precio').value),199.65);
 f.get('f-incluir-envase').checked=true;f.get('f-incluir-envase').change();assert.equal(Number(f.get('f-precio').value),1269.65);
 f.get('f-incluir-envase').checked=false;f.get('f-incluir-envase').change();
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,199.65);assert.equal(f.saved[0].incluirEnvaseDefecto,false);
});
test('cambiar sólo la opción de bidón conserva precio e IVA legado',async()=>{
 const f=fixture({id:'p',nombre:'Líquido',presentacion:'5 L',envaseId:'e',costo:100,precio:185,margen:50,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();assert.equal(Number(f.get('f-precio').value),1255);
 f.get('f-incluir-envase').checked=false;f.get('f-incluir-envase').change();assert.equal(Number(f.get('f-precio').value),185);
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,185);assert.equal(f.saved[0].iva,undefined);assert.equal(f.saved[0].incluirEnvaseDefecto,false);
});
test('editar el redondeado actualiza el precio calculado y persiste el importe comercial',async()=>{
 const f=fixture({id:'p',nombre:'Producto',costo:100,precio:181.5,margen:50,iva:21,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();
 assert.equal(Number(f.get('f-precio-redondeado').value),181.5);
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved[0].precio,181.5);
 f.get('f-precio-redondeado').value='200';f.get('f-precio-redondeado').input();
 assert.equal(Number(f.get('f-precio').value),200);
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved[1].precio,200);
});
test('agregar un adicional suma su precio y guarda la selección sin cambiar la base',async()=>{
 const f=fixture({id:'p',nombre:'Producto',costo:100,precio:181.5,margen:50,iva:21,stock:3},{productos:[{id:'p',nombre:'Producto',costo:100,precio:181.5,margen:50,iva:21,stock:3},{id:'spray',nombre:'Pulverizador',categoria:'Adicionales',precio:100,costo:50,stock:10}]});
 f.created.find(e=>e.textContent==='Editar').onclick();f.get('f-adicional').value='spray';f.get('f-adicional-agregar').onclick();assert.equal(Number(f.get('f-precio').value),281.5);
 await f.get('guardar-prod').onclick({preventDefault(){}});assert.equal(f.saved[0].precio,181.5);assert.equal(f.saved[0].adicionales[0].id,'spray');assert.equal(f.saved[0].adicionales[0].cant,1);
});

test('el último campo editado dirige el cálculo y el desglose admite una pérdida',async()=>{
 const f=fixture();
 f.get('nuevo').onclick();
 f.get('f-nombre').value='Producto de prueba';
 const editar=(id,value,event='input')=>{f.get(id).value=String(value);f.get(id)[event]();};
 editar('f-costo',1000);
 editar('f-margen',50);
 editar('f-iva',21,'change');
 assert.equal(f.get('f-precio').value,1996.5);
 editar('f-precio-redondeado',2000);
 assert.equal(f.get('f-precio').value,2000);
 assert.equal(Number(f.get('f-margen').value).toFixed(2),'50.26');
 assert.equal(f.get('f-financiero').checked,true);
 f.get('f-financiero').checked=false;f.get('f-financiero').change();
 assert.equal(f.get('f-precio').value,1818.18);
 editar('f-margen',50);
 assert.equal(f.get('f-precio-redondeado').value,1815);
 editar('f-costo',500);
 assert.equal(f.get('f-precio').value,907.5);
 editar('f-iva',10.5,'change');
 assert.equal(f.get('f-precio').value,828.75);
 editar('f-precio',400);
 assert.equal(f.get('f-precio-redondeado').value,400);
 assert.match(f.get('f-precio-detalle').textContent,/ganancia negativa/i);
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved[0].costoFinanciero,0);
 assert.equal(f.saved[0].precio,400);
 f.get('f-financiero').checked=true;f.get('f-financiero').change();
 assert.equal(f.get('f-precio-redondeado').value,440);
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved[1].costoFinanciero,10);
});

test('ingresar costo por litro guarda el costo total de la presentación',async()=>{
 const f=fixture();
 f.get('nuevo').onclick();
 f.get('f-nombre').value='Líquido de prueba';
 f.get('f-pres').value='5 L';f.get('f-pres').input();
 f.get('f-costo-litro').checked=true;f.get('f-costo-litro').change();
 f.get('f-costo').value='100';f.get('f-costo').input();
 f.get('f-margen').value='50';f.get('f-margen').input();
 assert.equal(f.get('f-precio').value,825);
 await f.get('guardar-prod').onclick({preventDefault(){}});
 assert.equal(f.saved[0].costo,500);
 assert.equal(f.saved[0].precio,825);
 assert.equal(f.saved[0].costoFinanciero,10);
});

test('editar un producto guardado sin costo financiero abre la casilla desmarcada',()=>{
 const f=fixture({id:'p',nombre:'Producto',costo:100,precio:150,margen:50,iva:0,costoFinanciero:0,stock:3});
 f.created.find(e=>e.textContent==='Editar').onclick();
 assert.equal(f.get('f-financiero').checked,false);
 assert.equal(f.get('f-precio').value,150);
});
