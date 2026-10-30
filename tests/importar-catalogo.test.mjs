import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {transactBusiness,readBusiness} from '../worker/business.mjs';

function database(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('../migrations/0001.sql',import.meta.url),'utf8'));
 return {
  prepare(query){return {args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(query).get(...this.args)||null;},async all(){return {results:sql.prepare(query).all(...this.args)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...this.args).changes)}};}};},
  async batch(list){sql.exec('BEGIN');try{const out=[];for(const stmt of list)out.push(await stmt.run());sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}}
 };
}

const fila=(extra)=>({codigo:'482',nombre:'LAVANDINA CONCENTRADA 1 Lt',detalle:'LAVANDINA CONCENTRADA 1 Lt. (50%)',presentacion:'1 Lt',categoria:'Líquidos 1L',provNombre:'UNIBLANC',costo:836.67,margen:50,precio:1255,...extra});

test('importar la lista crea, actualiza y oculta sin tocar stock ni fotos',async()=>{
 const env={DB:database(),ADMIN_PASSWORD:'clave-para-tests-de-negocio'};
 const actual=await readBusiness(env);
 const original=actual.state.productos.find(p=>p.codigo==='482'&&p.presentacion==='1 Lt');
 assert.ok(original,'el catálogo semilla trae la lavandina de 1 litro');
 const antes=actual.state.productos.length;
 const ocultables=actual.state.productos.filter(p=>p.activo!==false&&!(p.codigo==='482'&&p.presentacion==='1 Lt')).length;

 const nuevo={codigo:'PRUEBA-9001',nombre:'PRODUCTO DE PRUEBA',detalle:'PRODUCTO DE PRUEBA',presentacion:'x Unid',categoria:'Accesorios',provNombre:'PROVEEDOR NUEVO',costo:100,margen:100,precio:200};
 const id=crypto.randomUUID();
 const resultado=await transactBusiness(env,{id,revision:actual.revision,op:'importarCatalogo',args:[{
  ocultarFaltantes:true,
  filas:[fila({}),nuevo]
 }]});

 assert.equal(resultado.result.creados,1);
 assert.equal(resultado.result.actualizados,0);
 assert.equal(resultado.result.iguales,1,'la lavandina ya estaba igual que la lista');
 assert.deepEqual(resultado.result.proveedores,['PROVEEDOR NUEVO']);
 assert.equal(resultado.result.ocultados,ocultables);

 const productos=resultado.state.productos;
 const lavandina=productos.find(p=>p.codigo==='482'&&p.presentacion==='1 Lt');
 assert.equal(lavandina.costo,836.67);
 assert.equal(lavandina.precio,1255);
 assert.equal(lavandina.margen,50);
 assert.equal(lavandina.stock,original.stock,'el stock no se toca al importar la lista');
 assert.equal(lavandina.activo,true);

 const creado=productos.find(p=>p.codigo==='PRUEBA-9001');
 assert.equal(creado.stock,0);
 assert.equal(creado.precio,200);
 const proveedor=resultado.state.proveedores.find(p=>p.nombre==='PROVEEDOR NUEVO');
 assert.ok(proveedor);
 assert.equal(creado.provId,proveedor.id);

 const otro=productos.find(p=>p.codigo!=='482'&&p.codigo!=='PRUEBA-9001');
 assert.equal(otro.activo,false,'lo que no está en la lista se oculta, no se borra');
 assert.equal(productos.length,antes+1,'no se elimina ningún producto');

 // El mismo identificador no repite la operación.
 const repeticion=await transactBusiness(env,{id,revision:actual.revision,op:'importarCatalogo',args:[{
  ocultarFaltantes:true,
  filas:[fila({}),nuevo]
 }]});
 assert.deepEqual(repeticion.result,resultado.result);
 assert.equal(repeticion.state.productos.length,antes+1);
});

test('si la lista no trae el costo se conserva el cargado y se actualiza la venta',async()=>{
 const env={DB:database(),ADMIN_PASSWORD:'clave-para-tests-de-negocio'};
 const actual=await readBusiness(env);
 const original=actual.state.productos.find(p=>p.codigo==='482'&&p.presentacion==='1 Lt');
 const resultado=await transactBusiness(env,{id:crypto.randomUUID(),revision:actual.revision,op:'importarCatalogo',args:[{
  ocultarFaltantes:false,
  filas:[fila({costo:null,margen:null,precio:1300})]
 }]});
 const p=resultado.state.productos.find(p=>p.id===original.id);
 assert.equal(p.costo,original.costo,'conserva el costo anterior');
 assert.equal(p.precio,1300);
 assert.equal(p.margen,Math.round((1300/original.costo-1)*1e12)/1e10);
 assert.equal(resultado.result.sinCosto,0);
});

test('un cambio de presentación con el mismo código no crea otro producto',async()=>{
 const env={DB:database(),ADMIN_PASSWORD:'clave-para-tests-de-negocio'};
 const actual=await readBusiness(env);
 const original=actual.state.productos.find(p=>p.codigo==='571'&&p.presentacion==='1 Kg');
 assert.ok(original,'la semilla trae el oxifull de 1 kilo');
 const resultado=await transactBusiness(env,{id:crypto.randomUUID(),revision:actual.revision,op:'importarCatalogo',args:[{
  ocultarFaltantes:false,
  filas:[{codigo:'571',nombre:'OXIFULL',detalle:'OXIFULL X 1 Lt.',presentacion:'1 Lt',categoria:'Pileta',provNombre:'ACUAMAR',costo:9990,margen:50,precio:14985}]
 }]});
 assert.equal(resultado.result.creados,0);
 assert.equal(resultado.result.actualizados,1);
 const p=resultado.state.productos.find(p=>p.id===original.id);
 assert.equal(p.presentacion,'1 Lt');
 assert.equal(p.stock,original.stock);
});

test('la importación rechaza filas sin proveedor, sin precio o con margen inválido',async()=>{
 const env={DB:database(),ADMIN_PASSWORD:'clave-para-tests-de-negocio'};
 const actual=await readBusiness(env);
 const base={revision:actual.revision,op:'importarCatalogo'};
 await assert.rejects(transactBusiness(env,{...base,id:crypto.randomUUID(),args:[{filas:[fila({provNombre:''})]}]}),/proveedor/i);
 await assert.rejects(transactBusiness(env,{...base,id:crypto.randomUUID(),args:[{filas:[fila({precio:0})]}]}),/Costo o venta/i);
 await assert.rejects(transactBusiness(env,{...base,id:crypto.randomUUID(),args:[{filas:[fila({margen:1e13})]}]}),/Margen/i);
 await assert.rejects(transactBusiness(env,{...base,id:crypto.randomUUID(),args:[{filas:[]}]}),/1 y 2000/i);
});
