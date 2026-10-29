import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import {
  calcularEstadisticas,
  fechaGuatemala,
  inicioPeriodo,
  type PedidoEstadistico,
} from '../src/estadisticas/calculo.js';

const hasta = new Date('2026-10-29T18:00:00Z');
prueba('las fechas se calculan con medianoche de Guatemala, independiente del servidor', () => {
  verificar.equal(fechaGuatemala(new Date('2026-10-29T03:00:00Z')), '2026-10-28');
  verificar.equal(inicioPeriodo(7, hasta).toISOString(), '2026-10-23T06:00:00.000Z');
});
prueba('sin datos devuelve ceros y no inventa una duración de producción', () => {
  const datos = calcularEstadisticas([], 30, hasta);
  verificar.equal(datos.cartera.pedidos, 0);
  verificar.equal(datos.cartera.avance, 0);
  verificar.equal(datos.actividad.tasaRechazo, 0);
  verificar.equal(datos.actividad.tiempoMedioHoras, null);
  verificar.equal(datos.serieDiaria.length, 30);
});
prueba('separa cartera recibida de producción de pedidos anteriores y pondera por unidades', () => {
  const pedidos: PedidoEstadistico[] = [
    {
      cliente: 'Cartera reciente',
      cantidad: 250,
      fechaCreacion: new Date('2026-10-24T05:30:00Z'),
      paquetes: [
        { unidades: 100, estado: 'pendiente', historial: [] },
        { unidades: 100, estado: 'revision', historial: [] },
        {
          unidades: 50,
          estado: 'listo',
          historial: [
            { origen: 'pendiente', destino: 'en_proceso', fecha: new Date('2026-10-24T14:00:00Z') },
            { origen: 'en_proceso', destino: 'revision', fecha: new Date('2026-10-25T10:00:00Z') },
            { origen: 'revision', destino: 'en_proceso', fecha: new Date('2026-10-25T12:00:00Z') },
            { origen: 'en_proceso', destino: 'revision', fecha: new Date('2026-10-26T10:00:00Z') },
            { origen: 'revision', destino: 'listo', fecha: new Date('2026-10-26T18:00:00Z') },
          ],
        },
      ],
    },
    {
      cliente: 'Pedido anterior',
      cantidad: 100,
      fechaCreacion: new Date('2026-10-01T12:00:00Z'),
      paquetes: [
        {
          unidades: 100,
          estado: 'listo',
          historial: [
            { origen: 'pendiente', destino: 'en_proceso', fecha: new Date('2026-10-26T10:00:00Z') },
            { origen: 'revision', destino: 'listo', fecha: new Date('2026-10-28T10:00:00Z') },
          ],
        },
      ],
    },
  ];
  const datos = calcularEstadisticas(pedidos, 7, hasta);
  verificar.equal(datos.cartera.pedidos, 1);
  verificar.equal(datos.cartera.unidades, 250);
  verificar.equal(datos.cartera.avance, 20);
  verificar.equal(datos.actividad.unidadesTerminadas, 150);
  verificar.equal(datos.actividad.revisiones, 3);
  verificar.equal(datos.actividad.rechazos, 1);
  verificar.equal(datos.actividad.tasaRechazo, 33.3);
  verificar.equal(datos.actividad.tiempoMedioHoras, 50);
  verificar.equal(datos.clientes.length, 1);
  verificar.equal(datos.serieDiaria[0]?.pedidos, 1); // Se recibió el 23/10 en Guatemala.
  verificar.equal(
    datos.serieDiaria.reduce((suma, dia) => suma + dia.unidadesTerminadas, 0),
    150,
  );
  verificar.equal(
    datos.distribucion.reduce((suma, estado) => suma + estado.unidades, 0),
    250,
  );
});
prueba('excluye movimientos fuera del intervalo, incluidos eventos futuros', () => {
  const datos = calcularEstadisticas(
    [
      {
        cliente: 'C',
        cantidad: 1,
        fechaCreacion: new Date('2026-10-01'),
        paquetes: [
          {
            unidades: 1,
            estado: 'listo',
            historial: [
              { origen: 'revision', destino: 'listo', fecha: new Date('2026-10-30T18:00:00Z') },
            ],
          },
        ],
      },
    ],
    7,
    hasta,
  );
  verificar.equal(datos.actividad.unidadesTerminadas, 0);
  verificar.equal(datos.actividad.revisiones, 0);
});
