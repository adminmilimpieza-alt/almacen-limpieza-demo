const encoder = new TextEncoder();
export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
}
export function equal(a,b) {
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length) return false;
  let result=0; for(let i=0;i<a.length;i++) result|=a.charCodeAt(i)^b.charCodeAt(i); return result===0;
}
export async function sessionCookie(password) {
  const value = `${Date.now()+12*60*60*1000}.${crypto.randomUUID()}`;
  return `${value}.${await hmac(password,value)}`;
}
export async function authenticated(request,password) {
  if(!password) return false;
  const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)milimpieza_session=([^;]+)/)?.[1]||'';
  const [expires,nonce,signature] = token.split('.');
  return Number(expires)>Date.now() && Number(expires)<Date.now()+13*60*60*1000 && !!nonce && equal(signature,await hmac(password,`${expires}.${nonce}`));
}
export async function validWebhook(request,secret) {
  if(!secret) return false;
  const url = new URL(request.url), id=url.searchParams.get('data.id');
  const parts=Object.fromEntries((request.headers.get('x-signature')||'').split(',').map(s=>s.trim().split('=')));
  const requestId = request.headers.get('x-request-id');
  if(!id || !requestId || !parts.ts || !parts.v1) return false;
  return equal(parts.v1,await hmac(secret,`id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`));
}
