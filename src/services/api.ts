import type { Session } from '../types';
export const API_URL = (import.meta.env.VITE_API_URL || '').trim();
export class ApiError extends Error { constructor(message: string, public code: string) { super(message); } }
export async function api<T>(action: string, payload: Record<string, unknown> = {}, token?: string, get = false): Promise<T> {
  if (!API_URL) throw new ApiError('Falta conectar la API. Seguí los pasos del README para publicar Apps Script.', 'CONFIG');
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(get ? `${API_URL}?action=${encodeURIComponent(action)}` : API_URL, {
        method: get ? 'GET' : 'POST', redirect: 'follow', credentials: 'omit', signal: controller.signal,
        ...(!get ? {headers: {'Content-Type': 'text/plain;charset=UTF-8'}, body: JSON.stringify({action, ...payload, token})} : {}),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!body.success) throw new ApiError(body.message || 'No pudimos completar la operación.', body.error || 'SERVER');
      return body.data as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Únicamente consultas se reintentan automáticamente. Las escrituras usan requestId.
      if (attempt === 0 && (get || action === 'mySelection')) { await new Promise(r => setTimeout(r, 800)); continue; }
      throw new ApiError('No pudimos verificar la respuesta. Revisá la conexión y volvé a intentar. Si estabas confirmando, se reutilizará el mismo pedido.', 'NETWORK');
    } finally { clearTimeout(timeout); }
  }
  throw new Error('Sin respuesta');
}
const key = 'cumple-playa-session';
export function readSession(): Session | null { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); return s && s.expiresAt > Date.now() ? s : null; } catch { return null; } }
export function storeSession(session: Session | null) { if (session) localStorage.setItem(key, JSON.stringify(session)); else localStorage.removeItem(key); }
