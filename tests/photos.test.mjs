import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.mjs';
import {sessionCookie} from '../worker/security.mjs';
let identity={};try{identity=await import('../js/foto-identidad.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const photo='data:image/jpeg;base64,'+readFileSync(new URL('fixtures/foto-prueba.jpg',import.meta.url)).toString('base64');
const product={id:'p1',codigo:'482',nombre:'Lavandina',categoria:'Líquidos 1L',presentacion:'1 Lt'};
const password='clave-de-operador-para-tests';
function database(){
  const sql=new DatabaseSync(':memory:');
  const path=new URL('../migrations/0002.sql',import.meta.url);let schema='';try{schema=readFileSync(path,'utf8');}catch{}
  if(schema)sql.exec(schema);
  return {prepare(query){const s=sql.prepare(query);return {args:[],bind(...args){this.args=args.map(a=>a instanceof ArrayBuffer?new Uint8Array(a):a);return this;},async first(){const row=s.get(...this.args)||null;if(row?.image)row.image=Array.from(row.image);return row;},async all(){return {results:s.all(...this.args)};},async run(){const result=s.run(...this.args);return {meta:{changes:Number(result.changes)}};}};}};
}
async function request(env,path,{method='GET',data,auth=false,origin='https://app.test'}={}){
  const headers={Origin:origin,'Content-Type':'application/json'};
  if(auth)headers.Cookie='milimpieza_session='+await sessionCookie(password);
  return worker.fetch(new Request('https://app.test'+path,{method,headers,body:data?JSON.stringify(data):undefined}),env);
}
test('la identidad de la foto se mantiene entre equipos y separa presentaciones',async()=>{
  assert.equal(typeof identity.photoKey,'function');
  assert.equal(await identity.photoKey(product),await identity.photoKey({...product,id:'p987',nombre:'Otro nombre'}));
  assert.notEqual(await identity.photoKey(product),await identity.photoKey({...product,presentacion:'5 Lts'}));
});
test('una foto guardada online es legible desde otra sesión y la API entrega JPEG',async()=>{
  assert.equal(typeof identity.photoKey,'function');
  const env={DB:database(),ADMIN_PASSWORD:password},key=await identity.photoKey(product);
  const upload=await request(env,'/api/photos/'+key,{method:'PUT',auth:true,data:{product,photo,expectedRevision:null}});
  assert.equal(upload.status,201);const saved=await upload.json();assert.ok(saved.revision);
  const manifest=await (await request(env,'/api/photos')).json();assert.equal(manifest.photos[0].key,key);
  const image=await request(env,'/api/photos/'+key+'?v='+saved.revision);assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/jpeg');
  assert.equal(Buffer.from(await image.arrayBuffer()).equals(readFileSync(new URL('fixtures/foto-prueba.jpg',import.meta.url))),true);
});
test('la API rechaza escritura sin sesión y desde otro origen',async()=>{
  const env={DB:database(),ADMIN_PASSWORD:password},key='a'.repeat(64);
  assert.equal((await request(env,'/api/photos/'+key,{method:'PUT',data:{}})).status,401);
  assert.equal((await request(env,'/api/photos/'+key,{method:'PUT',auth:true,origin:'https://evil.test',data:{}})).status,403);
});
test('una migración y una edición obsoleta no pisan una foto existente',async()=>{
  assert.equal(typeof identity.photoKey,'function');
  const env={DB:database(),ADMIN_PASSWORD:password},key=await identity.photoKey(product),path='/api/photos/'+key;
  const first=await (await request(env,path,{method:'PUT',auth:true,data:{product,photo,expectedRevision:null}})).json();
  assert.equal((await request(env,path,{method:'PUT',auth:true,data:{product,photo,expectedRevision:null,mode:'migrate'}})).status,409);
  const next=await request(env,path,{method:'PUT',auth:true,data:{product,photo,expectedRevision:first.revision}});assert.equal(next.status,200);
  assert.equal((await request(env,path,{method:'PUT',auth:true,data:{product,photo,expectedRevision:first.revision}})).status,409);
});
test('quitar una foto se propaga y una migración antigua no la resucita',async()=>{
  assert.equal(typeof identity.photoKey,'function');
  const env={DB:database(),ADMIN_PASSWORD:password},key=await identity.photoKey(product),path='/api/photos/'+key;
  const first=await (await request(env,path,{method:'PUT',auth:true,data:{product,photo,expectedRevision:null}})).json();
  const removed=await request(env,path,{method:'PUT',auth:true,data:{product,photo:'',expectedRevision:first.revision}});assert.equal(removed.status,200);
  assert.equal((await request(env,path)).status,404);
  const manifest=await (await request(env,'/api/photos')).json();assert.equal(manifest.photos[0].deleted,true);
  assert.equal((await request(env,path,{method:'PUT',auth:true,data:{product,photo,expectedRevision:null,mode:'migrate'}})).status,409);
});
test('rechaza SVG, fotos excesivas y claves que no corresponden al producto',async()=>{
  assert.equal(typeof identity.photoKey,'function');
  const env={DB:database(),ADMIN_PASSWORD:password},key=await identity.photoKey(product);
  for(const invalid of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,'+'A'.repeat(210000)]){
    const r=await request(env,'/api/photos/'+key,{method:'PUT',auth:true,data:{product,photo:invalid,expectedRevision:null}});assert.ok([400,413].includes(r.status));
  }
  assert.equal((await request(env,'/api/photos/'+'f'.repeat(64),{method:'PUT',auth:true,data:{product,photo,expectedRevision:null}})).status,400);
});
