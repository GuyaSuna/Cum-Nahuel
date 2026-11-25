function selectionFor_(id) {return selections_().find(function (s) {return s.invitadoId === id;}) || null;}
function saveSelection_(guestId, lines, expectedVersion, requestId, admin) {
  var guest = guest_(guestId);
  require_(active_(guest.activo), 'VALIDATION', 'El invitado está inactivo.');
  require_(typeof requestId === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(requestId), 'VALIDATION', 'Identificador de pedido inválido.');
  var old = selectionFor_(guestId);
  // El identificador del último pedido se persiste en la misma escritura que el aporte.
  if (old && old.id === requestId) return {selection:old,replayed:true};
  require_(admin || config_().modificaciones === 'true', 'CLOSED', 'El organizador cerró las modificaciones.');
  require_((old ? String(old.fechaActualizacion) : '') === (expectedVersion || ''), 'CONFLICT', 'Tu aporte cambió en otra pestaña. Volvé a cargarlo antes de confirmar.');
  require_(Array.isArray(lines) && lines.length <= 100, 'VALIDATION', 'Selección inválida.');
  var items = ingredients_(true), seen = {};
  var clean = lines.map(function (line) {
    require_(line && typeof line.ingredienteId === 'string' && !seen[line.ingredienteId], 'VALIDATION', 'Ingrediente inválido o repetido.');
    seen[line.ingredienteId] = true;
    var item = items.find(function (i) {return i.id === line.ingredienteId && i.activo;});
    require_(item, 'VALIDATION', 'El ingrediente ya no está disponible.');
    var amount = number_(line.cantidad,1,1000000);
    require_(Number.isInteger(amount) && amount % item.incremento === 0, 'VALIDATION', 'Respetá el incremento de ' + item.nombre + '.');
    var mine = old && old.estado === 'confirmada' ? old.ingredientes.find(function (l) {return l.ingredienteId === item.id;}) : null;
    require_(amount <= item.disponible + (mine ? mine.cantidad : 0), 'AVAILABILITY', 'Cambió la disponibilidad de ' + item.nombre + '. Actualizá tu selección.');
    return {ingredienteId:item.id,cantidad:amount};
  });
  var now = new Date(Math.max(Date.now(), old ? Date.parse(old.fechaActualizacion) + 1 : 0)).toISOString();
  var row = {id:requestId,invitadoId:guestId,ingredientesJson:JSON.stringify(clean),estado:clean.length ? 'confirmada' : 'eliminada',fechaCreacion:old ? old.fechaCreacion : now,fechaActualizacion:now};
  // Se busca por invitadoId: exactamente una fila por persona, también después de eliminar.
  putRow_('Selecciones',row,'invitadoId');
  return {selection:selectionFor_(guestId),replayed:false};
}
