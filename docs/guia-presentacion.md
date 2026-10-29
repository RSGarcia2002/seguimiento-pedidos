# Guía breve para presentar la solución

## Recorrido de demostración (3 a 5 minutos)
1. Mostrar el panel: indicadores globales, búsqueda y filtros.
2. Crear un pedido de 250 unidades. Antes de guardarlo, enseñar la vista previa 100 + 100 + 50.
3. Abrir el detalle. Los tres paquetes comienzan Pendiente.
4. Avanzar el paquete de 50 hasta Revisión, rechazarlo con un motivo y consultar el historial.
5. Enviarlo de nuevo a Revisión y marcarlo Listo. Explicar por qué el avance es 20%.
6. Recargar: estados e historial permanecen guardados en MongoDB.
7. Intentar crear otro pedido con el mismo número y mostrar la validación.
8. Mostrar el repositorio: especificación, contrato OpenAPI, pruebas y README.

## Decisiones que conviene explicar
- **SDD:** se definieron reglas y contrato antes de implementar y verificar la aplicación.
- **Paquetes embebidos:** creación del pedido en una sola escritura, sin paquetes huérfanos.
- **Número único:** índice MongoDB; no depende solo de una consulta previa ni de Angular.
- **Concurrencia:** estado y versión en la condición de actualización. El historial se agrega
  en la misma escritura; un doble clic no puede saltar estados.
- **Avance:** suma de unidades de paquetes Listos dividida entre unidades totales.
- **Persistencia:** base real; las pruebas comprueban una desconexión y reconexión.
- **Extra:** historial con motivos de rechazo y exportación CSV. No se necesita una API de IA
  para operar; la IA se utilizó como agente durante el desarrollo.
- **Publicación:** un servidor Express sirve API y Angular desde el mismo origen; Atlas guarda
  los datos fuera del sistema de archivos del alojamiento.

## Uso de IA y error real
Codex ayudó con especificación, implementación y verificación. Un error de inferencia de
Mongoose con nombres de fechas en español rompió la compilación. Se corrigió usando
nombres literales (`as const`), manteniendo el tipado estricto y validando con pruebas reales.

## Límites que se deben comunicar
La aplicación de evaluación no incluye autenticación, eliminación o edición de cantidades.
El límite de 100000 unidades mantiene acotados los documentos. Los pedidos DEMO son ejemplos.
La publicación solo se declara completa después de verificar la URL pública.
La CI está preparada como plantilla; activarla requiere permiso workflow en GitHub.
