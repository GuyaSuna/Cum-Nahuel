function hash_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8).map(function (b) {return ('0' + ((b + 256) % 256).toString(16)).slice(-2);}).join(''); }
function random_() {return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');}
function equal_(a, b) {if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; var diff = 0; for (var n = 0; n < a.length; n++) diff |= a.charCodeAt(n) ^ b.charCodeAt(n); return diff === 0;}
function pinHash_(id, pin) { var pepper = props_().getProperty('PIN_PEPPER'); require_(pepper, 'CONFIG', 'Inicializá el proyecto.'); return hash_(pepper + ':' + id + ':' + pin); }
function rateLimit_(id) {
  var key = 'attempt:' + hash_(id), raw = props_().getProperty(key), now = Date.now();
  var state = raw ? JSON.parse(raw) : {count:0,until:now + 15 * 60000};
  if (state.until < now) state = {count:0,until:now + 15 * 60000};
  require_(state.count < 8, 'RATE_LIMIT', 'Demasiados intentos. Esperá 15 minutos.');
  state.count++; props_().setProperty(key, JSON.stringify(state));
}
function clearAttempts_(id) {props_().deleteProperty('attempt:' + hash_(id));}
function login_(p) {
  require_(typeof p.guestId === 'string' && /^g[a-zA-Z0-9-]{1,50}$/.test(p.guestId), 'AUTH', 'Nombre o PIN incorrectos.');
  rateLimit_('guest:' + p.guestId);
  var guest = rows_('Invitados').find(function (g) {return g.id === p.guestId && active_(g.activo);});
  require_(guest && typeof p.pin === 'string' && /^\d{6}$/.test(p.pin) && guest.pinHash && equal_(guest.pinHash, pinHash_(guest.id,p.pin)), 'AUTH', 'Nombre o PIN incorrectos.');
  clearAttempts_('guest:' + p.guestId);
  return newSession_('guest', guest);
}
function adminLogin_(p) {
  rateLimit_('admin');
  var salt = props_().getProperty('ADMIN_SALT'), expected = props_().getProperty('ADMIN_PASSWORD_HASH');
  require_(salt && expected, 'CONFIG', 'Configurá la contraseña del organizador en Apps Script.');
  require_(typeof p.password === 'string' && p.password.length <= 200 && equal_(expected,hash_(salt + ':' + p.password)), 'AUTH', 'Contraseña incorrecta.');
  clearAttempts_('admin'); return newSession_('admin');
}
function newSession_(role, guest) {
  cleanupSessions_();
  var token = random_(), expiresAt = Date.now() + (role === 'admin' ? 8 * 3600000 : 14 * 86400000);
  var state = {role:role, guestId:guest ? guest.id : null, fingerprint:guest ? guest.pinHash : props_().getProperty('ADMIN_PASSWORD_HASH'), expiresAt:expiresAt};
  props_().setProperty('session:' + hash_(token), JSON.stringify(state));
  var result = {token:token,expiresAt:expiresAt,role:role}; if (guest) result.guest = publicGuest_(guest); return result;
}
function authenticate_(token) {
  require_(typeof token === 'string' && /^[a-f0-9]{64}$/.test(token), 'SESSION', 'Volvé a ingresar para continuar.');
  var key = 'session:' + hash_(token), raw = props_().getProperty(key);
  require_(raw, 'SESSION', 'Tu sesión finalizó. Volvé a ingresar.');
  var session = JSON.parse(raw);
  require_(session.expiresAt > Date.now(), 'SESSION', 'Tu sesión venció. Volvé a ingresar.');
  if (session.role === 'guest') {
    var guest = guest_(session.guestId);
    require_(active_(guest.activo) && equal_(guest.pinHash,session.fingerprint), 'SESSION', 'Tu acceso cambió. Volvé a ingresar.');
  } else require_(session.role === 'admin' && equal_(session.fingerprint,props_().getProperty('ADMIN_PASSWORD_HASH')), 'SESSION', 'Tu sesión finalizó.');
  return session;
}
function cleanupSessions_() {
  var all = props_().getProperties();
  Object.keys(all).forEach(function (key) {if (key.indexOf('session:') === 0 && JSON.parse(all[key]).expiresAt < Date.now() || key.indexOf('attempt:') === 0 && JSON.parse(all[key]).until < Date.now()) props_().deleteProperty(key);});
}
// Ejecutar después de cargar ADMIN_PASSWORD temporal en Script Properties.
function configurarAdministrador() {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var password = props_().getProperty('ADMIN_PASSWORD');
    require_(password && password.length >= 12 && password.length <= 200, 'VALIDATION', 'Usá una contraseña de 12 a 200 caracteres.');
    var salt = random_(); props_().setProperty('ADMIN_SALT',salt); props_().setProperty('ADMIN_PASSWORD_HASH',hash_(salt + ':' + password)); props_().deleteProperty('ADMIN_PASSWORD');
  } finally {lock.releaseLock();}
}
