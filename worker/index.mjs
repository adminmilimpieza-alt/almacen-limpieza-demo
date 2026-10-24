import { normalizeItems, paymentResult } from './payments.mjs';
import { authenticated, sessionCookie, validWebhook, hmac, equal } from './security.mjs';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=value=>typeof value==='string' && /^[a-f0-9-]{36}$/i.test(value);
async function body(request){
  const text=await request.text(); if(text.length>50000) throw fail('Solicitud demasiado grande.',413);
  try{return JSON.parse(text);}catch{throw fail('Solicitud inválida.');}
}
let cachedToken=null;
async function accessToken(env){
  if(env.MP_ACCESS_TOKEN) return env.MP_ACCESS_TOKEN;
  if(!env.MP_CLIENT_ID||!env.MP_CLIENT_SECRET) throw fail('Falta cargar las credenciales de Mercado Pago en Cloudflare.',503);
  if(cachedToken && cachedToken.id===env.MP_CLIENT_ID && cachedToken.expires>Date.now()) return cachedToken.token;
  const r=await fetch('https://api.mercadopago.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:env.MP_CLIENT_ID,client_secret:env.MP_CLIENT_SECRET,grant_type:'client_credentials'}),signal:AbortSignal.timeout(15000)});
  const j=await r.json();
  if(!r.ok || !j.access_token) throw fail('Mercado Pago rechazó las credenciales. Verificá la aplicación o cargá el Access Token del vendedor.',502);
  cachedToken={id:env.MP_CLIENT_ID,token:j.access_token,expires:Date.now()+(Number(j.expires_in)||21600)*1000-60000};
  return j.access_token;
}
async function mp(env,path,options={}){
  const token=await accessToken(env);
  const r=await fetch(`https://api.mercadopago.com${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});
  if(!r.ok) {
    if(r.status===401) cachedToken=null;
    throw fail('Mercado Pago no autorizó la operación. Puede ser necesario el Access Token del vendedor o habilitar producción.',502);
  }
  return r.json();
}
function publicOrder(row){
  if(!row) return null;
  const {collector_id,...order}=row; return {...order,items:JSON.parse(row.items)};
}
async function refreshOrder(env,order){
  const result=order.payment_id ? {results:[await mp(env,`/v1/payments/${encodeURIComponent(order.payment_id)}`)]} : await mp(env,`/v1/payments/search?external_reference=${encodeURIComponent(order.id)}&sort=date_created&criteria=desc&limit=100`);
  const next=paymentResult(order,result.results||[]);
  await env.DB.prepare('UPDATE orders SET status=?,payment_id=?,checked_at=? WHERE id=?').bind(next.status,next.payment_id,new Date().toISOString(),order.id).run();
  return {...order,...next};
}
async function route(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/health') return json({service:'Mi Limpieza',database:!!env.DB,operatorConfigured:!!env.ADMIN_PASSWORD&&env.ADMIN_PASSWORD.length>=16,mercadoPagoConfigured:!!(env.MP_ACCESS_TOKEN||(env.MP_CLIENT_ID&&env.MP_CLIENT_SECRET)),webhookConfigured:!!env.MP_WEBHOOK_SECRET});
  if(!env.DB) throw fail('Falta vincular la base de cobros D1.',503);
  if(path==='/api/mp/webhook' && request.method==='POST'){
    if(!await validWebhook(request,env.MP_WEBHOOK_SECRET)) throw fail('Notificación no autorizada.',401);
    const id=url.searchParams.get('data.id'); if(!/^\d+$/.test(id)) throw fail('Pago inválido.');
    const payment=await mp(env,`/v1/payments/${id}`);
    const order=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(String(payment.external_reference||'')).first();
    if(order) await refreshOrder(env,order);
    return json({received:true});
  }
  // Mutating requests must originate from this app; CORS is intentionally absent.
  if(request.method!=='GET' && request.headers.get('Origin')!==url.origin) throw fail('Origen no autorizado.',403);
  if(path==='/api/login' && request.method==='POST'){
    if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<16) throw fail('Falta configurar una clave de operador de al menos 16 caracteres en Cloudflare.',503);
    const ip=request.headers.get('CF-Connecting-IP')||'local';
    const key=await hmac(env.ADMIN_PASSWORD,ip), now=Date.now();
    await env.DB.prepare('DELETE FROM login_limits WHERE reset_at < ?').bind(now).run();
    await env.DB.prepare('INSERT INTO login_limits(id,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1').bind(key,now+15*60*1000).run();
    const limit=await env.DB.prepare('SELECT attempts FROM login_limits WHERE id=?').bind(key).first();
    if(limit.attempts>5) throw fail('Demasiados intentos. Esperá 15 minutos.',429);
    const data=await body(request);
    if(typeof data.password!=='string' || !equal(await hmac(env.ADMIN_PASSWORD,data.password),await hmac(env.ADMIN_PASSWORD,env.ADMIN_PASSWORD))) throw fail('Clave incorrecta.',401);
    await env.DB.prepare('DELETE FROM login_limits WHERE id=?').bind(key).run();
    return json({ok:true},200,{'Set-Cookie':`milimpieza_session=${await sessionCookie(env.ADMIN_PASSWORD)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=43200`});
  }
  if(!await authenticated(request,env.ADMIN_PASSWORD)) throw fail('Iniciá sesión para administrar cobros.',401);
  if(path==='/api/logout'&&request.method==='POST') return json({ok:true},200,{'Set-Cookie':'milimpieza_session=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0'});
  if(path==='/api/mp/account'&&request.method==='GET'){
    const user=await mp(env,'/users/me');
    return json({id:user.id,nickname:user.nickname,site_id:user.site_id});
  }
  const device=request.headers.get('X-Device-ID');
  if(!uuid(device)) throw fail('Identificador de equipo inválido.');
  if(path==='/api/mp/orders'&&request.method==='GET'){
    const before=url.searchParams.get('before');
    let statement;
    if(before){
      const [date,id]=before.split('|');
      if(!uuid(id)||!/^\d{4}-\d\d-\d\dT/.test(date)||Number.isNaN(Date.parse(date))) throw fail('Página de cobros inválida.');
      statement=env.DB.prepare('SELECT * FROM orders WHERE device_id=? AND (created_at,id) < (?,?) ORDER BY created_at DESC,id DESC LIMIT 51').bind(device,date,id);
    }else statement=env.DB.prepare('SELECT * FROM orders WHERE device_id=? ORDER BY created_at DESC,id DESC LIMIT 51').bind(device);
    const rows=await statement.all(),page=rows.results.slice(0,50),last=page.at(-1);
    return json({orders:page.map(publicOrder),next:rows.results.length>50?last.created_at+'|'+last.id:null});
  }
  if(path==='/api/mp/orders'&&request.method==='POST'){
    const data=await body(request);
    if(!uuid(data.id)) throw fail('Identificador de cobro inválido.');
    const existing=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(data.id).first();
    if(existing){
      if(existing.device_id!==device) throw fail('El cobro pertenece a otro equipo.',409);
      if(existing.init_point) return json(publicOrder(existing));
      throw fail('El cobro está en proceso o falló. Revisá el listado antes de generar otro enlace.',409);
    }
    const {items,total,mpItems}=normalizeItems(data.items);
    const account=await mp(env,'/users/me');
    if(account.site_id!=='MLA') throw fail('La cuenta de Mercado Pago debe ser de Argentina.',422);
    await env.DB.prepare('INSERT INTO orders(id,device_id,cliente_id,items,total,collector_id,created_at) VALUES(?,?,?,?,?,?,?)').bind(data.id,device,String(data.cliente_id||'c1').slice(0,80),JSON.stringify(items),total,String(account.id),new Date().toISOString()).run();
    const payload={items:mpItems,external_reference:data.id,back_urls:{success:`${url.origin}/?pago=success`,pending:`${url.origin}/?pago=pending`,failure:`${url.origin}/?pago=failure`},auto_return:'approved',expires:true,expiration_date_to:new Date(Date.now()+24*60*60*1000).toISOString(),statement_descriptor:'MI LIMPIEZA'};
    if(env.MP_WEBHOOK_SECRET) payload.notification_url=`${url.origin}/api/mp/webhook`;
    // Never blindly retry preference creation after an ambiguous network failure.
    let preference;
    try{preference=await mp(env,'/checkout/preferences',{method:'POST',body:JSON.stringify(payload)});}
    catch(error){await env.DB.prepare("UPDATE orders SET status='creation_failed' WHERE id=?").bind(data.id).run(); throw error;}
    const checkout = preference.init_point;
    if(typeof checkout!=='string'||!/^https:\/\/(www\.)?mercadopago\.com\.ar\//.test(checkout)) throw fail('Mercado Pago no devolvió un enlace válido.',502);
    await env.DB.prepare("UPDATE orders SET status='pending',preference_id=?,init_point=? WHERE id=?").bind(String(preference.id),checkout,data.id).run();
    return json(publicOrder(await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(data.id).first()),201);
  }
  const match=path.match(/^\/api\/mp\/orders\/([a-f0-9-]{36})\/(check|register)$/i);
  if(match&&request.method==='POST'){
    const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? AND device_id=?').bind(match[1],device).first();
    if(!order) throw fail('Cobro no encontrado en este equipo.',404);
    const updated=await refreshOrder(env,order);
    if(match[2]==='register'){
      if(updated.status!=='approved') throw fail('Mercado Pago todavía no confirmó este pago.',409);
      await env.DB.prepare('UPDATE orders SET registered_at=COALESCE(registered_at,?) WHERE id=?').bind(new Date().toISOString(),order.id).run();
    }
    return json(publicOrder(updated));
  }
  throw fail('Ruta no encontrada.',404);
}
export default {async fetch(request,env){
  try{
    if(new URL(request.url).pathname.startsWith('/api/')) return await route(request,env);
    const response=await env.ASSETS.fetch(request);
    const headers=new Headers(response.headers);
    headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','same-origin'); headers.set('X-Frame-Options','DENY');
    return new Response(response.body,{status:response.status,headers});
  }catch(error){return json({error:error.status?error.message:'No se pudo completar la operación. Intentá nuevamente.'},error.status||500);}
}};
