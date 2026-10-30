// Lee la lista de precios completa del proveedor (formato Mi Limpieza) y la
// describe como catálogo. No modifica nada: la pantalla muestra el resumen y
// recién después se confirma online.
//
// Estructura esperada (hoja "Lista PRECIO"):
//   A=Código  B=Descripción  C=Venta  D=Cant./Lt.  E=Costo  F=% Ganancia  H=Costo botella
// Las filas con A="Codigo" abren una sección y traen el proveedor en B:
//   "Descripcion: LINEA PILETA ... Proveedor: UNIBLANC"
// El código viene una sola vez (celda combinada): las presentaciones siguientes lo heredan.
//
// Regla del cliente: la venta se calcula desde costo y margen, y la botella se
// suma a la venta. Por eso el costo que se guarda es venta ÷ (1 + margen/%):
// así la app reproduce exactamente el precio de la lista.
const ENVASES=/^(BID[OÓ]N|BOTELLA|ENVASE|PULVERIZADOR|ROCIADOR|ASPERSOR)/i;
const PRESENTACIONES=[[/\b10\s*LTS?/i,'10 Lts'],[/\b5\s*LTS?/i,'5 Lts'],[/\b1\s*LT\.?(?![A-Z])/i,'1 Lt'],
 [/\b50\s*KGS?/i,'50 Kg'],[/\b45\s*KGS?/i,'45 Kg'],[/\b1\s*KGS?\.?/i,'1 Kg'],[/\b1\s*KGR/i,'1 Kg'],
 [/\b500\s*GR/i,'500 grs'],[/\b250\s*CC/i,'250 cc'],[/\b360\s*CC/i,'360 cc'],[/\b750\s*ML/i,'750 ml']];

export function normalizar(valor){
 return String(valor??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}

export function presentacionDe(detalle,cant){
 const completo=String(detalle??'');
 // El tamaño del envase va antes que las dosis o rindes que la planilla pone entre paréntesis.
 const fuera=completo.replace(/\([^)]*\)/g,' ');
 const buscar=t=>{for(const [patron,valor] of PRESENTACIONES) if(patron.test(t)) return valor;return null;};
 const porTexto=buscar(fuera)||buscar(completo);
 let porCant=null;
 if(typeof cant==='number'&&cant>0){
  if(cant===1) porCant='1 Lt';
  else if(cant===5) porCant='5 Lts';
  else if(cant===10) porCant='10 Lts';
  else if(cant===0.5) porCant='500 grs';
  else if(Number.isInteger(cant)) porCant=cant+' x Unid';
 }
 // Si la planilla copió el tamaño de otra presentación, manda la columna Cant./Lt.
 if(porTexto&&porCant&&/LTS?$/i.test(porTexto)&&porCant!==porTexto) return porCant;
 return porTexto||porCant||'x Unid';
}

export function claveProducto(fila){
 const codigo=normalizar(fila?.codigo)||normalizar(fila?.nombre);
 return codigo+'|'+normalizar(fila?.presentacion);
}

const numero=valor=>typeof valor==='number'&&Number.isFinite(valor)?valor:null;
const texto=valor=>String(valor??'').replace(/\s+/g,' ').trim();
const redondear=n=>Math.round(n*100)/100;

function proveedorDe(cabecera){
 const conEtiqueta=/Proveedor:\s*([^|]+)$/i.exec(cabecera);
 if(conEtiqueta) return texto(conEtiqueta[1]);
 const solo=cabecera.replace(/^Descripcion:\s*/i,'').replace(/\s+/g,' ').trim();
 return /GEMORA|DON EMILIO|ACUAMAR|UNIBLANC|PURA QUIMICA/i.test(solo)?solo.toUpperCase():null;
}

function categoriaDe(proveedor,tipo,detalle,presentacion){
 if(tipo==='liquido'){
  if(ENVASES.test(detalle)) return 'Accesorios';
  return presentacion==='5 Lts'||presentacion==='10 Lts'?'Líquidos 5L':'Líquidos 1L';
 }
 if(tipo==='pileta') return /^ACUAMAR/i.test(proveedor)||ENVASES.test(detalle)?'Accesorios':'Pileta';
 return 'Accesorios';
}

