import type { EstadoPaquete } from '../pedidos/tipos';

/** Cartera y actividad tienen alcances distintos; el contrato los mantiene separados. */
export interface Estadisticas {
  periodo: { dias: number; desde: string; hasta: string; zonaHoraria: string };
  cartera: {
    pedidos: number;
    unidades: number;
    unidadesListas: number;
    avance: number;
    completados: number;
    enCurso: number;
    pendientes: number;
  };
  actividad: {
    unidadesTerminadas: number;
    paquetesTerminados: number;
    revisiones: number;
    rechazos: number;
    tasaRechazo: number;
    tiempoMedioHoras: number | null;
  };
  distribucion: { estado: EstadoPaquete; paquetes: number; unidades: number }[];
  clientes: {
    cliente: string;
    pedidos: number;
    unidades: number;
    unidadesListas: number;
    avance: number;
  }[];
  serieDiaria: {
    fecha: string;
    pedidos: number;
    unidadesRecibidas: number;
    unidadesTerminadas: number;
  }[];
}
