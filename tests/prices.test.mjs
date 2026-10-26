import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
import {sessionCookie} from '../worker/security.mjs';
const password='clave-operador-pruebas-precios';
const product={codigo:'482',nombre:'Lavandina',categoria:'Líquidos 1L',presentacion:'1 Lt'};
function database(){const db=new DatabaseSync(':memory:');return {prepare(q){const s=db.prepare(q);return {a:[],bind(...a){this.a=a;return this;},async first(){return s.get(...this.a)||null;},async run(){return {meta:{changes:Number(s.run(...this.a).changes)}};}};}};}
async function req(env,method='GET',data,auth=false,origin='https://app.test'){return worker.fetch(new Request('https://app.test/api/prices',{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Cookie:'milimpieza_session='+await sessionCookie(password)}:{})},body:data?JSON.stringify(data):undefined}),env);}
test('precios online se leen en otro equipo y rechazan escrituras obsoletas',async()=>{
 const env={DB:database(),ADMIN_PASSWORD:password};
 const initial=await req(env);assert.equal(initial.status,200);assert.deepEqual(await initial.json(),{revision:null,entries:[]});
 const payload={expectedRevision:null,entries:[{product,costo:100,margen:50,precio:150}]};
 const saved=await req(env,'PUT',payload,true);assert.equal(saved.status,200);const first=await saved.json();assert.ok(first.revision);
 assert.deepEqual(await (await req(env)).json(),first);
 assert.equal((await req(env,'PUT',payload,true)).status,409);
 const second=await req(env,'PUT',{...payload,expectedRevision:first.revision,entries:[{product,costo:200,margen:50,precio:300}]},true);assert.equal(second.status,200);
 assert.equal((await (await req(env)).json()).entries[0].precio,300);
});
test('precios requieren sesión, mismo origen y valores válidos',async()=>{
 const env={DB:database(),ADMIN_PASSWORD:password};
 const payload={expectedRevision:null,entries:[{product,costo:100,margen:50,precio:150}]};
 assert.equal((await req(env,'PUT',payload)).status,401);
 assert.equal((await req(env,'PUT',payload,true,'https://otro.test')).status,403);
 for(const entry of [{product,costo:-1,margen:50,precio:150},{product,costo:100,margen:50,precio:999},{product,costo:100,margen:50,precio:150,stock:99}])assert.equal((await req(env,'PUT',{...payload,entries:[entry]},true)).status,400);
});
