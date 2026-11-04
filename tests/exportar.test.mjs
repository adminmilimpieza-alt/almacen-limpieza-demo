import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function exporter(){const c=vm.createContext({console,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,TextEncoder,TextDecoder});for(const file of ['../js/vendor/xlsx.full.min.js','../js/vendor/pdf-lib.min.js','../js/exportar-informe.js'])vm.runInContext(readFileSync(new URL(file,import.meta.url),'utf8'),c);vm.runInContext('globalThis.exporter=ExportarInforme;',c);return c;}
const report={titulo:'Lista de precios · Revendedores',subtitulo:'Para clientes',columnas:['Fecha','Código','Producto','Venta'],filas:[['2026-10-27','001','Jabón líquido',1000]],resumen:[]};
test('CSV contiene sólo columnas y filas elegidas, con formato argentino y sin fórmulas activas',()=>{const c=exporter();const csv=c.exporter.csv({...report,filas:[...report.filas,['2026-10-27','002','=HYPERLINK("https://example.test")',750.5]]});assert.match(csv,/Jabón líquido/);assert.match(csv,/750,50/);assert.match(csv,/'=HYPERLINK/);assert.doesNotMatch(csv,/Costo|Deuda/);});
test('Excel conserva venta numérica y fecha con formato legible',async()=>{const c=exporter();const bytes=await c.exporter.xlsxBytes(report);const workbook=c.XLSX.read(bytes,{type:'array',cellNF:true});assert.equal(workbook.Sheets.Informe.D2.v,1000);assert.equal(workbook.Sheets.Informe.D2.t,'n');assert.equal(workbook.Sheets.Informe.A2.z,'dd/mm/yyyy');assert.equal(workbook.Sheets.Informe.C2.v,'Jabón líquido');});
test('PDF genera varias páginas y todas las filas permanecen en el archivo',async()=>{const c=exporter();const m={...report,filas:Array.from({length:90},(_,i)=>['2026-10-27',String(i),'Producto '+i+' con una descripción extensa y presentación para compartir con los clientes',1000+i])};const bytes=await c.exporter.pdfBytes(m);assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'%PDF');const parsed=await c.PDFLib.PDFDocument.load(bytes);assert.ok(parsed.getPageCount()>1);assert.ok(bytes.length>3000);});
test('PDF comercial incorpora bytes de foto y bloquea URLs ajenas o rutas privadas',async()=>{
 const c=exporter(),calls=[];
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS8sAAAAASUVORK5CYII=';
 c.URL=URL;c.document={baseURI:'https://tienda.test/'};
 c.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload();});}};
 c.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,blob:async()=>new Blob([Buffer.from(png,'base64')],{type:'image/png'})};};
 for(const source of ['https://otro.test/api/photos/'+'a'.repeat(64),'/api/state','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4='])assert.equal(await c.exporter.fotoDatos(source),'');
 assert.equal(calls.length,0);
 const photo='/api/photos/'+'a'.repeat(64)+'?v=1';
 const bytes=await c.exporter.pdfBytes({titulo:'Lista Mayorista',subtitulo:'Precios finales',columnas:['Código','Producto','Presentación','Precio'],filas:[['A','Jabón','1 L',100],['B','Sin imagen','5 L',200]],fotos:[photo,'']});
 assert.equal(calls.length,1);assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.redirect,'error');
 const parsed=await c.PDFLib.PDFDocument.load(bytes);
 const images=parsed.context.enumerateIndirectObjects().filter(([,object])=>String(object.dict?.get(c.PDFLib.PDFName.of('Subtype')))==='/Image');
 assert.ok(images.length>0,'el PDF debe contener una imagen incorporada');
 assert.doesNotMatch(Buffer.from(bytes).toString(),/api\/photos|tienda\.test/);
});
