import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rutasPedidos } from './pedidos/rutas.js';
import { rutasEstadisticas } from './estadisticas/rutas.js';
import { ErrorNegocio } from './dominio/pedidos.js';

/**
 * Construye la API sin abrir puertos ni conectarse a MongoDB.
 * La consulta de disponibilidad se recibe como dependencia para poder probar
 * el comportamiento HTTP sin necesitar una base de datos real.
 */
export function crearAplicacion(estaBaseDatosDisponible: () => boolean) {
  const aplicacion = express();

  // Reducimos la información expuesta y limitamos el tamaño del JSON recibido.
  aplicacion.disable('x-powered-by');
  aplicacion.use(helmet());
  aplicacion.use(express.json({ limit: '32kb' }));

  // Una API que perdió MongoDB responde 503 para que el monitoreo detecte el fallo.
  aplicacion.get('/api/salud', (_solicitud, respuesta) => {
    const disponible = estaBaseDatosDisponible();
    respuesta.status(disponible ? 200 : 503).json({
      estado: disponible ? 'correcto' : 'degradado',
      baseDatos: disponible ? 'conectada' : 'desconectada',
    });
  });

  // Las rutas de negocio comparten origen con Angular, evitando configurar CORS permisivo.
  aplicacion.use('/api/pedidos', rutasPedidos);
  aplicacion.use('/api/estadisticas', rutasEstadisticas);

  // En producción se entrega el Angular compilado desde este mismo servidor.
  const directorioWeb = fileURLToPath(new URL('../../web/dist/frontend/browser/', import.meta.url));
  if (existsSync(directorioWeb)) {
    aplicacion.use(express.static(directorioWeb));
    aplicacion.get('/{*ruta}', (solicitud, respuesta, siguiente) => {
      if (solicitud.path.startsWith('/api/')) return siguiente();
      respuesta.sendFile(directorioWeb + 'index.html');
    });
  }

  // Este manejador va después de las rutas para cubrir únicamente las desconocidas.
  aplicacion.use((_solicitud, respuesta) => {
    respuesta.status(404).json({
      error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'Ruta no encontrada.' },
    });
  });

  // Express reconoce los manejadores de errores por sus cuatro parámetros.
  // No se devuelve el detalle interno de las excepciones al cliente.
  aplicacion.use(
    (
      error: unknown,
      _solicitud: express.Request,
      respuesta: express.Response,
      _siguiente: express.NextFunction,
    ) => {
      if (error instanceof ErrorNegocio) {
        respuesta
          .status(error.estadoHttp)
          .json({ error: { codigo: error.codigo, mensaje: error.message } });
        return;
      }
      // El índice único es quien resuelve carreras entre dos creaciones simultáneas.
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        respuesta.status(409).json({
          error: { codigo: 'NUMERO_DUPLICADO', mensaje: 'Ya existe un pedido con ese número.' },
        });
        return;
      }
      if (
        error &&
        typeof error === 'object' &&
        'type' in error &&
        error.type === 'entity.too.large'
      ) {
        respuesta.status(413).json({
          error: { codigo: 'DATOS_EXCESIVOS', mensaje: 'La solicitud es demasiado grande.' },
        });
        return;
      }
      if (error instanceof SyntaxError && 'body' in error) {
        respuesta.status(400).json({
          error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo debe ser JSON válido.' },
        });
        return;
      }
      console.error('Error no controlado en la API');
      respuesta.status(500).json({
        error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error interno.' },
      });
    },
  );

  return aplicacion;
}
