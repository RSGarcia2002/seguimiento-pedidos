import { Router } from 'express';
import { ModeloPedido } from '../pedidos/modelo.js';
import { ErrorNegocio } from '../dominio/pedidos.js';
import { calcularAlertas } from './alertas.js';
import { crearAnalizador } from './analisis.js';
import type { ConfiguracionGemini } from './proveedor-gemini.js';

/** Router de solo lectura: el proveedor nunca dispone de herramientas de escritura. */
export function crearRutasOperacion(
  configuracion: ConfiguracionGemini = {
    clave: process.env['GEMINI_API_KEY'],
    modelo: process.env['GEMINI_MODEL'],
  },
) {
  const rutas = Router();
  const analizar = crearAnalizador(configuracion);
  rutas.get('/alertas', async (solicitud, respuesta) => {
    const tipo = solicitud.query['tipo'] ?? 'todos';
    if (
      typeof tipo !== 'string' ||
      !['todos', 'revision_demorada', 'pedido_inactivo', 'rechazos_repetidos'].includes(tipo)
    )
      throw new ErrorNegocio(400, 'TIPO_INVALIDO', 'El tipo de alerta no es válido.');
    const pedidos = await ModeloPedido.find().lean();
    const resultado = calcularAlertas(pedidos, new Date());
    const coincidencias = resultado.alertas.filter(
      (alerta) => tipo === 'todos' || alerta.tipo === tipo,
    );
    respuesta.json({
      ...resultado,
      alertas: coincidencias.slice(0, 50),
      totalFiltrado: coincidencias.length,
      iaDisponible: !!configuracion.clave,
    });
  });
  rutas.post('/analisis', async (solicitud, respuesta) => {
    const dias: unknown = solicitud.body?.dias;
    if (typeof dias !== 'number' || ![7, 30, 90].includes(dias))
      throw new ErrorNegocio(400, 'PERIODO_INVALIDO', 'Selecciona un período de 7, 30 o 90 días.');
    const pedidos = await ModeloPedido.find().lean();
    respuesta.json(await analizar(pedidos, dias));
  });
  return rutas;
}
