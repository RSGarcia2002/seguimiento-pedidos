import { validarVersionPedido, filtroVersionPedido, conflictoPedido } from './edicion.js';
import { Router } from 'express';
import { isObjectIdOrHexString, type QueryFilter, type PipelineStage } from 'mongoose';
import { ErrorNegocio, validarNuevoPedido, validarTransicion } from '../dominio/pedidos.js';
import { ModeloPedido, presentarPedido, type DatosPedido } from './modelo.js';

import { validarFechaFiltro } from './filtros.js';

export const rutasPedidos = Router();

/** Rechaza identificadores mal formados antes de enviarlos al controlador MongoDB. */
function validarId(valor: unknown): string {
  if (typeof valor !== 'string' || !isObjectIdOrHexString(valor))
    throw new ErrorNegocio(400, 'ID_INVALIDO', 'El identificador no es válido.');
  return valor;
}

/** Parámetros de paginación estrictos: no se aceptan fracciones ni expresiones numéricas. */
function enteroConsulta(valor: unknown, predeterminado: number, maximo: number) {
  if (valor === undefined) return predeterminado;
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor) || Number(valor) > maximo)
    throw new ErrorNegocio(400, 'CONSULTA_INVALIDA', 'La paginación no es válida.');
  return Number(valor);
}

