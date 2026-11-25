import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({title, close, children}: {title: string; close: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={ref} className="modal" onCancel={e => {e.preventDefault(); close();}} onClick={e => {if (e.target === e.currentTarget) close();}}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Cerrar"><X size={21}/></button></div>{children}</dialog>;
}
