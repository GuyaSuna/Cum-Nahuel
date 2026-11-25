function publicGuest_(g) {return {id:g.id,nombre:g.nombre,activo:active_(g.activo)};}
function guest_(id) {var g = rows_('Invitados').find(function (r) {return r.id === id;}); require_(g, 'NOT_FOUND', 'No encontramos al invitado.'); return g;}
function saveGuest_(g) {
  require_(g && typeof g === 'object' && typeof g.activo === 'boolean', 'VALIDATION', 'Invitado inválido.');
  var old = g.id ? guest_(g.id) : null;
  var nombre = text_(g.nombre,70);
  require_(!rows_('Invitados').some(function (r) {return r.id !== g.id && r.nombre.toLowerCase() === nombre.toLowerCase();}), 'VALIDATION', 'Ya existe un invitado con ese nombre.');
  if (!g.activo && old) require_(!confirmed_().some(function (s) {return s.invitadoId === g.id && s.ingredientes.length;}), 'CONFLICT', 'Primero eliminá el aporte de este invitado.');
  var value = {id:old ? old.id : 'g' + Utilities.getUuid(),nombre:nombre,pinHash:old ? old.pinHash : '',activo:g.activo};
  putRow_('Invitados',value); return publicGuest_(value);
}
function regeneratePin_(id) {
  var g = guest_(id);
  require_(active_(g.activo), 'VALIDATION', 'Activá al invitado para generar su PIN.');
  // Los primeros 12 dígitos hex de un UUID aleatorio se mantienen dentro del rango entero seguro.
  var pin = String(100000 + parseInt(random_().slice(0,12),16) % 900000);
  g.pinHash = pinHash_(g.id,pin); putRow_('Invitados',g);
  return {guestId:g.id,nombre:g.nombre,pin:pin}; // Solo administrador autenticado; se muestra una única vez.
}
