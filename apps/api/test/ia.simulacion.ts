import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import { crearAnalizador } from '../src/operacion/analisis.js';
import type { PedidoOperativo } from '../src/operacion/alertas.js';
const ahora = new Date('2026-10-29T18:00:00Z');
const fecha = new Date('2026-10-01T18:00:00Z');
const pedidos: PedidoOperativo[] = [
  {
    _id: 'interno',
    numero: 'NO-ENVIAR',
    cliente: 'NO-ENVIAR-CLIENTE',
    cantidad: 50,
    fechaCreacion: fecha,
    fechaActualizacion: fecha,
    paquetes: [
      {
        _id: 'p-interno',
        numero: 1,
        unidades: 50,
        estado: 'revision',
        historial: [{ origen: 'en_proceso', destino: 'revision', fecha }],
      },
    ],
  },
];
const base = process.env['SIMULACION_URL'] ?? 'http://127.0.0.1:4195';
prueba(
  'la aplicación llama HTTP al simulador, valida referencias y agrupa solicitudes simultáneas',
  async () => {
    const antes = JSON.stringify(pedidos);
    const contador = async () =>
      (await (await fetch(`${base}/gemini/__control`)).json()).solicitudes as number;
    const inicial = await contador();
    const analizar = crearAnalizador({
      clave: 'clave-simulada-no-real',
      urlBase: `${base}/gemini`,
    });
    const resultados = await Promise.all([
      analizar(pedidos, 30, ahora),
      analizar(pedidos, 30, ahora),
    ]);
    verificar.equal(resultados[0]!.modo, 'ia');
    verificar.ok(
      resultados[0]!.prioridades.every((prioridad) => prioridad.alerta.pedidoId === 'interno'),
    );
    verificar.equal((await analizar(pedidos, 30, ahora)).modo, 'ia');
    verificar.equal((await contador()) - inicial, 1);
    verificar.equal(JSON.stringify(pedidos), antes);
  },
);
for (const [ruta, motivo, esperaMs] of [
  ['cuota', 'cuota_agotada', 2000],
  ['fallo', 'no_disponible', 2000],
  ['demora', 'no_disponible', 50],
  ['invalido', 'respuesta_no_valida', 2000],
] as const) {
  prueba(`HTTP ${ruta}: conserva un resumen por reglas sin mutaciones`, async () => {
    const antes = JSON.stringify(pedidos);
    const respuesta = await crearAnalizador({
      clave: 'clave-simulada-no-real',
      urlBase: `${base}/${ruta}`,
      esperaMs,
    })(pedidos, 30, ahora);
    verificar.equal(respuesta.modo, 'reglas');
    verificar.equal(respuesta.motivoProveedor, motivo);
    verificar.equal(JSON.stringify(pedidos), antes);
  });
}
prueba('el límite aplicativo evita nuevas llamadas aunque cambie el período', async () => {
  const analizar = crearAnalizador({
    clave: 'clave-simulada-no-real',
    urlBase: `${base}/gemini`,
    limiteDiario: 1,
  });
  verificar.equal((await analizar(pedidos, 30, ahora)).modo, 'ia');
  const siguiente = await analizar(pedidos, 7, ahora);
  verificar.equal(siguiente.modo, 'reglas');
  verificar.equal(siguiente.motivoProveedor, 'limite_aplicativo');
});
