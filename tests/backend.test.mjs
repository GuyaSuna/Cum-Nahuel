import test from 'node:test';
import assert from 'node:assert/strict';
import { backend, save, line } from './helpers.mjs';

test('inicialización exacta, privada e idempotente, sin sobreescribir cambios',() => {
  const b = backend(), s = b.call('snapshot',{},true);
  assert.equal(s.success,true);assert.equal(s.data.invitados.length,18);assert.equal(s.data.ingredientes.length,23);assert.equal(s.data.resumen.presupuesto,3935);
  assert.equal(s.data.ingredientes.some(i => /bebida|huevo/i.test(i.nombre)),false);
  assert.equal(b.properties.has('ADMIN_PASSWORD'),false);
  assert.doesNotMatch(JSON.stringify(s),/pinHash|PIN_PEPPER|token|PASSWORD/);
  const update = b.call('saveGuest',{token:b.admin.token,guest:{id:'g1',nombre:'Augusto editado',activo:true}});assert.equal(update.success,true);
  b.context.inicializarProyecto();const again = b.call('snapshot').data;assert.equal(again.invitados[0].nombre,'Augusto editado');assert.equal(again.ingredientes.length,23);
});
test('reservas parciales, dos competidores, modificación y eliminación persistente',async () => {
  const b = backend(), a = b.guest('g1'), c = b.guest('g2');
  const first = save(b,a,[line('muzarela',500)]);assert.equal(first.success,true);
  assert.equal(b.call('ingredients').data.find(i => i.id === 'muzarela').disponible,1000);
  const results = await Promise.all([Promise.resolve().then(() => save(b,c,[line('muzarela',1000)])),Promise.resolve().then(() => save(b,a,[line('muzarela',1000)],first.data.selection.fechaActualizacion))]);
  assert.equal(results.filter(r => r.success).length,1);assert.equal(results[1].error,'AVAILABILITY');
  assert.equal(b.call('ingredients').data.find(i => i.id === 'muzarela').disponible,0);
  const changed = save(b,a,[line('muzarela',250)],first.data.selection.fechaActualizacion);assert.equal(changed.success,true);
  assert.equal(b.call('ingredients').data.find(i => i.id === 'muzarela').disponible,250);
  assert.equal(b.call('mySelection',{token:a.token}).data.selection.ingredientes[0].cantidad,250);
  const del = b.call('deleteSelection',{token:a.token,expectedVersion:changed.data.selection.fechaActualizacion,requestId:crypto.randomUUID()});assert.equal(del.success,true);
  assert.equal(b.call('ingredients').data.find(i => i.id === 'muzarela').disponible,500);
  assert.equal(b.sheets.get('Selecciones').data.length,3); // Encabezado y una fila por invitado.
  assert.equal(b.call('summary').data.confirmados,1);
  assert.equal(save(b,a,[line('mostaza',250)],del.data.selection.fechaActualizacion).success,true);
});
test('lock rechaza otra operación y siempre se libera, incluso en errores',() => {
  const b = backend();b.block(true);assert.equal(b.call('snapshot').error,'BUSY');b.block(false);
  assert.equal(b.call('not-found').error,'SESSION');
  assert.deepEqual(b.stats(),{locked:false,acquisitions:b.stats().acquisitions,releases:b.stats().acquisitions});
  assert.equal(b.call('snapshot').success,true);
});
test('idempotencia durable: una respuesta perdida se puede reintentar sin duplicar',() => {
  const b = backend(), g = b.guest('g1'), id = crypto.randomUUID();
  const first = save(b,g,[line('mayonesa',250)],'',id), retry = save(b,g,[line('mayonesa',250)],'',id);
  assert.equal(first.success,true);assert.equal(retry.success,true);assert.equal(retry.data.replayed,true);assert.equal(b.sheets.get('Selecciones').data.length,2);
  const newer = save(b,g,[line('mayonesa',500)],first.data.selection.fechaActualizacion);assert.equal(newer.success,true);
  assert.equal(save(b,g,[line('mayonesa',250)],'',id).error,'CONFLICT');
});
test('PIN, límite de intentos, permisos, expiración y revocación',() => {
  const b = backend(), g = b.guest('g1');
  assert.equal(b.call('adminSnapshot',{token:g.token}).error,'FORBIDDEN');
  assert.equal(b.call('saveGuest',{token:g.token,guest:{nombre:'Otro',activo:true}}).error,'FORBIDDEN');
  assert.equal(b.call('saveSelection',{token:'inventado',guestId:'g1',ingredientes:[]}).error,'SESSION');
  assert.equal(b.call('mySelection',{token:g.token},true).error,'METHOD');
  const sessionKey = [...b.properties.keys()].find(k => k.startsWith('session:') && JSON.parse(b.properties.get(k)).guestId === 'g1');
  const s = JSON.parse(b.properties.get(sessionKey));s.expiresAt=0;b.properties.set(sessionKey,JSON.stringify(s));assert.equal(b.call('mySelection',{token:g.token}).error,'SESSION');
  const again = b.guest('g1');b.call('regeneratePin',{token:b.admin.token,guestId:'g1'});assert.equal(b.call('mySelection',{token:again.token}).error,'SESSION');
  for (let n=0;n<8;n++) assert.equal(b.call('login',{guestId:'g1',pin:'000000'}).error,'AUTH');
  assert.equal(b.call('login',{guestId:'g1',pin:'000000'}).error,'RATE_LIMIT');
});
test('rechaza cantidades inválidas, duplicados, suplantación y sobreasignación',() => {
  const b = backend(), g = b.guest('g1');
  for (const amount of [-1,0,1.5,251,2000,'250']) assert.equal(save(b,g,[line('mayonesa',amount)]).success,false);
  assert.equal(save(b,g,[line('mayonesa',250),line('mayonesa',250)]).error,'VALIDATION');
  assert.equal(save(b,g,[line('no-existe',250)]).error,'VALIDATION');
  const result = b.call('saveSelection',{token:g.token,guestId:'g2',ingredientes:[line('mayonesa',250)],expectedVersion:'',requestId:crypto.randomUUID()});
  assert.equal(result.data.selection.invitadoId,'g1');
  assert.equal(b.call('summary').data.confirmados,1);
});
test('administración protege compromisos, valida campos y permite cambios seguros',() => {
  const b = backend(), g = b.guest('g1');save(b,g,[line('muzarela',500)]);
  const i = b.call('ingredients').data.find(i => i.id === 'muzarela');
  for (const patch of [{cantidadRequerida:250},{activo:false},{unidad:'unidades'},{incremento:750}]) assert.equal(b.call('saveIngredient',{token:b.admin.token,ingredient:{...i,...patch}}).success,false);
  assert.equal(b.call('saveGuest',{token:b.admin.token,guest:{id:'g1',nombre:'Augusto',activo:false}}).error,'CONFLICT');
  assert.equal(b.call('saveIngredient',{token:b.admin.token,ingredient:{...i,precioTotal:600}}).success,true);
  assert.equal(b.call('saveGuest',{token:b.admin.token,guest:{nombre:'=IMPORTXML()',activo:true}}).error,'VALIDATION');
  assert.equal(b.call('saveConfig',{token:b.admin.token,config:{ubicacion:'=IMPORTXML()'}}).error,'VALIDATION');
  assert.equal(b.call('saveConfig',{token:b.admin.token,config:{modificaciones:'false'}}).success,true);
  assert.equal(save(b,g,[line('mostaza',250)]).error,'CLOSED');
  assert.equal(b.call('adminSaveSelection',{token:b.admin.token,guestId:'g1',ingredientes:[],expectedVersion:b.call('mySelection',{token:g.token}).data.selection.fechaActualizacion,requestId:crypto.randomUUID()}).success,true);
  assert.equal(b.call('adminSnapshot',{token:b.admin.token}).data.selecciones[0].estado,'eliminada');
  assert.doesNotMatch(JSON.stringify(b.call('export',{token:b.admin.token})),/pinHash|PIN_PEPPER|PASSWORD|session:/);
});
test('respuestas estandarizadas también ante JSON malformado',() => {
  const b=backend(), result=b.context.doPost({postData:{contents:'{'}});
  assert.deepEqual(Object.keys(result).sort(),['data','error','message','success']);assert.equal(result.success,false);assert.equal(b.stats().locked,false);
});
