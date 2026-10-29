import { ErrorNegocio } from '../dominio/pedidos.js';

/** Valida fechas civiles sin aceptar las correcciones automáticas de Date (por ejemplo 30/02). */
export function validarFechaFiltro(valor: unknown): Date | undefined {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor))
    throw new ErrorNegocio(400, 'FECHA_INVALIDA', 'Usa fechas con formato año-mes-día.');
  const fecha = new Date(`${valor}T00:00:00-06:00`);
  if (
    Number.isNaN(fecha.getTime()) ||
    new Date(fecha.getTime() - 6 * 3600000).toISOString().slice(0, 10) !== valor
  )
    throw new ErrorNegocio(400, 'FECHA_INVALIDA', 'La fecha indicada no existe.');
  return fecha;
}
