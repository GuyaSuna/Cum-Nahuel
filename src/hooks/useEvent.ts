import { useCallback, useEffect, useState } from 'react';
import type { Snapshot } from '../types';
import { API_URL, api } from '../services/api';
import { initial } from '../services/initial';
export function useEvent() {
  const [data, setData] = useState<Snapshot>(initial);
  const [loading, setLoading] = useState(!!API_URL);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const refresh = useCallback(async () => {
    if (!API_URL) return;
    try { const value = await api<Snapshot>('snapshot', {}, undefined, true); setData(value); setConnected(true); setUpdated(new Date()); setError(''); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000); const onFocus = () => void refresh(); window.addEventListener('focus', onFocus); return () => {clearInterval(timer); window.removeEventListener('focus', onFocus);}; }, [refresh]);
  return {data, loading, error, connected, updated, refresh};
}
