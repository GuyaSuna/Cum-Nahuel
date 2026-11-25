import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
export function backend() {
  const properties = new Map([['SPREADSHEET_ID','private-sheet'],['ADMIN_PASSWORD','test-organizer-password']]);
  const sheets = new Map();
  let locked = false, blocked = false, acquisitions = 0, releases = 0;
  function assertLocked() {if (!locked) throw new Error('Acceso a la planilla sin bloqueo');}
  function sheet() {
    const data = [];
    return {
      data,
      getDataRange() {assertLocked();return {getValues:() => data.length ? structuredClone(data) : [['']]};},
      getLastRow() {assertLocked();return data.length;},
      setFrozenRows() {},
      getRange(r,c,rows,cols) { assertLocked();return {setNumberFormat() {return this;},setValues(values) {for (let y=0;y<rows;y++) {data[r-1+y] ||= [];for (let x=0;x<cols;x++) data[r-1+y][c-1+x] = values[y][x];}return this;}};},
    };
  }
  const context = vm.createContext({console,Date,JSON,Number,Math,String,Object,Array,Error,Boolean,RegExp,
    Utilities:{getUuid:() => crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,value) => [...crypto.createHash('sha256').update(value).digest()]},
    PropertiesService:{getScriptProperties:() => ({getProperty:k => properties.get(k) ?? null,setProperty(k,v) {properties.set(k,String(v));},deleteProperty:k => properties.delete(k),getProperties:() => Object.fromEntries(properties)})},
    SpreadsheetApp:{openById:() => {assertLocked();return {getSheetByName:n => sheets.get(n),insertSheet(n) {const s = sheet();sheets.set(n,s);return s;}};},flush() {assertLocked();}},
    LockService:{getScriptLock:() => ({tryLock() {if (blocked || locked) return false;locked=true;acquisitions++;return true;},waitLock() {if (blocked || locked) throw new Error('busy');locked=true;acquisitions++;},hasLock:() => locked,releaseLock() {locked=false;releases++;}})},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text => ({setMimeType:() => JSON.parse(text)})},
  });
  for (const file of readdirSync('apps-script').filter(f => f.endsWith('.gs'))) vm.runInContext(readFileSync(`apps-script/${file}`,'utf8'),context,{filename:file});
  context.inicializarProyecto(); context.configurarAdministrador();
  function call(action,p={},get=false) {return get ? context.doGet({parameter:{action,...p}}) : context.doPost({postData:{contents:JSON.stringify({action,...p})}});}
  const admin = call('adminLogin',{password:'test-organizer-password'}).data;
  function guest(id) {const pin = call('regeneratePin',{token:admin.token,guestId:id}).data.pin;return {...call('login',{guestId:id,pin}).data,pin};}
  return {call,guest,admin,context,sheets,properties,block:v => {blocked=v;},stats:() => ({locked,acquisitions,releases})};
}
export const save = (b,g,ingredientes,version='',requestId=crypto.randomUUID()) => b.call('saveSelection',{token:g.token,ingredientes,expectedVersion:version,requestId});
export const line = (ingredienteId,cantidad) => ({ingredienteId,cantidad});
