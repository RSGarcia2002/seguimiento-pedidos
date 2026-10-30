import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import solicitar from 'supertest';
import { crearAplicacion } from '../src/aplicacion.js';
import { ModeloPedido } from '../src/pedidos/modelo.js';

/** Cada caso utiliza exclusivamente una base aleatoria; ningún DELETE alcanza los datos de la aplicación. */
prueba('CRUD de pedidos con persistencia, reglas y concurrencia reales', async (contexto) => {
  await mongoose.connect(process.env['TEST_MONGODB_URI'] ?? 'mongodb://127.0.0.1:27019', {
    dbName: 'crud_pruebas_' + randomUUID().replaceAll('-', ''),
  });
  await ModeloPedido.init();
  const api = crearAplicacion(() => true, {});
  const crear = async (numero: string) =>
    (
      await solicitar(api)
        .post('/api/pedidos')
        .send({ numero, cliente: 'Cliente original', cantidad: 250 })
        .expect(201)
    ).body;
  try {
    await contexto.test(
      'edita cantidad pendiente, normaliza y regenera paquetes sin perder unidades',
      async () => {
        const pedido = await crear('CRUD-01');
        const { body: editado } = await solicitar(api)
          .put(`/api/pedidos/${pedido.id}`)
          .send({
            numero: ' crud-01-editado ',
            cliente: ' Nuevo cliente ',
            cantidad: 350,
            versionPedidoActual: 0,
            paquetes: [],
          })
          .expect(200);
        verificar.equal(editado.numero, 'CRUD-01-EDITADO');
        verificar.equal(editado.cliente, 'Nuevo cliente');
        verificar.equal(editado.versionPedido, 1);
        verificar.deepEqual(
          editado.paquetes.map((p: { unidades: number }) => p.unidades),
          [100, 100, 100, 50],
        );
        verificar.equal(editado.avance, 0);
        verificar.equal((await ModeloPedido.findById(pedido.id))?.cantidad, 350);
        const { body: soloDatos } = await solicitar(api)
          .put(`/api/pedidos/${pedido.id}`)
          .send({
            numero: editado.numero,
            cliente: 'Corrección',
            cantidad: 350,
            versionPedidoActual: 1,
          })
          .expect(200);
        verificar.deepEqual(soloDatos.paquetes, editado.paquetes);
      },
    );
    await contexto.test(
      'rechaza entradas inválidas y duplicados normalizados sin alterar el pedido',
      async () => {
        const pedido = await crear('CRUD-02');
        const datos = {
          numero: pedido.numero,
          cliente: pedido.cliente,
          cantidad: pedido.cantidad,
          versionPedidoActual: 0,
        };
        for (const versionPedidoActual of [undefined, -1, 0.5, '0', null])
          await solicitar(api)
            .put(`/api/pedidos/${pedido.id}`)
            .send({ ...datos, versionPedidoActual })
            .expect(400);
        for (const cantidad of [0, 1.5, '100', 100001])
          await solicitar(api)
            .put(`/api/pedidos/${pedido.id}`)
            .send({ ...datos, cantidad })
            .expect(400);
        await solicitar(api)
          .put(`/api/pedidos/${pedido.id}`)
          .send({ ...datos, numero: 'crud-01-editado' })
          .expect(409);
        verificar.deepEqual((await solicitar(api).get(`/api/pedidos/${pedido.id}`)).body, pedido);
        await solicitar(api).put('/api/pedidos/no-valido').send(datos).expect(400);
        await solicitar(api)
          .put(`/api/pedidos/${new mongoose.Types.ObjectId()}`)
          .send(datos)
          .expect(404);
      },
    );
    await contexto.test(
      'solo una de dos ediciones con la misma versión puede guardarse',
      async () => {
        const pedido = await crear('CRUD-03');
        const respuestas = await Promise.all(
          ['Uno', 'Dos'].map((cliente) =>
            solicitar(api)
              .put(`/api/pedidos/${pedido.id}`)
              .send({ numero: pedido.numero, cliente, cantidad: 250, versionPedidoActual: 0 }),
          ),
        );
        verificar.deepEqual(respuestas.map((r) => r.status).sort(), [200, 409]);
        verificar.equal((await ModeloPedido.findById(pedido.id))?.versionPedido, 1);
      },
    );
    await contexto.test(
      'un movimiento bloquea cambiar cantidad pero permite corregir datos conservando historial',
      async () => {
        const pedido = await crear('CRUD-04');
        const { body: iniciado } = await solicitar(api)
          .post(`/api/pedidos/${pedido.id}/paquetes/${pedido.paquetes[0].id}/transiciones`)
          .send({ accion: 'avanzar', estadoActual: 'pendiente', versionActual: 0 })
          .expect(200);
        verificar.equal(iniciado.versionPedido, 1);
        await solicitar(api)
          .put(`/api/pedidos/${pedido.id}`)
          .send({
            numero: pedido.numero,
            cliente: 'Cliente corregido',
            cantidad: 300,
            versionPedidoActual: 1,
          })
          .expect(409);
        const { body: corregido } = await solicitar(api)
          .put(`/api/pedidos/${pedido.id}`)
          .send({
            numero: pedido.numero,
            cliente: 'Cliente corregido',
            cantidad: 250,
            versionPedidoActual: 1,
          })
          .expect(200);
        verificar.deepEqual(corregido.paquetes, iniciado.paquetes);
        verificar.equal(corregido.versionPedido, 2);
      },
    );
    await contexto.test(
      'cantidad y transición simultáneas no pueden sustituir un paquete ya movido',
      async () => {
        const pedido = await crear('CRUD-05');
        const respuestas = await Promise.all([
          solicitar(api)
            .put(`/api/pedidos/${pedido.id}`)
            .send({
              numero: pedido.numero,
              cliente: pedido.cliente,
              cantidad: 350,
              versionPedidoActual: 0,
            }),
          solicitar(api)
            .post(`/api/pedidos/${pedido.id}/paquetes/${pedido.paquetes[0].id}/transiciones`)
            .send({ accion: 'avanzar', estadoActual: 'pendiente', versionActual: 0 }),
        ]);
        verificar.equal(respuestas.filter((r) => r.status === 200).length, 1);
        verificar.ok(respuestas.some((r) => [404, 409].includes(r.status)));
        const actual = await ModeloPedido.findById(pedido.id);
        verificar.equal(actual?.versionPedido, 1);
        verificar.equal(actual?.cantidad, respuestas[0]!.status === 200 ? 350 : 250);
      },
    );
    await contexto.test(
      'los documentos anteriores sin versión se pueden editar con versión cero',
      async () => {
        const pedido = await crear('CRUD-06');
        await ModeloPedido.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(pedido.id) },
          { $unset: { versionPedido: '' } },
        );
        verificar.equal(
          (await solicitar(api).get(`/api/pedidos/${pedido.id}`)).body.versionPedido,
          0,
        );
        const { body: editado } = await solicitar(api)
          .put(`/api/pedidos/${pedido.id}`)
          .send({ numero: pedido.numero, cliente: 'Legado', cantidad: 250, versionPedidoActual: 0 })
          .expect(200);
        verificar.equal(editado.versionPedido, 1);
      },
    );
    await contexto.test(
      'exige confirmación exacta y versión vigente; elimina pedido, detalle y aportes a estadísticas',
      async () => {
        const pedido = await crear('CRUD-07');
        await solicitar(api)
          .delete(`/api/pedidos/${pedido.id}`)
          .send({ numeroConfirmacion: 'otro', versionPedidoActual: 0 })
          .expect(400);
        await solicitar(api)
          .delete(`/api/pedidos/${pedido.id}`)
          .send({ numeroConfirmacion: pedido.numero })
          .expect(400);
        const editado = (
          await solicitar(api)
            .put(`/api/pedidos/${pedido.id}`)
            .send({
              numero: pedido.numero,
              cliente: 'Corregido',
              cantidad: 250,
              versionPedidoActual: 0,
            })
            .expect(200)
        ).body;
        await solicitar(api)
          .delete(`/api/pedidos/${pedido.id}`)
          .send({ numeroConfirmacion: pedido.numero, versionPedidoActual: 0 })
          .expect(409);
        const antes = (await solicitar(api).get('/api/estadisticas?dias=30')).body;
        await solicitar(api)
          .delete(`/api/pedidos/${pedido.id}`)
          .send({ numeroConfirmacion: pedido.numero, versionPedidoActual: editado.versionPedido })
          .expect(204);
        await solicitar(api).get(`/api/pedidos/${pedido.id}`).expect(404);
        verificar.equal(await ModeloPedido.exists({ _id: pedido.id }), null);
        const despues = (await solicitar(api).get('/api/estadisticas?dias=30')).body;
        verificar.equal(despues.cartera.pedidos, antes.cartera.pedidos - 1);
        verificar.equal((await solicitar(api).get('/api/pedidos?busqueda=CRUD-07')).body.total, 0);
        await solicitar(api)
          .delete(`/api/pedidos/${pedido.id}`)
          .send({ numeroConfirmacion: pedido.numero, versionPedidoActual: 1 })
          .expect(404);
      },
    );
    await contexto.test(
      'edición y eliminación concurrentes respetan la misma versión del documento',
      async () => {
        const pedido = await crear('CRUD-08');
        const resultados = await Promise.all([
          solicitar(api)
            .put(`/api/pedidos/${pedido.id}`)
            .send({
              numero: pedido.numero,
              cliente: 'Cambio',
              cantidad: 250,
              versionPedidoActual: 0,
            }),
          solicitar(api)
            .delete(`/api/pedidos/${pedido.id}`)
            .send({ numeroConfirmacion: pedido.numero, versionPedidoActual: 0 }),
        ]);
        verificar.equal(resultados.filter((r) => [200, 204].includes(r.status)).length, 1);
        verificar.ok(resultados.some((r) => [404, 409].includes(r.status)));
      },
    );
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
