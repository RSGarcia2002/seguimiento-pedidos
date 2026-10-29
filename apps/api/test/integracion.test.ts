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
  const aplicacion = crearAplicacion(() => mongoose.connection.readyState === 1);
  let id = '';
  let paqueteId = '';
  const transicionar = (estadoActual: string, versionActual: number, accion = 'avanzar', motivo = '') => solicitar(aplicacion).post(`/api/pedidos/${id}/paquetes/${paqueteId}/transiciones`).send({ estadoActual, versionActual, accion, motivo });
  try {
    await contexto.test('crea y persiste 250 unidades como 100, 100 y 50', async () => {
      const respuesta = await solicitar(aplicacion).post('/api/pedidos').send({ numero: ' ped-001 ', cliente: ' Cliente Uno ', cantidad: 250, paquetes: [{ unidades: 250, estado: 'listo' }] });
      verificar.equal(respuesta.status, 201);
      verificar.equal(respuesta.body.numero, 'PED-001');
      verificar.deepEqual(respuesta.body.paquetes.map((paquete: { unidades: number }) => paquete.unidades), [100, 100, 50]);
      verificar.equal(respuesta.body.conteos.pendiente, 3);
      verificar.equal(respuesta.body.avance, 0);
      id = respuesta.body.id; paqueteId = respuesta.body.paquetes[2].id;
      verificar.equal((await ModeloPedido.findById(id))?.cantidad, 250);
    });
    await contexto.test('bloquea duplicados normalizados con el índice único', async () => {
      const respuesta = await solicitar(aplicacion).post('/api/pedidos').send({ numero: 'ped-001', cliente: 'Otro', cantidad: 1 });
      verificar.equal(respuesta.status, 409);
      verificar.equal(respuesta.body.error.codigo, 'NUMERO_DUPLICADO');
    });
    await contexto.test('rechaza datos inválidos y JSON mal formado', async () => {
      for (const cantidad of [0, -1, 1.5, '100', true, 100001]) {
        verificar.equal((await solicitar(aplicacion).post('/api/pedidos').send({ numero: 'INVALIDO', cliente: 'C', cantidad })).status, 400);
      }
      verificar.equal((await solicitar(aplicacion).post('/api/pedidos').set('Content-Type', 'application/json').send('{')).status, 400);
    });
    await contexto.test('rechaza un intento de salto con estado inventado', async () => {
      verificar.equal((await transicionar('revision', 0)).status, 409);
      verificar.equal((await solicitar(aplicacion).get(`/api/pedidos/${id}`)).body.paquetes[2].estado, 'pendiente');
    });
    await contexto.test('solo una de dos transiciones simultáneas tiene éxito', async () => {
      const respuestas = await Promise.all([transicionar('pendiente', 0), transicionar('pendiente', 0)]);
      verificar.deepEqual(respuestas.map((respuesta) => respuesta.status).sort(), [200, 409]);
      const detalle = (await solicitar(aplicacion).get(`/api/pedidos/${id}`)).body;
      verificar.equal(detalle.paquetes[2].estado, 'en_proceso');
      verificar.equal(detalle.paquetes[2].historial.length, 1);
    });
    await contexto.test('rechaza desde revisión, registra motivo y permite revisar nuevamente', async () => {
      verificar.equal((await transicionar('en_proceso', 1)).status, 200);
      const rechazo = await transicionar('revision', 2, 'rechazar', 'Corregir acabado');
      verificar.equal(rechazo.status, 200);
      verificar.equal(rechazo.body.paquetes[2].estado, 'en_proceso');
      verificar.equal(rechazo.body.paquetes[2].historial[2].motivo, 'Corregir acabado');
      verificar.equal((await transicionar('en_proceso', 3)).status, 200);
    });
    await contexto.test('detecta versiones obsoletas tras un ciclo de rechazo y revisión', async () => {
      verificar.equal((await transicionar('revision', 2)).status, 409);
      const respuesta = await transicionar('revision', 4);
      verificar.equal(respuesta.status, 200);
      verificar.equal(respuesta.body.avance, 20);
      verificar.equal(respuesta.body.unidadesListas, 50);
      verificar.equal(respuesta.body.paquetes[2].historial.length, 5);
      verificar.equal((await transicionar('listo', 5)).status, 409);
    });
    await contexto.test('busca literalmente y filtra estado con resumen global independiente', async () => {
      const encontrado = await solicitar(aplicacion).get('/api/pedidos').query({ busqueda: 'cliente uno', estado: 'en_curso' });
      verificar.equal(encontrado.body.total, 1);
      verificar.equal(encontrado.body.resumen.unidadesListas, 50);
      const sinCoincidencias = await solicitar(aplicacion).get('/api/pedidos').query({ busqueda: '.*' });
      verificar.equal(sinCoincidencias.body.total, 0);
      verificar.equal(sinCoincidencias.body.resumen.pedidos, 1);
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos').query({ estado: 'completado' })).body.total, 0);
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos').query({ estado: 'pendiente' })).body.total, 0);
    });
    await contexto.test('la paginación y los identificadores se validan', async () => {
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos').query({ pagina: '1.5' })).status, 400);
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos').query({ limite: 101 })).status, 400);
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos/no-valido')).status, 400);
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos/000000000000000000000000')).status, 404);
    });
    await contexto.test('completar todos los paquetes produce 100% y el filtro completado', async () => {
      let detalle = (await solicitar(aplicacion).get(`/api/pedidos/${id}`)).body;
      for (const paquete of detalle.paquetes.slice(0, 2)) {
        for (const [versionActual, estadoActual] of ['pendiente', 'en_proceso', 'revision'].entries()) {
          const respuesta = await solicitar(aplicacion).post(`/api/pedidos/${id}/paquetes/${paquete.id}/transiciones`).send({ accion: 'avanzar', estadoActual, versionActual });
          verificar.equal(respuesta.status, 200); detalle = respuesta.body;
        }
      }
      verificar.equal(detalle.avance, 100);
      verificar.equal(detalle.estado, 'completado');
      verificar.equal((await solicitar(aplicacion).get('/api/pedidos').query({ estado: 'completado' })).body.total, 1);
    });
    await contexto.test('dos creaciones simultáneas con el mismo número guardan un único pedido', async () => {
      const crear = () => solicitar(aplicacion).post('/api/pedidos').send({ numero: 'CONCURRENTE', cliente: 'C', cantidad: 1 });
      const respuestas = await Promise.all([crear(), crear()]);
      verificar.deepEqual(respuestas.map((respuesta) => respuesta.status).sort(), [201, 409]);
    });
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
