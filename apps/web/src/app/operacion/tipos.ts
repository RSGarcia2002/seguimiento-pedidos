export type TipoAlerta = 'revision_demorada' | 'pedido_inactivo' | 'rechazos_repetidos';
export interface AlertaOperativa {
  id: string;
  tipo: TipoAlerta;
  prioridad: 'alta' | 'media';
  titulo: string;
  detalle: string;
  pedidoId: string;
  pedidoNumero: string;
  cliente: string;
  paqueteId: string | null;
  paqueteNumero: number | null;
  horasSinMovimiento: number;
  rechazos: number;
  ultimaActividad: string;
  accionSugerida: string;
}
export interface ListadoAlertas {
  fechaConsulta: string;
  umbrales: { revisionHoras: number; inactividadHoras: number; rechazosMinimos: number };
  resumen: {
    total: number;
    revisionDemorada: number;
    pedidosInactivos: number;
    rechazosRepetidos: number;
  };
  alertas: AlertaOperativa[];
  totalFiltrado: number;
  iaDisponible: boolean;
}
export interface AnalisisOperacion {
  modo: 'reglas' | 'ia';
  proveedor: string | null;
  motivoProveedor: string;
  fechaGeneracion: string;
  resumen: string;
  prioridades: { alerta: AlertaOperativa; explicacion: string }[];
  metricas: {
    dias: number;
    pedidosPeriodo: number;
    unidadesTerminadas: number;
    avanceCartera: number;
    alertasActivas: number;
  };
}
