import mongoose from 'mongoose';
import { ModeloPedido } from './pedidos/modelo.js';
import { crearAplicacion } from './aplicacion.js';

// Las variables de entorno mantienen la configuración fuera del código.
// Sus nombres se conservan por ser convenciones de infraestructura.
const uriMongo = process.env['MONGODB_URI'];
if (!uriMongo) throw new Error('Configura MONGODB_URI en apps/api/.env antes de iniciar.');
const puerto = Number(process.env['PORT'] ?? 3000);
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('PORT no es válido.');
}

// No aceptamos tráfico hasta disponer de la conexión necesaria para persistir datos.
try {
  await mongoose.connect(uriMongo, { serverSelectionTimeoutMS: 5000 });
  // Esperamos la creación del índice único antes de aceptar pedidos.
  await ModeloPedido.init();
} catch {
  // Evitamos imprimir la URI porque puede contener credenciales de acceso.
  console.error('No se pudo conectar con MongoDB. Revisa la configuración y disponibilidad.');
  process.exit(1);
}

// En Mongoose, readyState === 1 indica que la conexión está establecida.
const aplicacion = crearAplicacion(() => mongoose.connection.readyState === 1);
const servidor = aplicacion.listen(puerto, () => {
  console.log(`API disponible en http://localhost:${puerto}/api/salud`);
});

/** Deja terminar las solicitudes activas antes de cerrar la conexión a MongoDB. */
function cerrarServidor() {
  // El límite evita que el proceso quede bloqueado durante un cierre o despliegue.
  const limiteCierre = setTimeout(() => process.exit(1), 10000);
  limiteCierre.unref();
  servidor.close(async () => {
    await mongoose.disconnect();
    clearTimeout(limiteCierre);
    process.exit(0);
  });
}

// SIGTERM cubre los despliegues y SIGINT la interrupción desde la terminal.
process.once('SIGTERM', cerrarServidor);
process.once('SIGINT', cerrarServidor);
