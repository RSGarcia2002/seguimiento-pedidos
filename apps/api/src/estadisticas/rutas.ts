import { Router } from 'express';
import { ErrorNegocio } from '../dominio/pedidos.js';
import { ModeloPedido } from '../pedidos/modelo.js';
import { calcularEstadisticas, inicioPeriodo } from './calculo.js';

export const rutasEstadisticas = Router();
rutasEstadisticas.get('/', async (solicitud, respuesta) => {
  const valor = solicitud.query['dias'] ?? '30';
  if (typeof valor !== 'string' || !['7', '30', '90'].includes(valor))
    throw new ErrorNegocio(400, 'PERIODO_INVALIDO', 'Selecciona un período de 7, 30 o 90 días.');
  const dias = Number(valor);
  const hasta = new Date();
  const desde = inicioPeriodo(dias, hasta);
  // Incluye movimientos recientes de pedidos anteriores: no recorta la producción al origen del pedido.
  const pedidos = await ModeloPedido.find({
    $or: [
      { fechaCreacion: { $gte: desde, $lte: hasta } },
      { 'paquetes.historial': { $elemMatch: { fecha: { $gte: desde, $lte: hasta } } } },
    ],
  })
    .select('cliente cantidad fechaCreacion paquetes.unidades paquetes.estado paquetes.historial')
    .lean();
  respuesta.json(calcularEstadisticas(pedidos, dias, hasta));
});
