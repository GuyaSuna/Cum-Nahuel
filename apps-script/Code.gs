/* API de Apps Script V8. Todos los accesos a datos se serializan bajo el mismo lock. */
function doGet(e) { return respond_(function () { return route_(e && e.parameter || {}, true); }); }
function doPost(e) { return respond_(function () {
  var raw = e && e.postData && e.postData.contents;
  require_(typeof raw === 'string' && raw.length < 50000, 'BAD_REQUEST', 'Pedido inválido.');
  return route_(JSON.parse(raw), false);
}); }
function respond_(fn) {
  var lock = LockService.getScriptLock();
  var result;
  try {
    require_(lock.tryLock(20000), 'BUSY', 'Hay otra confirmación en curso. Volvé a intentar.');
    result = {success:true, data:fn(), error:null, message:'OK'};
  } catch (err) {
    result = {success:false, data:null, error:err.apiCode || 'SERVER', message:err.apiCode ? err.message : 'No pudimos procesar el pedido. Revisá la configuración del servidor.'};
  } finally { if (lock.hasLock()) lock.releaseLock(); }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function require_(condition, code, message) { if (!condition) { var err = new Error(message); err.apiCode = code; throw err; } }
function route_(p, get) {
  var action = p.action || 'snapshot';
  var publicActions = ['snapshot','config','guests','ingredients','selections','summary'];
  if (publicActions.indexOf(action) >= 0) {
    var data = snapshot_();
    return action === 'snapshot' ? data : data[{config:'configuracion',guests:'invitados',ingredients:'ingredientes',selections:'selecciones',summary:'resumen'}[action]];
  }
  require_(!get, 'METHOD', 'Esta operación requiere POST.');
  if (action === 'login') return login_(p);
  if (action === 'adminLogin') return adminLogin_(p);
  var session = authenticate_(p.token);
  if (action === 'logout') { props_().deleteProperty('session:' + hash_(p.token)); return {closed:true}; }
  if (action === 'mySelection') return {selection:selectionFor_(session.guestId), guest: session.role === 'guest' ? publicGuest_(guest_(session.guestId)) : null};
  if (action === 'saveSelection' || action === 'deleteSelection') {
    require_(session.role === 'guest', 'FORBIDDEN', 'Ingresá como invitado.');
    return saveSelection_(session.guestId, action === 'deleteSelection' ? [] : p.ingredientes, p.expectedVersion, p.requestId, false);
  }
  require_(session.role === 'admin', 'FORBIDDEN', 'Esta operación requiere permisos de organizador.');
  if (action === 'adminSnapshot') return adminSnapshot_();
  if (action === 'saveGuest') return saveGuest_(p.guest);
  if (action === 'regeneratePin') return regeneratePin_(p.guestId);
  if (action === 'saveIngredient') return saveIngredient_(p.ingredient);
  if (action === 'saveConfig') return saveConfig_(p.config);
  if (action === 'adminSaveSelection') return saveSelection_(p.guestId, p.ingredientes, p.expectedVersion, p.requestId, true);
  if (action === 'export') return adminSnapshot_();
  require_(false, 'NOT_FOUND', 'Operación desconocida.');
}
function props_() { return PropertiesService.getScriptProperties(); }
function db_() { var id = props_().getProperty('SPREADSHEET_ID'); require_(id, 'CONFIG', 'Configurá SPREADSHEET_ID e inicializá la planilla.'); return SpreadsheetApp.openById(id); }
var SCHEMA_ = {
  Invitados:['id','nombre','pinHash','activo'],
  Ingredientes:['id','nombre','categoria','cantidadRequerida','unidad','incremento','precioTotal','activo'],
  Selecciones:['id','invitadoId','ingredientesJson','estado','fechaCreacion','fechaActualizacion'],
  Configuracion:['clave','valor']
};
function rows_(name) {
  var sheet = db_().getSheetByName(name);
  require_(sheet, 'CONFIG', 'Ejecutá inicializarProyecto.');
  var values = sheet.getDataRange().getValues();
  require_(JSON.stringify(values[0]) === JSON.stringify(SCHEMA_[name]), 'SCHEMA', 'No modifiques los encabezados de ' + name + '.');
  return values.slice(1).filter(function (row) {return row[0] !== '';}).map(function (row) {
    var obj = {}; SCHEMA_[name].forEach(function (key, n) {obj[key] = row[n] instanceof Date ? row[n].toISOString() : row[n];}); return obj;
  });
}
function putRow_(name, obj, key) {
  var sheet = db_().getSheetByName(name), values = sheet.getDataRange().getValues();
  var keyIndex = SCHEMA_[name].indexOf(key || 'id');
  var found = values.findIndex(function (r, n) {return n > 0 && String(r[keyIndex]) === String(obj[key || 'id']);});
  var row = SCHEMA_[name].map(function (k) {return obj[k] === undefined ? '' : obj[k];});
  row.forEach(function (v) {require_(typeof v !== 'string' || !/^[=+@\t\r]/.test(v), 'VALIDATION', 'No se permiten fórmulas en los datos.');});
  var range = sheet.getRange(found < 0 ? sheet.getLastRow() + 1 : found + 1, 1, 1, row.length);
  if (name === 'Configuracion') range.setNumberFormat('@');
  range.setValues([row]);
  SpreadsheetApp.flush();
}
function active_(value) {return value === true || value === 'true';}
function text_(value, max) { require_(typeof value === 'string' && value.trim().length > 0 && value.length <= (max || 100) && !/^[=+@\-\t\r]/.test(value), 'VALIDATION', 'Texto inválido o demasiado largo.'); return value.trim(); }
function number_(value, min, max) {require_(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, 'VALIDATION', 'Cantidad o precio inválido.'); return value;}
function config_() {var result = {}; rows_('Configuracion').forEach(function (r) {result[r.clave] = String(r.valor);}); return result;}
function saveConfig_(values) {
  require_(values && typeof values === 'object', 'VALIDATION', 'Configuración inválida.');
  var allowed = ['fecha','ubicacion','horario','merienda','cena','personas','presupuestoMin','presupuestoMax','modificaciones'];
  var config = config_();
  Object.keys(values).forEach(function (key) {
    require_(allowed.indexOf(key) >= 0 && typeof values[key] === 'string' && values[key].length <= 200, 'VALIDATION', 'Configuración inválida.');
    config[key] = values[key];
  });
  require_(!config.fecha || /^\d{4}-\d{2}-\d{2}$/.test(config.fecha) && !isNaN(Date.parse(config.fecha)), 'VALIDATION', 'Fecha inválida.');
  ['merienda','cena'].forEach(function (k) {require_(/^([01]\d|2[0-3]):[0-5]\d$/.test(config[k]), 'VALIDATION', 'Horario inválido.');});
  require_(Number.isInteger(Number(config.personas)) && Number(config.personas) > 0 && Number(config.personas) <= 1000, 'VALIDATION', 'Cantidad de personas inválida.');
  require_(Number.isFinite(Number(config.presupuestoMin)) && Number(config.presupuestoMin) >= 0 && Number.isFinite(Number(config.presupuestoMax)) && Number(config.presupuestoMax) >= Number(config.presupuestoMin), 'VALIDATION', 'Presupuesto inválido.');
  require_(['true','false'].indexOf(config.modificaciones) >= 0, 'VALIDATION', 'Estado de modificaciones inválido.');
  Object.keys(values).forEach(function (key) {putRow_('Configuracion', {clave:key,valor:config[key]}, 'clave');});
  return config;
}
function adminSnapshot_() { var snap = snapshot_(); snap.invitados = rows_('Invitados').map(publicGuest_); snap.ingredientes = ingredients_(true); snap.selecciones = selections_(); return snap; }