rutasPedidos.get('/', async (solicitud, respuesta) => {
  const pagina = enteroConsulta(solicitud.query['pagina'], 1, 1000000);
  const limite = enteroConsulta(solicitud.query['limite'], 12, 100);
  const busqueda = solicitud.query['busqueda'] ?? '';
  const estado = solicitud.query['estado'] ?? 'todos';
  if (
    typeof busqueda !== 'string' ||
    busqueda.length > 80 ||
    typeof estado !== 'string' ||
    !['todos', 'pendiente', 'en_curso', 'completado'].includes(estado)
  )
    throw new ErrorNegocio(400, 'CONSULTA_INVALIDA', 'Los filtros no son válidos.');
  const filtro: QueryFilter<InstanceType<typeof ModeloPedido>> = {};
  const cliente = solicitud.query['cliente'] ?? '';
  const orden = solicitud.query['orden'] ?? 'recientes';
  if (
    typeof cliente !== 'string' ||
    cliente.length > 120 ||
    typeof orden !== 'string' ||
    !['recientes', 'antiguos', 'menor_avance', 'sin_movimiento'].includes(orden)
  )
    throw new ErrorNegocio(400, 'CONSULTA_INVALIDA', 'Cliente u orden no válidos.');
  if (cliente.trim()) filtro.cliente = cliente.trim();
  const desde = validarFechaFiltro(solicitud.query['desde']);
  const hasta = validarFechaFiltro(solicitud.query['hasta']);
  if (desde && hasta && desde > hasta)
    throw new ErrorNegocio(
      400,
      'FECHAS_INVERTIDAS',
      'La fecha inicial debe ser anterior o igual a la final.',
    );
  if (desde || hasta)
    filtro.fechaCreacion = {
      ...(desde ? { $gte: desde } : {}),
      ...(hasta ? { $lt: new Date(hasta.getTime() + 86400000) } : {}),
    };
  if (busqueda.trim()) {
    // Se escapan metacaracteres para que la búsqueda sea literal y no una expresión arbitraria.
    const literal = busqueda.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filtro.$or = [
      { numero: { $regex: literal, $options: 'i' } },
      { cliente: { $regex: literal, $options: 'i' } },
    ];
  }
  if (estado === 'pendiente')
    filtro.paquetes = { $not: { $elemMatch: { estado: { $ne: 'pendiente' } } } };
  if (estado === 'completado')
    filtro.paquetes = { $not: { $elemMatch: { estado: { $ne: 'listo' } } } };
  if (estado === 'en_curso')
    filtro.$and = [
      { paquetes: { $elemMatch: { estado: { $ne: 'pendiente' } } } },
      { paquetes: { $elemMatch: { estado: { $ne: 'listo' } } } },
    ];
  // El avance se calcula antes de paginar para ordenar todo el conjunto filtrado.
  const etapas: PipelineStage[] = [{ $match: filtro }];
  if (orden === 'menor_avance')
    etapas.push({
      $addFields: {
        avanceOrden: {
          $divide: [
            {
              $sum: {
                $map: {
                  input: '$paquetes',
                  as: 'paquete',
                  in: { $cond: [{ $eq: ['$$paquete.estado', 'listo'] }, '$$paquete.unidades', 0] },
                },
              },
            },
            '$cantidad',
          ],
        },
      },
    });
  const ordenacion: Record<string, 1 | -1> =
    orden === 'antiguos'
      ? { fechaCreacion: 1, _id: 1 }
      : orden === 'menor_avance'
        ? { avanceOrden: 1, fechaCreacion: 1, _id: 1 }
        : orden === 'sin_movimiento'
          ? { fechaActualizacion: 1, _id: 1 }
          : { fechaCreacion: -1, _id: -1 };
  etapas.push({ $sort: ordenacion }, { $skip: (pagina - 1) * limite }, { $limit: limite });
  const [pedidos, total, resumenes, clientesDisponibles] = await Promise.all([
    ModeloPedido.aggregate<DatosPedido>(etapas),
    ModeloPedido.countDocuments(filtro),
    // El resumen abarca todos los pedidos, independientemente de los filtros del listado.
    ModeloPedido.aggregate([
      {
        $project: {
          cantidad: 1,
          pendientes: {
            $size: {
              $filter: {
                input: '$paquetes',
                as: 'paquete',
                cond: { $eq: ['$$paquete.estado', 'pendiente'] },
              },
            },
          },
          listos: {
            $size: {
              $filter: {
                input: '$paquetes',
                as: 'paquete',
                cond: { $eq: ['$$paquete.estado', 'listo'] },
              },
            },
          },
          total: { $size: '$paquetes' },
          unidadesListas: {
            $sum: {
              $map: {
                input: '$paquetes',
                as: 'paquete',
                in: { $cond: [{ $eq: ['$$paquete.estado', 'listo'] }, '$$paquete.unidades', 0] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          pedidos: { $sum: 1 },
          completados: { $sum: { $cond: [{ $eq: ['$listos', '$total'] }, 1, 0] } },
          enCurso: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$listos', '$total'] }, { $ne: ['$pendientes', '$total'] }] },
                1,
                0,
              ],
            },
          },
          unidades: { $sum: '$cantidad' },
          unidadesListas: { $sum: '$unidadesListas' },
        },
      },
      { $project: { _id: 0 } },
    ]),
    ModeloPedido.distinct('cliente'),
  ]);
  respuesta.json({
    pedidos: pedidos.map((pedido) => presentarPedido(pedido, false)),
    total,
    pagina,
    totalPaginas: Math.ceil(total / limite),
    clientesDisponibles: clientesDisponibles.sort((a, b) => a.localeCompare(b)),
    resumen: resumenes[0] ?? {
      pedidos: 0,
      completados: 0,
      enCurso: 0,
      unidades: 0,
      unidadesListas: 0,
    },
  });
});

rutasPedidos.post('/', async (solicitud, respuesta) => {
  const datos = validarNuevoPedido(solicitud.body);
  // Una sola inserción conserva el pedido y todos sus paquetes como unidad atómica.
  const pedido = await ModeloPedido.create({
    numero: datos.numero,
    cliente: datos.cliente,
    cantidad: datos.cantidad,
    paquetes: datos.unidades.map((unidades, indice) => ({
      numero: indice + 1,
      unidades,
      estado: 'pendiente',
      version: 0,
    })),
  });
  respuesta.status(201).json(presentarPedido(pedido));
});

rutasPedidos.get('/:id', async (solicitud, respuesta) => {
  const pedido = await ModeloPedido.findById(validarId(solicitud.params['id']));
  if (!pedido) throw new ErrorNegocio(404, 'PEDIDO_NO_ENCONTRADO', 'No se encontró el pedido.');
  respuesta.json(presentarPedido(pedido));
});

/** Edita únicamente campos comerciales; los paquetes solo se regeneran antes del primer movimiento. */
rutasPedidos.put('/:id', async (solicitud, respuesta) => {
  const id = validarId(solicitud.params['id']);
  const version = validarVersionPedido(solicitud.body);
  const datos = validarNuevoPedido(solicitud.body);
  const actual = await ModeloPedido.findById(id);
  if (!actual) throw new ErrorNegocio(404, 'PEDIDO_NO_ENCONTRADO', 'No se encontró el pedido.');
  if ((actual.versionPedido ?? 0) !== version) conflictoPedido();
  const cambiaCantidad = datos.cantidad !== actual.cantidad;
  if (
    cambiaCantidad &&
    actual.paquetes.some(
      (paquete) =>
        paquete.estado !== 'pendiente' || paquete.version !== 0 || paquete.historial.length > 0,
    )
  )
    throw new ErrorNegocio(
      409,
      'CANTIDAD_BLOQUEADA',
      'La cantidad solo puede cambiar antes de iniciar la producción. Puedes corregir el número y el cliente.',
    );
  const pedido = await ModeloPedido.findOneAndUpdate(
    { _id: id, ...filtroVersionPedido(version) },
    {
      $set: {
        numero: datos.numero,
        cliente: datos.cliente,
        cantidad: datos.cantidad,
        ...(cambiaCantidad
          ? {
              paquetes: datos.unidades.map((unidades, indice) => ({
                numero: indice + 1,
                unidades,
                estado: 'pendiente',
                version: 0,
                historial: [],
              })),
            }
          : {}),
      },
      $inc: { versionPedido: 1 },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!pedido) conflictoPedido();
  respuesta.json(presentarPedido(pedido));
});

/** La confirmación textual evita una eliminación involuntaria; la versión evita borrar cambios nuevos. */
rutasPedidos.delete('/:id', async (solicitud, respuesta) => {
  const id = validarId(solicitud.params['id']);
  const version = validarVersionPedido(solicitud.body);
  const confirmacion: unknown = solicitud.body?.numeroConfirmacion;
  if (typeof confirmacion !== 'string' || !confirmacion.trim() || confirmacion.length > 50)
    throw new ErrorNegocio(
      400,
      'CONFIRMACION_INVALIDA',
      'Escribe el número exacto del pedido para confirmar la eliminación.',
    );
  const actual = await ModeloPedido.findById(id);
  if (!actual) throw new ErrorNegocio(404, 'PEDIDO_NO_ENCONTRADO', 'No se encontró el pedido.');
  if ((actual.versionPedido ?? 0) !== version) conflictoPedido();
  if (confirmacion.trim() !== actual.numero)
    throw new ErrorNegocio(
      400,
      'CONFIRMACION_INVALIDA',
      'El número de confirmación no coincide con el pedido.',
    );
  const resultado = await ModeloPedido.deleteOne({
    _id: id,
    numero: actual.numero,
    ...filtroVersionPedido(version),
  });
  if (!resultado.deletedCount) conflictoPedido();
  respuesta.status(204).end();
});

rutasPedidos.post('/:id/paquetes/:paqueteId/transiciones', async (solicitud, respuesta) => {
  const id = validarId(solicitud.params['id']);
  const paqueteId = validarId(solicitud.params['paqueteId']);
  const transicion = validarTransicion(solicitud.body);
  // Estado y versión se comparan dentro de la escritura; dos clics no pueden avanzar dos veces.
  const pedido = await ModeloPedido.findOneAndUpdate(
    {
      _id: id,
      paquetes: {
        $elemMatch: {
          _id: paqueteId,
          estado: transicion.estadoActual,
          version: transicion.versionActual,
        },
      },
    },
    {
      $set: { 'paquetes.$.estado': transicion.destino },
      $inc: { 'paquetes.$.version': 1, versionPedido: 1 },
      $push: {
        'paquetes.$.historial': {
          fecha: new Date(),
          origen: transicion.estadoActual,
          destino: transicion.destino,
          motivo: transicion.motivo,
        },
      },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!pedido) {
    const existe = await ModeloPedido.exists({ _id: id, 'paquetes._id': paqueteId });
    if (!existe)
      throw new ErrorNegocio(404, 'PAQUETE_NO_ENCONTRADO', 'No se encontró el pedido o paquete.');
    throw new ErrorNegocio(
      409,
      'PAQUETE_ACTUALIZADO',
      'El paquete cambió desde tu última consulta. Actualiza e inténtalo de nuevo.',
    );
  }
  respuesta.json(presentarPedido(pedido));
});
