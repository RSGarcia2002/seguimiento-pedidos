# Seguimiento operativo gratuito

La aplicación funciona sin claves de IA y sin contratar servicios adicionales. El apartado
**Alertas** genera un resumen verificable por reglas, con métricas reales de la base de
la demostración y enlaces a los pedidos que requieren atención.

## Criterios

- Paquete en revisión durante al menos 72 horas desde su último movimiento.
- Pedido abierto sin cambios durante al menos 120 horas.
- Paquete abierto con dos o más rechazos en su historial.

Las alertas pueden coincidir. Los pedidos completamente terminados quedan excluidos.
Estos umbrales sirven para seguimiento; no equivalen a fechas de entrega incumplidas.
Se muestran hasta 50 alertas por filtro, con el total real y fecha de última actividad.

El resumen combina cartera recibida en 7, 30 o 90 días con alertas actuales de toda la
operación. Los filtros del listado permiten cliente exacto, fechas de creación inclusivas
según Guatemala y orden por antigüedad, menor avance o último movimiento.

## IA generativa opcional

El cliente REST de Gemini está implementado, pero **no está activado sin una clave**.
La entrega funciona íntegramente en modo «Reglas de seguimiento». No se presenta ese
texto como una respuesta generativa. No se ha verificado una llamada real a Google.

Para activarlo opcionalmente, crear una clave de un proyecto sin facturación desde
[Google AI Studio](https://aistudio.google.com/apikey) y configurar `GEMINI_API_KEY`
solo en el servidor. Modelo predeterminado: `gemini-3.1-flash-lite`.
El archivo local ignorado `apps/api/.env.ia` sirve para guardar la clave; no se carga
por defecto. Copiar su variable a `apps/api/.env` para desarrollo o agregarla como secreto
en Render para publicación. Nunca incluirla en Angular, capturas o Git.

El [nivel gratuito del proveedor](https://ai.google.dev/gemini-api/docs/pricing) tiene
cuotas y disponibilidad sujetas a la cuenta. No activar facturación para esta entrega.
La aplicación limita a 20 intentos diarios por proceso, comparte solicitudes simultáneas
y conserva respuestas válidas cinco minutos. Los límites y la caché se reinician al
reiniciar el servidor; no constituyen un control de facturación del proveedor.

Solo se envían métricas agregadas y referencias internas de hasta 12 alertas; no se
incluyen nombres de clientes, números comerciales ni motivos escritos por usuarios.
El proveedor devuelve texto y referencias que el servidor valida. No dispone de
herramientas para modificar registros. Cuota agotada, timeout, errores o referencias
inventadas producen un resumen por reglas con aviso visible.

## Pruebas de la integración externa

Se usa una simulación HTTP local de Postman, sin claves reales ni llamadas a Google:

```sh
postman simulation run postman/simulations/ia.sim.yaml --port 4195 --no-history --output ndjson
# En otra terminal, desde la raíz del proyecto:
npm run test:simulacion -w @pedidos/api
```

Se verifican respuesta válida, agrupación y caché, HTTP 429, HTTP 500, timeout,
referencias inexistentes y límite diario. Estas pruebas establecen el comportamiento
de nuestro cliente ante el contrato simulado, no la disponibilidad del servicio real.
