export const normal=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/\b(litros?|lts?\.?)(?=\s|$)/g,'l').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
export function numeroCosto(value){if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;let s=String(value??'').trim().replace(/ARS|\$/gi,'').replace(/[\s\u00a0]/g,'');if(!s||!/^\d[\d.,]*$/.test(s))return null;if(s.includes(',')&&s.includes('.')){const decimal=s.lastIndexOf(',')>s.lastIndexOf('.')?',':'.';s=decimal===','?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');}else if(s.includes(',')){if((s.match(/,/g)||[]).length!==1)return null;s=s.replace(',','.');}else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');const n=Number(s);return Number.isFinite(n)&&n>=0?n:null;}
export function parseCSV(text){text=String(text).replace(/^\uFEFF/,'').replace(/^sep=.[\r\n]+/i,'');const first=text.split(/\r?\n/).find(l=>l.trim())||'';const delimiters=[';',',','\t'];const counts=delimiters.map(d=>{let q=false,n=0;for(let i=0;i<first.length;i++){if(first[i]==='"')q=!q;else if(!q&&first[i]===d)n++;}return n;});const delimiter=delimiters[counts.indexOf(Math.max(...counts))];const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(field);field='';if(c!==delimiter){if(row.some(x=>x.trim()))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}else field+=c;}row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;}
export function detectarColumnas(headers){const labels=headers.map(v=>normal(v).replace(/ /g,''));const find=re=>labels.findIndex(s=>re.test(s));let costo=-1,best=-1;labels.forEach((s,i)=>{let score=-1;if(s.includes('costo')||s.includes('coste'))score=10;if(/costocompra|preciocosto|costo.*lt|costol$|costeunit|costounit/.test(s))score=20;if(/^(precio|preciounitario|importe|preciocimp|precioconiva|costoporlitrokg)$/.test(s))score=5;if(/venta|ganancia|margen|porcentaje|botella|envase/.test(s))score=-1;if(score>best){best=score;costo=i;}});const explicitCode=find(/^(codigo|cod|sku|ean|codbarra|codigobarras|codarticulo)$/),explicitName=find(/descripcion|producto|nombre|detalle/);return {codigo:explicitCode>=0?explicitCode:explicitName>=0?find(/^articulo$/):-1,nombre:explicitName>=0?explicitName:explicitCode>=0?find(/^articulo$/):-1,presentacion:find(/presentacion|contenido|envase|medida|cant.*l$/),costo};}
export function detectarEncabezado(rows){let found=0,best=-1;rows.slice(0,25).forEach((r,i)=>{const c=detectarColumnas(r),score=(c.codigo>=0?3:0)+(c.nombre>=0?3:0)+(c.costo>=0?5:0);if(score>best){best=score;found=i;}});return found;}
const volumen=/\b(\d+(?:[.,]\d+)?)\s*(ml|litros?|lts?\.?|l|kgrs?|kgs?|grs?|g)\b/i;
function presentacion(value){const m=String(value??'').match(volumen);if(!m)return '';const n=Number(m[1].replace(',','.')),u=m[2].toLowerCase();return /^(ml|l)/.test(u)?`${Math.round(n*(u==='ml'?1:1000)*1000)/1000}ml`:`${Math.round(n*(/^kg/.test(u)?1000:1)*1000)/1000}g`;}
const familia=name=>normal(String(name??'').replace(volumen,''));
export function extraerFilas(rows,headerIndex,columns){let previous=null;const out=[];for(let i=headerIndex+1;i<rows.length;i++){const r=rows[i],cost=numeroCosto(r[columns.costo]),nombre=String(r[columns.nombre]??'').trim();if(cost==null||!nombre)continue;let codigo=columns.codigo>=0?String(r[columns.codigo]??'').trim():'',inferido=false;let pres=columns.presentacion>=0?String(r[columns.presentacion]??''):'';if(/^\d+(?:[.,]\d+)?$/.test(pres)&&/cant.*l$/.test(normal(rows[headerIndex]?.[columns.presentacion]).replace(/ /g,'')))pres+=' l';if(!codigo&&previous?.codigo&&familia(nombre)===familia(previous.nombre)&&(presentacion(nombre)||presentacion(pres))){codigo=previous.codigo;inferido=true;}const row={codigo,nombre,presentacion:pres,costo:cost,fila:i+1,codigoInferido:inferido,baseCosto:/costoporlitrokg/.test(normal(rows[headerIndex]?.[columns.costo]).replace(/ /g,''))?'litro-kg':'unidad'};out.push(row);previous=row;}return out;}
export function unidadesPack(value){
 const text=normal(value),values=[];
 for(const re of [/\bx\s*(\d+)\s*(?:unidades|unid|uni|und|u)\b/g,/\b(?:pack|caja|bulto|paquete)\s*(?:x|de)?\s*(\d+)\b/g])for(const m of text.matchAll(re)){const n=Number(m[1]);if(Number.isInteger(n)&&n>1&&n<=100000)values.push(n);}
 return values.at(-1)??null;
}
export function compararFilas(rows,products,asignaciones={},conversiones={}){
 const expanded=rows.flatMap((source,sourceIndex)=>{
  if(source.baseCosto!=='litro-kg')return [{source,sourceIndex}];
  const code=String(source.codigo||'').trim().toUpperCase();
  const matches=products.filter(p=>code&&String(p.codigo||'').trim().toUpperCase()===code);
  return matches.length?matches.map(p=>({source:{...source,destinoId:p.id},sourceIndex})):[{source,sourceIndex}];
 });
 const out=expanded.map(({source,sourceIndex},index)=>{
  const chosen=asignaciones[index]||source.destinoId,code=String(source.codigo||'').trim().toUpperCase(),pres=presentacion(source.presentacion)||presentacion(source.nombre);
  let candidatos=code?products.filter(p=>String(p.codigo||'').trim().toUpperCase()===code):[],motivo='Código';
  if(pres&&candidatos.length)candidatos=candidatos.filter(p=>(presentacion(p.presentacion)||presentacion(p.nombre))===pres);
  if(!candidatos.length){candidatos=products.filter(p=>normal(p.nombre)===normal(source.nombre)&&(!pres||(presentacion(p.presentacion)||presentacion(p.nombre))===pres));motivo='Nombre exacto';}
  if(chosen){candidatos=products.filter(p=>p.id===chosen);motivo=source.destinoId&&!asignaciones[index]?'Código · costo por litro/kg':'Elegido manualmente';}
  const p=candidatos.length===1?candidatos[0]:null;
  if(!p)return {source,sourceIndex,index,id:null,estado:candidatos.length?'ambigua':'no-encontrado',candidatos:candidatos.map(p=>p.id),motivo};
  const decision=conversiones[String(sourceIndex)+':'+p.id]||{},unidadesSugeridas=unidadesPack(source.nombre+' '+(source.presentacion||''));
  let costoNuevo=source.costo,factor=1,divisorPack=1;
  if(source.baseCosto!=='litro-kg'){
   const n=Number(decision.unidades);
   if((unidadesSugeridas&&!['unidad','pack'].includes(decision.modo))||(decision.modo==='pack'&&(!Number.isInteger(n)||n<2||n>100000)))return {source,sourceIndex,index,id:p.id,producto:p,estado:'revisar-pack',candidatos:[p.id],motivo,unidadesSugeridas,costoAnterior:p.costo,precioAnterior:p.precio};
   if(decision.modo==='pack'){divisorPack=n;costoNuevo=Math.round(source.costo/n*100)/100;}
  }
  if(source.baseCosto==='litro-kg'){
   const size=presentacion(p.presentacion)||presentacion(p.nombre);
   if(!size||Number(size.replace(/ml|g/g,''))<=0)return {source,sourceIndex,index,id:p.id,producto:p,estado:'sin-presentacion',candidatos:[p.id],motivo:'Revisar litros o kilos de la presentación'};
   factor=Number(size.replace(/ml|g/g,''))/1000;
   costoNuevo=Math.round(source.costo*factor*100)/100;
  }
  const dif=costoNuevo-Number(p.costo),estado=source.costo<=0?'sin-precio':Math.abs(dif)<.005?'igual':dif>0?'sube':'baja',precioNuevo=dif>0?Math.round((Number(p.costo)>0?p.precio*costoNuevo/p.costo:costoNuevo*(1+(Number(p.margen)||0)/100))*100)/100:p.precio;
  return {source,sourceIndex,index,id:p.id,producto:p,estado,candidatos:[p.id],costoAnterior:p.costo,costoNuevo,diferencia:dif,precioAnterior:Math.round((p.precio+Number(p.precioEnvase||0))*100)/100,precioNuevo:Math.round((precioNuevo+Number(p.precioEnvase||0))*100)/100,margenAnterior:p.costo>0?(p.precio/p.costo-1)*100:null,margenNuevo:costoNuevo>0?(precioNuevo/costoNuevo-1)*100:null,motivo,factor,divisorPack,unidadesSugeridas,modoCotizacion:decision.modo||'unidad'};
 });
 const counts=new Map();out.forEach(r=>{if(r.id)counts.set(r.id,(counts.get(r.id)||0)+1);});out.forEach(r=>{if(r.id&&counts.get(r.id)>1)r.estado='duplicada';});return out;
}
// PDF rows are reconstructed by position, never by extraction order. These
// supplier layouts right-align money and may merge Codigo + Descripcion.
export function filasPDF(pages){
 const lines=[];
 for(const items of pages){const grouped=[];for(const item of items.filter(i=>i.str?.trim()).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){let row=grouped.find(r=>Math.abs(r.y-item.transform[5])<2.5);if(!row){row={y:item.transform[5],items:[]};grouped.push(row);}row.items.push(item);}for(const r of grouped)lines.push(r.items.sort((a,b)=>a.transform[4]-b.transform[4]));}
 const granel=lines.some(line=>line.some(i=>/x\s*lt\.?\s*\/\s*k/i.test(i.str)));
 const supplierHeader=lines.find(line=>{const text=normal(line.map(i=>i.str).join(' '));return /codigo/.test(text)&&/descripcion|articulo/.test(text)&&(/precio/.test(text)||/x l k/.test(text));});
 if(supplierHeader){
  const out=[['Código','Descripción',granel?'Costo por litro/kg':'Costo']];
  const headerY=lines.indexOf(supplierHeader);
  for(const line of lines.slice(headerY+1)){
   const price=line.at(-1),code=line[0];if(line.length<3||!/^\d{1,14}(?:[/-]\d+)?$/.test(code.str.trim()))continue;
   const cost=numeroCosto(price.str);if(cost===null||!/[.,$]/.test(price.str))continue;
   const nombre=line.slice(1,-1).map(i=>i.str.trim()).filter(Boolean).join(' ');if(!/[a-záéíóúñ]/i.test(nombre))continue;
   out.push([code.str.trim(),nombre,cost]);
  }
  return out;
 }
 let header=null,best=-1;for(const line of lines.slice(0,50)){const c=detectarColumnas(line.map(x=>x.str)),score=(c.codigo>=0?3:0)+(c.nombre>=0?3:0)+(c.costo>=0?5:0);if(score>best){best=score;header=line;}}
 if(!header)return [];const starts=header.map(i=>i.transform[4]);return lines.map(items=>{const row=starts.map(()=> '');for(const item of items){let col=0;for(let j=0;j<starts.length;j++)if(item.transform[4]>=starts[j]-4)col=j;row[col]+=(row[col]?' ':'')+item.str;}return row;});
}

export const claveCambio=r=>String(r.sourceIndex??r.index)+':'+String(r.id||'');
export const cambiosPendientes=(rows,omitidos=new Set())=>rows.filter(r=>['sube','baja'].includes(r.estado)&&!omitidos.has(claveCambio(r)));
