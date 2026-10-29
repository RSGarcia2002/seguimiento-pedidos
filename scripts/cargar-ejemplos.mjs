/** Crea ejemplos identificables mediante la API real; no sustituye la persistencia por datos ficticios. */
const direccionApi = process.env['API_URL'] ?? 'http://127.0.0.1:3000';
const ejemplos = [
  { numero: 'DEMO-250', cliente: 'Cliente de demostración A', cantidad: 250, estados: [0, 2, 3] },
  { numero: 'DEMO-480', cliente: 'Cliente de demostración B', cantidad: 480, estados: [3, 3, 1, 2, 0] },
  { numero: 'DEMO-1200', cliente: 'Cliente de demostración C', cantidad: 1200, estados: [] },
  { numero: 'DEMO-100', cliente: 'Cliente de demostración D', cantidad: 100, estados: [3] },
];
for (const ejemplo of ejemplos) {
  const respuesta = await fetch(`${direccionApi}/api/pedidos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero: ejemplo.numero, cliente: ejemplo.cliente, cantidad: ejemplo.cantidad }),
    signal: AbortSignal.timeout(15000),
  });
  if (respuesta.status === 409) { console.log(`${ejemplo.numero} ya existe; se conserva sin cambios.`); continue; }
  if (!respuesta.ok) throw new Error(`No se pudo crear ${ejemplo.numero}: HTTP ${respuesta.status}`);
  const pedido = await respuesta.json();
  for (const [indice, avances] of ejemplo.estados.entries()) {
    const paquete = pedido.paquetes[indice];
    for (let versionActual = 0; versionActual < avances; versionActual++) {
      const cambio = await fetch(`${direccionApi}/api/pedidos/${pedido.id}/paquetes/${paquete.id}/transiciones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'avanzar', estadoActual: ['pendiente', 'en_proceso', 'revision'][versionActual], versionActual }),
        signal: AbortSignal.timeout(15000),
      });
      if (!cambio.ok) throw new Error(`No se pudo avanzar un paquete de ${ejemplo.numero}.`);
    }
  }
  console.log(`Ejemplo ${ejemplo.numero} creado mediante la API.`);
}
