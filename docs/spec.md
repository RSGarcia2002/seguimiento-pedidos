# Especificación: seguimiento de pedidos

Estado: especificación definida antes de implementar; versión v1 implementada y verificada.

## Objetivo
Registrar pedidos y seguir su producción por paquetes, con persistencia en MongoDB.
Interfaz en español. Stack: Angular, Node.js, Express, MongoDB y TypeScript.

## Reglas y aceptación
- R01: pedido con número y cliente obligatorios, sin espacios externos; cantidad entera positiva.
- R02: número único, normalizado a mayúsculas, protegido por índice único en MongoDB.
- R03: paquetes de 1 a 100 unidades cuya suma coincide con la cantidad del pedido.
  Ejemplos: 1 -> [1], 100 -> [100], 101 -> [100, 1], 250 -> [100, 100, 50].
- R04: cada paquete inicia Pendiente. Solo avanza a En proceso, Revisión y Listo, en orden.
- R05: únicamente desde Revisión puede rechazarse para volver a En proceso.
- R06: el servidor aplica las reglas y evita transiciones desde un estado desactualizado.
- R07: resumen por pedido con conteo de paquetes por estado y avance =
  unidades de paquetes Listos / unidades totales * 100, mostrado con hasta un decimal.
  Un paquete de 50 listo en un pedido de 250 equivale al 20%.
- R08: los datos sobreviven a recargas y reinicios de la aplicación.

## Diseño previsto
Pedidos con paquetes embebidos en un documento; creación en una sola escritura.
Actualizar paquetes con condición sobre su estado actual para evitar avances simultáneos.
Dos vistas: listado con búsqueda por número o cliente y detalle con acciones por paquete.
No se incluyen edición de cantidades, eliminación, autenticación o funciones con IA en la base inicial.
Extra previsto tras completar lo obligatorio: historial de transiciones.

## Pruebas pendientes de negocio
Validar cantidades 0, negativas, decimales, texto y campos vacíos; duplicados normalizados;
partición en límites; todas las transiciones válidas e inválidas; rechazo;
avance ponderado, estado obsoleto y persistencia real en MongoDB.

## Entrega
Aplicación pública y repositorio público con código, pruebas y README de instalación.
Documentar un error real del agente y su corrección; declarar pendientes con honestidad.

## Identidad visual
Referencia solicitada: https://tataaccessories.org/es (revisada el 29/10/2026).
Adaptar al panel la tipografía Jost, blanco #FFFFFF, gris #F3F3F3,
texto #121212, acento vino #9E252D y oscuro secundario #242833.
Usar superficies limpias, bordes discretos, esquinas de 4px y jerarquía clara.
Centralizar colores en variables CSS; conservar etiquetas textuales para los estados.
El diseño debe funcionar desde 320px de ancho y permitir navegación por teclado.
La versión final identifica el panel como control de producción para la demostración técnica.

## Contrato de implementación v1
- Estados técnicos: pendiente, en_proceso, revision, listo; etiquetas visibles en español.
- Número de pedido de 1 a 50 caracteres y cliente de 1 a 120; cantidad entre 1 y 100000.
  El límite admite hasta 1000 paquetes por pedido y evita documentos MongoDB excesivos.
- Crear con POST /api/pedidos: numero, cliente, cantidad. HTTP 201; 400 inválido; 409 duplicado.
- GET /api/pedidos admite busqueda (máximo 80), estado (todos, pendiente, en_curso,
  completado), pagina (desde 1) y limite (12 por defecto, máximo 100).
  Devuelve pedidos resumidos, total filtrado, pagina, totalPaginas y resumen global.
- GET /api/pedidos/:id devuelve pedido completo, paquetes e historial por paquete.
- POST /api/pedidos/:id/paquetes/:paqueteId/transiciones recibe accion (avanzar o rechazar),
  estadoActual, versionActual (entero desde cero), motivo opcional de máximo 300 caracteres.
  Rechazar solo desde revision; motivo opcional. Devuelve el detalle actualizado.
  HTTP 404 si no existe y 409 si otro usuario ya modificó ese paquete.
- La versión se incrementa con cada transición para impedir conflictos incluso después
  de un ciclo revisión -> rechazo -> revisión. Cambio e historial se guardan atómicamente.
- Estado de pedido derivado: completado si todos están listos, pendiente si todos están
  pendientes y en_curso en los demás casos. El avance siempre se pondera por unidades.
- Los errores usan {error: {codigo, mensaje}}. No se aceptan propiedades arbitrarias del cliente.
- Historial real en MongoDB con fecha, origen, destino y motivo. Exportación CSV del listado
  visible como extra de uso local. No requiere llamadas a proveedores externos de IA.
- Producción: Express sirve el frontend Angular y /api desde el mismo origen.
  El despliegue público y la conexión Atlas se verificarán antes de declarar la entrega completa.

## Compatibilidad de estilos en producción
La política de seguridad de Express no permite scripts ni manejadores JavaScript HTML inline.
El build de Angular debe cargar CSS con enlaces ordinarios, sin activación mediante scripts inline.
Se desactiva únicamente la extracción de CSS crítico (inlineCritical), manteniendo minificación.
El flujo E2E debe comprobar que el botón primario conserva fondo vino y espaciado de diseño.

## Ampliación: operación sintética y estadísticas
- Añadir 96 pedidos sintéticos, 8 clientes ficticios y 90 días de actividad, conservando
  los pedidos existentes. Lote versionado e idempotente, sin cambios al repetirlo.
