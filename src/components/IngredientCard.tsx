import { useState } from 'react';
import { Plus, Check, Leaf, Milk, Sandwich, Cookie } from 'lucide-react';
import type { Item } from '../types';
import { money, quantity } from '../utils/format';
export const categoryIcon = (category: string) => category === 'Aderezos' ? Sandwich : category === 'Quesos y fiambres' ? Milk : category === 'Tortas fritas' ? Cookie : Leaf;
const emoji: Record<string, string> = {'Mayonesa':'🥚','Mostaza':'🌭','Kétchup':'🍅','Picantina':'🌶️','Barbacoa':'🔥','Mayonesa de ajo':'🧄','Muzarela':'🧀','Paleta':'🥪','Salame':'🍕','Panceta':'🥓','Cheddar':'🧀','Cebollas':'🧅','Tomates':'🍅','Lechuga':'🥬','Aceitunas':'🫒','Morrones':'🫑','Papas pay':'🥔','Pepinillos':'🥒','Cebolla crispy':'🧅','Limones':'🍋','Orégano':'🌿','Dulce de leche':'🍯','Azúcar':'🥄'};
export function IngredientCard({item, selected, own, add, closed}: {item: Item; selected: number; own: number; add: (id: string, amount: number) => void; closed: boolean}) {
  const [amount, setAmount] = useState(item.incremento);
  const available = Math.max(0, item.disponible + own - selected);
  const max = Math.floor(available / item.incremento) * item.incremento;
  const value = Math.min(amount, max);
  const complete = item.disponible === 0;
  return <article className={`ingredient-card ${complete ? 'is-complete' : ''}`}>
    <div className="card-top"><span className={`food-icon cat-${item.categoria.split(' ')[0].toLowerCase()}`} aria-hidden="true">{emoji[item.nombre] || '🧺'}</span><span className={`badge ${complete ? 'success' : 'neutral'}`}>{complete ? <><Check size={13}/> Completo</> : `${quantity(item.disponible, item.unidad)} libres`}</span></div>
    <p className="eyebrow card-category">{item.categoria}</p><h3>{item.nombre}</h3>
    <div className="item-facts"><span>Necesitamos {quantity(item.cantidadRequerida,item.unidad)}</span><strong>{money(item.precioTotal)} <small>aprox.</small></strong></div>
    <div className="progress" role="progressbar" aria-label={`Cobertura de ${item.nombre}`} aria-valuenow={Math.min(100,Math.round(item.comprometida / item.cantidadRequerida * 100))} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${Math.min(100,item.comprometida / item.cantidadRequerida * 100)}%`}}/></div>
    <p className="committed">{quantity(item.comprometida,item.unidad)} comprometidos</p>
    <div className="contributors">{item.aportantes.length ? item.aportantes.map(a => <span key={a.invitadoId} title={`${a.nombre}: ${quantity(a.cantidad,item.unidad)}`}><span className="tiny-avatar">{a.nombre.charAt(0)}</span>{a.nombre} · {quantity(a.cantidad,item.unidad)}</span>) : <span>¡Podés ser el primero en llevarlo!</span>}</div>
    <div className="card-action"><label className="sr-only" htmlFor={`qty-${item.id}`}>Cantidad de {item.nombre}</label><input id={`qty-${item.id}`} type="number" min={item.incremento} max={max} step={item.incremento} value={value || ''} disabled={max <= 0 || closed} onChange={e => setAmount(Number(e.target.value))}/><span>{item.unidad}</span><button className="add-button" disabled={closed || max <= 0 || value <= 0 || value % item.incremento !== 0} onClick={() => add(item.id,value)} aria-label={`Agregar ${value} ${item.unidad} de ${item.nombre}`}><Plus size={17}/> Agregar</button></div>
    {selected > 0 && <p className="in-bag"><Check size={13}/>{quantity(selected,item.unidad)} en tu selección</p>}
  </article>;
}
