import { Schema, model } from 'mongoose';
import { estadosPaquete, resumirPaquetes } from '../dominio/pedidos.js';

// El historial vive dentro del paquete: transición e historial se escriben juntos.
const esquemaEvento = new Schema(
  {
    fecha: { type: Date, required: true },
    origen: { type: String, enum: estadosPaquete, required: true },
    destino: { type: String, enum: estadosPaquete, required: true },
    motivo: { type: String, default: '', maxlength: 300 },
  },
  { _id: false },
);
const esquemaPaquete = new Schema({
  numero: { type: Number, required: true, min: 1 },
  unidades: { type: Number, required: true, min: 1, max: 100 },
  estado: { type: String, enum: estadosPaquete, default: 'pendiente', required: true },
  version: { type: Number, default: 0, required: true },
  historial: { type: [esquemaEvento], default: [] },
});
const esquemaPedido = new Schema(
  {
    numero: { type: String, required: true, unique: true, maxlength: 50 },
    cliente: { type: String, required: true, maxlength: 120 },
    cantidad: { type: Number, required: true, min: 1, max: 100000 },
    paquetes: { type: [esquemaPaquete], required: true },
    // Identifica datos de muestra sin modificar el comportamiento de pedidos manuales.
    origenDatos: { type: String, enum: ['manual', 'sintetico'], default: 'manual' },
    loteDatos: { type: String, maxlength: 80 },
    fechaLoteDatos: { type: Date },
  },
  {
    timestamps: { createdAt: 'fechaCreacion' as const, updatedAt: 'fechaActualizacion' as const },
    versionKey: false,
  },
);

// Las consultas del panel estadístico filtran por creación o por fecha de movimiento.
esquemaPedido.index({ fechaCreacion: -1 });
esquemaPedido.index({ 'paquetes.historial.fecha': -1 });

export const ModeloPedido = model('Pedido', esquemaPedido);
/** Representación mínima que acepta documentos Mongoose y resultados de agregación. */
export interface DatosPedido {
  _id: { toString(): string };
  numero: string;
  cliente: string;
  cantidad: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  origenDatos?: 'manual' | 'sintetico';
  paquetes: {
    _id: { toString(): string };
    numero: number;
    unidades: number;
    estado: (typeof estadosPaquete)[number];
    version: number;
    historial: {
      fecha: Date;
      origen: (typeof estadosPaquete)[number];
      destino: (typeof estadosPaquete)[number];
      motivo?: string;
    }[];
  }[];
}

/** Separa la representación pública de los detalles internos de Mongoose. */
export function presentarPedido(pedido: DatosPedido, incluirPaquetes = true) {
  const resumen = {
    id: pedido._id.toString(),
    numero: pedido.numero,
    cliente: pedido.cliente,
    cantidad: pedido.cantidad,
    origenDatos: pedido.origenDatos ?? 'manual',
    fechaCreacion: pedido.fechaCreacion,
    fechaActualizacion: pedido.fechaActualizacion,
    ...resumirPaquetes(pedido.paquetes),
  };
  if (!incluirPaquetes) return resumen;
  return {
    ...resumen,
    paquetes: pedido.paquetes.map((paquete) => ({
      id: paquete._id.toString(),
      numero: paquete.numero,
      unidades: paquete.unidades,
      estado: paquete.estado,
      version: paquete.version,
      historial: paquete.historial.map((evento) => ({
        fecha: evento.fecha,
        origen: evento.origen,
        destino: evento.destino,
        motivo: evento.motivo,
      })),
    })),
  };
}
