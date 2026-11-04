import {authenticated,hmac,equal} from './security.mjs';
import {readBusiness} from './business.mjs';
const PREFIX='/api/respaldo-drive',SCOPE='openid email https://www.googleapis.com/auth/drive.file';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const configured=env=>!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&/^https:\/\/[^/]+\/api\/respaldo-drive\/callback$/.test(env.GOOGLE_REDIRECT_URI||''));
const emailOf=state=>String(state.catalogo?.respaldoDrive?.email||'milimpiezainsumos@gmail.com').trim().toLowerCase();
const cookie=(request,name)=>request.headers.get('Cookie')?.match(new RegExp('(?:^|;\\s*)'+name+'=([^;]+)'))?.[1]||'';
const base64=bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s);};
const unbase64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function secretKey(env){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.ADMIN_PASSWORD+'|'+env.GOOGLE_CLIENT_SECRET)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function seal(env,value){const iv=crypto.getRandomValues(new Uint8Array(12));return base64(iv)+'.'+base64(await crypto.subtle.encrypt({name:'AES-GCM',iv},await secretKey(env),new TextEncoder().encode(value)));}
async function unseal(env,value){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(iv)},await secretKey(env),unbase64(data)));}
async function initialize(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS drive_backup (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT, config_revision TEXT, token TEXT, folder_id TEXT, last_success TEXT, file_id TEXT, last_error TEXT, lease_until INTEGER NOT NULL DEFAULT 0)').run();
 await env.DB.prepare('INSERT INTO drive_backup(id) VALUES(1) ON CONFLICT(id) DO NOTHING').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS drive_oauth_states (state TEXT PRIMARY KEY, binding TEXT NOT NULL, email TEXT NOT NULL, config_revision TEXT NOT NULL, expires INTEGER NOT NULL)').run();
}
async function google(url,options={}){let r;try{r=await fetch(url,{...options,signal:AbortSignal.timeout(30000),redirect:'error'});}catch{throw fail('No se pudo contactar Google Drive. Reintentá más tarde.',502);}if(!r.ok)throw fail('Google rechazó la operación. Revisá la conexión y el espacio disponible en Drive.',502);return r.json();}
const bearer=token=>({Authorization:'Bearer '+token});
const tokenRequest=(env,data)=>google('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,...data})});
async function current(env){const {state}=await readBusiness(env);return {state,email:emailOf(state),configRevision:String(state.catalogo?.respaldoDrive?.revision||''),row:await env.DB.prepare('SELECT * FROM drive_backup WHERE id=1').first()};}
async function status(env){await initialize(env);const {email,configRevision,row}=await current(env),connected=configured(env)&&row.email===email&&row.config_revision===configRevision&&!!row.token;return {configured:configured(env),connected,email,folderId:connected?row.folder_id:null,lastSuccess:row.email===email?row.last_success:null,fileId:row.email===email?row.file_id:null,lastError:row.email===email?row.last_error:null,message:!configured(env)?'Pendiente de configurar las credenciales de Google. Todavía no se hacen copias en Drive.':!connected?'Cuenta pendiente de conectar. Todavía no se hacen copias en Drive.':'Cuenta conectada. Copia diaria y copia manual disponibles.'};}
async function buildBackup(env,state){
 const size=await env.DB.prepare('SELECT COALESCE(SUM(LENGTH(image)),0) AS bytes FROM product_photos').first();
 if(Number(size.bytes)>7*1024*1024)throw fail('Las fotos superan el tamaño permitido para esta copia (10 MB completos). No se guardó una copia parcial. Descargá el respaldo local y revisá el tamaño de las fotos.',413);
 const photos=(await env.DB.prepare('SELECT photo_key,revision,image,deleted,updated_at FROM product_photos ORDER BY photo_key').all()).results;
 // Explicit business collections only. Never copy OAuth, payment credentials, sessions or operation tables.
 const allowed=['productos','clientes','proveedores','ventas','movimientos','pedidos','turnos','listasPrecios','promociones','catalogo'];
 const data=Object.fromEntries(allowed.map(key=>[key,state[key]]));
 const backup=JSON.stringify({format:'milimpieza-respaldo-drive',version:1,createdAt:new Date().toISOString(),data,photos:photos.map(p=>({key:p.photo_key,revision:p.revision,deleted:!!p.deleted,updatedAt:p.updated_at,photo:p.image?'data:image/jpeg;base64,'+base64(p.image):''}))});
 if(new TextEncoder().encode(backup).length>10*1024*1024)throw fail('El respaldo completo supera 10 MB. No se guardó una copia parcial. Conservá una copia local y revisá su tamaño antes de reintentar.',413);
 return backup;
}
export async function runDriveBackup(env,{manual=false}={}){
 if(!env.DB||!configured(env))return {skipped:true,reason:'not-configured'};
 await initialize(env);const {state,email,configRevision,row}=await current(env);
 if(row.email!==email||row.config_revision!==configRevision||!row.token)return {skipped:true,reason:'not-connected'};
 const today=new Date().toISOString().slice(0,10);
 if(!manual&&row.last_success?.startsWith(today))return {skipped:true,reason:'already-backed-up'};
 const lease=await env.DB.prepare('UPDATE drive_backup SET lease_until=? WHERE id=1 AND lease_until<?').bind(Date.now()+10*60*1000,Date.now()).run();
 if(!lease.meta.changes)throw fail('Ya hay una copia en curso.',409);
 try{
  const refresh=await unseal(env,row.token),tokens=await tokenRequest(env,{grant_type:'refresh_token',refresh_token:refresh});
  if(!tokens.access_token)throw fail('Google no entregó acceso. Volvé a conectar la cuenta.',502);
  const auth=bearer(tokens.access_token);
  const user=await google('https://openidconnect.googleapis.com/v1/userinfo',{headers:auth});
  if(user.email_verified!==true||String(user.email).toLowerCase()!==email)throw fail('La cuenta conectada no coincide con el correo de destino. Volvé a conectar.',409);
  let folder=row.folder_id;
  if(!folder){const result=await google('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({name:'Mi Limpieza · Respaldos',mimeType:'application/vnd.google-apps.folder'})});if(!/^[\w-]+$/.test(result.id||''))throw fail('No se pudo verificar la carpeta de destino.',502);folder=result.id;await env.DB.prepare('UPDATE drive_backup SET folder_id=? WHERE id=1 AND email=?').bind(folder,email).run();}
  const content=await buildBackup(env,state),boundary='milimpieza_'+crypto.randomUUID().replaceAll('-',''),name='mi-limpieza-'+new Date().toISOString().replaceAll(':','-')+'.json';
  // Recheck account selection immediately before the external write.
  if((await current(env)).email!==email||(await current(env)).configRevision!==configRevision)throw fail('Cambió el correo de destino. Volvé a conectar la cuenta.',409);
  const multipart='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name,parents:[folder]})+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+content+'\r\n--'+boundary+'--';
  const uploaded=await google('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{...auth,'Content-Type':'multipart/related; boundary='+boundary},body:multipart});
  if(!/^[\w-]+$/.test(uploaded.id||''))throw fail('Google no confirmó el archivo de la copia.',502);
  const verified=await google('https://www.googleapis.com/drive/v3/files/'+uploaded.id+'?fields=id,size,parents,trashed',{headers:auth});
  if(verified.id!==uploaded.id||verified.trashed||!verified.parents?.includes(folder)||Number(verified.size)!==new TextEncoder().encode(content).length)throw fail('No se pudo verificar el archivo completo en Drive. La copia no figura como exitosa.',502);
  const timestamp=new Date().toISOString();
  await env.DB.prepare('UPDATE drive_backup SET last_success=?,file_id=?,last_error=NULL WHERE id=1 AND email=?').bind(timestamp,uploaded.id,email).run();
  return {ok:true,lastSuccess:timestamp,fileId:uploaded.id};
 }catch(error){await env.DB.prepare('UPDATE drive_backup SET last_error=? WHERE id=1 AND email=?').bind(error.message,email).run();throw error;}
 finally{await env.DB.prepare('UPDATE drive_backup SET lease_until=0 WHERE id=1').run();}
}
export async function handleDriveBackup(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
 try{
  if(!env.DB)throw fail('Falta vincular la base de datos.',503);
  if(url.pathname===PREFIX+'/callback')return await callback(request,env,url);
  if(!await authenticated(request,env.ADMIN_PASSWORD))throw fail('Iniciá sesión de operador para administrar el respaldo.',401);
  if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)throw fail('Origen no autorizado.',403);
  if(url.pathname===PREFIX+'/status'&&request.method==='GET')return json(await status(env));
  if(url.pathname===PREFIX+'/copy'&&request.method==='POST'){
   const result=await runDriveBackup(env,{manual:true});if(result.skipped)throw fail('Configurá y conectá la cuenta de Google antes de copiar.',409);return json(result);
  }
  if(url.pathname===PREFIX+'/connect'&&request.method==='GET'){
   if(!configured(env))throw fail('Falta configurar las credenciales de Google en el servidor.',503);
   if(new URL(env.GOOGLE_REDIRECT_URI).origin!==url.origin)throw fail('La dirección de autorización no coincide con este sitio.',409);
   // Cross-site links cannot start an authorization on behalf of the operator.
   if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw fail('Abrí la conexión desde Respaldo.',403);
   await initialize(env);const {email,configRevision}=await current(env),nonce=crypto.randomUUID(),session=cookie(request,'milimpieza_session'),expires=Date.now()+10*60*1000;
   const state=crypto.randomUUID()+'.'+await hmac(env.ADMIN_PASSWORD,nonce+'|'+email+'|'+expires);
   await env.DB.prepare('DELETE FROM drive_oauth_states WHERE expires<?').bind(Date.now()).run();
   await env.DB.prepare('INSERT INTO drive_oauth_states(state,binding,email,config_revision,expires) VALUES(?,?,?,?,?)').bind(state,await hmac(env.ADMIN_PASSWORD,nonce+'|'+session),email,configRevision,expires).run();
   const target=new URL('https://accounts.google.com/o/oauth2/v2/auth');target.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:env.GOOGLE_REDIRECT_URI,response_type:'code',scope:SCOPE,state,access_type:'offline',prompt:'consent select_account',login_hint:email}).toString();
   const headers=new Headers({Location:target.href,'Cache-Control':'no-store'});
   headers.append('Set-Cookie',`milimpieza_drive_nonce=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=${PREFIX}/callback; Max-Age=600`);
   headers.append('Set-Cookie',`milimpieza_drive_operator=${session}; HttpOnly; Secure; SameSite=Lax; Path=${PREFIX}/callback; Max-Age=600`);
   return new Response(null,{status:302,headers});
  }
  throw fail('Ruta de respaldo no encontrada.',404);
 }catch(error){return json({error:error.message},error.status||500);}
}
async function callback(request,env,url){
 if(request.method!=='GET'||!configured(env)||env.GOOGLE_REDIRECT_URI!==url.origin+url.pathname)throw fail('Autorización no configurada.',400);
 const session=cookie(request,'milimpieza_drive_operator'),nonce=cookie(request,'milimpieza_drive_nonce');
 if(!nonce||!await authenticated(new Request(request.url,{headers:{Cookie:'milimpieza_session='+session}}),env.ADMIN_PASSWORD))throw fail('La sesión de autorización venció. Volvé a conectar desde Respaldo.',401);
 await initialize(env);const state=url.searchParams.get('state')||'',row=await env.DB.prepare('SELECT * FROM drive_oauth_states WHERE state=?').bind(state).first();
 if(!row||row.expires<Date.now()||!equal(row.binding,await hmac(env.ADMIN_PASSWORD,nonce+'|'+session)))throw fail('La autorización no corresponde a este navegador o venció.',403);
 const consumed=await env.DB.prepare('DELETE FROM drive_oauth_states WHERE state=?').bind(state).run();if(!consumed.meta.changes)throw fail('Esta autorización ya se usó.',403);
 if((await current(env)).email!==row.email||(await current(env)).configRevision!==row.config_revision)throw fail('Cambió el correo de destino. Volvé a conectar.',409);
 if(url.searchParams.has('error')||!url.searchParams.get('code'))throw fail('No se autorizó la conexión a Google Drive.',400);
 const tokens=await tokenRequest(env,{grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:env.GOOGLE_REDIRECT_URI});
 if(!tokens.access_token||!tokens.refresh_token)throw fail('Google no autorizó las copias automáticas. Volvé a conectar y aceptá el permiso.',409);
 const user=await google('https://openidconnect.googleapis.com/v1/userinfo',{headers:bearer(tokens.access_token)});
 if(user.email_verified!==true||String(user.email).toLowerCase()!==row.email)throw fail('Elegiste otra cuenta de Google. Debés autorizar '+row.email+'.',409);
 if(!(tokens.scope||'').split(' ').includes('https://www.googleapis.com/auth/drive.file'))throw fail('Falta el permiso para guardar archivos en Drive.',409);
 await env.DB.prepare('UPDATE drive_backup SET email=?,config_revision=?,token=?,folder_id=CASE WHEN email=? THEN folder_id ELSE NULL END,last_success=CASE WHEN email=? THEN last_success ELSE NULL END,file_id=CASE WHEN email=? THEN file_id ELSE NULL END,last_error=NULL WHERE id=1').bind(row.email,row.config_revision,await seal(env,tokens.refresh_token),row.email,row.email,row.email).run();
 const headers=new Headers({Location:'/?drive=conectado','Cache-Control':'no-store'});
 for(const name of ['milimpieza_drive_nonce','milimpieza_drive_operator'])headers.append('Set-Cookie',`${name}=; HttpOnly; Secure; SameSite=Lax; Path=${PREFIX}/callback; Max-Age=0`);
 return new Response(null,{status:302,headers});
}
