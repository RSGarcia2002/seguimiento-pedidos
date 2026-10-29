/** Simulación local del contrato Gemini. Nunca se usa en producción ni llama a Google. */
const http = require('http');
let solicitudes = 0;
const servidor = http.createServer((solicitud, respuesta) => {
  const direccion = new URL(solicitud.url, 'http://localhost');
  if (direccion.pathname === '/__control') {
    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
    return respuesta.end(JSON.stringify({ solicitudes }));
  }
  if (solicitud.method !== 'POST' || !/^\/v1beta\/models\/[^/]+:generateContent$/.test(direccion.pathname)) {
    respuesta.writeHead(501); return respuesta.end('Ruta no modelada');
  }
  solicitudes++;
  try {
    const datos = solicitud.body;
    if (!solicitud.headers['x-goog-api-key'] || datos?.generationConfig?.responseMimeType !== 'application/json' || !datos?.generationConfig?.responseJsonSchema) {
      respuesta.writeHead(400); return respuesta.end('Solicitud fuera del contrato');
    }
    const contexto = JSON.parse(datos.contents[0].parts[0].text);
    const texto = process.env.RESPUESTA_INVALIDA === '1'
      ? { resumen: 'Salida inválida', prioridades: [{ alertaId: 'alerta-inexistente', explicacion: 'No debe aceptarse.' }] }
      : { resumen: 'Conviene revisar los paquetes detenidos antes de iniciar más trabajo.', prioridades: contexto.alertas.slice(0, 2).map(alerta => ({ alertaId: alerta.id, explicacion: 'Verificar la evidencia y coordinar el siguiente paso con el área responsable.' })) };
    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
    respuesta.end(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(texto) }] } }] }));
  } catch {
    respuesta.writeHead(400); respuesta.end('Cuerpo no válido');
  }
});
servidor.listen(process.env.PORT || 4500);
