import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
let domain = {};
try { domain = await import('../worker/payments.mjs'); } catch (e) { if(e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
test('normaliza tickets fraccionados sin cambiar el importe', () => {
  assert.equal(typeof domain.normalizeItems, 'function');
  const result = domain.normalizeItems([{id:'p1',nombre:'Jabón',precio:100.15,cant:1.5}]);
  assert.equal(result.total, 150.23);
  assert.equal(result.mpItems[0].unit_price,150.23);
  assert.equal(result.mpItems[0].quantity,1);
});
test('rechaza precios, cantidades y totales inválidos', () => {
  assert.equal(typeof domain.normalizeItems, 'function');
  for(const it of [{precio:0,cant:1},{precio:100,cant:-1},{precio:Infinity,cant:1},{precio:100,cant:0}])
    assert.throws(()=>domain.normalizeItems([{id:'p1',nombre:'Jabón',...it}]));
  assert.throws(()=>domain.normalizeItems([]));
});
test('un pago solo corresponde con cuenta, referencia, moneda e importe exactos', () => {
  assert.equal(typeof domain.matchesPayment, 'function');
  const order = {id:'order1',total:150.23,collector_id:'123'};
  const payment = {id:1,external_reference:'order1',collector_id:123,currency_id:'ARS',transaction_amount:150.23,status:'approved',transaction_amount_refunded:0};
  assert.equal(domain.matchesPayment(order,payment),true);
  for(const change of [{collector_id:456},{external_reference:'otro'},{currency_id:'USD'},{transaction_amount:1},{transaction_amount_refunded:1}])
    assert.equal(domain.matchesPayment(order,{...payment,...change}),false);
});
function store(){
  const values = new Map();
  const context = vm.createContext({localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}, CATALOGO:{productos:[{nombre:'Jabón',precio:100,stock:5}],proveedores:[]}, console});
  vm.runInContext(readFileSync(new URL('../js/store.js',import.meta.url),'utf8')+'\nglobalThis.store = Store;',context);
  return context.store;
}
test('registrar dos veces el mismo pago crea una sola venta, ingreso y descuento',()=>{
  const s=store(); s.abrirTurno(0);
  assert.equal(typeof s.registrarPagoMP,'function');
  const order={id:'o1',status:'approved',payment_id:'123',total:100,items:[{id:'p1',nombre:'Jabón',precio:100,cant:1}],cliente_id:'c1'};
  s.registrarPagoMP(order); s.registrarPagoMP(order);
  const db=s.get(); assert.equal(db.ventas.length,1); assert.equal(db.movimientos.length,1); assert.equal(db.productos[0].stock,4); assert.equal(db.movimientos[0].conciliado,true);
});
test('un enlace pendiente nunca puede registrarse como venta pagada',()=>{
  const s=store(); s.abrirTurno(0);
  assert.equal(typeof s.registrarPagoMP,'function');
  assert.throws(()=>s.registrarPagoMP({id:'o2',status:'pending',items:[],total:100}));
  assert.equal(s.get().ventas.length,0); assert.equal(s.get().movimientos.length,0);
});
test('un reembolso parcial obliga a revisar el cobro previamente aprobado',()=>{
  assert.equal(typeof domain.paymentResult,'function');
  assert.equal(domain.paymentResult({id:'o',total:100,collector_id:'1',payment_id:'9',status:'approved'},[{id:9,external_reference:'o',collector_id:1,currency_id:'ARS',transaction_amount:100,transaction_amount_refunded:20,status:'approved'}]).status,'review');
});
