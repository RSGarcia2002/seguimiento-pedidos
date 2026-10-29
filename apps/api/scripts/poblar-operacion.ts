import mongoose from 'mongoose';
import { generarOperacion, loteOperacion } from '../src/datos/generador.js';
import { ModeloPedido } from '../src/pedidos/modelo.js';

/** Carga aditiva e idempotente. El lote ya existente no se recalcula ni se sobrescribe. */
const uri = process.env['MONGODB_URI'];
if (!uri) throw new Error('Configura MONGODB_URI antes de cargar los datos.');
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  await ModeloPedido.init();
  const existentes = await ModeloPedido.find({ loteDatos: loteOperacion })
    .select('numero fechaLoteDatos')
    .lean();
  const numeros = new Set(existentes.map((pedido) => pedido.numero));
  const candidatos = generarOperacion(existentes[0]?.fechaLoteDatos ?? new Date()).filter(
    (pedido) => !numeros.has(pedido.numero),
  );
  const documentos = [];
  for (const candidato of candidatos) {
    // No se reemplaza un pedido manual aunque coincida con un número del lote.
    if (await ModeloPedido.exists({ numero: candidato.numero })) continue;
    const documento = new ModeloPedido(candidato);
    await documento.validate();
    documentos.push(documento.toObject());
  }
  if (documentos.length) await ModeloPedido.collection.insertMany(documentos);
  console.log(
    JSON.stringify({
      lote: loteOperacion,
      agregados: documentos.length,
      existentes: existentes.length,
      totalPedidos: await ModeloPedido.countDocuments(),
    }),
  );
} catch (error) {
  console.error(
    'No se completó la carga de datos sintéticos.',
    error instanceof Error ? error.name : 'Error desconocido',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
