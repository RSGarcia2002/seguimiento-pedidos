# Guía breve para presentar la solución

## Recorrido de demostración (3 a 5 minutos)
1. Mostrar el panel: indicadores globales, búsqueda y filtros.
2. Crear un pedido de 250 unidades. Antes de guardarlo, enseñar la vista previa 100 + 100 + 50.
3. Abrir el detalle. Los tres paquetes comienzan Pendiente.
4. Avanzar el paquete de 50 hasta Revisión, rechazarlo con un motivo y consultar el historial.
5. Enviarlo de nuevo a Revisión y marcarlo Listo. Explicar por qué el avance es 20%.
6. Recargar: estados e historial permanecen guardados en MongoDB.
7. Intentar crear otro pedido con el mismo número y mostrar la validación.
8. Abrir Estadísticas: cambiar entre 7, 30 y 90 días, mostrar la tabla diaria y explicar
   que producción del período y avance actual de la cartera son indicadores distintos.
   Aclarar que los 96 pedidos adicionales son sintéticos y sus clientes ficticios.
9. Mostrar el repositorio: especificación, contrato OpenAPI, pruebas y README.

## Decisiones que conviene explicar
- **SDD:** se definieron reglas y contrato antes de implementar y verificar la aplicación.
- **Paquetes embebidos:** creación del pedido en una sola escritura, sin paquetes huérfanos.
- **Número único:** índice MongoDB; no depende solo de una consulta previa ni de Angular.
- **Concurrencia:** estado y versión en la condición de actualización. El historial se agrega
  en la misma escritura; un doble clic no puede saltar estados.
- **Avance:** suma de unidades de paquetes Listos dividida entre unidades totales.
- **Persistencia:** base real; las pruebas comprueban una desconexión y reconexión.
- **Extra:** historial con motivos de rechazo y exportación CSV. Incluye estadísticas, filtros y alertas con resumen por reglas. No requiere una clave para operar. Gemini es opcional y permanece desactivado sin configuración; se probó con una simulación HTTP local.
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

## Recorrido dentro de la aplicación

El botón «Guía paso a paso» del encabezado muestra una visita explicada de las pantallas.
Se ofrece también en la primera visita y puede omitirse. Dura 12 pasos cuando existen
pedidos; utiliza un pedido abierto cuando está disponible, sin ejecutar cambios.
Los pasos de detalle se omiten si la base está vacía. Permite usar Anterior, Siguiente,
Finalizar o Escape y repetirlo después.

## CRUD completo

Desde el detalle se puede editar número y cliente, y cambiar cantidad antes del primer movimiento. Eliminar exige escribir el número exacto y borra definitivamente paquetes e historial. Editar y eliminar utilizan versión del pedido para detectar cambios concurrentes. Demostrarlo únicamente con un pedido creado para la presentación.
