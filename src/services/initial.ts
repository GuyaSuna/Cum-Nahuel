import type { Snapshot } from '../types';
// Vista previa de solo lectura. Nunca se utiliza como almacenamiento.
const names = ['Augusto','Dulzura Frita','Melany','Francisco','Mateo','Facundo','Ignacio','Aramis','Juan Meny','Nahuel Plasencia','Candes','Girman','Pipiola','Lucas','Guillermino','Luis','Meli','Marcelo'];
const groups: [string, [string, number, string, number, number][]][] = [
  ['Aderezos', [['Mayonesa',1000,'g',250,200],['Mostaza',500,'g',250,80],['Kétchup',500,'g',250,120],['Picantina',200,'g',100,50],['Barbacoa',350,'g',175,150],['Mayonesa de ajo',250,'g',125,100]]],
  ['Quesos y fiambres', [['Muzarela',1500,'g',250,615],['Paleta',900,'g',100,450],['Salame',300,'g',100,240],['Panceta',500,'g',100,430],['Cheddar',300,'g',100,240]]],
  ['Verduras y complementos', [['Cebollas',5,'unidades',1,50],['Tomates',1000,'g',250,100],['Lechuga',2,'unidades',1,100],['Aceitunas',300,'g',100,120],['Morrones',500,'g',250,110],['Papas pay',350,'g',175,220],['Pepinillos',300,'g',100,150],['Cebolla crispy',150,'g',75,90],['Limones',500,'g',250,70],['Orégano',1,'sobre',1,20]]],
  ['Tortas fritas', [['Dulce de leche',750,'g',250,205],['Azúcar',500,'g',250,25]]],
];
export const initial: Snapshot = {
  configuracion: {fecha:'', ubicacion:'Playa a confirmar', horario:'Después del almuerzo', merienda:'17:00', cena:'21:00', personas:'20', presupuestoMin:'200', presupuestoMax:'500', modificaciones:'true'},
  invitados: names.map((nombre, n) => ({id:`g${n+1}`, nombre, activo:true})),
  ingredientes: groups.flatMap(([categoria, entries]) => entries.map(([nombre,cantidadRequerida,unidad,incremento,precioTotal]) => ({id: nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll(' ','-'), nombre,categoria,cantidadRequerida,unidad,incremento,precioTotal,activo:true,comprometida:0,disponible:cantidadRequerida,aportantes:[]}))),
  selecciones: [], resumen: {porcentaje:0, pendientes:23, completos:0, confirmados:0, presupuesto:3935},
};
