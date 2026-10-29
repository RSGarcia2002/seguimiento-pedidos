import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import solicitar from 'supertest';
import { crearAplicacion } from '../src/aplicacion.js';

// Se comprueba la respuesta HTTP usando disponibilidad simulada, sin MongoDB real.
prueba('salud confirma disponibilidad cuando la base está conectada', async () => {
  const respuesta = await solicitar(crearAplicacion(() => true)).get('/api/salud');
  verificar.equal(respuesta.status, 200);
  verificar.deepEqual(respuesta.body, { estado: 'correcto', baseDatos: 'conectada' });
});

prueba('salud devuelve 503 si se pierde la conexión', async () => {
  const respuesta = await solicitar(crearAplicacion(() => false)).get('/api/salud');
  verificar.equal(respuesta.status, 503);
  verificar.deepEqual(respuesta.body, { estado: 'degradado', baseDatos: 'desconectada' });
});

prueba('una ruta desconocida devuelve un error JSON', async () => {
  const respuesta = await solicitar(crearAplicacion(() => true)).get('/api/inexistente');
  verificar.equal(respuesta.status, 404);
  verificar.equal(respuesta.body.error.codigo, 'RUTA_NO_ENCONTRADA');
});
