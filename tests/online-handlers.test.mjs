import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import '../js/store.js';
const totalesCobro=globalThis.MiLimpiezaStoreFactory({getItem:()=>null,setItem(){}}).totalesCobro;

function cajaFixture(cobrar){
  const elements=new Map();
  function element(){ return {value:'',innerHTML:'',textContent:'',disabled:false,children:[],classList:{add(){}},setAttribute(){},append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;},appendChild(x){this.children.push(x);},addEventListener(){},focus(){},closest(){return null;},querySelectorAll(){return [];}}; }
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const db={productos:[{id:'p',nombre:'Producto',codigo:'1',categoria:'Unidad',precio:50,stock:5}],clientes:[],movimientos:[]};
  const alerts=[];
  const ctx=vm.createContext({document:{getElementById:get,createElement:element,createTextNode:x=>({textContent:x}),addEventListener(){}},Store:{totalesCobro,disponibilidadVenta:id=>db.productos.find(p=>p.id===id)?.stock||0,comprobarStockVenta:()=>{},get:()=>db,cobrar,precioParaCliente:id=>db.productos.find(p=>p.id===id)?.precio||0},Stock:{render(){}},Reportes:{render(){}},alert:x=>alerts.push(x),setTimeout(){},clearTimeout(){}});
  vm.runInContext(fs.readFileSync(new URL('../js/caja.js',import.meta.url),'utf8')+';globalThis.caja=Caja;',ctx);
  ctx.caja.init();
  get('catalogo').children[0].onclick();
  return {ctx,get,alerts,db};
}

test('cobro espera confirmación y conserva el carrito ante error',async()=>{
  let fail;
  const f=cajaFixture(()=>new Promise((_,reject)=>{fail=reject;}));
  const pending=f.get('cobrar').onclick();
  assert.equal(f.get('total').textContent,'50,00');
  assert.equal(f.alerts.length,0);
  assert.equal(f.get('cobrar').disabled,true);
  fail(new Error('Sin conexión'));
  await pending;
  assert.equal(f.get('total').textContent,'50,00');
  assert.deepEqual(f.alerts,['Sin conexión']);
  assert.equal(f.get('cobrar').disabled,false);
});

test('recuperación solo vacía el carrito que corresponde al cobro',()=>{
  const f=cajaFixture(()=>50);
  assert.equal(f.ctx.caja.confirmarRecuperacion([]),false);
  assert.equal(f.get('total').textContent,'50,00');
  const items=[{id:'p',nombre:'Producto',precio:50,cant:1,pres:'U',codigo:'1',incluirEnvase:true}];
  assert.equal(f.ctx.caja.confirmarRecuperacion(items),true);
  assert.equal(f.get('total').textContent,'0,00');
});

