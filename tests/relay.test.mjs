import test from 'node:test';
import assert from 'node:assert/strict';
import relay from '../extras/cors-relay/worker.mjs';
const env={ALLOWED_ORIGIN:'https://example.github.io',APPS_SCRIPT_URL:'https://script.google.com/macros/s/example/exec'};
test('relay rechaza otros orígenes y credenciales en query',async () => {
  assert.equal((await relay.fetch(new Request('https://relay.example/',{headers:{Origin:'https://other.example'}}),env)).status,403);
  const response=await relay.fetch(new Request('https://relay.example/?token=secret',{headers:{Origin:env.ALLOWED_ORIGIN}}),env);
  assert.equal(response.status,400);assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);
});
test('relay reenvía POST simple y devuelve JSON legible sin poner el token en URL',async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async (url,options) => {assert.equal(url.toString(),env.APPS_SCRIPT_URL);assert.equal(options.method,'POST');assert.equal(options.headers['Content-Type'],'text/plain;charset=UTF-8');assert.equal(JSON.parse(options.body).token,'private-token');return new Response(JSON.stringify({success:true,data:{ok:true},error:null,message:'OK'}),{headers:{'Content-Type':'application/json'}});};
    const response=await relay.fetch(new Request('https://relay.example/',{method:'POST',headers:{Origin:env.ALLOWED_ORIGIN},body:JSON.stringify({action:'mySelection',token:'private-token'})}),env);
    assert.equal(response.status,200);assert.equal((await response.json()).success,true);assert.equal(response.headers.get('Cache-Control'),'no-store');
  } finally {globalThis.fetch=original;}
});