// Nombre corto: corta la explicación de dosis/uso después del primer punto o paréntesis.
export function nombreCorto(detalle,presentacion){
 let base=texto(detalle);
 const parentesis=base.indexOf('(');
 if(parentesis>12) base=base.slice(0,parentesis);
 else{
  const corte=base.indexOf('. ');
  if(corte>12){
   const resto=base.slice(corte+2).trim();
   // Cortar sólo si sigue una explicación ("Para recuperar el agua"), no una variante del producto ("- Dove").
   if(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(resto)&&resto.split(/\s+/).length>=3) base=base.slice(0,corte);
  }
 }
 base=texto(base).replace(/[.;,]+$/,'');
 const final=/(\d+)\s*(LTS?|LT|KGR|GR|CC|ML)\s*$/i.exec(base);
 if(final&&presentacion&&presentacion!=='x Unid'){
  const real=/^(\d+)/.exec(presentacion);
  if(real&&real[1]!==final[1]) base=texto(base.slice(0,final.index))+' '+presentacion;
 }
 return base||texto(detalle);
}

export function leerLista(rows){
 const filas=[],avisos=[];const vistos=new Map();
 let proveedor=null,tipo=null,ultimoCodigo=null,seccion=0;
 for(let i=0;i<rows.length;i++){
  const fila=rows[i]||[];
  const primera=texto(fila[0]);
  if(primera.toLowerCase()==='codigo'){
   seccion++;
   const cabecera=texto(fila[1]);
   proveedor=proveedorDe(cabecera);
   tipo=/LIQUIDO/i.test(cabecera)?'liquido':/PILETA/i.test(cabecera)?'pileta':'otros';
   ultimoCodigo=null;
   if(!proveedor) avisos.push(`Fila ${i+1}: no se pudo leer el proveedor de la sección.`);
   continue;
  }
  if(!proveedor) continue;
  const detalle=texto(fila[1]);
  if(!detalle) continue;
  let codigo=primera;
  const etiqueta=!!codigo&&!/\d/.test(codigo)&&codigo.length>3;
  if(etiqueta) codigo=ultimoCodigo;
  else if(codigo) ultimoCodigo=codigo;
  else codigo=ultimoCodigo;

  const venta=numero(fila[2]),cant=numero(fila[3]),costoLista=numero(fila[4]),margen=numero(fila[5]),envase=numero(fila[7]);
  const presentacion=presentacionDe(detalle,cant);
  const categoria=categoriaDe(proveedor,tipo,detalle,presentacion);
  let costo=null,precio=null,nota=null,margenFila=margen,incompleta=false;
  const margenValido=margen!=null&&margen>-100;
  if(venta!=null&&venta>0&&margenValido){
   costo=redondear(venta/(1+margen/100));
   // El precio que manda es el de la lista: se guarda tal cual.
   precio=redondear(venta);
   if(envase) nota=`La venta de la lista incluye $${redondear(envase)} de envase; se guarda el costo equivalente para que la app calcule ese precio.`;
  }else if(venta!=null&&venta>0&&costoLista!=null&&costoLista>0){
   costo=redondear(costoLista);precio=redondear(venta);margenFila=redondear((precio/costo-1)*100);
   nota='La lista no trae el margen: se calculó desde la venta y el costo.';
  }else if(venta!=null&&venta>0){
   // La planilla trae la venta pero no el costo: se conserva el costo cargado.
   precio=redondear(venta);margenFila=null;incompleta=true;
   nota='La lista no trae el costo de este producto: se mantiene el costo ya cargado y su venta de la lista.';
  }else if(costoLista!=null&&costoLista>0){
   costo=redondear(costoLista);precio=redondear(costo*(1+(margen||0)/100));
   nota='Sin venta en la lista: se calculó desde el costo.';
  }else{
   avisos.push(`Fila ${i+1}: ${detalle.slice(0,50)} no tiene costo ni venta; queda afuera.`);
   continue;
  }
  const nombre=nombreCorto(detalle,presentacion);
  const base={codigo,detalle,nombre,presentacion,categoria,provNombre:proveedor,costo,margen:margenFila,precio,aviso:nota,incompleta,fila:i+1};
  let clave=claveProducto(base);
  if(vistos.has(clave)){clave=clave+'|'+normalizar(nombre);base.aviso=[nota,`Código y presentación repetidos (fila ${vistos.get(claveProducto(base))}); se distingue por nombre.`].filter(Boolean).join(' ');}
  else vistos.set(clave,base.fila);
  filas.push({...base,clave});
 }
 const proveedores=[...new Set(filas.map(f=>f.provNombre))].sort((a,b)=>a.localeCompare(b,'es'));
 if(!filas.length) avisos.push('No se encontraron productos: revisá que la hoja sea la lista de precios del proveedor.');
 return {filas,proveedores,avisos};
}
