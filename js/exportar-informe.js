const ExportarInforme=(()=>{
 const loaders=new Map();
 function script(path,key){if(globalThis[key])return Promise.resolve(globalThis[key]);if(!loaders.has(key))loaders.set(key,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL(path,document.baseURI).href;s.onload=()=>globalThis[key]?resolve(globalThis[key]):reject(new Error('No se pudo cargar '+key));s.onerror=()=>{loaders.delete(key);reject(new Error('No se pudo cargar la herramienta. Revisá la conexión.'));};document.head.append(s);}));return loaders.get(key);}
 const excel=()=>script('js/vendor/xlsx.full.min.js','XLSX');
 const pdf=()=>script('js/vendor/pdf-lib.min.js','PDFLib');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cell=(v,title='')=>typeof v==='number'?v.toLocaleString('es-AR',{minimumFractionDigits:/precio|venta|costo|importe|total|deuda|pagado|ingreso|egreso/i.test(title)?2:0,maximumFractionDigits:2}):String(v??'');
 function validate(m){if(!m||!Array.isArray(m.columnas)||!Array.isArray(m.filas)||!m.columnas.length)throw new Error('Primero generá un informe.');if(m.filas.length>20000)throw new Error('El informe supera 20.000 filas. Reducí el período para exportar.');}
 function csv(m){validate(m);const encode=(v,title)=>{let text=cell(v,title);if(typeof v!=='number'&&/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};return '\uFEFF'+[m.columnas.map(v=>encode(v)),...m.filas.map(row=>m.columnas.map((title,i)=>encode(row[i],title)))].map(row=>row.join(';')).join('\r\n');}
 function html(m){validate(m);return `<header><h1>Mi Limpieza</h1><h2>${esc(m.titulo)}</h2><p>${esc(m.subtitulo)}</p>${(m.resumen||[]).map(s=>`<p>${esc(s)}</p>`).join('')}</header><table><thead><tr>${m.columnas.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${m.filas.map(row=>`<tr>${m.columnas.map((title,i)=>`<td>${esc(cell(row[i],title))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
 const filename=m=>String(m.titulo||'informe').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').slice(0,75)+'-'+new Date().toISOString().slice(0,10);
 function download(bytes,type,name){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function xlsxBytes(m){validate(m);const X=await excel(),data=m.filas.map(row=>row.map((v,i)=>/fecha/i.test(m.columnas[i])&&/^\d{4}-\d{2}-\d{2}$/.test(String(v))?new Date(v+'T12:00:00'):v)),sheet=X.utils.aoa_to_sheet([m.columnas,...data]);sheet['!cols']=m.columnas.map((title,i)=>({wch:Math.min(48,Math.max(title.length+2,...m.filas.slice(0,200).map(r=>String(r[i]??'').length+2)))}));sheet['!autofilter']={ref:sheet['!ref']};for(let c=0;c<m.columnas.length;c++)if(/precio|venta|costo|importe|total|deuda|pagado|ingreso|egreso/i.test(m.columnas[c]))for(let r=1;r<=m.filas.length;r++){const key=X.utils.encode_cell({r,c});if(sheet[key]?.t==='n')sheet[key].z='#,##0.00';}for(let c=0;c<m.columnas.length;c++)if(/fecha/i.test(m.columnas[c]))for(let r=1;r<=m.filas.length;r++){const key=X.utils.encode_cell({r,c});if(sheet[key]?.t==='n')sheet[key].z='dd/mm/yyyy';}const book=X.utils.book_new();X.utils.book_append_sheet(book,sheet,'Informe');return X.write(book,{bookType:'xlsx',type:'array'});}
 const latin=text=>String(text??'').normalize('NFC').replace(/[–—‑]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x20-\xFF\n]/g,'?');
 // Only raster photos from the photo service or local raster data may enter a customer document.
 async function fotoDatos(source){
  if(typeof source!=='string'||!source)return '';
  try{
   let blob;
   if(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(source)){blob=await (await fetch(source)).blob();}
   else{const url=new URL(source,document.baseURI),base=new URL(document.baseURI);if(url.origin!==base.origin||!/^\/api\/photos\/[a-f0-9]{64}$/.test(url.pathname)||url.username||url.password)return '';const response=await fetch(url.href,{credentials:'same-origin',redirect:'error'});if(!response.ok)return '';blob=await response.blob();}
   if(!/^image\/(jpeg|png)$/.test(blob.type)||blob.size>10*1024*1024)return '';
   const bytes=new Uint8Array(await blob.arrayBuffer());
   if(!(bytes[0]===255&&bytes[1]===216)&&!(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))return '';
   return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  }catch{return '';}
 }
 async function fotosPreparadas(m){const out=[];for(const source of m.fotos||[])out.push(await fotoDatos(source));return out;}
 function htmlFotos(m,fotos){return '<header><h1>Mi Limpieza</h1><h2>'+esc(m.titulo)+'</h2><p>'+esc(m.subtitulo)+'</p></header><div class="lista-comercial">'+m.filas.map((row,i)=>'<article>'+(fotos[i]?'<img alt="" src="'+esc(fotos[i])+'">':'<div class="lista-sin-foto">Sin foto</div>')+'<div><h3>'+esc(row[1])+'</h3><p>'+esc(row[2])+'</p><strong>$ '+esc(cell(row[3],'Precio'))+'</strong></div></article>').join('')+'</div>';}
 async function pdfFotos(m){
  const fotos=await fotosPreparadas(m),P=await pdf(),doc=await P.PDFDocument.create(),font=await doc.embedFont(P.StandardFonts.Helvetica),bold=await doc.embedFont(P.StandardFonts.HelveticaBold);let page,y;
  const lines=(value,max=66)=>{const text=latin(value),result=[];for(let start=0;start<text.length;start+=max)result.push(text.slice(start,start+max));return result.length?result:[''];};
  function addPage(){page=doc.addPage([595.28,841.89]);y=800;page.drawText('MI LIMPIEZA',{x:32,y,size:17,font:bold});y-=25;for(const line of lines(m.titulo)){page.drawText(line,{x:32,y,size:12,font:bold});y-=16;}for(const line of lines(m.subtitulo)){page.drawText(line,{x:32,y,size:10,font});y-=14;}y-=12;}
  addPage();
  for(let i=0;i<m.filas.length;i++){const row=m.filas[i],name=lines(row[1],55),presentation=lines(row[2],65),height=Math.max(100,36+name.length*14+presentation.length*12);if(y-height<35)addPage();let image;
   if(fotos[i])try{image=await (/^data:image\/png/.test(fotos[i])?doc.embedPng(fotos[i]):doc.embedJpg(fotos[i]));}catch{}
   if(image){const scale=Math.min(80/image.width,80/image.height);page.drawImage(image,{x:32+(80-image.width*scale)/2,y:y-85+(80-image.height*scale)/2,width:image.width*scale,height:image.height*scale});}
   else{page.drawRectangle({x:32,y:y-85,width:80,height:80,color:P.rgb(.95,.95,.95)});page.drawText('Sin foto',{x:49,y:y-48,size:10,font});}
   let textY=y-16;for(const line of name){page.drawText(line,{x:128,y:textY,size:12,font:bold});textY-=14;}for(const line of presentation){page.drawText(line,{x:128,y:textY,size:10,font});textY-=12;}page.drawText('$ '+latin(cell(row[3],'Precio')),{x:128,y:textY-8,size:14,font:bold});y-=height;page.drawLine({start:{x:32,y},end:{x:563,y},thickness:.3,color:P.rgb(.8,.8,.8)});y-=8;
  }
  const pages=doc.getPages();pages.forEach((p,i)=>p.drawText(`${i+1}/${pages.length}`,{x:540,y:18,size:9,font}));return doc.save();
 }
 async function pdfBytes(m){
  validate(m);if(Array.isArray(m.fotos))return pdfFotos(m);const P=await pdf(),doc=await P.PDFDocument.create(),font=await doc.embedFont(P.StandardFonts.Helvetica),bold=await doc.embedFont(P.StandardFonts.HelveticaBold);const landscape=m.columnas.length>6,size=landscape?[841.89,595.28]:[595.28,841.89],margin=30,usable=size[0]-2*margin,fontSize=8;
  const weights=m.columnas.map(c=>/producto|descripci|direcci|concepto|notas/i.test(c)?3.4:/cliente|proveedor|referencia/i.test(c)?2.4:1.5),sum=weights.reduce((a,b)=>a+b,0),widths=weights.map(w=>usable*w/sum);
  const wrap=(value,width,f=font,s=fontSize)=>{const text=latin(value);const out=[];for(const line of text.split('\n')){let part='';for(const ch of line){if(part&&f.widthOfTextAtSize(part+ch,s)>width){out.push(part);part='';}part+=ch;}out.push(part);}return out;};let page,y;
  function addPage(first=false){page=doc.addPage(size);y=size[1]-margin;page.drawText('MI LIMPIEZA',{x:margin,y:y-14,size:14,font:bold,color:P.rgb(.13,.19,.42)});y-=31;for(const line of wrap(m.titulo,usable,bold,14)){page.drawText(line,{x:margin,y,size:14,font:bold});y-=18;}if(first){for(const value of [m.subtitulo,...(m.resumen||[])])for(const line of wrap(value,usable,font,9)){page.drawText(line,{x:margin,y:y-1,size:9,font});y-=12;}}y-=9;let x=margin;const headerLines=m.columnas.map((c,i)=>wrap(c,widths[i]-8,bold,8)),h=Math.max(...headerLines.map(a=>a.length))*10+10;page.drawRectangle({x:margin,y:y-h,width:usable,height:h,color:P.rgb(.91,.93,.96)});headerLines.forEach((lines,i)=>{lines.forEach((t,j)=>page.drawText(t,{x:x+4,y:y-12-j*10,size:8,font:bold}));x+=widths[i];});y-=h;}
  addPage(true);
  for(const row of m.filas){const lines=m.columnas.map((title,i)=>wrap(cell(row[i],title),widths[i]-8));let remaining=Math.max(...lines.map(l=>l.length)),offset=0;while(remaining>0){let capacity=Math.floor((y-margin-20-8)/10);if(capacity<1){addPage();capacity=Math.floor((y-margin-20-8)/10);}const count=Math.min(remaining,capacity),height=count*10+8;let x=margin;lines.forEach((arr,i)=>{arr.slice(offset,offset+count).forEach((t,j)=>page.drawText(t,{x:x+4,y:y-12-j*10,size:fontSize,font}));x+=widths[i];});page.drawLine({start:{x:margin,y:y-height},end:{x:margin+usable,y:y-height},thickness:.4,color:P.rgb(.82,.82,.82)});y-=height;remaining-=count;offset+=count;if(remaining)addPage();}}
  const pages=doc.getPages();pages.forEach((p,i)=>p.drawText(`Mi Limpieza - ${i+1}/${pages.length}`,{x:margin,y:16,size:8,font}));return doc.save();
 }
 async function exportar(format,m){if(typeof format!=='string')[m,format]=[format,m];validate(m);if(format==='csv')download(csv(m),'text/csv;charset=utf-8',filename(m)+'.csv');else if(format==='xlsx')download(await xlsxBytes(m),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',filename(m)+'.xlsx');else if(format==='pdf')download(await pdfBytes(m),'application/pdf',filename(m)+'.pdf');else throw new Error('Formato no disponible.');}
 async function imprimir(m){validate(m);const fotos=Array.isArray(m.fotos)?await fotosPreparadas(m):null;let box=document.getElementById('informe-print');if(!box){box=document.createElement('section');box.id='informe-print';document.body.append(box);}box.innerHTML=fotos?htmlFotos(m,fotos):html(m);if(fotos)await Promise.all(Array.from(box.querySelectorAll('img')).map(img=>img.decode().catch(()=>{})));box.dataset.paisaje=String(m.columnas.length>6);document.body.classList.remove('print-remito','print-ticket','print-cierre');document.body.classList.add('print-informe');const cleanup=()=>{document.body.classList.remove('print-informe');box.replaceChildren();window.removeEventListener('afterprint',cleanup);};window.addEventListener('afterprint',cleanup);window.print();}
 return {exportar,imprimir,cargarExcel:excel,csv,html,pdfBytes,xlsxBytes,fotoDatos};
})();
