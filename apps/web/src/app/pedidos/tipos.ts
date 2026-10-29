/** Contrato público de la API; los identificadores se reciben como cadenas. */
export type EstadoPaquete = 'pendiente' | 'en_proceso' | 'revision' | 'listo';
export type EstadoPedido = 'pendiente' | 'en_curso' | 'completado';
export interface EventoPaquete {
  fecha: string;
  origen: EstadoPaquete;
  destino: EstadoPaquete;
  motivo: string;
}
export interface Paquete {
  id: string;
  numero: number;
  unidades: number;
  estado: EstadoPaquete;
  version: number;
  historial: EventoPaquete[];
}
export interface ResumenPedido {
  origenDatos?: 'manual' | 'sintetico';
  id: string;
  numero: string;
  cliente: string;
  cantidad: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  totalPaquetes: number;
  unidadesListas: number;
  avance: number;
  conteos: Record<EstadoPaquete, number>;
  estado: EstadoPedido;
}
export interface Pedido extends ResumenPedido {
  paquetes: Paquete[];
}
export interface ResumenGlobal {
  pedidos: number;
  enCurso: number;
  completados: number;
  unidades: number;
  unidadesListas: number;
}
export interface ListadoPedidos {
  clientesDisponibles?: string[];
  pedidos: ResumenPedido[];
  total: number;
  pagina: number;
  totalPaginas: number;
  resumen: ResumenGlobal;
}
export interface NuevoPedido {
  numero: string;
  cliente: string;
  cantidad: number | null;
}
export const etiquetasEstado: Record<EstadoPaquete | EstadoPedido, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  revision: 'Revisión',
  listo: 'Listo',
  en_curso: 'En curso',
  completado: 'Completado',
};
