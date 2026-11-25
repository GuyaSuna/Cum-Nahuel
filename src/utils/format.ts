import type { Item, Line } from '../types';
export const money = (value: number) => new Intl.NumberFormat('es-UY', {style: 'currency', currency: 'UYU', maximumFractionDigits: 0}).format(value);
export const quantity = (n: number, unit: string) => `${n.toLocaleString('es-UY')} ${unit}`;
export const total = (lines: Line[], items: Item[]) => lines.reduce((sum, line) => { const item = items.find(i => i.id === line.ingredienteId); return sum + (item ? item.precioTotal * line.cantidad / item.cantidadRequerida : 0); }, 0);
export const eventDate = (date: string) => date ? new Intl.DateTimeFormat('es-UY', {weekday: 'long', day: 'numeric', month: 'long'}).format(new Date(`${date}T12:00:00`)) : 'Fecha a confirmar';
export function download(name: string, data: string, type: string) { const url = URL.createObjectURL(new Blob([data], {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
