import {test} from 'node:test';import assert from 'node:assert/strict';
let remito={};try{remito=await import('../js/remito.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const db={clientes:[{id:'c1',nombre:'Mostrador',extra:''},{id:'c2',nombre:'Ana <script>',extra:'Calle 123'}],productos:[{id:'p1',nombre:'Precio actual',precio:999}],ventas:[{id:'v1',fecha:'2026-10-26T15:00:00Z',clienteId:'c2',items:[{id:'p1',nombre:'Lavandina',cant:2,precio:100}],total:200}]};
test('después de cobrar imprime última venta con sus valores originales',()=>{assert.equal(typeof remito.prepararRemito,'function');const r=remito.prepararRemito(db,[],'c1');assert.equal(r.cliente.nombre,'Ana <script>');assert.equal(r.items[0].precio,100);assert.equal(r.total,200);assert.equal(r.fecha,db.ventas[0].fecha);assert.equal(db.ventas.length,1);});
test('el carrito actual tiene prioridad y su impresión no registra una venta',()=>{assert.equal(typeof remito.prepararRemito,'function');const items=[{nombre:'Detergente',precio:125.5,cant:3}];const r=remito.prepararRemito(db,items,'c1');assert.equal(r.total,376.5);assert.equal(r.cliente.nombre,'Mostrador');assert.equal(db.ventas.length,1);r.items[0].cant=99;assert.equal(items[0].cant,3);});
test('plantilla contiene datos, totales y texto escapado sin omitir líneas largas',()=>{assert.equal(typeof remito.htmlRemito,'function');const r=remito.prepararRemito(db,[]);const html=remito.htmlRemito(r);assert.match(html,/REMITO/);assert.match(html,/3534098633/);assert.match(html,/Ana &lt;script&gt;/);assert.match(html,/Calle 123/);assert.match(html,/Cantidad/);assert.match(html,/Unitario/);assert.match(html,/200,00/);assert.doesNotMatch(html,/<script>/);r.items=Array.from({length:40},(_,i)=>({nombre:'Producto-'+i,precio:1,cant:1}));assert.match(remito.htmlRemito(r),/Producto-39/);});
test('sin carrito ni venta no imprime un remito vacío',()=>{assert.equal(typeof remito.prepararRemito,'function');assert.throws(()=>remito.prepararRemito({...db,ventas:[]},[]),/venta|ticket/i);});
test('terminar o cancelar impresión limpia el modo remito y permite reimprimir',async()=>{
 const originalDocument=globalThis.document,originalWindow=globalThis.window;let prints=0,cleaned=0;const classes=new Set(),events=new Map();
 const box={innerHTML:'',querySelector:()=>({decode:async()=>{}}),replaceChildren(){cleaned++;}};
 globalThis.document={getElementById:()=>box,body:{classList:{add:c=>classes.add(c),remove:(...cs)=>cs.forEach(c=>classes.delete(c))}},fonts:{ready:Promise.resolve()}};
 globalThis.window={addEventListener:(name,cb)=>events.set(name,cb),removeEventListener:name=>events.delete(name),print(){prints++;assert.equal(classes.has('print-remito'),true);assert.match(box.innerHTML,/REMITO/);events.get('afterprint')();}};
 try{await globalThis.Remito.imprimir(db,[]);await globalThis.Remito.imprimir(db,[]);assert.equal(prints,2);assert.equal(cleaned,2);assert.equal(classes.has('print-remito'),false);assert.equal(events.size,0);}finally{globalThis.document=originalDocument;globalThis.window=originalWindow;}
});
test('media A4 pagina explícitamente con totales dentro de cada hoja',()=>{
 const r={fecha:db.ventas[0].fecha,cliente:db.clientes[1],items:Array.from({length:40},(_,i)=>({nombre:'Producto-'+i,precio:2,cant:1})),total:79.5};
 const html=remito.htmlRemito(r);
 assert.equal((html.match(/class="remito-hoja"/g)||[]).length,3);
 assert.match(html,/Hoja 1\/3/);assert.match(html,/Hoja 3\/3/);assert.match(html,/SUBTOTAL DE ESTA HOJA/);assert.match(html,/TOTAL FINAL/);assert.match(html,/79,50/);
 assert.equal((html.match(/Producto-\d+/g)||[]).length,40);
});
test('descripciones extraordinarias continúan sin perder texto ni duplicar importe',()=>{
 const nombre='x'.repeat(3000)+'FINAL';const r={fecha:db.ventas[0].fecha,cliente:db.clientes[0],items:[{nombre,precio:10,cant:2}],total:20};
 const html=remito.htmlRemito(r);assert.match(html,/FINAL/);assert.ok((html.match(/class="remito-hoja"/g)||[]).length>1);assert.equal((html.match(/data-item="0"/g)||[]).length,1);assert.match(html,/continuación/);
});
test('venta preserva nombre y dirección históricos aunque el cliente cambie',()=>{
 const venta={...db.ventas[0],clienteSnapshot:{id:'c2',nombre:'Ana original',extra:'Dirección original'}};
 const r=remito.prepararRemito({...db,ventas:[venta]},[]);assert.equal(r.cliente.nombre,'Ana original');assert.equal(r.cliente.extra,'Dirección original');r.cliente.nombre='Otro';assert.equal(venta.clienteSnapshot.nombre,'Ana original');
});
test('impresión mide hojas y reduce filas hasta que pie y detalle entren',async()=>{
 const oldD=globalThis.document,oldW=globalThis.window;const events=new Map();let prints=0,mediciones=0;
 const box={innerHTML:'',style:{cssText:'color: red'},getBoundingClientRect:()=>({height:510}),replaceChildren(){},querySelectorAll(selector){if(selector==='img')return [];if(selector==='.remito-hoja'){mediciones++;const pages=this.innerHTML.split('class="remito-hoja"').slice(1);return pages.map(page=>{const rows=(page.match(/data-item=/g)||[]).length;return {getBoundingClientRect:()=>({bottom:510,height:510}),querySelectorAll:()=>[{getBoundingClientRect:()=>({bottom:rows>16?530:500})}]};});}return [];}};
 globalThis.document={getElementById:()=>box,body:{classList:{add(){},remove(){}}},fonts:{ready:Promise.resolve()}};
 globalThis.window={addEventListener:(n,cb)=>events.set(n,cb),removeEventListener:n=>events.delete(n),print(){prints++;assert.equal(box.style.cssText,'color: red');assert.equal((box.innerHTML.match(/class="remito-hoja"/g)||[]).length,3);events.get('afterprint')();}};
 try{await globalThis.Remito.imprimir(db,Array.from({length:40},(_,i)=>({nombre:'P'+i,precio:1,cant:1})),'c1');assert.equal(prints,1);assert.ok(mediciones>1);}finally{globalThis.document=oldD;globalThis.window=oldW;}
});
test('última venta impresa no es una compra histórica ni una venta anulada',()=>{const newer={...db.ventas[0],id:'historica',historica:true,items:[{nombre:'Antigua',cant:1,precio:1}],total:1};const d={...db,ventas:[newer,{...newer,historica:false,anulada:true},...db.ventas]};assert.equal(remito.prepararRemito(d,[]).items[0].nombre,'Lavandina');});
