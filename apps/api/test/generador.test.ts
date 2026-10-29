import { test as prueba } from 'node:test';
import verificar from 'node:assert/strict';
import { generarOperacion } from '../src/datos/generador.js';
import { siguienteEstado, resumirPaquetes } from '../src/dominio/pedidos.js';

prueba('la muestra es reproducible y tiene volumen, variedad y ocho clientes ficticios', () => {
  const fecha = new Date('2026-10-29T18:00:00Z');
  const pedidos = generarOperacion(fecha);
  verificar.deepEqual(pedidos, generarOperacion(fecha));
  verificar.equal(pedidos.length, 96);
  verificar.equal(new Set(pedidos.map((pedido) => pedido.numero)).size, 96);
  verificar.equal(new Set(pedidos.map((pedido) => pedido.cliente)).size, 8);
  const estados = new Set(pedidos.map((pedido) => resumirPaquetes(pedido.paquetes).estado));
  verificar.equal(estados.size, 3);
});
prueba('cada paquete mantiene unidades, cronología, estado y versión coherentes', () => {
  const referencia = new Date('2026-10-29T18:00:00Z');
  let rechazos = 0;
  for (const pedido of generarOperacion(referencia)) {
    verificar.equal(pedido.origenDatos, 'sintetico');
    verificar.ok(pedido.fechaCreacion <= referencia);
    verificar.ok(
      pedido.fechaActualizacion >= pedido.fechaCreacion && pedido.fechaActualizacion <= referencia,
    );
    verificar.equal(
      pedido.paquetes.reduce((suma, paquete) => suma + paquete.unidades, 0),
      pedido.cantidad,
    );
    for (const paquete of pedido.paquetes) {
      verificar.ok(paquete.unidades > 0 && paquete.unidades <= 100);
      verificar.equal(paquete.version, paquete.historial.length);
      let estado: typeof paquete.estado = 'pendiente';
      let fechaAnterior = pedido.fechaCreacion;
      for (const evento of paquete.historial) {
        verificar.equal(evento.origen, estado);
        const rechazo = evento.origen === 'revision' && evento.destino === 'en_proceso';
        verificar.equal(siguienteEstado(estado, rechazo ? 'rechazar' : 'avanzar'), evento.destino);
        verificar.ok(evento.fecha >= fechaAnterior && evento.fecha <= referencia);
        if (rechazo) {
          rechazos++;
          verificar.ok(evento.motivo.length > 0);
        }
        estado = evento.destino;
        fechaAnterior = evento.fecha;
      }
      verificar.equal(paquete.estado, estado);
    }
  }
  verificar.ok(rechazos > 0);
});
