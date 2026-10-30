import {test} from 'node:test';
import assert from 'node:assert/strict';
import {leerLista,claveProducto,presentacionDe,nombreCorto} from '../js/lista-proveedor.mjs';

function hoja(){
 return [
  ['Codigo','Descripcion: LIQUIDO LIMPIEZA (Hogar/Comercio)     Proveedor: UNIBLANC','Costo','Cant./Lt.','Costo/Lt.','% Ganancia','Ref.','Costo/Botella Lt.'],
  ['','','Venta','','','','Limpiamas %',''],
  [482,'LAVANDINA CONCENTRADA 1 Lt. (50% Concent. Cloro)',1255,1,670,50,'',250],
  ['','LAVANDINA CONCENTRADA 5 Lts. (50% Concent. Cloro)',5025,5,3350,50,'',''],
  [89,'PULVERIZADOR TRANSPARENTE',377,'',null,50,'',''],
  [91,'BOTELLA 250 cc.',250,'',null,50,'',''],
  ['Codigo','Descripcion: LINEA PILETA          Proveedor: ACUAMAR','Costo','','Costo','% Ganancia','',''],
  ['','','Venta','','','','',''],
  ['B-03','CANASTA SKIMMER NATURAL',7500,'',3750,100,'',''],
  ['B-02','BOYA HONGO',3537,'',1965,80,'',''],
  ['Codigo','Descripcion: LINEA PILETA          Proveedor: PURA QUIMICA','Costo','Cant./Lt.','Costo','% Ganancia'],
  ['','','Venta','','x Kg.',''],
  ['PURA QUIMICA','PASTILLAS CLORO TRIPLE ACCION 200 grs x 1 kg.',7560,1,5040,50],
  ['','PASTILLAS CLORO TRIPLE ACCION 200 grs x 50 kg. (Pileteros)',312480,50,252000,24],
  ['Codigo','Descripcion: GEMORA','Costo','','Costo Compra','% Ganancia','Precio Ref.',''],
  ['','','Venta/Uni.','','','','GEMORA',''],
  ['','PAÑO AMARILLO MULTIUSO (x Unid)',493,'',340,45],
  ['','SIN PRECIO',null,'',null,null]
 ];
}

test('la lista del proveedor se lee por secciones y hereda el código de la presentación',()=>{
 const {filas,proveedores,avisos}=leerLista(hoja());
 assert.deepEqual(proveedores,['ACUAMAR','GEMORA','PURA QUIMICA','UNIBLANC']);
 const litro=filas.find(f=>f.codigo==='482'&&f.presentacion==='1 Lt');
 const cinco=filas.find(f=>f.codigo==='482'&&f.presentacion==='5 Lts');
 assert.equal(cinco.presentacion,'5 Lts');
 assert.equal(cinco.proveedor||cinco.provNombre,'UNIBLANC');
 // El envase se suma a la venta: se guarda el costo que reproduce el precio de la lista.
 assert.equal(litro.costo,836.67);
 assert.equal(litro.precio,1255);
 assert.equal(litro.margen,50);
 assert.match(litro.aviso,/envase/i);
 assert.equal(cinco.costo,3350);
 assert.equal(cinco.precio,5025);
 assert.equal(cinco.categoria,'Líquidos 5L');
 assert.ok(avisos.some(a=>/SIN PRECIO/i.test(a))||!filas.some(f=>/SIN PRECIO/i.test(f.nombre)));
});

test('los envases y accesorios van a Accesorios y el resto conserva su sección',()=>{
 const {filas}=leerLista(hoja());
 const pulverizador=filas.find(f=>f.codigo==='89');
 const botella=filas.find(f=>f.codigo==='91');
 assert.equal(pulverizador.categoria,'Accesorios');
 assert.equal(botella.categoria,'Accesorios');
 assert.equal(botella.presentacion,'250 cc');
 const canasta=filas.find(f=>f.codigo==='B-03');
 assert.equal(canasta.categoria,'Accesorios');
 assert.equal(canasta.provNombre,'ACUAMAR');
 const pastillas=filas.find(f=>/PASTILLAS/.test(f.nombre));
 assert.equal(pastillas.provNombre,'PURA QUIMICA');
 assert.equal(pastillas.categoria,'Pileta');
 assert.equal(pastillas.presentacion,'1 Kg');
 const paquete=filas.find(f=>/50 kg/i.test(f.nombre));
 assert.equal(paquete.presentacion,'50 Kg');
 assert.equal(paquete.precio,312480);
});

test('las filas sin costo ni venta quedan afuera con aviso',()=>{
 const {filas,avisos}=leerLista(hoja());
 assert.ok(!filas.some(f=>/SIN PRECIO/i.test(f.nombre)));
 assert.ok(avisos.some(a=>/SIN PRECIO/i.test(a)));
});

test('la clave de importación ignora acentos y presentación escrita distinto',()=>{
 const a=claveProducto({codigo:'B-03',nombre:'Canasta',presentacion:'x Unid'});
 const b=claveProducto({codigo:'b 03',nombre:'Otra cosa',presentacion:'X UNID'});
 assert.equal(a,b);
 assert.equal(claveProducto({codigo:'',nombre:'PAÑO AMARILLO',presentacion:'x Unid'}),'PANOAMARILLO|XUNID');
});

test('presentación y nombre corto respetan la planilla',()=>{
 assert.equal(presentacionDe('LAVANDINA 5 Lts. (50%)',5),'5 Lts');
 assert.equal(presentacionDe('BOTELLA 250 cc.',undefined),'250 cc');
 assert.equal(presentacionDe('PRODUCTO SIN DATO',undefined),'x Unid');
 assert.equal(nombreCorto('LAVANDINA CONCENTRADA 1 Lt. (50% Concent. Cloro)','1 Lt'),'LAVANDINA CONCENTRADA 1 Lt');
 assert.equal(nombreCorto('CLORO GRANULADO - DILUCION RAPIDA 50 Kg. (Pileteros)','50 Kg'),'CLORO GRANULADO - DILUCION RAPIDA 50 Kg');
});
