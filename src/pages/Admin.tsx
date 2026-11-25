import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, KeyRound, Plus, Settings, Pencil, RefreshCw } from 'lucide-react';
import type { Config, Guest, Item, Line, Session, Snapshot } from '../types';
import { api, ApiError } from '../services/api';
import { download, quantity } from '../utils/format';
import { Modal } from '../components/Modal';
type Edit = {type: 'guest'; value?: Guest} | {type:'item'; value?: Item} | {type:'selection'; guest: Guest};
export function Admin({session, notify, refresh, expired}: {session: Session; notify:(s: string) => void; refresh: () => Promise<void>; expired: () => void}) {
  const [data,setData] = useState<Snapshot | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [edit,setEdit] = useState<Edit | null>(null);
  const [tab,setTab] = useState('evento');
  const [pin,setPin] = useState<{nombre:string;pin:string} | null>(null);
  const [lines,setLines] = useState<Line[]>([]);
  const load = useCallback(async () => {
    try {setData(await api<Snapshot>('adminSnapshot',{},session.token)); setError('');}
    catch (e) {setError((e as Error).message); if (e instanceof ApiError && e.code === 'SESSION') expired();}
  },[session.token,expired]);
  useEffect(() => {void load();},[load]);
  async function mutate(action: string, payload: Record<string,unknown>) {
    setBusy(true); setError('');
    try {const result = await api<{nombre:string;pin:string}>(action,payload,session.token); if (action === 'regeneratePin') setPin(result); else notify('Cambios guardados.'); setEdit(null); await load(); await refresh();}
    catch (e) {setError((e as Error).message); if (e instanceof ApiError && e.code === 'SESSION') expired();}
    finally {setBusy(false);}
  }
  async function saveConfig(e: FormEvent<HTMLFormElement>) {e.preventDefault(); const form = new FormData(e.currentTarget); const config = Object.fromEntries(form.entries()); config.modificaciones = form.has('modificaciones') ? 'true' : 'false'; await mutate('saveConfig',{config});}
  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!edit) return;
    const values = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (edit.type === 'guest') await mutate('saveGuest',{guest:{id:edit.value?.id,nombre:values.nombre,activo:values.activo === 'on'}});
    if (edit.type === 'item') await mutate('saveIngredient',{ingredient:{...values,id:edit.value?.id,activo:values.activo === 'on',cantidadRequerida:Number(values.cantidadRequerida),incremento:Number(values.incremento),precioTotal:Number(values.precioTotal)}});
    if (edit.type === 'selection') {
      const old = data?.selecciones.find(s => s.invitadoId === edit.guest.id);
      // Recuperar también la versión de una selección eliminada, que no aparece en el resumen público.
      await mutate('adminSaveSelection',{guestId:edit.guest.id,ingredientes:lines,expectedVersion:old?.fechaActualizacion || '',requestId:crypto.randomUUID()});
    }
  }
  async function exportData(csv: boolean) {
    setBusy(true);
    try {
      const value = await api<Snapshot>('export',{},session.token);
      if (!csv) download('cumple-playa.json',JSON.stringify(value,null,2),'application/json');
      else {
        const escape = (v: unknown) => {let s = String(v ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"','""') + '"';};
        const rows = [['invitado','estado','ingrediente','cantidad','unidad','fechaActualizacion'],...value.invitados.flatMap(g => {const s = value.selecciones.find(v => v.invitadoId === g.id); return s?.ingredientes.length ? s.ingredientes.map(l => {const i = value.ingredientes.find(v => v.id === l.ingredienteId); return [g.nombre,s.estado,i?.nombre,l.cantidad,i?.unidad,s.fechaActualizacion];}) : [[g.nombre,'sin aporte','','','','']];})];
        download('aportes.csv','\uFEFF'+rows.map(r => r.map(escape).join(',')).join('\r\n'),'text/csv;charset=utf-8');
      }
      notify('Archivo exportado sin credenciales.');
    } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  if (!data) return <section className="panel"><h1>Organizador</h1><p>{error || 'Cargando la organización…'}</p><button className="button" onClick={() => void load()}><RefreshCw size={16}/> Reintentar</button></section>;
  const c = data.configuracion;
  return <section className="admin"><div className="section-heading"><div><p className="eyebrow">TODO LISTO PARA EL CUMPLE</p><h1>Rincón del organizador</h1><p>Configurá el día y ayudá a repartir los aportes.</p></div><Settings size={30}/></div><div className="tabs admin-tabs">{[['evento','El evento'],['invitados','Invitados y PIN'],['ingredientes','Ingredientes'],['aportes','Aportes'],['exportar','Copias y exportación']].map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {tab === 'evento' && <form className="panel admin-form" onSubmit={saveConfig}><h2>Datos del encuentro</h2><div className="form-grid">{([['fecha','Fecha','date'],['ubicacion','Ubicación','text'],['horario','Llegada','text'],['merienda','Merienda','time'],['cena','Cena','time'],['personas','Personas','number'],['presupuestoMin','Presupuesto sugerido desde ($)','number'],['presupuestoMax','Presupuesto sugerido hasta ($)','number']] as [keyof Config,string,string][]).map(([key,label,type]) => <label key={key}>{label}<input name={key} type={type} defaultValue={c[key]} min="0" maxLength={200} required={key !== 'fecha'}/></label>)}</div><label className="check-field"><input name="modificaciones" type="checkbox" defaultChecked={c.modificaciones === 'true'}/>Permitir que los invitados confirmen y modifiquen sus aportes</label><button className="button primary" disabled={busy}>Guardar evento</button></form>}
    {tab === 'invitados' && <section className="panel"><div className="list-heading"><h2>{data.invitados.length} invitados</h2><button className="button primary" disabled={busy} onClick={() => setEdit({type:'guest'})}><Plus size={16}/>Agregar</button></div><p className="muted">Cada PIN nuevo invalida las sesiones anteriores. Compartilo por un medio privado.</p><div className="admin-list">{data.invitados.map(g => <div key={g.id}><span><strong>{g.nombre}</strong><small>{g.activo ? 'Activo' : 'Inactivo'}</small></span><div><button className="button small" disabled={busy} onClick={() => setEdit({type:'guest',value:g})}><Pencil size={14}/>Editar</button><button className="button small" disabled={busy || !g.activo} onClick={() => void mutate('regeneratePin',{guestId:g.id})}><KeyRound size={14}/>Nuevo PIN</button></div></div>)}</div></section>}
    {tab === 'ingredientes' && <section className="panel"><div className="list-heading"><h2>Lista de ingredientes</h2><button className="button primary" disabled={busy} onClick={() => setEdit({type:'item'})}><Plus size={16}/>Agregar</button></div><div className="admin-list">{data.ingredientes.map(i => <div key={i.id}><span><strong>{i.nombre}{!i.activo && ' · Inactivo'}</strong><small>{quantity(i.disponible,i.unidad)} faltantes de {quantity(i.cantidadRequerida,i.unidad)}</small></span><button className="button small" onClick={() => setEdit({type:'item',value:i})}><Pencil size={14}/>Editar</button></div>)}</div></section>}
    {tab === 'aportes' && <section className="panel"><h2>Modificar aportes</h2><p className="muted">Las mismas reglas de disponibilidad se aplican al organizador.</p><div className="admin-list">{data.invitados.filter(g => g.activo).map(g => {const s = data.selecciones.find(s => s.invitadoId === g.id); return <div key={g.id}><span><strong>{g.nombre}</strong><small>{s?.ingredientes.length || 0} ingredientes</small></span><button className="button small" onClick={() => {setLines(s?.ingredientes || []);setEdit({type:'selection',guest:g});}}><Pencil size={14}/>Modificar</button></div>;})}</div></section>}
    {tab === 'exportar' && <section className="panel export-panel"><Download size={32}/><h2>Guardá una copia del encuentro</h2><p>JSON incluye configuración, invitados, ingredientes y aportes. CSV muestra los aportes por persona. Los archivos no incluyen PIN, hashes ni sesiones.</p><div className="button-row"><button className="button primary" disabled={busy} onClick={() => void exportData(false)}>Exportar JSON</button><button className="button" disabled={busy} onClick={() => void exportData(true)}>Exportar CSV</button></div><p className="muted">Para un respaldo restaurable completo, duplicá también la planilla privada. Encontrás el procedimiento en el README.</p></section>}
    {pin && <Modal title={`PIN de ${pin.nombre}`} close={() => setPin(null)}><p>Compartilo únicamente con esta persona. Al cerrar, no se vuelve a mostrar.</p><p className="pin-display">{pin.pin}</p><button className="button primary full" onClick={() => setPin(null)}>Ya lo guardé</button></Modal>}
    {edit && <Modal title={edit.type === 'guest' ? 'Editar invitado' : edit.type === 'item' ? 'Editar ingrediente' : `Aporte de ${edit.guest.nombre}`} close={() => {if (!busy) setEdit(null);}}><form onSubmit={saveEdit} className="edit-form">
      {edit.type === 'guest' && <><label>Nombre<input name="nombre" defaultValue={edit.value?.nombre} maxLength={70} required/></label><label className="check-field"><input type="checkbox" name="activo" defaultChecked={edit.value?.activo ?? true}/>Activo</label></>}
      {edit.type === 'item' && <><div className="form-grid">{[['nombre','Nombre','text'],['categoria','Categoría','text'],['cantidadRequerida','Cantidad requerida','number'],['unidad','Unidad (g, unidades, sobre)','text'],['incremento','Incremento','number'],['precioTotal','Precio total estimado ($)','number']].map(([key,label,type]) => <label key={key}>{label}<input name={key} type={type} defaultValue={String(edit.value?.[key as keyof Item] ?? '')} min={key === 'precioTotal' ? 0 : 1} step={key === 'precioTotal' ? '0.01' : 1} maxLength={70} required/></label>)}</div><label className="check-field"><input name="activo" type="checkbox" defaultChecked={edit.value?.activo ?? true}/>Activo</label></>}
      {edit.type === 'selection' && <><p className="muted">Cero quita el ingrediente. Todos en cero elimina el aporte.</p><div className="selection-editor">{data.ingredientes.filter(i => i.activo).map(i => <label key={i.id}>{i.nombre}<span><input aria-label={`Cantidad de ${i.nombre}`} type="number" min="0" max={i.cantidadRequerida} step={i.incremento} value={lines.find(l => l.ingredienteId === i.id)?.cantidad || 0} onChange={e => {const n = Number(e.target.value);setLines(old => [...old.filter(l => l.ingredienteId !== i.id),...(n > 0 ? [{ingredienteId:i.id,cantidad:n}] : [])]);}}/>{i.unidad}</span></label>)}</div></>}
      {error && <p className="notice error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></form></Modal>}
  </section>;
}
