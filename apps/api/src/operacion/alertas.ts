import { resumirPaquetes, type EstadoPaquete } from '../dominio/pedidos.js';

export const umbralesSeguimiento = { revisionHoras: 72, inactividadHoras: 120, rechazosMinimos: 2 };
export type TipoAlerta = 'revision_demorada' | 'pedido_inactivo' | 'rechazos_repetidos';
export interface PedidoOperativo {
  _id: { toString(): string };
  numero: string;
  cliente: string;
  cantidad: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  paquetes: {
    _id: { toString(): string };
    numero: number;
    unidades: number;
    estado: EstadoPaquete;
    historial: { fecha: Date; origen: EstadoPaquete; destino: EstadoPaquete }[];
  }[];
}
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
  ultimaActividad: Date;
  accionSugerida: string;
}

/** Los umbrales orientan el seguimiento; no afirman atrasos frente a una fecha prometida. */
export function calcularAlertas(pedidos: PedidoOperativo[], ahora: Date) {
  const alertas: AlertaOperativa[] = [];
  const horas = (fecha: Date) => Math.max(0, (ahora.getTime() - fecha.getTime()) / 3600000);
  for (const pedido of pedidos) {
    if (resumirPaquetes(pedido.paquetes).estado === 'completado') continue;
    const pedidoId = pedido._id.toString();
    const base = { pedidoId, pedidoNumero: pedido.numero, cliente: pedido.cliente };
    const inactividad = horas(pedido.fechaActualizacion);
    if (inactividad >= umbralesSeguimiento.inactividadHoras)
      alertas.push({
        ...base,
        id: `${pedidoId}:inactividad`,
        tipo: 'pedido_inactivo',
        prioridad: 'media',
        titulo: 'Pedido sin movimiento',
        detalle: `Sin actividad registrada durante ${Math.floor(inactividad / 24)} días.`,
        paqueteId: null,
        paqueteNumero: null,
        horasSinMovimiento: Math.round(inactividad * 10) / 10,
        rechazos: 0,
        ultimaActividad: pedido.fechaActualizacion,
        accionSugerida:
          'Revisar la planificación del pedido y confirmar el siguiente paso con producción.',
      });
    for (const paquete of pedido.paquetes) {
      if (paquete.estado === 'listo') continue;
      const ultimaActividad = paquete.historial.at(-1)?.fecha ?? pedido.fechaCreacion;
      const horasSinMovimiento = horas(ultimaActividad);
      const rechazos = paquete.historial.filter(
        (evento) => evento.origen === 'revision' && evento.destino === 'en_proceso',
      ).length;
      const basePaquete = {
        ...base,
        paqueteId: paquete._id.toString(),
        paqueteNumero: paquete.numero,
        horasSinMovimiento: Math.round(horasSinMovimiento * 10) / 10,
        rechazos,
        ultimaActividad,
      };
      if (paquete.estado === 'revision' && horasSinMovimiento >= umbralesSeguimiento.revisionHoras)
        alertas.push({
          ...basePaquete,
          id: `${pedidoId}:${paquete._id}:revision`,
          tipo: 'revision_demorada',
          prioridad: 'alta',
          titulo: 'Revisión requiere seguimiento',
          detalle: `El paquete lleva ${Math.floor(horasSinMovimiento / 24)} días en Revisión.`,
          accionSugerida:
            'Consultar a control de calidad y resolver la revisión antes de avanzar el paquete.',
        });
      if (rechazos >= umbralesSeguimiento.rechazosMinimos)
        alertas.push({
          ...basePaquete,
          id: `${pedidoId}:${paquete._id}:rechazos`,
          tipo: 'rechazos_repetidos',
          prioridad: 'alta',
          titulo: 'Rechazos repetidos',
          detalle: `El paquete registra ${rechazos} devoluciones a producción y sigue abierto.`,
          accionSugerida:
            'Revisar los motivos registrados y corregir la causa antes de una nueva inspección.',
        });
    }
  }
  alertas.sort(
    (a, b) =>
      (a.prioridad === b.prioridad ? 0 : a.prioridad === 'alta' ? -1 : 1) ||
      b.horasSinMovimiento - a.horasSinMovimiento ||
      a.id.localeCompare(b.id),
  );
  const resumen = {
    total: alertas.length,
    revisionDemorada: 0,
    pedidosInactivos: 0,
    rechazosRepetidos: 0,
  };
  for (const alerta of alertas) {
    if (alerta.tipo === 'revision_demorada') resumen.revisionDemorada++;
    else if (alerta.tipo === 'pedido_inactivo') resumen.pedidosInactivos++;
    else resumen.rechazosRepetidos++;
  }
  return { fechaConsulta: ahora, umbrales: umbralesSeguimiento, resumen, alertas };
}
