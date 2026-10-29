import { dividirEnPaquetes, type EstadoPaquete } from '../dominio/pedidos.js';

export const loteOperacion = 'operacion-sintetica-v1';
const clientes = [
  'Comercial Bruma',
  'Atelier Cobre',
  'Distribuidora Nébula',
  'Casa Oliva Textil',
  'Sierra Norte Accesorios',
  'Moda Litoral',
  'Grupo Altovento',
  'Estudio Trama',
];
const motivos = [
  'Ajustar tensión de costura',
  'Revisar uniformidad del acabado',
  'Corregir alineación de perforaciones',
  'Validar presentación del empaque',
  'Revisar medida y corte',
];

/** Genera una muestra determinista: no inventa clientes reales ni modifica datos existentes. */
export function generarOperacion(referencia: Date, cantidadPedidos = 96) {
  if (
    Number.isNaN(referencia.getTime()) ||
    !Number.isInteger(cantidadPedidos) ||
    cantidadPedidos < 2 ||
    cantidadPedidos > 200
  )
    throw new Error('Parámetros de generación inválidos.');
  const inicioHoy = new Date(referencia);
  inicioHoy.setUTCHours(6, 0, 0, 0); // Medianoche de Guatemala, sin horario de verano.
  if (inicioHoy > referencia) inicioHoy.setUTCDate(inicioHoy.getUTCDate() - 1);
  return Array.from({ length: cantidadPedidos }, (_, indice) => {
    const diasAtras = 89 - Math.floor((indice * 89) / (cantidadPedidos - 1));
    const fechaCreacion = new Date(
      Math.min(
        inicioHoy.getTime() - diasAtras * 86400000 + (8 + (indice % 3)) * 3600000,
        referencia.getTime(),
      ),
    );
    const cantidad = 180 + ((indice * 137) % 2100);
    const completos = diasAtras > 12 ? indice % 5 !== 0 : diasAtras > 5 && indice % 3 === 0;
    const pendiente = diasAtras < 5 && indice % 4 === 0;
    const paquetes = dividirEnPaquetes(cantidad).map((unidades, posicion) => {
      const objetivo = completos
        ? 3
        : pendiente
          ? 0
          : diasAtras > 12
            ? 1 + ((indice + posicion) % 3)
            : (indice + posicion) % 4;
      const rechazado = objetivo > 0 && (indice * 7 + posicion) % 13 === 0;
      // Todo cambio reproduce la máquina de estados real; un rechazo siempre sale de Revisión.
      const recorrido: EstadoPaquete[] =
        objetivo === 0
          ? []
          : rechazado
            ? [
                'en_proceso',
                'revision',
                'en_proceso',
                ...(objetivo >= 2 ? ['revision' as const] : []),
                ...(objetivo === 3 ? ['listo' as const] : []),
              ]
            : [
                'en_proceso',
                ...(objetivo >= 2 ? ['revision' as const] : []),
                ...(objetivo === 3 ? ['listo' as const] : []),
              ];
      let instante = fechaCreacion.getTime() + (posicion % 5) * 1800000;
      let estado: EstadoPaquete = 'pendiente';
      const historial: {
        fecha: Date;
        origen: EstadoPaquete;
        destino: EstadoPaquete;
        motivo: string;
      }[] = [];
      for (const [paso, destino] of recorrido.entries()) {
        // Duraciones de calendario variadas; nunca se incluyen movimientos futuros.
        instante +=
          (paso === 0 ? 2 + (indice % 5) : 4 + ((indice + posicion + paso) % 15)) * 3600000;
        if (instante > referencia.getTime()) break;
        historial.push({
          fecha: new Date(instante),
          origen: estado,
          destino,
          motivo:
            estado === 'revision' && destino === 'en_proceso'
              ? motivos[(indice + posicion) % motivos.length]!
              : '',
        });
        estado = destino;
      }
      return { numero: posicion + 1, unidades, estado, version: historial.length, historial };
    });
    const ultimaFecha = Math.max(
      fechaCreacion.getTime(),
      ...paquetes.flatMap((paquete) => paquete.historial.map((evento) => evento.fecha.getTime())),
    );
    return {
      numero: `TAT-${referencia.getUTCFullYear()}-${String(1001 + indice)}`,
      cliente: clientes[(indice * 3 + Math.floor(indice / 8)) % clientes.length]!,
      cantidad,
      origenDatos: 'sintetico' as const,
      loteDatos: loteOperacion,
      fechaLoteDatos: referencia,
      fechaCreacion,
      fechaActualizacion: new Date(ultimaFecha),
      paquetes,
    };
  });
}
