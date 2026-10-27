import '../js/store.js';
import catalogo from '../data/catalogo.json' with {type:'json'};
import {authenticated} from './security.mjs';
const cols=['productos','clientes','proveedores','ventas','movimientos','pedidos','turnos'];
const allowed=new Set(['guardarProductoEdicion','eliminar','toggleActivo','actualizarPrecios','aplicarMargen','editarPrecio','asignarProveedor','abrirTurno','cerrarTurno','cobrar','anularVenta','cobrarDeuda','addMovimiento','conciliar','upsertEntidad','delEntidad','upsertPedido','recibirPedido','delPedido']);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const validId=id=>typeof id==='string'&&/^[\w-]{1,100}$/.test(id);
const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e12;
function factory(state){const memory=new Map(state?[['almacen_mi_limpieza_v11',JSON.stringify(state)]]:[]);return globalThis.MiLimpiezaStoreFactory({getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},catalogo);}
function publicState(state){return Object.fromEntries([...cols.map(c=>[c,state[c]]),['catalogo',state.catalogo||{}]]);}
const initialized=new WeakMap();
async function initialize(env){
 let pending=initialized.get(env.DB);if(!pending){pending=initializeDatabase(env);initialized.set(env.DB,pending);pending.catch(()=>initialized.delete(env.DB));}return pending;
}
async function initializeDatabase(env){
 await env.DB.batch([
  env.DB.prepare('CREATE TABLE IF NOT EXISTS business_meta (id INTEGER PRIMARY KEY CHECK(id=1),revision TEXT NOT NULL,data TEXT NOT NULL)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS business_records (collection TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,position INTEGER NOT NULL,PRIMARY KEY(collection,id))'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS business_operations (id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,result TEXT NOT NULL,revision TEXT NOT NULL)')
 ]);
 if(await env.DB.prepare('SELECT revision FROM business_meta WHERE id=1').first())return;
 const store=factory();
 try{const prices=await env.DB.prepare('SELECT revision,data FROM shared_prices WHERE id=1').first();if(prices)store.aplicarPreciosOnline({revision:prices.revision,entries:JSON.parse(prices.data)});}catch(e){if(!/no such table.*shared_prices/i.test(e.message))throw e;}
 const state=publicState(store.get()),revision=crypto.randomUUID();
 const rows=cols.flatMap(c=>state[c].map((r,i)=>({collection:c,id:r.id,data:JSON.stringify(r),position:i})));
 await env.DB.batch([
 env.DB.prepare('INSERT INTO business_meta(id,revision,data) VALUES(1,?,?) ON CONFLICT(id) DO NOTHING').bind(revision,JSON.stringify({catalogo:state.catalogo,sequence:0})),
 env.DB.prepare("INSERT INTO business_records(collection,id,data,position) SELECT json_extract(value,'$.collection'),json_extract(value,'$.id'),json_extract(value,'$.data'),json_extract(value,'$.position') FROM json_each(?) WHERE (SELECT revision FROM business_meta WHERE id=1)=? ON CONFLICT(collection,id) DO NOTHING").bind(JSON.stringify(rows),revision)
 ]);
}
async function snapshot(env){const rows=(await env.DB.prepare('SELECT m.revision,m.data AS metadata,r.collection,r.data FROM business_meta m LEFT JOIN business_records r ON 1=1 WHERE m.id=1 ORDER BY r.collection,r.position').all()).results;const state={...Object.fromEntries(cols.map(c=>[c,[]])),...JSON.parse(rows[0].metadata)};for(const r of rows)if(r.collection)state[r.collection].push(JSON.parse(r.data));return {revision:rows[0].revision,state};}
function validateState(state){
 const plain=value=>{if(typeof value==='string'&&/<\s*\/?\s*[a-z!]/i.test(value))throw fail('Usá texto simple, sin etiquetas HTML.');if(value&&typeof value==='object')Object.values(value).forEach(plain);};
 plain(state);
 for(const p of state.productos)for(const field of ['foto','img'])if(p[field]&&!/^\/api\/photos\/[a-f0-9]{64}\?v=[a-f0-9-]{36}$/i.test(p[field]))throw fail('Subí la foto con el selector de imágenes.');

 for(const col of cols){const ids=new Set();for(const row of state[col]){if(!row||!validId(row.id)||ids.has(row.id))throw fail('Identificador inválido o duplicado.');ids.add(row.id);if(JSON.stringify(row).length>2000000)throw fail('Registro demasiado grande.',413);}}
 for(const p of state.productos){if(typeof p.nombre!=='string'||!p.nombre.trim()||!number(p.stock)||!number(p.costo)||!number(p.precio)||(p.margen!=null&&!number(p.margen)))throw fail('Producto o stock inválido.');if(p.provId&&!state.proveedores.some(x=>x.id===p.provId))throw fail('Proveedor no encontrado.');}
 for(const c of state.clientes)if(!number(c.deuda??0)||typeof c.nombre!=='string'||!c.nombre.trim())throw fail('Cliente inválido.');
 if(state.turnos.filter(t=>t.estado==='abierto').length>1)throw fail('Ya hay una caja abierta.');
 for(const m of state.movimientos)if(!number(m.monto)||!['ingreso','egreso'].includes(m.tipo)||!['efectivo','mercadopago','banco'].includes(m.medio))throw fail('Movimiento inválido.');
 for(const v of state.ventas){if(!stateClient(state,v.clienteId)||!state.turnos.some(t=>t.id===v.turnoId)||!number(v.total))throw fail('Venta inválida.');items(v.items,state,false);}
 for(const m of state.movimientos)if(!state.turnos.some(t=>t.id===m.turnoId))throw fail('Turno no encontrado.');
 for(const p of state.pedidos){if(p.provId&&!state.proveedores.some(x=>x.id===p.provId))throw fail('Proveedor no encontrado.');items(p.items,state,false);}
}
function items(list,state,sale=true){if(!Array.isArray(list)||!list.length||list.length>2000)throw fail('Productos inválidos.');const ids=new Set();for(const i of list){const p=state.productos.find(p=>p.id===i.id);if(!p||ids.has(i.id)||!number(i.cant)||i.cant<=0||(sale&&(!number(i.precio)||i.precio!==p.precio||p.activo===false)))throw fail('Cantidad, precio o producto inválido.');ids.add(i.id);}}
function validateOperation(op,args,state){
 if(!Array.isArray(args)||args.length>4)throw fail('Argumentos inválidos.');
 if(['upsertEntidad','delEntidad'].includes(op)&&!['clientes','proveedores'].includes(args[0]))throw fail('Colección inválida.');
 if(op==='addMovimiento'){const m=args[0];if(!m||Object.keys(m).some(k=>!['id','fecha','tipo','medio','concepto','monto','conciliado'].includes(k))||!number(m.monto)||m.monto<=0)throw fail('Movimiento inválido.');}
 if(op==='editarPrecio'&&(!['costo','margen'].includes(args[1])||!number(args[2])))throw fail('Precio inválido.');
 if(op==='asignarProveedor'&&(!Array.isArray(args[0])||args[0].some(id=>!state.productos.some(p=>p.id===id))||!state.proveedores.some(p=>p.id===args[1])))throw fail('Proveedor o productos inválidos.');
 if(op==='aplicarMargen'&&!['propio',''].includes(args[0])&&!number(args[0]))throw fail('Margen inválido.');
 if(op==='anularVenta'){const sale=state.ventas.find(v=>v.id===args[0]);if(sale?.pago==='cuenta'&&(state.clientes.find(c=>c.id===sale.clienteId)?.deuda||0)<sale.total)throw fail('La cuenta ya tiene pagos aplicados. Revisá la deuda antes de anular esta venta.');}
 if(op==='cobrar'){items(args[0],state);if(!['efectivo','banco','mercadopago','cuenta'].includes(args[1])||!state.clientes.some(c=>c.id===(args[2]||'c1')))throw fail('Pago o cliente inválido.');}
 if(op==='abrirTurno'&&!number(args[0]))throw fail('Saldo inválido.');
 if(op==='cerrarTurno'&&(!args[0]||Object.values(args[0]).some(n=>!number(n))))throw fail('Conteo inválido.');
 if(op==='cobrarDeuda'&&(!number(args[1])||args[1]<=0||!['efectivo','banco','mercadopago'].includes(args[2])))throw fail('Cobro inválido.');
 if(op==='recibirPedido'&&(!number(args[1])||!['efectivo','banco','mercadopago'].includes(args[2]||'efectivo')))throw fail('Pago inválido.');
 if(op==='upsertPedido'){if(args[0]?.estado!=='pendiente')throw fail('Pedido inválido.');const old=state.pedidos.find(x=>x.id===args[0].id);if(old&&old.estado!=='pendiente')throw fail('Pedido ya recibido.');}
 if(op==='delEntidad'){const [col,id]=args;if(col==='clientes'&&(id==='c1'||state.ventas.some(v=>v.clienteId===id)||(state.clientes.find(c=>c.id===id)?.deuda||0)>0))throw fail('Cliente con operaciones.');if(col==='proveedores'&&(state.productos.some(p=>p.provId===id)||state.pedidos.some(p=>p.provId===id)))throw fail('Proveedor con operaciones.');}
 if(op==='eliminar'&&(state.ventas.some(v=>v.items.some(i=>i.id===args[0]))||state.pedidos.some(p=>p.items.some(i=>i.id===args[0]))))throw fail('Producto con operaciones.');
 if(op==='upsertEntidad'&&args[0]==='clientes'){const old=state.clientes.find(c=>c.id===args[1]?.id);if((args[1]?.deuda??0)!==(old?.deuda??0))throw fail('La deuda se modifica mediante cobros y ventas.');}
}
const operationFingerprint=(op,args)=>JSON.stringify({op,args:op==='registrarPagoMP'?[{id:args?.[0]?.id}]:args});
// Internal server helper: caller must authenticate before invoking it.
export async function replayBusiness(env,{id,op,args}){
 await initialize(env);
 const prior=await env.DB.prepare('SELECT fingerprint,result FROM business_operations WHERE id=?').bind(id).first();
 if(!prior)return null;
 if(prior.fingerprint!==operationFingerprint(op,args))throw fail('Identificador reutilizado con otra operación.',409);
 return {...await snapshot(env),result:JSON.parse(prior.result)};
}
export async function transactBusiness(env,{id,revision,op,args,verifiedMP}){
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id||''))throw fail('Identificador de operación inválido.');
 if(!allowed.has(op)&&!(op==='registrarPagoMP'&&verifiedMP===true))throw fail('Operación inválida.');
 if(JSON.stringify(args)?.length>1000000)throw fail('Solicitud demasiado grande.',413);
 if(Array.isArray(args)){args=structuredClone(args);const index={cobrarDeuda:1,recibirPedido:1,editarPrecio:2,abrirTurno:0,aplicarMargen:0}[op];if(index!==undefined&&typeof args[index]==='string'&&/^\d+(?:\.\d+)?$/.test(args[index].trim()))args[index]=Number(args[index]);}
 await initialize(env);
 const fingerprint=operationFingerprint(op,args);
 const prior=await env.DB.prepare('SELECT fingerprint,result FROM business_operations WHERE id=?').bind(id).first();
 if(prior){if(prior.fingerprint!==fingerprint)throw fail('Identificador reutilizado con otra operación.',409);return {...await snapshot(env),result:JSON.parse(prior.result)};}
 const current=await snapshot(env);if(current.revision!==revision)throw fail('El negocio cambió en otro equipo. Actualizá antes de continuar.',409);
 validateOperation(op,args,current.state);
 if(op==='registrarPagoMP'){const order=args[0];if(order?.status!=='approved'||!order.payment_id||!stateClient(current.state,order.cliente_id||'c1'))throw fail('Pago no verificado.');items(order.items,current.state,false);}
 const store=factory(current.state);let result;
 try{
 result=store[op](...args);
 }catch(e){throw e.status?e:fail(e.message);}
 const state=publicState(store.get());validateState(state);const next=crypto.randomUUID();
 const sequence=(current.state.sequence||0)+1;state.sequence=sequence;
 const statements=[env.DB.prepare('UPDATE business_meta SET revision=?,data=? WHERE id=1 AND revision=?').bind(next,JSON.stringify({catalogo:state.catalogo,sequence}),revision)];
 for(const col of cols){
 const before=new Map(current.state[col].map(row=>[row.id,JSON.stringify(row)]));
 const after=new Set(state[col].map(row=>row.id));
 const history=['ventas','movimientos','turnos','pedidos'].includes(col);
 const rows=state[col].flatMap(row=>{const data=JSON.stringify(row);return before.get(row.id)===data?[]:[{id:row.id,data,position:history?-sequence:catalogo.productos.length+sequence}];});
 const removed=[...before.keys()].filter(id=>!after.has(id));
 if(rows.length)statements.push(env.DB.prepare("INSERT INTO business_records(collection,id,data,position) SELECT ?,json_extract(value,'$.id'),json_extract(value,'$.data'),json_extract(value,'$.position') FROM json_each(?) WHERE (SELECT revision FROM business_meta WHERE id=1)=? ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data").bind(col,JSON.stringify(rows),next));
 if(removed.length)statements.push(env.DB.prepare("DELETE FROM business_records WHERE collection=? AND id IN (SELECT value FROM json_each(?)) AND (SELECT revision FROM business_meta WHERE id=1)=?").bind(col,JSON.stringify(removed),next));
 }
 statements.push(env.DB.prepare('INSERT INTO business_operations(id,fingerprint,result,revision) SELECT ?,?,?,? WHERE (SELECT revision FROM business_meta WHERE id=1)=?').bind(id,fingerprint,JSON.stringify(result??null),next,next));
 if(op==='registrarPagoMP')statements.push(env.DB.prepare('UPDATE orders SET registered_at=COALESCE(registered_at,?) WHERE id=? AND (SELECT revision FROM business_meta WHERE id=1)=?').bind(new Date().toISOString(),args[0].id,next));
 const batch=await env.DB.batch(statements);
 if(!batch[0].meta.changes){const receipt=await env.DB.prepare('SELECT fingerprint,result FROM business_operations WHERE id=?').bind(id).first();if(receipt&&receipt.fingerprint===fingerprint)return {...await snapshot(env),result:JSON.parse(receipt.result)};throw fail('El negocio cambió en otro equipo. Actualizá antes de continuar.',409);}
 return {revision:next,state,result:result??null};
}
function stateClient(state,id){return state.clientes.some(c=>c.id===id);}
export async function handleBusiness(request,env){
 if(!await authenticated(request,env.ADMIN_PASSWORD))throw fail('Iniciá sesión de operador.',401);
 if(request.method==='GET'){await initialize(env);const since=new URL(request.url).searchParams.get('since');if(since){const current=await env.DB.prepare('SELECT revision FROM business_meta WHERE id=1').first();if(current.revision===since)return json({revision:current.revision,unchanged:true});}return json(await snapshot(env));}
 if(request.method!=='POST')throw fail('Método no permitido.',405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)throw fail('Origen no autorizado.',403);
 const text=await request.text();if(text.length>1000000)throw fail('Solicitud demasiado grande.',413);let data;try{data=JSON.parse(text);}catch{throw fail('Solicitud inválida.');}
 if(!data||typeof data!=='object'||Object.keys(data).some(k=>!['id','revision','op','args'].includes(k)))throw fail('Solicitud inválida.');
 return json(await transactBusiness(env,data));
}
