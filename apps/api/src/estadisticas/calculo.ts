import { estadosPaquete, resumirPaquetes, type EstadoPaquete } from '../dominio/pedidos.js';

export interface PedidoEstadistico {
  cliente: string;
  cantidad: number;
  fechaCreacion: Date;
  paquetes: {
    unidades: number;
    estado: EstadoPaquete;
    historial: { fecha: Date; origen: EstadoPaquete; destino: EstadoPaquete }[];
  }[];
}

/** Convierte un instante en día de Guatemala sin depender de la zona horaria del servidor. */
export function fechaGuatemala(fecha: Date) {
  return new Date(fecha.getTime() - 6 * 3600000).toISOString().slice(0, 10);
}

/** El intervalo incluye días calendario completos previos y el día actual hasta ahora. */
export function inicioPeriodo(dias: number, hasta: Date) {
  return new Date(Date.parse(fechaGuatemala(hasta) + 'T00:00:00-06:00') - (dias - 1) * 86400000);
}

/** Separa la cartera recibida de los movimientos: no mezcla cohortes con producción diaria. */
export function calcularEstadisticas(pedidos: PedidoEstadistico[], dias: number, hasta: Date) {
  const desde = inicioPeriodo(dias, hasta);
  const enPeriodo = (fecha: Date) => fecha >= desde && fecha <= hasta;
  const serieDiaria = Array.from({ length: dias }, (_, indice) => ({
    fecha: fechaGuatemala(new Date(desde.getTime() + indice * 86400000)),
    pedidos: 0,
    unidadesRecibidas: 0,
    unidadesTerminadas: 0,
  }));
  const porFecha = new Map(serieDiaria.map((dia) => [dia.fecha, dia]));
  const cartera = {
    pedidos: 0,
    unidades: 0,
    unidadesListas: 0,
    avance: 0,
    completados: 0,
    enCurso: 0,
    pendientes: 0,
  };
  const actividad = {
    unidadesTerminadas: 0,
    paquetesTerminados: 0,
    revisiones: 0,
    rechazos: 0,
    tasaRechazo: 0,
    tiempoMedioHoras: null as number | null,
  };
  const distribucion = estadosPaquete.map((estado) => ({ estado, paquetes: 0, unidades: 0 }));
  const porCliente = new Map<
    string,
    { cliente: string; pedidos: number; unidades: number; unidadesListas: number; avance: number }
  >();
  let totalHoras = 0;
  let muestraHoras = 0;
  for (const pedido of pedidos) {
    if (enPeriodo(pedido.fechaCreacion)) {
      const resumen = resumirPaquetes(pedido.paquetes);
      cartera.pedidos++;
      cartera.unidades += pedido.cantidad;
      cartera.unidadesListas += resumen.unidadesListas;
      if (resumen.estado === 'completado') cartera.completados++;
      else if (resumen.estado === 'en_curso') cartera.enCurso++;
      else cartera.pendientes++;
      const dia = porFecha.get(fechaGuatemala(pedido.fechaCreacion))!;
      dia.pedidos++;
      dia.unidadesRecibidas += pedido.cantidad;
      const cliente = porCliente.get(pedido.cliente) ?? {
        cliente: pedido.cliente,
        pedidos: 0,
        unidades: 0,
        unidadesListas: 0,
        avance: 0,
      };
      cliente.pedidos++;
      cliente.unidades += pedido.cantidad;
      cliente.unidadesListas += resumen.unidadesListas;
      porCliente.set(pedido.cliente, cliente);
      for (const paquete of pedido.paquetes) {
        const estado = distribucion.find((elemento) => elemento.estado === paquete.estado)!;
        estado.paquetes++;
        estado.unidades += paquete.unidades;
      }
    }
    for (const paquete of pedido.paquetes) {
      const inicio = paquete.historial.find((evento) => evento.destino === 'en_proceso');
      for (const evento of paquete.historial) {
        if (!enPeriodo(evento.fecha)) continue;
        if (
          evento.origen === 'revision' &&
          (evento.destino === 'listo' || evento.destino === 'en_proceso')
        )
          actividad.revisiones++;
        if (evento.origen === 'revision' && evento.destino === 'en_proceso') actividad.rechazos++;
        if (evento.destino === 'listo') {
          actividad.unidadesTerminadas += paquete.unidades;
          actividad.paquetesTerminados++;
          porFecha.get(fechaGuatemala(evento.fecha))!.unidadesTerminadas += paquete.unidades;
          if (inicio && inicio.fecha <= evento.fecha) {
            totalHoras += (evento.fecha.getTime() - inicio.fecha.getTime()) / 3600000;
            muestraHoras++;
          }
        }
      }
    }
  }
  const porcentaje = (parte: number, total: number) =>
    total ? Math.round((parte / total) * 1000) / 10 : 0;
  cartera.avance = porcentaje(cartera.unidadesListas, cartera.unidades);
  actividad.tasaRechazo = porcentaje(actividad.rechazos, actividad.revisiones);
  actividad.tiempoMedioHoras = muestraHoras
    ? Math.round((totalHoras / muestraHoras) * 10) / 10
    : null;
  const clientes = [...porCliente.values()]
    .map((cliente) => ({
      ...cliente,
      avance: porcentaje(cliente.unidadesListas, cliente.unidades),
    }))
    .sort((a, b) => b.unidades - a.unidades || a.cliente.localeCompare(b.cliente))
    .slice(0, 8);
  return {
    periodo: { dias, desde, hasta, zonaHoraria: 'America/Guatemala' },
    cartera,
    actividad,
    distribucion,
    clientes,
    serieDiaria,
  };
}
