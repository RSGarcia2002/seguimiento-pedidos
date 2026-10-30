import { ErrorNegocio } from '../dominio/pedidos.js';

/** La versión del documento protege ediciones y eliminaciones frente a cualquier movimiento. */
export function validarVersionPedido(datos: unknown): number {
  const version =
    datos && typeof datos === 'object' && 'versionPedidoActual' in datos
      ? datos.versionPedidoActual
      : undefined;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0)
    throw new ErrorNegocio(400, 'VERSION_INVALIDA', 'La versión del pedido no es válida.');
  return version;
}

/** Conserva compatibilidad con pedidos guardados antes de incorporar la versión del documento. */
export function filtroVersionPedido(version: number) {
  return version === 0
    ? { $or: [{ versionPedido: 0 }, { versionPedido: { $exists: false } }] }
    : { versionPedido: version };
}

export function conflictoPedido(): never {
  throw new ErrorNegocio(
    409,
    'PEDIDO_ACTUALIZADO',
    'El pedido cambió desde tu última consulta. Actualiza y revisa sus datos antes de reintentar.',
  );
}
