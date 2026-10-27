import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handleBusiness,transactBusiness,replayBusiness} from '../worker/business.mjs';
import {sessionCookie} from '../worker/security.mjs';
const password='business-password-long';
function db(){const d=new DatabaseSync(':memory:');const reads=[],writes=[];return {reads,writes,prepare(sql){if(sql.startsWith('SELECT'))reads.push(sql);return {args:[],bind(...args){this.args=args;return this;},async first(){return d.prepare(sql).get(...this.args)||null;},async all(){return {results:d.prepare(sql).all(...this.args)};},async run(){writes.push({sql,args:this.args});return {meta:{changes:Number(d.prepare(sql).run(...this.args).changes)}};},sql};},async batch(list){d.exec('BEGIN');try{const r=[];for(const s of list)r.push(await s.run());d.exec('COMMIT');return r;}catch(e){d.exec('ROLLBACK');throw e;}}};}
async function read(env,auth=true){return handleBusiness(new Request('https://app.test/api/business',{headers:auth?{Cookie:'milimpieza_session='+await sessionCookie(password)}:{}}),env);}
const op=(revision,name,args,id=crypto.randomUUID())=>({id,revision,op:name,args});
test('private initialization, shared customers, stock, receipts and stale revision',async()=>{
 const env={DB:db(),ADMIN_PASSWORD:password};await assert.rejects(read(env,false),{status:401});
 let first=await (await read(env)).json();assert.equal(first.state.cfg,undefined);assert.ok(first.state.productos.length);
 let saved=await transactBusiness(env,op(first.revision,'upsertEntidad',['clientes',{id:'c2',nombre:'Ana',deuda:0}]));
 assert.ok((await (await read(env)).json()).state.clientes.some(c=>c.id==='c2'));
 await assert.rejects(transactBusiness(env,op(first.revision,'abrirTurno',[0])),{status:409});
 saved=await transactBusiness(env,op(saved.revision,'abrirTurno',[0]));
 const p=saved.state.productos[0];const draft={...p,stock:1};saved=await transactBusiness(env,op(saved.revision,'guardarProductoEdicion',[draft,p]));
 const sale=op(saved.revision,'cobrar',[[{id:p.id,nombre:p.nombre,precio:p.precio,cant:1}],'efectivo','c2']);
 const [a,b]=await Promise.allSettled([transactBusiness(env,sale),transactBusiness(env,op(saved.revision,'cobrar',sale.args))]);assert.equal([a,b].filter(x=>x.status==='fulfilled').length,1);
 const replay=await transactBusiness(env,sale);assert.equal(replay.state.ventas.length,1);assert.equal(replay.state.productos[0].stock,0);
 await assert.rejects(transactBusiness(env,{...sale,args:[]}),{status:409});
 await assert.rejects(transactBusiness(env,op(replay.revision,'registrarPagoMP',[{}])),{status:400});
 await assert.rejects(transactBusiness(env,op(replay.revision,'upsertEntidad',['ventas',{id:'bad'}])),{status:400});
});
test('endpoint requires same origin, rejects device config and invalid quantities',async()=>{
 const env={DB:db(),ADMIN_PASSWORD:password};const current=await (await read(env)).json();
 const headers={Cookie:'milimpieza_session='+await sessionCookie(password),'Content-Type':'application/json'};
 await assert.rejects(handleBusiness(new Request('https://app.test/api/business',{method:'POST',headers:{...headers,Origin:'https://evil.test'},body:JSON.stringify(op(current.revision,'abrirTurno',[0]))}),env),{status:403});
 const changed=await transactBusiness(env,op(current.revision,'abrirTurno',[0]));const p=changed.state.productos[0];
 for(const cant of [-1,0])await assert.rejects(transactBusiness(env,op(changed.revision,'cobrar',[[{id:p.id,precio:p.precio,cant}],'efectivo','c1'])),{status:400});
 await assert.rejects(transactBusiness(env,op(changed.revision,'cobrar',[[{id:p.id,precio:p.precio,cant:1},{id:p.id,precio:p.precio,cant:1}],'efectivo','c1'])),{status:400});
 await assert.rejects(transactBusiness(env,op(changed.revision,'upsertEntidad',['cfg',{id:'private'}])),{status:400});
 const response=await handleBusiness(new Request('https://app.test/api/business?since='+changed.revision,{headers}),env);assert.deepEqual(await response.json(),{revision:changed.revision,unchanged:true});
});
test('unchanged polling reads only one metadata row and performs no DDL',async()=>{
 const env={DB:db(),ADMIN_PASSWORD:password};const first=await (await read(env)).json();env.DB.reads.length=0;
 const headers={Cookie:'milimpieza_session='+await sessionCookie(password)};
 for(let i=0;i<3;i++){const r=await handleBusiness(new Request('https://app.test/api/business?since='+first.revision,{headers}),env);assert.equal((await r.json()).unchanged,true);}
 assert.deepEqual(env.DB.reads,Array(3).fill('SELECT revision FROM business_meta WHERE id=1'));
});
test('all business mutations preserve stock, debts, supplier orders and cash closure',async()=>{
 const env={DB:db(),ADMIN_PASSWORD:password};let current=await (await read(env)).json();
 const run=async(name,args)=>{current=await transactBusiness(env,op(current.revision,name,args));return current;};
 await run('upsertEntidad',['proveedores',{id:'prov-test',nombre:'Proveedor'}]);
 await run('upsertEntidad',['clientes',{id:'cust-test',nombre:'Cliente',deuda:0}]);
 await run('upsertEntidad',['clientes',{id:'remove-me',nombre:'Temporal',deuda:0}]);await run('delEntidad',['clientes','remove-me']);
 const product={id:'product-test',nombre:'Prueba',codigo:'TEST',categoria:'Prueba',presentacion:'1',stock:8,costo:100,precio:150,margen:50,activo:true,provId:'prov-test'};
 await run('guardarProductoEdicion',[product,null]);await run('toggleActivo',[product.id,false]);await run('toggleActivo',[product.id,true]);
 await run('editarPrecio',[product.id,'costo','120']);assert.equal(current.state.productos.find(p=>p.id===product.id).precio,180);
 await run('actualizarPrecios',[[{codigo:'TEST',costo:100,margen:50,precio:150}],'Prueba']);await run('aplicarMargen',['propio','Prueba']);await run('aplicarMargen',[50,'Prueba']);
 await run('asignarProveedor',[[product.id],'prov-test']);
 await run('abrirTurno',['100']);
 const line={id:product.id,nombre:product.nombre,cant:2,precio:150};await run('cobrar',[[line],'cuenta','cust-test']);
 assert.equal(current.state.clientes.find(c=>c.id==='cust-test').deuda,300);
 await run('cobrarDeuda',['cust-test','100','efectivo']);assert.equal(current.state.clientes.find(c=>c.id==='cust-test').deuda,200);
 const paidSale=current.state.ventas[0];await assert.rejects(run('anularVenta',[paidSale.id]),{status:400});
 await run('cobrar',[[line],'efectivo','cust-test']);const sale=current.state.ventas[0];await run('anularVenta',[sale.id]);assert.equal(current.state.productos.find(p=>p.id===product.id).stock,6);
 await run('addMovimiento',[{id:'manual-test',tipo:'ingreso',medio:'banco',concepto:'Aporte',monto:200}]);await run('conciliar',['manual-test',true]);
 await run('upsertPedido',[{id:'pedido-test',provId:'prov-test',estado:'pendiente',items:[{id:product.id,cant:3,precio:100}]}]);
 await run('recibirPedido',['pedido-test','250','efectivo']);assert.equal(current.state.productos.find(p=>p.id===product.id).stock,9);
 const revision=current.revision;await assert.rejects(run('recibirPedido',['pedido-test','250','efectivo']),{status:400});assert.equal((await (await read(env)).json()).revision,revision);
 await run('delPedido',['pedido-test']);
 await run('cerrarTurno',[{efectivo:0,banco:200,mercadopago:0},'Cierre']);assert.equal(current.state.turnos[0].estado,'cerrado');
 await run('guardarProductoEdicion',[{...product,id:'remove-product',codigo:'REMOVE'},null]);await run('eliminar',['remove-product']);
 await run('upsertEntidad',['proveedores',{id:'remove-prov',nombre:'Temporal'}]);await run('delEntidad',['proveedores','remove-prov']);
});
test('verified MP records sale and provider receipt atomically, failure rolls everything back',async()=>{
 const env={DB:db(),ADMIN_PASSWORD:password};let current=await (await read(env)).json();
 await env.DB.prepare('CREATE TABLE orders(id TEXT PRIMARY KEY,registered_at TEXT)').run();
 current=await transactBusiness(env,op(current.revision,'abrirTurno',[0]));const p=current.state.productos[0];
 const order={id:crypto.randomUUID(),status:'approved',payment_id:'payment-1',cliente_id:'c1',items:[{id:p.id,nombre:p.nombre,cant:1,precio:p.precio}],total:p.precio};
 const operation={...op(current.revision,'registrarPagoMP',[order]),verifiedMP:true};
 await env.DB.prepare('INSERT INTO orders(id) VALUES(?)').bind(order.id).run();
 const saved=await transactBusiness(env,operation);assert.ok((await env.DB.prepare('SELECT registered_at FROM orders WHERE id=?').bind(order.id).first()).registered_at);
 assert.equal(saved.state.ventas[0].mpOrderId,order.id);assert.equal(saved.state.productos[0].stock,p.stock-1);
 assert.equal((await transactBusiness(env,operation)).state.ventas.length,1);
 await env.DB.prepare('DROP TABLE orders').run();const second={...order,id:crypto.randomUUID(),payment_id:'payment-2'};
 await assert.rejects(transactBusiness(env,{...op(saved.revision,'registrarPagoMP',[second]),verifiedMP:true}));
 const after=await (await read(env)).json();assert.equal(after.revision,saved.revision);assert.equal(after.state.ventas.length,1);assert.equal(after.state.productos[0].stock,p.stock-1);
});
test('datos compartidos rechazan etiquetas activas y URL de foto inyectada',async()=>{const env={DB:db(),ADMIN_PASSWORD:password};let current=await (await read(env)).json();await assert.rejects(transactBusiness(env,op(current.revision,'upsertEntidad',['clientes',{id:'unsafe',nombre:'<img src=x onerror=alert(1)>',deuda:0}])),{status:400});const p=current.state.productos[0];await assert.rejects(transactBusiness(env,op(current.revision,'guardarProductoEdicion',[{...p,foto:'x" onerror="alert(1)'},p])),{status:400});assert.equal((await (await read(env)).json()).revision,current.revision);});
test('sales upsert only changed records while preserving historical order and replay',async()=>{
 const env={DB:db(),ADMIN_PASSWORD:password};let current=await (await read(env)).json();current=await transactBusiness(env,op(current.revision,'abrirTurno',[0]));
 const p=current.state.productos[0],args=[[{id:p.id,nombre:p.nombre,cant:1,precio:p.precio}],'efectivo','c1'];
 const first=await transactBusiness(env,op(current.revision,'cobrar',args));env.DB.writes.length=0;
 const operation=op(first.revision,'cobrar',args);const second=await transactBusiness(env,operation);
 const upserts=env.DB.writes.filter(w=>w.sql.startsWith('INSERT INTO business_records'));
 assert.deepEqual(upserts.map(w=>[w.args[0],JSON.parse(w.args[1]).length]).sort(),[['movimientos',1],['productos',1],['ventas',1]]);
 assert.equal(env.DB.writes.some(w=>w.sql.startsWith('DELETE FROM business_records')),false);
 const readback=await (await read(env)).json();assert.deepEqual(readback.state.ventas.map(v=>v.id),second.state.ventas.map(v=>v.id));assert.equal(readback.state.ventas[1].id,first.state.ventas[0].id);
 env.DB.writes.length=0;assert.equal((await transactBusiness(env,operation)).state.ventas.length,2);assert.equal(env.DB.writes.length,0);
});
test('server replay helper matches verified MP order identity after payment status changes',async()=>{
 const env={DB:db(),ADMIN_PASSWORD:password};let current=await (await read(env)).json();await env.DB.prepare('CREATE TABLE orders(id TEXT PRIMARY KEY,registered_at TEXT)').run();current=await transactBusiness(env,op(current.revision,'abrirTurno',[0]));
 const p=current.state.productos[0],order={id:crypto.randomUUID(),status:'approved',payment_id:'payment-a',cliente_id:'c1',items:[{id:p.id,cant:1,precio:p.precio}],total:p.precio};await env.DB.prepare('INSERT INTO orders(id) VALUES(?)').bind(order.id).run();
 const operation={...op(current.revision,'registrarPagoMP',[order]),verifiedMP:true};await transactBusiness(env,operation);
 const replay=await replayBusiness(env,{id:operation.id,op:'registrarPagoMP',args:[{id:order.id,status:'refunded'}]});assert.equal(replay.state.ventas.length,1);
 await assert.rejects(replayBusiness(env,{id:operation.id,op:'registrarPagoMP',args:[{id:crypto.randomUUID()}]}),{status:409});
});
test('reintentar una ficha antigua no pisa campos modificados por otro equipo',async()=>{const env={DB:db(),ADMIN_PASSWORD:password};let s=await (await read(env)).json();s=await transactBusiness(env,op(s.revision,'upsertEntidad',['clientes',{id:'ficha',nombre:'Antes',tel:'1',extra:'Dirección A',deuda:0},null]));const base={...s.state.clientes.find(c=>c.id==='ficha')};s=await transactBusiness(env,op(s.revision,'upsertEntidad',['clientes',{...base,nombre:'Nombre nuevo'},base]));s=await transactBusiness(env,op(s.revision,'upsertEntidad',['clientes',{...base,tel:'2'},base]));assert.equal(s.state.clientes.find(c=>c.id==='ficha').nombre,'Nombre nuevo');assert.equal(s.state.clientes.find(c=>c.id==='ficha').tel,'2');await assert.rejects(transactBusiness(env,op(s.revision,'upsertEntidad',['clientes',{...base,nombre:'Otra edición'},base])),{status:400});});