- Identificar origenDatos=sintetico y loteDatos; pedidos manuales conservan su origen.
  La interfaz identifica el entorno como demostración para no atribuir operaciones reales.
- Cronología: creación <= eventos <= instante de generación; estados y versiones derivan
  del historial válido, incluidos rechazos solamente desde revisión.
- GET /api/estadisticas?dias=7|30|90 (30 por defecto). Días calendario de Guatemala (UTC-6),
  hasta el instante de consulta; se excluyen eventos futuros.
- Resumen de cartera: pedidos recibidos en el período y su estado actual, unidades listas
  y avance ponderado. Distribución por unidades y paquetes; clientes por volumen recibido.
- Actividad: serie diaria de pedidos/unidades recibidos y unidades terminadas según el
  evento destino=listo, incluyendo pedidos creados antes del período.
- Calidad: revisiones resueltas (revision->listo o revision->en_proceso), rechazos y
  porcentaje de rechazo; no confundir eventos de rechazo con número de pedidos.
- Tiempo medio: horas transcurridas entre primer inicio y terminación de paquetes
  terminados durante el período, incluyendo los ciclos de rechazo; null si no hay muestra.
- Vista /estadisticas con selector de período, gráficos SVG accesibles, leyendas,
  tabla de datos y mensajes de carga/error. Estadísticas derivadas de MongoDB.

## Ampliación: seguimiento operativo y análisis gratuito
- Alertas derivadas del estado actual: Revisión sin movimiento >=72h, pedidos no completados
  sin actividad >=120h y paquetes no listos con >=2 rechazos. Son umbrales de demostración,
  no incumplimientos de plazos de entrega. No se modifica ningún estado al analizarlos.
- GET /api/operacion/alertas?tipo=todos|revision_demorada|pedido_inactivo|rechazos_repetidos.
  Incluye fecha, umbrales, resumen global y hasta 50 alertas ordenadas por prioridad y antigüedad.
- POST /api/operacion/analisis {dias:7|30|90}: devuelve resumen, prioridades con evidencia,
  modo=reglas|ia, motivoProveedor y fechaGeneracion. Las alertas son globales; la cartera y
  producción del resumen respetan el período seleccionado.
- Sin clave Gemini, sin cuota o ante fallos: resumen determinista identificado como reglas.
  Integración opcional Gemini 3.1 Flash-Lite para Free Tier sin activar facturación.
- La IA solo recibe métricas agregadas e IDs internos de alertas; no nombres de clientes,
  números de pedidos, motivos libres ni credenciales. Solo puede referenciar alertas reales.
- Tiempo máximo de proveedor 20s, respuesta validada, caché 5min por contexto, solicitudes
  simultáneas agrupadas y límite aplicativo de 20 generaciones diarias por proceso.
  No hay cambio automático de proveedor/modelo ni activación de planes pagados.
- Listado: cliente exacto, desde/hasta (fechas civiles de Guatemala incluyentes) y orden
  recientes|antiguos|menor_avance|sin_movimiento. Fechas inválidas o invertidas devuelven 400.
  Los filtros actúan antes de la paginación; el resumen superior continúa siendo global.

## Recorrido guiado de la interfaz

La primera visita ofrece una bienvenida que permite comenzar u omitir el recorrido. El
encabezado mantiene «Guía paso a paso» para repetirlo. La preferencia se guarda solo en
el navegador y su ausencia o bloqueo no impide usar la aplicación.

La guía destaca elementos existentes y explica listado, creación, filtros, CSV, detalle,
paquetes, historial, estadísticas, alertas y resumen. Navega entre secciones con controles
Anterior/Siguiente, contador de pasos, cierre y tecla Escape. El detalle utiliza un pedido
existente; si no hay pedidos, omite sus pasos. No crea registros, cambia estados, genera
resúmenes ni abre acciones de escritura automáticamente. Los fallos de carga no bloquean
el cierre. El diálogo conserva el foco, admite teclado y se adapta a móviles.

No se modifica el contrato HTTP: la guía reutiliza únicamente consultas GET existentes.

## CRUD completo de pedidos

- C: POST existente; R: listado y detalle existentes.
- U: PUT /api/pedidos/:id recibe numero, cliente, cantidad y versionPedidoActual.
  Reutiliza normalización, unicidad y límites de creación. Número y cliente pueden
  corregirse en cualquier estado. La cantidad solo cambia si todos los paquetes siguen
  pendientes, sin historial y con versión cero; en ese caso se regeneran atómicamente.
  Si la cantidad no cambia, se conservan identificadores e historial de paquetes.
- D: DELETE /api/pedidos/:id recibe numeroConfirmacion exacto y versionPedidoActual.
  Elimina definitivamente pedido, paquetes e historial. La interfaz informa el efecto
  en estadísticas y exige escribir el número del pedido antes de confirmar.
- Cada edición y transición incrementa versionPedido. Documentos anteriores sin ese
  campo se interpretan como versión cero. Editar y eliminar comparan la versión en la
  misma operación atómica para evitar sobrescribir cambios concurrentes.
- HTTP 400 para entradas inválidas o confirmación incorrecta, 404 si no existe y 409
  para duplicado, cantidad bloqueada o versión obsoleta; DELETE correcto devuelve 204.
- La interfaz ofrece Editar y Eliminar en detalle, mensajes de resultado y tratamiento
  de conflictos. Se actualizan listado y estadísticas en su siguiente consulta.
- Las pruebas destructivas usan únicamente registros y bases de pruebas propios.
