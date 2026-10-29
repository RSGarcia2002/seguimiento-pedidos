import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import solicitar from 'supertest';
import { crearAplicacion } from '../src/aplicacion.js';
import { ModeloPedido } from '../src/pedidos/modelo.js';

/** Cada ejecución usa una base única de prueba; nunca se vacía la base de desarrollo. */
prueba('API de pedidos con MongoDB real', async (contexto) => {
  const nombreBase = 'seguimiento_pruebas_' + randomUUID().replaceAll('-', '');
  const conexion = process.env['TEST_MONGODB_URI'] ?? 'mongodb://127.0.0.1:27019';
  await mongoose.connect(conexion, { dbName: nombreBase, serverSelectionTimeoutMS: 5000 });
  await ModeloPedido.init();
  const aplicacion = crearAplicacion(() => mongoose.connection.readyState === 1, {});
  let id = '';
  let paqueteId = '';
  const transicionar = (
    estadoActual: string,
    versionActual: number,
    accion = 'avanzar',
    motivo = '',
  ) =>
    solicitar(aplicacion)
      .post(`/api/pedidos/${id}/paquetes/${paqueteId}/transiciones`)
      .send({ estadoActual, versionActual, accion, motivo });
  try {
    await contexto.test('crea y persiste 250 unidades como 100, 100 y 50', async () => {
      const respuesta = await solicitar(aplicacion)
        .post('/api/pedidos')
        .send({
          numero: ' ped-001 ',
          cliente: ' Cliente Uno ',
          cantidad: 250,
          paquetes: [{ unidades: 250, estado: 'listo' }],
        });
      verificar.equal(respuesta.status, 201);
      verificar.equal(respuesta.body.numero, 'PED-001');
      verificar.deepEqual(
        respuesta.body.paquetes.map((paquete: { unidades: number }) => paquete.unidades),
        [100, 100, 50],
      );
      verificar.equal(respuesta.body.conteos.pendiente, 3);
      verificar.equal(respuesta.body.avance, 0);
      id = respuesta.body.id;
      paqueteId = respuesta.body.paquetes[2].id;
      verificar.equal((await ModeloPedido.findById(id))?.cantidad, 250);
    });
    await contexto.test('bloquea duplicados normalizados con el índice único', async () => {
      const respuesta = await solicitar(aplicacion)
        .post('/api/pedidos')
        .send({ numero: 'ped-001', cliente: 'Otro', cantidad: 1 });
      verificar.equal(respuesta.status, 409);
      verificar.equal(respuesta.body.error.codigo, 'NUMERO_DUPLICADO');
    });
    await contexto.test('rechaza datos inválidos y JSON mal formado', async () => {
      for (const cantidad of [0, -1, 1.5, '100', true, 100001]) {
        verificar.equal(
          (
            await solicitar(aplicacion)
              .post('/api/pedidos')
              .send({ numero: 'INVALIDO', cliente: 'C', cantidad })
          ).status,
          400,
        );
      }
      verificar.equal(
        (
          await solicitar(aplicacion)
            .post('/api/pedidos')
            .set('Content-Type', 'application/json')
            .send('{')
        ).status,
        400,
      );
    });
    await contexto.test('rechaza un intento de salto con estado inventado', async () => {
      verificar.equal((await transicionar('revision', 0)).status, 409);
      verificar.equal(
        (await solicitar(aplicacion).get(`/api/pedidos/${id}`)).body.paquetes[2].estado,
        'pendiente',
      );
    });
    await contexto.test('solo una de dos transiciones simultáneas tiene éxito', async () => {
      const respuestas = await Promise.all([
        transicionar('pendiente', 0),
        transicionar('pendiente', 0),
      ]);
      verificar.deepEqual(respuestas.map((respuesta) => respuesta.status).sort(), [200, 409]);
      const detalle = (await solicitar(aplicacion).get(`/api/pedidos/${id}`)).body;
      verificar.equal(detalle.paquetes[2].estado, 'en_proceso');
      verificar.equal(detalle.paquetes[2].historial.length, 1);
    });
    await contexto.test(
      'rechaza desde revisión, registra motivo y permite revisar nuevamente',
      async () => {
        verificar.equal((await transicionar('en_proceso', 1)).status, 200);
        const rechazo = await transicionar('revision', 2, 'rechazar', 'Corregir acabado');
        verificar.equal(rechazo.status, 200);
        verificar.equal(rechazo.body.paquetes[2].estado, 'en_proceso');
        verificar.equal(rechazo.body.paquetes[2].historial[2].motivo, 'Corregir acabado');
        verificar.equal((await transicionar('en_proceso', 3)).status, 200);
      },
    );
    await contexto.test(
      'detecta versiones obsoletas tras un ciclo de rechazo y revisión',
      async () => {
        verificar.equal((await transicionar('revision', 2)).status, 409);
        const respuesta = await transicionar('revision', 4);
        verificar.equal(respuesta.status, 200);
        verificar.equal(respuesta.body.avance, 20);
        verificar.equal(respuesta.body.unidadesListas, 50);
        verificar.equal(respuesta.body.paquetes[2].historial.length, 5);
        verificar.equal((await transicionar('listo', 5)).status, 409);
      },
    );
    await contexto.test(
      'busca literalmente y filtra estado con resumen global independiente',
      async () => {
        const encontrado = await solicitar(aplicacion)
          .get('/api/pedidos')
          .query({ busqueda: 'cliente uno', estado: 'en_curso' });
        verificar.equal(encontrado.body.total, 1);
        verificar.equal(encontrado.body.resumen.unidadesListas, 50);
        const sinCoincidencias = await solicitar(aplicacion)
          .get('/api/pedidos')
          .query({ busqueda: '.*' });
        verificar.equal(sinCoincidencias.body.total, 0);
        verificar.equal(sinCoincidencias.body.resumen.pedidos, 1);
        verificar.equal(
          (await solicitar(aplicacion).get('/api/pedidos').query({ estado: 'completado' })).body
            .total,
          0,
        );
        verificar.equal(
          (await solicitar(aplicacion).get('/api/pedidos').query({ estado: 'pendiente' })).body
            .total,
          0,
        );
      },
    );
    await contexto.test('la paginación y los identificadores se validan', async () => {
      verificar.equal(
        (await solicitar(aplicacion).get('/api/pedidos').query({ pagina: '1.5' })).status,
        400,
      );
      verificar.equal(
        (await solicitar(aplicacion).get('/api/pedidos').query({ limite: 101 })).status,
        400,
      );
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos/no-valido')).status, 400);
      verificar.equal(
        (await solicitar(aplicacion).get('/api/pedidos/000000000000000000000000')).status,
        404,
      );
    });
    await contexto.test(
      'completar todos los paquetes produce 100% y el filtro completado',
      async () => {
        let detalle = (await solicitar(aplicacion).get(`/api/pedidos/${id}`)).body;
        for (const paquete of detalle.paquetes.slice(0, 2)) {
          for (const [versionActual, estadoActual] of [
            'pendiente',
            'en_proceso',
            'revision',
          ].entries()) {
            const respuesta = await solicitar(aplicacion)
              .post(`/api/pedidos/${id}/paquetes/${paquete.id}/transiciones`)
              .send({ accion: 'avanzar', estadoActual, versionActual });
            verificar.equal(respuesta.status, 200);
            detalle = respuesta.body;
          }
        }
        verificar.equal(detalle.avance, 100);
        verificar.equal(detalle.estado, 'completado');
        verificar.equal(
          (await solicitar(aplicacion).get('/api/pedidos').query({ estado: 'completado' })).body
            .total,
          1,
        );
      },
    );
    await contexto.test(
      'dos creaciones simultáneas con el mismo número guardan un único pedido',
      async () => {
        const crear = () =>
          solicitar(aplicacion)
            .post('/api/pedidos')
            .send({ numero: 'CONCURRENTE', cliente: 'C', cantidad: 1 });
        const respuestas = await Promise.all([crear(), crear()]);
        verificar.deepEqual(respuestas.map((respuesta) => respuesta.status).sort(), [201, 409]);
      },
    );
    await contexto.test(
      'estadísticas consultan MongoDB y separan métricas con períodos válidos',
      async () => {
        const respuesta = await solicitar(aplicacion).get('/api/estadisticas').query({ dias: 7 });
        verificar.equal(respuesta.status, 200);
        verificar.equal(respuesta.body.cartera.pedidos, 2);
        verificar.equal(respuesta.body.cartera.unidades, 251);
        verificar.equal(respuesta.body.actividad.unidadesTerminadas, 250);
        verificar.equal(respuesta.body.actividad.rechazos, 1);
        verificar.equal(respuesta.body.actividad.tasaRechazo, 25);
        verificar.equal(respuesta.body.serieDiaria.length, 7);
        verificar.equal(
          (await solicitar(aplicacion).get('/api/estadisticas').query({ dias: 8 })).status,
          400,
        );
      },
    );
    await contexto.test(
      'incluye producción reciente de un pedido recibido antes del período',
      async () => {
        const ahora = Date.now();
        const anterior = await ModeloPedido.create({
          numero: 'ANTERIOR-ESTADISTICAS',
          cliente: 'Fuera de cartera',
          cantidad: 100,
          paquetes: [
            {
              numero: 1,
              unidades: 100,
              estado: 'listo',
              version: 3,
              historial: [
                {
                  origen: 'pendiente',
                  destino: 'en_proceso',
                  fecha: new Date(ahora - 7200000),
                  motivo: '',
                },
                {
                  origen: 'en_proceso',
                  destino: 'revision',
                  fecha: new Date(ahora - 3600000),
                  motivo: '',
                },
                { origen: 'revision', destino: 'listo', fecha: new Date(ahora - 1000), motivo: '' },
              ],
            },
          ],
        });
        try {
          await ModeloPedido.collection.updateOne(
            { _id: anterior._id },
            { $set: { fechaCreacion: new Date(ahora - 120 * 86400000) } },
          );
          const respuesta = await solicitar(aplicacion).get('/api/estadisticas').query({ dias: 7 });
          verificar.equal(respuesta.body.cartera.pedidos, 2);
          verificar.equal(respuesta.body.actividad.unidadesTerminadas, 350);
        } finally {
          await ModeloPedido.deleteOne({ _id: anterior._id });
        }
      },
    );
    await contexto.test(
      'filtra cliente y fechas inclusivas y ordena antes de paginar',
      async () => {
        const hoy = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);
        const filtrado = await solicitar(aplicacion)
          .get('/api/pedidos')
          .query({ cliente: 'Cliente Uno', desde: hoy, hasta: hoy });
        verificar.equal(filtrado.status, 200);
        verificar.equal(filtrado.body.total, 1);
        verificar.equal(filtrado.body.pedidos[0].numero, 'PED-001');
        verificar.ok(filtrado.body.clientesDisponibles.includes('Cliente Uno'));
        const ordenado = await solicitar(aplicacion)
          .get('/api/pedidos')
          .query({ orden: 'menor_avance', limite: 1 });
        verificar.equal(ordenado.body.pedidos[0].numero, 'CONCURRENTE');
        for (const consulta of [
          { desde: '2026-02-30' },
          { desde: '2026-02-02', hasta: '2026-02-01' },
          { orden: 'inventado' },
        ]) {
          verificar.equal(
            (await solicitar(aplicacion).get('/api/pedidos').query(consulta)).status,
            400,
          );
        }
      },
    );
    await contexto.test(
      'alertas y análisis consultan evidencia real sin modificar pedidos',
      async () => {
        const ahora = Date.now();
        const historial = [
          { origen: 'pendiente', destino: 'en_proceso', fecha: new Date(ahora - 200 * 3600000) },
          { origen: 'en_proceso', destino: 'revision', fecha: new Date(ahora - 190 * 3600000) },
          { origen: 'revision', destino: 'en_proceso', fecha: new Date(ahora - 189 * 3600000) },
          { origen: 'en_proceso', destino: 'revision', fecha: new Date(ahora - 180 * 3600000) },
          { origen: 'revision', destino: 'en_proceso', fecha: new Date(ahora - 179 * 3600000) },
          { origen: 'en_proceso', destino: 'revision', fecha: new Date(ahora - 160 * 3600000) },
        ];
        const pruebaOperacion = await ModeloPedido.create({
          numero: 'OPERACION-PRUEBA',
          cliente: 'C',
          cantidad: 50,
          paquetes: [{ numero: 1, unidades: 50, estado: 'revision', version: 6, historial }],
        });
        try {
          await ModeloPedido.collection.updateOne(
            { _id: pruebaOperacion._id },
            {
              $set: {
                fechaCreacion: new Date(ahora - 220 * 3600000),
                fechaActualizacion: new Date(ahora - 160 * 3600000),
              },
            },
          );
          const antes = JSON.stringify(await ModeloPedido.findById(pruebaOperacion._id).lean());
          const alertas = await solicitar(aplicacion).get('/api/operacion/alertas');
          verificar.equal(alertas.status, 200);
          verificar.equal(alertas.body.resumen.total, 3);
          verificar.equal(alertas.body.resumen.rechazosRepetidos, 1);
          const revision = await solicitar(aplicacion)
            .get('/api/operacion/alertas')
            .query({ tipo: 'revision_demorada' });
          verificar.equal(revision.body.alertas.length, 1);
          verificar.equal(revision.body.resumen.total, 3);
          const analisis = await solicitar(aplicacion)
            .post('/api/operacion/analisis')
            .send({ dias: 30 });
          verificar.equal(analisis.status, 200);
          verificar.equal(analisis.body.modo, 'reglas');
          verificar.equal(analisis.body.motivoProveedor, 'sin_configurar');
          verificar.equal(
            JSON.stringify(await ModeloPedido.findById(pruebaOperacion._id).lean()),
            antes,
          );
          verificar.equal(
            (await solicitar(aplicacion).get('/api/operacion/alertas').query({ tipo: 'otro' }))
              .status,
            400,
          );
          verificar.equal(
            (await solicitar(aplicacion).post('/api/operacion/analisis').send({ dias: 8 })).status,
            400,
          );
        } finally {
          await ModeloPedido.deleteOne({ _id: pruebaOperacion._id });
        }
      },
    );
    await contexto.test('los pedidos e historial sobreviven a reconectar MongoDB', async () => {
      await mongoose.disconnect();
      await mongoose.connect(conexion, { dbName: nombreBase });
      const respuesta = await solicitar(aplicacion).get(`/api/pedidos/${id}`);
      verificar.equal(respuesta.status, 200);
      verificar.equal(respuesta.body.avance, 100);
      verificar.equal(respuesta.body.paquetes[2].historial.length, 5);
    });
  } finally {
    // La base se generó en esta ejecución; el nombre no procede de una entrada externa.
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
