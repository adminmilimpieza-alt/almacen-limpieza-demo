import {photoKey} from '../js/foto-identidad.mjs';
import {authenticated} from './security.mjs';
const MAX_BYTES=150000,MAX_KEYS=2000;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error=(message,status=400)=>Object.assign(new Error(message),{status});
function jpeg(data){
  if(data==='')return null;
  if(typeof data!=='string'||!data.startsWith('data:image/jpeg;base64,'))throw error('La foto debe ser JPEG.');
  const encoded=data.slice(23);
  if(encoded.length>Math.ceil(MAX_BYTES/3)*4)throw error('La foto supera 150 KB. Elegí una imagen más pequeña.',413);
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)||encoded.length%4!==0)throw error('Foto inválida.');
  let bytes;try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}catch{throw error('Foto inválida.');}
  if(bytes.length<4||bytes.length>MAX_BYTES||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes.at(-2)!==255||bytes.at(-1)!==217)throw error('El archivo no es una foto JPEG válida.');
  return bytes.buffer;
}
export async function handlePhotos(request,env){
  const url=new URL(request.url),match=url.pathname.match(/^\/api\/photos\/([a-f0-9]{64})$/);
  if(url.pathname==='/api/photos'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT photo_key,revision,deleted FROM product_photos ORDER BY photo_key').all();
    return json({photos:rows.results.map(r=>({key:r.photo_key,revision:r.revision,deleted:!!r.deleted}))});
  }
  if(!match)throw error('Ruta de fotos no encontrada.',404);
  const key=match[1];
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT revision,image,deleted FROM product_photos WHERE photo_key=?').bind(key).first();
    if(!row||row.deleted||!row.image)return json({error:'Foto no encontrada.'},404);
    const version=url.searchParams.get('v');
    return new Response(new Uint8Array(row.image),{headers:{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':version===row.revision?'public, max-age=31536000, immutable':'no-store',ETag:'"'+row.revision+'"'}});
  }
  if(request.method!=='PUT')throw error('Método no permitido.',405);
  if(request.headers.get('Origin')!==url.origin)throw error('Origen no autorizado.',403);
  if(!await authenticated(request,env.ADMIN_PASSWORD))throw error('Iniciá sesión de operador para guardar fotos.',401);
  if(Number(request.headers.get('Content-Length')||0)>205000)throw error('Foto demasiado grande.',413);
  const text=await request.text();if(text.length>205000)throw error('Foto demasiado grande.',413);
  let data;try{data=JSON.parse(text);}catch{throw error('Solicitud inválida.');}
  if(await photoKey(data.product)!==key)throw error('La foto no corresponde al producto indicado.');
  const image=jpeg(data.photo),deleted=data.photo===''?1:0;
  const expected=data.expectedRevision;
  if(expected!==null && (typeof expected!=='string'||!/^[a-f0-9-]{36}$/i.test(expected)))throw error('Revisión de foto inválida.');
  if(data.mode==='migrate'&&(expected!==null||deleted))throw error('Migración de foto inválida.');
  const revision=crypto.randomUUID(),updated=new Date().toISOString();
  let result;
  if(expected===null){
    result=await env.DB.prepare('INSERT INTO product_photos(photo_key,revision,image,deleted,updated_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM product_photos) < ? ON CONFLICT(photo_key) DO NOTHING').bind(key,revision,image,deleted,updated,MAX_KEYS).run();
  }else{
    // Keep the previous bytes on a soft deletion. A migration never resurrects it.
    result=await env.DB.prepare('UPDATE product_photos SET revision=?,image=CASE WHEN ?=1 THEN image ELSE ? END,deleted=?,updated_at=? WHERE photo_key=? AND revision=?').bind(revision,deleted,image,deleted,updated,key,expected).run();
  }
  if(!result.meta.changes){
    const existing=await env.DB.prepare('SELECT revision FROM product_photos WHERE photo_key=?').bind(key).first();
    if(existing||expected!==null)throw error('La foto cambió en otro equipo. Actualizá las fotos antes de guardar. Las recuperaciones no reemplazan fotos online.',409);
    throw error('Se alcanzó el límite de 2000 fotos. Contactá al administrador.',413);
  }
  return json({key,revision,deleted:!!deleted,url:deleted?'':`/api/photos/${key}?v=${revision}`},expected===null?201:200);
}
