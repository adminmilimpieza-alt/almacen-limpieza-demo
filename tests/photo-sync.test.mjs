import {test} from 'node:test';
import assert from 'node:assert/strict';
import {photoKey} from '../js/foto-identidad.mjs';
let sync={};try{sync=await import('../js/fotos-datos.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const product={id:'p1',codigo:'482',nombre:'Lavandina',categoria:'Líquidos 1L',presentacion:'1 Lt',stock:7,precio:100,foto:''};
test('aplica una foto online sin modificar stock, precio ni otros registros',async()=>{
  assert.equal(typeof sync.mergePhotos,'function');
  const db={productos:[{...product}],ventas:[{id:'v1'}]};const key=await photoKey(product);
  const result=await sync.mergePhotos(db,[{key,revision:'r1',deleted:false}]);
  assert.equal(result.changed,true);assert.equal(db.productos[0].foto,'/api/photos/'+key+'?v=r1');assert.equal(db.productos[0].stock,7);assert.equal(db.productos[0].precio,100);assert.deepEqual(db.ventas,[{id:'v1'}]);
});
test('preserva una foto local antigua aunque otro equipo tenga una foto online',async()=>{
  assert.equal(typeof sync.mergePhotos,'function');
  const db={productos:[{...product,foto:'data:image/jpeg;base64,local'}]};const key=await photoKey(product);
  const result=await sync.mergePhotos(db,[{key,revision:'r2',deleted:false}]);
  assert.equal(db.productos[0].foto,'data:image/jpeg;base64,local');assert.equal(result.pending,1);
});
test('una baja online sustituye la foto remota previa por una foto vacía',async()=>{
  assert.equal(typeof sync.mergePhotos,'function');
  const key=await photoKey(product);const db={productos:[{...product,foto:'/api/photos/'+key+'?v=old',fotoOnlineRevision:'old',fotoOnlineKey:key}]};
  await sync.mergePhotos(db,[{key,revision:'new',deleted:true}]);assert.equal(db.productos[0].foto,'');assert.equal(db.productos[0].fotoOnlineRevision,'new');
});
test('extrae únicamente fotos y datos identificadores de un respaldo',async()=>{
  assert.equal(typeof sync.backupPhotos,'function');
  const backup={clientes:[{nombre:'Privado'}],ventas:[{id:'secreto'}],productos:[{...product,foto:'data:image/jpeg;base64,local'},{...product,id:'p2',foto:'https://example.com/remote.jpg'}]};
  const result=sync.backupPhotos(backup);assert.equal(result.length,1);assert.equal(result[0].foto,'data:image/jpeg;base64,local');assert.equal('ventas' in result[0],false);assert.equal('stock' in result[0],false);assert.equal('precio' in result[0],false);
});
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function store(){const values=new Map();const context=vm.createContext({localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},CATALOGO:{productos:[product],proveedores:[]},console});vm.runInContext(readFileSync(new URL('../js/store.js',import.meta.url),'utf8')+'\nglobalThis.store=Store;',context);return context.store;}
test('aplicar fotos no revierte una venta realizada durante una consulta online',()=>{
  const s=store();assert.equal(typeof s.actualizarFotos,'function');const snapshot=s.get().productos[0];
  s.abrirTurno(0);s.cobrar([{id:'p1',nombre:'Lavandina',precio:100,cant:1}],'efectivo','c1');
  s.actualizarFotos([{id:'p1',previousFoto:'',previousRevision:undefined,product:product,foto:'/api/photos/test?v=1',fotoOnlineKey:'test',fotoOnlineRevision:'1',fotoPendiente:false}]);
  const after=s.get();assert.equal(after.productos[0].stock,snapshot.stock-1);assert.equal(after.ventas.length,1);assert.equal(after.productos[0].foto,'/api/photos/test?v=1');
});
test('actualizar catálogo no pierde una baja de foto online ni su revisión',()=>{
  const s=store();const db=s.get();Object.assign(db.productos[0],{foto:'',fotoOnlineKey:'test',fotoOnlineRevision:'deleted'});s.import(JSON.stringify(db));
  s.aplicarRemoto({productos:[{...product,foto:'data:image/jpeg;base64,antigua'}]});
  assert.equal(s.get().productos[0].foto,'');assert.equal(s.get().productos[0].fotoOnlineRevision,'deleted');
});
test('editar metadatos conserva la foto que cambió en otro equipo mientras estaba abierto el modal',async()=>{
  assert.equal(typeof sync.preparePhotoEdit,'function');
  const original={...product,foto:'/api/photos/key?v=old',fotoOnlineKey:'key',fotoOnlineRevision:'old'};
  const current={...original,foto:'/api/photos/key?v=new',fotoOnlineRevision:'new'};
  const draft={...current,nombre:'Nombre editado',foto:original.foto};
  const prepared=await sync.preparePhotoEdit(draft,original,current);
  assert.equal(prepared.product.foto,current.foto);assert.equal(prepared.base.fotoOnlineRevision,'new');
});
test('una foto editada conserva la revisión original aunque haya llegado una actualización',async()=>{
  assert.equal(typeof sync.preparePhotoEdit,'function');
  const original={...product,foto:'/api/photos/key?v=old',fotoOnlineKey:'key',fotoOnlineRevision:'old'};
  const current={...original,foto:'/api/photos/key?v=new',fotoOnlineRevision:'new'};
  const prepared=await sync.preparePhotoEdit({...current,foto:'data:image/jpeg;base64,nueva'},original,current);
  assert.equal(prepared.base.fotoOnlineRevision,'old');assert.equal(prepared.product.fotoOnlineRevision,'old');
});
test('cambiar identidad limpia revisiones viejas para poder reintentar una subida fallida',async()=>{
  assert.equal(typeof sync.preparePhotoEdit,'function');
  const original={...product,foto:'/api/photos/key?v=old',fotoOnlineKey:'key',fotoOnlineRevision:'old'};
  const prepared=await sync.preparePhotoEdit({...original,codigo:'nuevo'},original,original);
  assert.equal(prepared.product.fotoOnlineRevision,undefined);assert.equal(prepared.product.fotoOnlineKey,undefined);assert.equal(prepared.base,null);
});
test('guardar el producto después de subir la foto conserva una venta de otra pestaña',()=>{
  const s=store();assert.equal(typeof s.guardarProductoEdicion,'function');const original=s.get().productos[0];
  s.abrirTurno(0);s.cobrar([{id:'p1',nombre:'Lavandina',precio:100,cant:1}],'efectivo','c1');
  s.guardarProductoEdicion({...original,foto:'/api/photos/key?v=new'},original);
  assert.equal(s.get().productos[0].stock,original.stock-1);assert.equal(s.get().ventas.length,1);assert.equal(s.get().productos[0].foto,'/api/photos/key?v=new');
});
test('rechaza un cambio de stock que entró en conflicto durante la subida',()=>{
  const s=store();assert.equal(typeof s.guardarProductoEdicion,'function');const original=s.get().productos[0];
  s.abrirTurno(0);s.cobrar([{id:'p1',nombre:'Lavandina',precio:100,cant:1}],'efectivo','c1');
  assert.throws(()=>s.guardarProductoEdicion({...original,stock:50},original));assert.equal(s.get().productos[0].stock,original.stock-1);
});
