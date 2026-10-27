import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function cajaFixture(cobrar){
  const elements=new Map();
  function element(){ return {value:'',innerHTML:'',textContent:'',disabled:false,children:[],classList:{add(){}},appendChild(x){this.children.push(x);},addEventListener(){},focus(){},closest(){return null;},querySelectorAll(){return [];}}; }
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const db={productos:[{id:'p',nombre:'Producto',codigo:'1',categoria:'Unidad',precio:50,stock:5}],clientes:[],movimientos:[]};
  const alerts=[];
  const ctx=vm.createContext({document:{getElementById:get,createElement:element,addEventListener(){}},Store:{get:()=>db,cobrar},Stock:{render(){}},Reportes:{render(){}},alert:x=>alerts.push(x),setTimeout(){},clearTimeout(){}});
  vm.runInContext(fs.readFileSync(new URL('../js/caja.js',import.meta.url),'utf8')+';globalThis.caja=Caja;',ctx);
  ctx.caja.init();
  get('catalogo').children[0].onclick();
  return {ctx,get,alerts,db};
}

test('cobro espera confirmación y conserva el carrito ante error',async()=>{
  let fail;
  const f=cajaFixture(()=>new Promise((_,reject)=>{fail=reject;}));
  const pending=f.get('cobrar').onclick();
  assert.equal(f.get('total').textContent,50);
  assert.equal(f.alerts.length,0);
  assert.equal(f.get('cobrar').disabled,true);
  fail(new Error('Sin conexión'));
  await pending;
  assert.equal(f.get('total').textContent,50);
  assert.deepEqual(f.alerts,['Sin conexión']);
  assert.equal(f.get('cobrar').disabled,false);
});

test('recuperación solo vacía el carrito que corresponde al cobro',()=>{
  const f=cajaFixture(()=>50);
  assert.equal(f.ctx.caja.confirmarRecuperacion([]),false);
  assert.equal(f.get('total').textContent,50);
  const items=[{id:'p',nombre:'Producto',precio:50,cant:1,pres:'U',codigo:'1'}];
  assert.equal(f.ctx.caja.confirmarRecuperacion(items),true);
  assert.equal(f.get('total').textContent,0);
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
test('durante el cobro queda bloqueado todo el ticket, incluidos escáner y tarjetas',async()=>{let resolve;const f=cajaFixture(()=>new Promise(r=>{resolve=r;}));const pending=f.get('cobrar').onclick();assert.equal(f.get('caja-controles').disabled,true);resolve(50);await pending;assert.equal(f.get('caja-controles').disabled,false);assert.equal(f.get('total').textContent,0);});
test('cámara o tarjeta no agrega productos mientras el ticket está bloqueado',async()=>{let resolve;const f=cajaFixture(()=>new Promise(r=>{resolve=r;}));const card=f.get('catalogo').children[0];const pending=f.get('cobrar').onclick();card.onclick();assert.equal(f.get('total').textContent,50);resolve(50);await pending;assert.equal(f.get('total').textContent,0);});