// Model the browser behavior: replacing option markup selects the first option.
test('actualización remota conserva el cliente elegido para cobrar',()=>{
  const f=cajaFixture(()=>50);
  f.db.clientes=[{id:'c1',nombre:'Mostrador'},{id:'c2',nombre:'Cliente elegido'}];
  const select=f.get('f-cliente');
  Object.defineProperty(select,'innerHTML',{set(markup){this.value=markup.match(/value="([^"]*)"/)?.[1]||'';},get(){return '';}});
  select.value='c2';
  f.ctx.caja.refresh();
  assert.equal(select.value,'c2');
  f.db.clientes.unshift({id:'nuevo',nombre:'Nuevo cliente remoto'});
  f.ctx.caja.refresh();
  assert.equal(select.value,'c2');
});
test('durante el cobro queda bloqueado todo el ticket, incluidos escáner y tarjetas',async()=>{let resolve;const f=cajaFixture(()=>new Promise(r=>{resolve=r;}));const pending=f.get('cobrar').onclick();assert.equal(f.get('caja-controles').disabled,true);resolve(50);await pending;assert.equal(f.get('caja-controles').disabled,false);assert.equal(f.get('total').textContent,'0,00');});
test('cámara o tarjeta no agrega productos mientras el ticket está bloqueado',async()=>{let resolve;const f=cajaFixture(()=>new Promise(r=>{resolve=r;}));const card=f.get('catalogo').children[0];const pending=f.get('cobrar').onclick();card.onclick();assert.equal(f.get('total').textContent,'50,00');resolve(50);await pending;assert.equal(f.get('total').textContent,'0,00');});


test('bonificación se elige y se apaga al pasar a Mercado Pago',()=>{
  const f=cajaFixture(()=>50);f.get('pago').value='efectivo';
  assert.equal(f.get('total').textContent,'50,00');
  f.get('bonificacion').checked=true;f.get('bonificacion').onchange();
  assert.equal(f.get('total').textContent,'45,00');
  f.get('pago').value='mercadopago';f.get('pago').onchange();
  assert.equal(f.get('bonificacion').checked,false);assert.equal(f.get('bonificacion').disabled,true);assert.equal(f.get('total').textContent,'50,00');
});
test('precio cambiado exige revisar el ticket antes de cobrar',async()=>{
  let llamadas=0;const f=cajaFixture(()=>{llamadas++;return 75;});f.db.productos[0].precio=75;
  await f.get('cobrar').onclick();assert.equal(llamadas,0);assert.equal(f.get('total').textContent,'75,00');assert.match(f.alerts[0],/Revisá el ticket/);
  await f.get('cobrar').onclick();assert.equal(llamadas,1);
});


test('Link de pago muestra primero el total completo de Mercado Pago',async()=>{
 const f=cajaFixture(()=>50);f.ctx.Store.turnoAbierto=()=>true;let enlaces=0;f.ctx.Pagos={crearLink:()=>{enlaces++;}};
 f.get('pago').value='efectivo';f.get('bonificacion').checked=true;f.get('bonificacion').onchange();assert.equal(f.get('total').textContent,'45,00');
 await f.get('linkmp').onclick();assert.equal(enlaces,0);assert.equal(f.get('pago').value,'mercadopago');assert.equal(f.get('bonificacion').checked,false);assert.equal(f.get('total').textContent,'50,00');assert.match(f.alerts.at(-1),/Revisá el total/);
});

test('catálogo permite vender líquido 5L sin bidón cuando no hay envases',async()=>{
 const f=cajaFixture(()=>50);f.get('vaciar').onclick();Object.assign(f.db.productos[0],{nombre:'Detergente 5L',presentacion:'5L',categoria:'Líquidos 5L',envaseId:'bidon'});
 f.ctx.Store.disponibilidadVenta=(_id,env=true)=>env?0:5;f.ctx.caja.refresh();
 const option=f.get('catalogo').children.at(-1),sin=option.children[1];assert.match(sin.textContent,/Sin bidón/);assert.equal(sin.disabled,false);sin.onclick();
 let sent;f.ctx.Store.cobrar=items=>{sent=items;return 50;};await f.get('cobrar').onclick();assert.equal(sent[0].incluirEnvase,false);assert.equal(sent[0].cant,1);
});


test('bidón accesorio 5L no ofrece quitar envase ni interrumpe las pestañas',()=>{
 const f=cajaFixture(()=>50);f.db.productos.push({id:'env',nombre:'BIDON 5L',presentacion:'5L',categoria:'Accesorios',precio:1070,stock:3});
 const original=f.ctx.Store.precioParaCliente;f.ctx.Store.precioParaCliente=(id,cliente,env)=>{if(id==='env'){assert.notEqual(env,false);return 1070;}return original(id,cliente,env);};f.ctx.caja.refresh();
 assert.equal(typeof f.get('tab-promos').onclick,'function');f.get('tab-promos').onclick();assert.equal(typeof f.get('tab-productos').onclick,'function');f.get('tab-productos').onclick();
 const accessory=f.get('catalogo').children.at(-1);assert.equal(accessory.className,'prod-card');
});
