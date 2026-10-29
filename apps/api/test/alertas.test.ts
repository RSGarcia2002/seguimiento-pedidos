import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import { calcularAlertas, type PedidoOperativo } from '../src/operacion/alertas.js';
import { validarFechaFiltro } from '../src/pedidos/filtros.js';
import { crearAnalizador } from '../src/operacion/analisis.js';
import { validarTextoAnalisis } from '../src/operacion/proveedor-gemini.js';

const ahora = new Date('2026-10-29T18:00:00Z');
function pedido(horas: number): PedidoOperativo {
  const fecha = new Date(ahora.getTime() - horas * 3600000);
  return {
    _id: 'pedido',
    numero: 'P-1',
    cliente: 'Cliente',
    cantidad: 50,
    fechaCreacion: fecha,
    fechaActualizacion: fecha,
    paquetes: [
      {
        _id: 'paquete',
        numero: 1,
        unidades: 50,
        estado: 'revision',
        historial: [{ fecha, origen: 'en_proceso', destino: 'revision' }],
      },
    ],
  };
}
prueba('la revisión se alerta desde 72h exactas y no antes', () => {
  verificar.equal(calcularAlertas([pedido(71.99)], ahora).resumen.revisionDemorada, 0);
  verificar.equal(calcularAlertas([pedido(72)], ahora).resumen.revisionDemorada, 1);
});
prueba('la inactividad se alerta desde 120h y desaparece al completar el pedido', () => {
  const datos = pedido(120);
  verificar.equal(calcularAlertas([datos], ahora).resumen.pedidosInactivos, 1);
  datos.paquetes[0]!.estado = 'listo';
  verificar.equal(calcularAlertas([datos], ahora).resumen.total, 0);
});
prueba(
  'se usan fechas por paquete, sin ocultar revisiones antiguas por cambios en otro paquete',
  () => {
    const datos = pedido(80);
    datos.fechaActualizacion = ahora;
    const resultado = calcularAlertas([datos], ahora);
    verificar.equal(resultado.resumen.revisionDemorada, 1);
    verificar.equal(resultado.resumen.pedidosInactivos, 0);
  },
);
prueba('rechazos repetidos cuentan devoluciones reales y excluyen paquetes listos', () => {
  const datos = pedido(10);
  datos.paquetes[0]!.historial.push(
    ...[1, 2].map(() => ({
      fecha: ahora,
      origen: 'revision' as const,
      destino: 'en_proceso' as const,
    })),
  );
  datos.paquetes[0]!.estado = 'en_proceso';
  verificar.equal(calcularAlertas([datos], ahora).resumen.rechazosRepetidos, 1);
  datos.paquetes[0]!.estado = 'listo';
  verificar.equal(calcularAlertas([datos], ahora).resumen.total, 0);
});
prueba('las fechas del filtro son días válidos de Guatemala', () => {
  verificar.equal(validarFechaFiltro('2026-10-29')?.toISOString(), '2026-10-29T06:00:00.000Z');
  for (const fecha of ['2026-02-30', '2026-13-01', '29/10/2026', ['2026-10-29']])
    verificar.throws(() => validarFechaFiltro(fecha));
});
prueba('el resumen sin clave es explícitamente por reglas y no modifica los pedidos', async () => {
  const datos = [pedido(150)];
  const antes = JSON.stringify(datos);
  const respuesta = await crearAnalizador({})(datos, 7, ahora);
  verificar.equal(respuesta.modo, 'reglas');
  verificar.equal(respuesta.motivoProveedor, 'sin_configurar');
  verificar.ok(respuesta.prioridades.length > 0);
  verificar.equal(JSON.stringify(datos), antes);
});
prueba('se rechazan referencias inventadas, duplicadas y textos fuera del contrato', () => {
  const ids = new Set(['real']);
  for (const dato of [
    { resumen: '', prioridades: [] },
    { resumen: 'R', prioridades: [{ alertaId: 'inventado', explicacion: 'E' }] },
    {
      resumen: 'R',
      prioridades: [
        { alertaId: 'real', explicacion: 'E' },
        { alertaId: 'real', explicacion: 'E' },
      ],
    },
  ])
    verificar.throws(() => validarTextoAnalisis(dato, ids));
});
