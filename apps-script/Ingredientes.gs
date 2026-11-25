function selections_() {return rows_('Selecciones').map(function (r) {return {id:r.id,invitadoId:r.invitadoId,ingredientes:JSON.parse(r.ingredientesJson || '[]'),estado:r.estado,fechaCreacion:r.fechaCreacion,fechaActualizacion:r.fechaActualizacion};});}
function confirmed_() {return selections_().filter(function (s) {return s.estado === 'confirmada';});}
function ingredients_(all) {
  var selections = confirmed_(), guests = rows_('Invitados');
  return rows_('Ingredientes').filter(function (r) {return all || active_(r.activo);}).map(function (item) {
    var aportantes = [];
    selections.forEach(function (s) {s.ingredientes.forEach(function (line) {if (line.ingredienteId === item.id) {var g = guests.find(function (v) {return v.id === s.invitadoId;}); aportantes.push({invitadoId:s.invitadoId,nombre:g ? g.nombre : 'Invitado',cantidad:line.cantidad});}});});
    var comprometida = aportantes.reduce(function (n,a) {return n + a.cantidad;},0);
    return Object.assign({},item,{activo:active_(item.activo),comprometida:comprometida,disponible:Math.max(0,item.cantidadRequerida - comprometida),aportantes:aportantes});
  });
}
function snapshot_() {
  var items = ingredients_(false), selections = confirmed_();
  var completed = items.filter(function (i) {return i.disponible === 0;}).length;
  // Promedio de cobertura por ingrediente: no suma gramos con unidades o sobres.
  var progress = items.length ? Math.round(items.reduce(function (sum,i) {return sum + Math.min(1,i.comprometida / i.cantidadRequerida);},0) / items.length * 100) : 0;
  return {configuracion:config_(),invitados:rows_('Invitados').filter(function (g) {return active_(g.activo);}).map(publicGuest_),ingredientes:items,selecciones:selections,resumen:{porcentaje:progress,pendientes:items.length-completed,completos:completed,confirmados:selections.filter(function (s) {return s.ingredientes.length > 0;}).length,presupuesto:items.reduce(function (sum,i) {return sum + i.precioTotal;},0)}};
}
function saveIngredient_(p) {
  require_(p && typeof p === 'object' && typeof p.activo === 'boolean', 'VALIDATION', 'Ingrediente inválido.');
  var old = p.id ? ingredients_(true).find(function (i) {return i.id === p.id;}) : null;
  require_(!p.id || old, 'NOT_FOUND', 'No encontramos el ingrediente.');
  var value = {id:old ? old.id : 'i' + Utilities.getUuid(),nombre:text_(p.nombre,70),categoria:text_(p.categoria,70),cantidadRequerida:number_(p.cantidadRequerida,1,1000000),unidad:text_(p.unidad,20),incremento:number_(p.incremento,1,1000000),precioTotal:number_(p.precioTotal,0,1000000),activo:p.activo};
  require_(Number.isInteger(value.cantidadRequerida) && Number.isInteger(value.incremento) && value.cantidadRequerida % value.incremento === 0, 'VALIDATION', 'La cantidad requerida debe ser múltiplo del incremento.');
  if (old && old.comprometida > 0) {
    require_(value.activo && value.cantidadRequerida >= old.comprometida && value.unidad === old.unidad && old.aportantes.every(function (a) {return a.cantidad % value.incremento === 0;}), 'CONFLICT', 'El cambio afecta aportes confirmados. Ajustalos primero.');
  }
  putRow_('Ingredientes',value); return value;
}
