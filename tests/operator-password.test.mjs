import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';

test('permite una clave de 12 caracteres y rechaza una de 11',async()=>{
 const DB={prepare(){return {bind(){return this;},async run(){},async first(){return {attempts:1};}};}};
 const login=password=>new Request('https://app.test/api/login',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json'},body:JSON.stringify({password})});
 for(const [password,valid] of [['A12345678901',true],['A1234567890',false]]){
  const env={DB,ADMIN_PASSWORD:password};
  const health=await worker.fetch(new Request('https://app.test/api/health'),env);
  assert.equal((await health.json()).operatorConfigured,valid);
  const response=await worker.fetch(login(password),env);
  assert.equal(response.status,valid?200:503);
  if(valid)assert.match(response.headers.get('Set-Cookie'),/milimpieza_session=/);
 }
});
