import { Schema, model, type InferSchemaType } from 'mongoose';
import { estadosPaquete, resumirPaquetes } from '../dominio/pedidos.js';

// El historial vive dentro del paquete: transición e historial se escriben juntos.
const esquemaEvento = new Schema({
  fecha: { type: Date, required: true },
  origen: { type: String, enum: estadosPaquete, required: true },
  destino: { type: String, enum: estadosPaquete, required: true },
  motivo: { type: String, default: '', maxlength: 300 },
}, { _id: false });
const esquemaPaquete = new Schema({
  numero: { type: Number, required: true, min: 1 },
  unidades: { type: Number, required: true, min: 1, max: 100 },
  estado: { type: String, enum: estadosPaquete, default: 'pendiente', required: true },
  version: { type: Number, default: 0, required: true },
  historial: { type: [esquemaEvento], default: [] },
});
const esquemaPedido = new Schema({
  numero: { type: String, required: true, unique: true, maxlength: 50 },
  cliente: { type: String, required: true, maxlength: 120 },
  cantidad: { type: Number, required: true, min: 1, max: 100000 },
  paquetes: { type: [esquemaPaquete], required: true },
}, { timestamps: { createdAt: 'fechaCreacion' as const, updatedAt: 'fechaActualizacion' as const }, versionKey: false });

export const ModeloPedido = model('Pedido', esquemaPedido);
type DatosPedido = InferSchemaType<typeof esquemaPedido> & { _id: { toString(): string } };

/** Separa la representación pública de los detalles internos de Mongoose. */
export function presentarPedido(pedido: DatosPedido, incluirPaquetes = true) {
  const resumen = {
    id: pedido._id.toString(), numero: pedido.numero, cliente: pedido.cliente,
    cantidad: pedido.cantidad, fechaCreacion: pedido.fechaCreacion,
    fechaActualizacion: pedido.fechaActualizacion, ...resumirPaquetes(pedido.paquetes),
  };
  if (!incluirPaquetes) return resumen;
  return { ...resumen, paquetes: pedido.paquetes.map((paquete) => ({
    id: paquete._id.toString(), numero: paquete.numero, unidades: paquete.unidades,
    estado: paquete.estado, version: paquete.version,
    historial: paquete.historial.map((evento) => ({
      fecha: evento.fecha, origen: evento.origen, destino: evento.destino, motivo: evento.motivo,
    })),
  })) };
}
