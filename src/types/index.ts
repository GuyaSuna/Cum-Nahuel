export interface Guest { id: string; nombre: string; activo: boolean }
export interface Item { id: string; nombre: string; categoria: string; cantidadRequerida: number; unidad: string; incremento: number; precioTotal: number; activo: boolean; comprometida: number; disponible: number; aportantes: {nombre: string; cantidad: number; invitadoId: string}[] }
export interface Line { ingredienteId: string; cantidad: number }
export interface Selection { id: string; invitadoId: string; ingredientes: Line[]; estado: string; fechaCreacion: string; fechaActualizacion: string }
export interface Config { fecha: string; ubicacion: string; horario: string; merienda: string; cena: string; personas: string; presupuestoMin: string; presupuestoMax: string; modificaciones: string }
export interface Snapshot { configuracion: Config; invitados: Guest[]; ingredientes: Item[]; selecciones: Selection[]; resumen: {porcentaje: number; pendientes: number; completos: number; confirmados: number; presupuesto: number} }
export interface Session { token: string; expiresAt: number; role: 'guest' | 'admin'; guest?: Guest }
