import {photoKey,photoProduct} from './foto-identidad.mjs';
export const localPhoto=value=>typeof value==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(value);
export function backupPhotos(source){
  const rows=Array.isArray(source?.productos)?source.productos:Array.isArray(source?.fotos)?source.fotos:[];
  return rows.filter(p=>localPhoto(p.foto)).map(p=>({...photoProduct(p),foto:p.foto}));
}
export async function mergePhotos(db,manifest){
  const remote=new Map(manifest.map(p=>[p.key,p]));
  const keys=await Promise.all(db.productos.map(p=>photoKey(p)));
  const patches=[];let pending=0,conflicts=0;
  db.productos.forEach((p,i)=>{
    const row=remote.get(keys[i]);
    if(localPhoto(p.foto)||p.fotoPendiente){pending++;if(row)conflicts++;return;}
    if(!row)return;
    const foto=row.deleted?'':`/api/photos/${row.key}?v=${row.revision}`;
    if(p.foto===foto&&p.fotoOnlineRevision===row.revision)return;
    const patch={id:p.id,previousFoto:p.foto||'',previousRevision:p.fotoOnlineRevision,product:photoProduct(p),foto,fotoOnlineKey:row.key,fotoOnlineRevision:row.revision,fotoPendiente:false};
    patches.push(patch);Object.assign(p,{foto,fotoOnlineKey:row.key,fotoOnlineRevision:row.revision,fotoPendiente:false});
  });
  return {changed:patches.length>0,patches,pending,conflicts};
}
export async function preparePhotoEdit(draft,original,current){
  const product={...draft};
  const same=original&&await photoKey(original)===await photoKey(product);
  if(!same){delete product.fotoOnlineKey;delete product.fotoOnlineRevision;return {product,base:null};}
  if(product.foto===original.foto&&!original.fotoPendiente){
    for(const field of ['foto','fotoOnlineKey','fotoOnlineRevision','fotoPendiente'])product[field]=current[field];
    return {product,base:current};
  }
  for(const field of ['fotoOnlineKey','fotoOnlineRevision'])product[field]=original[field];
  return {product,base:original};
}
