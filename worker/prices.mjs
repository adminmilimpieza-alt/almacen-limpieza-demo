import {authenticated} from './security.mjs';
import {photoIdentity,photoProduct} from '../js/foto-identidad.mjs';
const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function handlePrices(request,env){
 const url=new URL(request.url);
 if(!['GET','PUT'].includes(request.method))throw fail('Método no permitido.',405);
 if(request.method==='PUT'){
  if(request.headers.get('Origin')!==url.origin)throw fail('Origen no autorizado.',403);
  if(!await authenticated(request,env.ADMIN_PASSWORD))throw fail('Iniciá sesión de operador para compartir precios.',401);
 }
 let current;
 try{current=await env.DB.prepare('SELECT revision,data FROM shared_prices WHERE id=1').first();}
 catch(error){if(!/no such table.*shared_prices/i.test(error.message))throw error;}
 if(request.method==='GET')return json(current?{revision:current.revision,entries:JSON.parse(current.data)}:{revision:null,entries:[]});
 const text=await request.text();if(text.length>700000)throw fail('La lista es demasiado grande.',413);
 let data;try{data=JSON.parse(text);}catch{throw fail('Lista inválida.');}
 if(!data||typeof data!=='object')throw fail('Lista inválida.');
 if(data.expectedRevision!==null&&(typeof data.expectedRevision!=='string'||!/^[a-f0-9-]{36}$/i.test(data.expectedRevision)))throw fail('Revisión inválida.');
 if(!Array.isArray(data.entries)||!data.entries.length||data.entries.length>2000)throw fail('La lista debe contener entre 1 y 2000 precios.');
 const incoming=new Map();
 for(const row of data.entries){
  if(!row||typeof row!=='object'||!row.product||typeof row.product!=='object')throw fail('Producto inválido.');
  if(Object.keys(row).some(k=>!['product','costo','margen','precio'].includes(k)))throw fail('La lista solo puede contener precios.');
  const key=photoIdentity(row.product),product=photoProduct(row.product);
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1000000000;
  if(!valid(row.costo)||!valid(row.precio)||(row.margen!==null&&!valid(row.margen)))throw fail('Costo, margen o precio inválido.');
  if(row.costo>0&&row.margen!==null&&Math.abs(row.precio-Math.round(row.costo*(1+row.margen/100)*100)/100)>.011)throw fail('El precio debe corresponder al costo y margen.');
  if(incoming.has(key))throw fail('Hay productos duplicados en la lista.');
  incoming.set(key,{product,costo:row.costo,margen:row.margen,precio:row.precio});
 }
 if((current?.revision||null)!==data.expectedRevision)throw fail('La lista cambió en otro equipo. Actualizá y revisá los precios antes de compartir.',409);
 const all=new Map((current?JSON.parse(current.data):[]).map(r=>[photoIdentity(r.product),r]));
 for(const [key,row] of incoming)all.set(key,row);
 if(all.size>2000)throw fail('Se alcanzó el límite de 2000 productos.',413);
 const entries=[...all.values()],revision=crypto.randomUUID();
 // Initialize only after an authorized, valid write. Existing tables are untouched.
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS shared_prices (id INTEGER PRIMARY KEY CHECK(id=1), revision TEXT NOT NULL, data TEXT NOT NULL)').run();
 const result=current?await env.DB.prepare('UPDATE shared_prices SET revision=?,data=? WHERE id=1 AND revision=?').bind(revision,JSON.stringify(entries),data.expectedRevision).run():await env.DB.prepare('INSERT INTO shared_prices(id,revision,data) VALUES(1,?,?) ON CONFLICT(id) DO NOTHING').bind(revision,JSON.stringify(entries)).run();
 if(!result.meta.changes)throw fail('Otro equipo acaba de compartir precios. Actualizá antes de reintentar.',409);
 return json({revision,entries});
}
