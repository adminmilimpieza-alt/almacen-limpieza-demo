import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authenticated,sessionCookie,validWebhook,hmac} from '../worker/security.mjs';
import worker from '../worker/index.mjs';
const password='clave-operador-de-prueba-larga';
test('la sesión rechaza cookies alteradas y claves distintas',async()=>{
  const cookie=await sessionCookie(password);
  assert.equal(await authenticated(new Request('https://app.test/api/mp/orders',{headers:{Cookie:`milimpieza_session=${cookie}`}}),password),true);
  assert.equal(await authenticated(new Request('https://app.test/api/mp/orders',{headers:{Cookie:`milimpieza_session=${cookie}a`}}),password),false);
  assert.equal(await authenticated(new Request('https://app.test/api/mp/orders',{headers:{Cookie:`milimpieza_session=${cookie}`}}),'otra-clave'),false);
});
test('el webhook exige firma válida del ID de la notificación',async()=>{
  const sig=await hmac('secreto','id:123;request-id:req1;ts:123456;');
  const headers={'x-signature':`ts=123456,v1=${sig}`,'x-request-id':'req1'};
  assert.equal(await validWebhook(new Request('https://app.test/api/mp/webhook?data.id=123',{headers}),'secreto'),true);
  assert.equal(await validWebhook(new Request('https://app.test/api/mp/webhook?data.id=999',{headers}),'secreto'),false);
  assert.equal(await validWebhook(new Request('https://app.test/api/mp/webhook?data.id=123',{headers}),''),false);
});
test('la API no permite leer cobros sin sesión ni modificar desde otro origen',async()=>{
  const env={DB:{},ADMIN_PASSWORD:password};
  const read=await worker.fetch(new Request('https://app.test/api/mp/orders'),env);
  assert.equal(read.status,401);
  const write=await worker.fetch(new Request('https://app.test/api/login',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'}),env);
  assert.equal(write.status,403);
});
test('sin secretos la API informa configuración pendiente, sin simular cobros',async()=>{
  const health=await worker.fetch(new Request('https://app.test/api/health'),{});
  const info=await health.json();assert.equal(info.mercadoPagoConfigured,false);
  const create=await worker.fetch(new Request('https://app.test/api/mp/orders',{method:'POST'}),{});
  assert.equal(create.status,503);
});
