import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import {
  dividirEnPaquetes,
  siguienteEstado,
  resumirPaquetes,
  validarNuevoPedido,
  validarTransicion,
  estadosPaquete,
} from '../src/dominio/pedidos.js';

// Se prueban límites y reglas, sin copiar el algoritmo de implementación.
prueba('divide cantidades pequeñas, exactas y con resto sin perder unidades', () => {
  for (const [cantidad, esperado] of [
    [1, [1]],
    [99, [99]],
    [100, [100]],
    [101, [100, 1]],
    [250, [100, 100, 50]],
  ] as const) {
    verificar.deepEqual(dividirEnPaquetes(cantidad), esperado);
  }
  const maximo = dividirEnPaquetes(100000);
  verificar.equal(maximo.length, 1000);
  verificar.equal(
    maximo.reduce((suma, unidades) => suma + unidades, 0),
    100000,
  );
});
prueba('rechaza cantidades vacías, texto, booleanos, decimales y fuera de rango', () => {
  for (const cantidad of [undefined, null, '250', true, 0, -1, 1.5, NaN, Infinity, 100001])
    verificar.throws(() => dividirEnPaquetes(cantidad));
});
prueba('el avance de 50 unidades listas sobre 250 es 20%, no un tercio', () => {
  const resumen = resumirPaquetes([
    { unidades: 100, estado: 'pendiente' },
    { unidades: 100, estado: 'revision' },
    { unidades: 50, estado: 'listo' },
  ]);
  verificar.equal(resumen.avance, 20);
  verificar.equal(resumen.unidadesListas, 50);
  verificar.deepEqual(resumen.conteos, { pendiente: 1, en_proceso: 0, revision: 1, listo: 1 });
  verificar.equal(resumen.estado, 'en_curso');
});
prueba('distingue pedidos totalmente pendientes y completados', () => {
  verificar.equal(resumirPaquetes([{ unidades: 1, estado: 'pendiente' }]).estado, 'pendiente');
  const completado = resumirPaquetes([
    { unidades: 100, estado: 'listo' },
    { unidades: 50, estado: 'listo' },
  ]);
  verificar.equal(completado.estado, 'completado');
  verificar.equal(completado.avance, 100);
});
prueba('avanza secuencialmente y no permite salir de Listo', () => {
  verificar.equal(siguienteEstado('pendiente', 'avanzar'), 'en_proceso');
  verificar.equal(siguienteEstado('en_proceso', 'avanzar'), 'revision');
  verificar.equal(siguienteEstado('revision', 'avanzar'), 'listo');
  verificar.throws(() => siguienteEstado('listo', 'avanzar'));
});
prueba('rechazar solo es válido desde Revisión', () => {
  for (const estado of estadosPaquete) {
    if (estado === 'revision') verificar.equal(siguienteEstado(estado, 'rechazar'), 'en_proceso');
    else verificar.throws(() => siguienteEstado(estado, 'rechazar'));
  }
});
prueba('normaliza número y cliente y descarta estados impuestos por el cliente', () => {
  const datos = validarNuevoPedido({
    numero: ' ped-a ',
    cliente: ' Cliente ',
    cantidad: 1,
    estado: 'listo',
  });
  verificar.equal(datos.numero, 'PED-A');
  verificar.equal(datos.cliente, 'Cliente');
  for (const campos of [
    { numero: ' ', cliente: 'Cliente', cantidad: 1 },
    { numero: 'A', cliente: ' ', cantidad: 1 },
    { numero: 'A'.repeat(51), cliente: 'C', cantidad: 1 },
  ])
    verificar.throws(() => validarNuevoPedido(campos));
});
prueba('transiciones rechazan estados, acciones, versiones y motivos mal formados', () => {
  const valida = {
    accion: 'rechazar',
    estadoActual: 'revision',
    versionActual: 2,
    motivo: ' Acabado ',
  };
  verificar.equal(validarTransicion(valida).motivo, 'Acabado');
  for (const invalida of [
    { ...valida, accion: 'saltar' },
    { ...valida, estadoActual: 'otro' },
    { ...valida, versionActual: -1 },
    { ...valida, versionActual: 1.5 },
    { ...valida, motivo: 'a'.repeat(301) },
  ])
    verificar.throws(() => validarTransicion(invalida));
});
