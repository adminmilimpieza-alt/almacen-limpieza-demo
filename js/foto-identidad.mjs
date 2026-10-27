// Shared by the browser and Worker: local product IDs are intentionally excluded.
export function photoIdentity(product){
  if(!product||typeof product!=='object')throw new Error('Producto inválido.');
  const clean=value=>String(value??'').normalize('NFC').trim();
  const code=clean(product.codigo),name=clean(product.nombre);
  const category=clean(product.categoria)||'Accesorios',presentation=clean(product.presentacion);
  if((!code&&!name)||[code,name,category,presentation].some(v=>v.length>300))throw new Error('Identidad de producto inválida.');
  return JSON.stringify([code?'codigo':'nombre',code||name,category,presentation]);
}
export async function photoKey(product){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(photoIdentity(product)));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export function photoProduct(product){
  return {codigo:product.codigo||'',nombre:product.nombre||'',categoria:product.categoria||'Accesorios',presentacion:product.presentacion||''};
}
