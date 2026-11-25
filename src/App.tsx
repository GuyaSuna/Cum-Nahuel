import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Sun, Waves, CalendarDays, MapPin, Users, Check, ShoppingBag, Search, SlidersHorizontal, LogOut, KeyRound, RefreshCw, Umbrella, Heart, ShieldCheck, Wifi, X, Cookie, Utensils } from 'lucide-react';
import { Beach } from './components/Beach';
import { Modal } from './components/Modal';
import { IngredientCard, categoryIcon } from './components/IngredientCard';
import { Cart } from './components/Cart';
import { Organization } from './pages/Organization';
import { Admin } from './pages/Admin';
import { useEvent } from './hooks/useEvent';
import { API_URL, api, ApiError, readSession, storeSession } from './services/api';
import { money, eventDate } from './utils/format';
import type { Line, Selection, Session } from './types';
type Page = 'inicio' | 'ingredientes' | 'organizacion' | 'seleccion' | 'admin';
function getPage(): Page {const hash = window.location.hash.slice(1); return ['inicio','ingredientes','organizacion','seleccion','admin'].includes(hash) ? hash as Page : 'inicio';}
export default function App() {
  const {data,loading,error,connected,updated,refresh} = useEvent();
  const [page,setPage] = useState<Page>(getPage);
  const [session,setSession] = useState<Session | null>(readSession);
  const [login,setLogin] = useState<'guest' | 'admin' | null>(null);
  const [loginError,setLoginError] = useState('');
  const [busy,setBusy] = useState(false);
  const [lines,setLines] = useState<Line[]>([]);
  const [own,setOwn] = useState<Selection | null>(null);
  const [mineReady,setMineReady] = useState(!readSession());
  const [category,setCategory] = useState('Todos');
  const [filter,setFilter] = useState('todos');
  const [search,setSearch] = useState('');
  const [notice,setNotice] = useState('');
  const [actionError,setActionError] = useState('');
  const [connection,setConnection] = useState(false);
  const [deleteModal,setDeleteModal] = useState(false);
  const pending = useRef<{signature:string;requestId:string} | null>(null);
  const loginDraft = useRef<Line[] | null>(null);
  const notify = useCallback((text: string) => setNotice(text),[]);
  const expire = useCallback(() => {storeSession(null);setSession(null);setOwn(null);setMineReady(true);setLogin('guest');setLoginError('Tu sesión finalizó. Volvé a ingresar.');},[]);
  useEffect(() => {const fn = () => {setPage(getPage());window.scrollTo({top:0,behavior:'smooth'});}; window.addEventListener('hashchange',fn); return () => window.removeEventListener('hashchange',fn);},[]);
  useEffect(() => {if (!notice) return; const timer = setTimeout(() => setNotice(''),6000);return () => clearTimeout(timer);},[notice]);
  useEffect(() => {
    if (!session || session.role !== 'guest') {setMineReady(true);return;}
    let cancelled = false; setMineReady(false);
    api<{selection: Selection | null}>('mySelection',{},session.token).then(result => {if (!cancelled) {setOwn(result.selection);setLines(result.selection?.estado === 'confirmada' ? result.selection.ingredientes : loginDraft.current || []);loginDraft.current = null;setMineReady(true);}}).catch(e => {if (!cancelled) {setActionError(e.message); if (e instanceof ApiError && e.code === 'SESSION') expire();}});
    return () => {cancelled = true;};
  },[session,expire]);
  async function reload() {
    if (!session) return;
    setBusy(true);
    try {const result = await api<{selection: Selection | null}>('mySelection',{},session.token);setOwn(result.selection);setLines(result.selection?.ingredientes || []);pending.current = null;setMineReady(true);setActionError('');await refresh();notify('Recuperamos tu última confirmación.');}
    catch(e) {handleError(e);} finally {setBusy(false);}
  }
  function handleError(e: unknown) {setActionError((e as Error).message);if (e instanceof ApiError && e.code === 'SESSION') expire();}
  async function identify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);setBusy(true);setLoginError('');
    try {const value = await api<Session>(login === 'admin' ? 'adminLogin' : 'login',login === 'admin' ? {password:form.get('password')} : {guestId:form.get('guestId'),pin:form.get('pin')});storeSession(value);setSession(value);setLogin(null);setActionError('');if (value.role === 'admin') window.location.hash = 'admin';notify(value.guest ? `¡Hola, ${value.guest.nombre}!` : 'Ingresaste como organizador.');}
    catch(e) {setLoginError((e as Error).message);} finally {setBusy(false);}
  }
  async function logout() {
    if (session) {try {await api('logout',{},session.token);} catch { /* La credencial local se descarta incluso sin conexión. */ }}
    storeSession(null);setSession(null);setOwn(null);setLines([]);pending.current = null;setMineReady(true);window.location.hash = 'inicio';
  }
  function add(id: string, amount: number) {if (busy || !mineReady) return; setLines(old => {const found = old.find(l => l.ingredienteId === id);return [...old.filter(l => l.ingredienteId !== id),{ingredienteId:id,cantidad:(found?.cantidad || 0) + amount}];});setActionError('');notify('Agregado a tu bolsita. Acordate de confirmar.');}
  function change(id: string,n: number) {setLines(old => [...old.filter(l => l.ingredienteId !== id),...(n > 0 ? [{ingredienteId:id,cantidad:n}] : [])]);}
  async function save(remove = false) {
    if (!session || session.role !== 'guest') {loginDraft.current = lines;setLogin('guest');setLoginError('');return;}
    if (!mineReady) {setActionError('Primero recuperá tu última confirmación.');return;}
    const ingredients = remove ? [] : lines;
    const signature = JSON.stringify({guest:session.guest?.id,ingredients,version:own?.fechaActualizacion || ''});
    if (pending.current?.signature !== signature) pending.current = {signature,requestId:crypto.randomUUID()};
    setBusy(true);setActionError('');
    try {const value = await api<{selection:Selection}>('saveSelection',{ingredientes:ingredients,expectedVersion:own?.fechaActualizacion || '',requestId:pending.current.requestId},session.token);setOwn(value.selection);setLines(value.selection.ingredientes);pending.current = null;setDeleteModal(false);await refresh();notify(remove ? 'Tu aporte fue eliminado. Las cantidades están disponibles otra vez.' : '¡Aporte confirmado! Gracias por sumar al cumple.');}
    catch(e) {handleError(e);await refresh();} finally {setBusy(false);}
  }
  async function testConnection() {
    setBusy(true);setActionError('');
    try {await api('summary',{},undefined,true);await api('summary');notify(`GET y POST respondieron correctamente desde ${window.location.origin}.`);await refresh();}
    catch(e) {handleError(e);} finally {setBusy(false);}
  }
  const categories = ['Todos',...new Set(data.ingredientes.map(i => i.categoria))];
  const visible = data.ingredientes.filter(i => (category === 'Todos' || i.categoria === category) && (filter === 'todos' || (filter === 'disponibles' ? i.disponible > 0 : i.disponible === 0)) && i.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const canSave = connected && data.configuracion.modificaciones === 'true' && (session?.role !== 'guest' || mineReady);
  const catalog = <><div className="section-heading catalog-heading"><div><p className="eyebrow">UN POQUITO CADA UNO</p><h2>¿Qué llevamos a la playa?</h2><p>Elegí lo que te guste. También podés llevar una parte.</p></div><span className="catalog-count">{data.ingredientes.length} ingredientes · {money(data.resumen.presupuesto)} aprox.</span></div><div className="catalog-layout"><div className="catalog-main"><div className="catalog-tools"><label className="search"><Search size={18}/><input aria-label="Buscar ingrediente" placeholder="Buscá un ingrediente…" value={search} onChange={e => setSearch(e.target.value)}/></label><label className="availability"><SlidersHorizontal size={16}/><span className="sr-only">Disponibilidad</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="todos">Todos los estados</option><option value="disponibles">Disponibles</option><option value="completos">Completos</option></select></label></div><div className="tabs category-tabs" aria-label="Categorías">{categories.map(c => {const Icon = c === 'Todos' ? ShoppingBag : categoryIcon(c);return <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}><Icon size={15}/>{c}</button>;})}</div><div className="ingredient-grid">{visible.map(item => <IngredientCard key={item.id} item={item} selected={lines.find(l => l.ingredienteId === item.id)?.cantidad || 0} own={own?.estado === 'confirmada' ? own.ingredientes.find(l => l.ingredienteId === item.id)?.cantidad || 0 : 0} add={add} closed={busy || !mineReady || data.configuracion.modificaciones !== 'true'}/>)}</div>{!visible.length && <div className="panel no-results"><Search size={30}/><h3>No encontramos ingredientes</h3><p>Probá otra búsqueda o cambiá los filtros.</p><button className="button" onClick={() => {setSearch('');setCategory('Todos');setFilter('todos');}}>Limpiar filtros</button></div>}</div><aside><Cart items={data.ingredientes} lines={lines} own={own?.estado === 'confirmada' ? own.ingredientes : []} session={session} busy={busy} canSave={canSave} saved={own?.estado === 'confirmada'} budget={[data.configuracion.presupuestoMin,data.configuracion.presupuestoMax]} change={change} save={() => void save()} reload={() => void reload()} clear={() => setDeleteModal(true)}/><div className="drink-note"><span aria-hidden="true">🥤</span><div><strong>Tu bebida va por tu cuenta</strong><p>Traé lo que quieras tomar. El organizador pone las comidas principales y los huevos.</p></div></div></aside></div></>;
  return <><a className="skip-link" href="#contenido">Saltar al contenido</a><header className="site-header"><div className="header-inner"><a href="#inicio" className="brand"><span className="brand-mark"><Umbrella size={24}/></span><span>cumple<span className="brand-light">playa</span><small>BUENA COMPAÑÍA, BUENA VIDA</small></span></a><nav aria-label="Navegación principal">{([['inicio','El plan'],['ingredientes','Qué llevar'],['organizacion','Quién lleva qué']] as [Page,string][]).map(([id,label]) => <a className={page === id ? 'active' : ''} href={`#${id}`} key={id}>{label}</a>)}</nav><div className="header-actions"><button className="bag-nav" onClick={() => {window.location.hash = 'seleccion';}} aria-label={`Mi selección: ${lines.length} ingredientes`}><ShoppingBag size={20}/>{lines.length > 0 && <span>{lines.length}</span>}</button>{session ? <><span className="session-name">{session.guest?.nombre || 'Organizador'}</span><button className="icon-button" aria-label="Cerrar sesión" onClick={() => void logout()}><LogOut size={18}/></button></> : <button className="button login-button" disabled={!connected} onClick={() => {setLogin('guest');setLoginError('');}}><KeyRound size={16}/><span>Ingresar</span></button>}</div></div></header>
    <main id="contenido" className="container">
      {!API_URL && <div className="notice preview-notice"><span><Wifi size={16}/><strong>Vista previa</strong> · Conectá Google Sheets para confirmar y compartir aportes reales.</span><button className="text-button" onClick={() => setConnection(true)}>Cómo conectar</button></div>}
      {loading && <div className="notice"><RefreshCw className="spin" size={16}/>Consultando la organización…</div>}
      {error && <div className="notice error" role="alert"><span>{error}{!connected && ' El catálogo mostrado es la vista previa inicial.'}</span><button className="text-button" onClick={() => void refresh()}>Reintentar</button></div>}
      {data.configuracion.modificaciones !== 'true' && <div className="notice">El organizador cerró los cambios. Podés seguir consultando los aportes.</div>}
      {actionError && <div className="notice error" role="alert"><span>{actionError}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setActionError('')}><X size={16}/></button></div>}
      {page === 'inicio' && <><section className="hero"><div className="hero-copy"><span className="summer-label"><Sun size={16}/> SOL, AMIGOS Y ALGO RICO</span><h1>¡Cumpleaños<br/>en la <span>playa!</span><svg viewBox="0 0 220 14" aria-hidden="true"><path d="M4 9Q100-3 214 6" stroke="#f2bb67" strokeWidth="7" strokeLinecap="round"/></svg></h1><p>Un día para desconectar, compartir<br className="desktop-break"/> y festejar juntos. ¿Te sumás?</p><div className="event-meta"><span><CalendarDays size={17}/>{eventDate(data.configuracion.fecha)}</span><span><MapPin size={17}/>{data.configuracion.ubicacion}</span></div><div className="button-row"><a className="button primary" href="#ingredientes"><ShoppingBag size={18}/>Elegir qué llevar</a><a className="button light" href="#organizacion"><Users size={18}/>Ver los aportes</a></div><div className="hero-footnote"><span className="mini-avatars">{['A','M','N','F'].map(n => <span key={n}>{n}</span>)}</span><span>{data.configuracion.personas} personas · un gran plan</span></div></div><div className="hero-image"><Beach/><div className="beach-sticker"><Sun size={22}/><span>El mejor plan es<br/><strong>con ustedes.</strong></span></div><span className="image-caption">NOS VEMOS DONDE ROMPEN LAS OLAS</span></div></section><section className="overview"><div className="overview-title"><span className="round-icon"><Waves size={24}/></span><div><h2>El cumple se arma entre todos</h2><p>Cada ingrediente nos acerca a un día increíble.</p></div></div><div className="overview-stats"><div><strong>{data.resumen.porcentaje}<small>%</small></strong><span>del plan cubierto</span></div><div><strong>{data.resumen.confirmados}<small>/{data.invitados.length}</small></strong><span>aportes confirmados</span></div><div><strong>{data.resumen.pendientes}</strong><span>ingredientes pendientes</span></div></div><div className="overview-progress"><div className="progress" role="progressbar" aria-label="Organización general" aria-valuenow={data.resumen.porcentaje} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${data.resumen.porcentaje}%`}}/></div><span>{data.resumen.completos} de {data.ingredientes.length} ingredientes completos <Check size={14}/></span></div></section><section className="day-plan"><div><p className="eyebrow">SIN APURO, TODO EL DÍA</p><h2>Un plan bien de verano</h2></div><div className="plan-step"><Sun/><div><span>{data.configuracion.horario}</span><strong>Playa y buena compañía</strong></div></div><div className="plan-step"><Cookie/><div><span>{data.configuracion.merienda} · Merienda</span><strong>Tortas fritas para compartir</strong></div></div><div className="plan-step"><Utensils/><div><span>{data.configuracion.cena} · Cena</span><strong>Hamburguesas, pizzas y panchos</strong></div></div></section>{catalog}</>}
      {page === 'ingredientes' && <div className="page-content">{catalog}</div>}
      {page === 'organizacion' && <Organization data={data}/>}
      {page === 'seleccion' && <div className="my-selection-page"><div className="section-heading"><div><p className="eyebrow">TU GRANITO DE ARENA</p><h1>Mi selección</h1><p>Revisá las cantidades y confirmá tu aporte.</p></div></div><Cart items={data.ingredientes} lines={lines} own={own?.estado === 'confirmada' ? own.ingredientes : []} session={session} busy={busy} canSave={canSave} saved={own?.estado === 'confirmada'} budget={[data.configuracion.presupuestoMin,data.configuracion.presupuestoMax]} change={change} save={() => void save()} reload={() => void reload()} clear={() => setDeleteModal(true)}/><a className="button" href="#ingredientes">Seguir eligiendo ingredientes</a></div>}
      {page === 'admin' && (session?.role === 'admin' ? <Admin session={session} notify={notify} refresh={refresh} expired={expire}/> : <section className="admin-gate panel"><ShieldCheck size={36}/><h1>Rincón del organizador</h1><p>Ingresá para configurar el evento y administrar los aportes.</p><button className="button primary" disabled={!connected} onClick={() => {setLogin('admin');setLoginError('');}}>Ingresar como organizador</button></section>)}
    </main><footer className="site-footer"><div className="container footer-inner"><span><Umbrella size={18}/>Hecho para compartir <Heart size={14}/></span><span className="sync-label">{updated ? `Actualizado ${updated.toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})} · cada 30 s` : 'Que no falten las ganas de pasarla bien.'}</span><div><button className="text-button" onClick={() => setConnection(true)}>Conexión</button><a href="#admin">Organizador</a></div></div></footer>
    <nav className="mobile-nav" aria-label="Navegación móvil">{([['inicio','El plan',Sun],['ingredientes','Qué llevar',ShoppingBag],['organizacion','Aportes',Users],['seleccion','Mi bolsita',Check]] as const).map(([id,label,Icon]) => <a className={page === id ? 'active' : ''} key={id} href={`#${id}`}><Icon size={20}/>{label}{id === 'seleccion' && lines.length > 0 && <b>{lines.length}</b>}</a>)}</nav>
    {notice && <div className="toast" role="status"><Check size={18}/>{notice}<button className="icon-button" aria-label="Cerrar notificación" onClick={() => setNotice('')}><X size={16}/></button></div>}
    {login && <Modal title={login === 'guest' ? '¡Qué bueno verte por acá!' : 'Hola, organizador'} close={() => {if (!busy) setLogin(null);}}><p>{login === 'guest' ? 'Elegí tu nombre e ingresá el PIN que te compartió el organizador. Al ingresar se cargará tu última selección confirmada.' : 'Usá tu contraseña privada para administrar el cumple.'}</p><form onSubmit={identify} className="edit-form">{login === 'guest' ? <><label>Tu nombre<select name="guestId" required defaultValue=""><option value="" disabled>Elegí tu nombre</option>{data.invitados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label><label>Tu PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="current-password" placeholder="6 dígitos" required/></label></> : <label>Contraseña<input name="password" type="password" autoComplete="current-password" required maxLength={200}/></label>}{loginError && <p className="notice error" role="alert">{loginError}</p>}<button className="button primary full" disabled={busy}>{busy ? 'Verificando…' : 'Entrar al cumple'}</button><p className="muted small-text">{login === 'guest' ? 'Si no tenés tu PIN, pedíselo al organizador.' : 'Las credenciales se validan en Google Apps Script.'}</p></form></Modal>}
    {connection && <Modal title="Conectar la organización" close={() => setConnection(false)}><p>La aplicación guarda los aportes en una planilla privada de Google Sheets a través de Apps Script.</p><ol className="connection-steps"><li>Creá la planilla y copiá los archivos de <code>apps-script/</code> a su editor de Apps Script.</li><li>Configurá <code>SPREADSHEET_ID</code>, inicializá el proyecto y configurá la contraseña administrativa.</li><li>Publicá como aplicación web y configurá <code>VITE_API_URL</code> con la URL terminada en <code>/exec</code>.</li><li>Volvé a compilar y desplegar. Encontrás el procedimiento completo en <code>README.md</code>.</li></ol><div className="notice">{API_URL ? 'Hay una URL de API configurada.' : 'Todavía no hay una URL de API configurada.'}</div><button className="button primary full" disabled={!API_URL || busy} onClick={() => void testConnection()}><Wifi size={17}/>{busy ? 'Probando…' : 'Probar GET y POST desde este sitio'}</button><p className="muted small-text">La prueba consulta datos sin modificar aportes. Después, verificá una confirmación real con tu PIN.</p></Modal>}
    {deleteModal && <Modal title="¿Eliminar tu aporte?" close={() => {if (!busy) setDeleteModal(false);}}><p>Tus cantidades volverán a estar disponibles para los demás. Después podés elegir nuevamente.</p><button className="button primary full" disabled={busy} onClick={() => void save(true)}>{busy ? 'Eliminando…' : 'Sí, eliminar mi aporte'}</button><button className="text-button full" disabled={busy} onClick={() => setDeleteModal(false)}>Conservar mi aporte</button></Modal>}
  </>;
}
