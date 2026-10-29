# Registro del trabajo con IA

## Preparación
Se especificaron primero las reglas de negocio en docs/spec.md.
Se generó el frontend con Angular CLI y se preparó una API Express independiente.

## Incidencia real de preparación
El agente intentó crear el directorio del proyecto en un comando cuyo directorio de trabajo
ya apuntaba a esa carpeta inexistente. El proceso no pudo iniciarse.
Corrección: crear primero la carpeta desde /tmp y ejecutar después el generador dentro de ella.
Verificación: el generador creó correctamente el proyecto Angular.
Este registro se ampliará si aparecen errores de implementación; no se inventarán incidentes.

## Compatibilidad detectada
El Node global es 25.9.0 y queda fuera del rango declarado por Angular CLI 22.2.5.
Se utilizó Node 24 a través de npm exec sin reemplazar la instalación global.

## Error real de implementación: inferencia de fechas en Mongoose
Al añadir timestamps con nombres en español, TypeScript infirió los nombres como
cadenas abiertas y produjo un índice de tipo Date para las propiedades del pedido.
La compilación falló al crear y presentar pedidos.
Corrección: declarar los nombres de timestamps como literales con `as const`.
Verificación: compilación estricta y pruebas de integración con MongoDB real aprobadas,
incluyendo la creación, consulta, transiciones y reconexión de datos.

## Comprobación de interfaz
El flujo E2E usa el servidor y Angular compilados con MongoDB real en una base separada.
Crea 250 unidades, comprueba 100/100/50, rechaza y vuelve a revisar el último paquete,
lo completa, verifica 20% tras recargar, busca, exporta CSV y rechaza un duplicado.
Se revisan anchos 1440, 390 y 320 sin desbordamiento global.

## Ajuste de la vista previa
El servidor de desarrollo detectó el componente antes de que se escribiera su HTML
y conservó la compilación anterior tras el error de plantilla ausente.
La compilación de producción sí era correcta. Se reinició el servidor de desarrollo
una vez existentes los archivos para que la vista previa sirviera el panel actual.

## Publicación del repositorio
GitHub creó el repositorio público pero rechazó el primer push porque la credencial
OAuth no tiene permiso workflow. Se conservó la configuración como plantilla
`docs/ci/verificacion-github.yml`, sin activar automatizaciones, y se volvió a enviar
el código. Las pruebas se ejecutaron localmente; no se declara CI aprobada.

## Conexión a Atlas
Se configuró la URI únicamente en archivos locales ignorados por Git y con permisos 600.
Se verificaron conexión, colección e índice único; se conservaron los cuatro pedidos
locales en Atlas sin sobrescribir registros existentes. Una creación de 250 unidades
por HTTP se confirmó directamente en Atlas con paquetes 100/100/50; se eliminó únicamente
ese registro temporal de verificación. La aplicación local ya apunta a Atlas.
Se creó el servicio gratuito Render autorizado; su conexión pública se verificará por separado.

## Corrección detectada en la revisión visual pública
La funcionalidad HTTP y el flujo E2E funcionaban, pero los botones perdían estilos.
La optimización de CSS crítico de Angular generaba enlaces media=print que se activaban con un script inline;
Helmet bloqueaba ese script por la política CSP. El código no relajó la seguridad:
se desactivó inlineCritical para cargar todo el CSS con un enlace ordinario y se añadió
una comprobación E2E del color del botón para detectar esta regresión en producción.

Al verificar los estilos completos, la prueba móvil detectó que el texto accesible
posicionado dentro de la tabla podía ampliar el ancho de la página. Se definió el
contenedor de la tabla como referencia de posicionamiento para mantener ese texto
contenido dentro de su área desplazable, conservando la accesibilidad.

## Publicación verificada
Con los dos rangos de salida de Render autorizados por el usuario en Atlas,
el servicio arrancó correctamente. Tras corregir los estilos y el contenedor de tabla,
Render quedó live en el commit 012dd5493288bda3ce6e162c54350ad2f1378938.
Se verificaron HTTP 200, conexión con Atlas, flujo público real, persistencia,
duplicados, diseño móvil y ausencia de errores de consola. La verificación eliminó
solamente el pedido temporal que creó; los cuatro ejemplos permanecen disponibles.

## Ampliación de datos y estadísticas
Se definieron primero procedencia sintética, criterios temporales y contrato de métricas.
Se implementaron el generador determinista, carga aditiva e idempotente, endpoint estadístico
con períodos de Guatemala y gráficos SVG con alternativa tabular. Primera carga Atlas:
96 pedidos nuevos y total 100; segunda carga: cero nuevos. Se conservaron los datos anteriores.
Se verificaron cartera vs actividad, producción de pedidos anteriores, rechazo por revisión,
horas transcurridas, estados sin muestra y navegación móvil del panel estadístico.

La ampliación quedó publicada en Render y se verificaron sus totales en 7/30/90 días.
La revisión pública confirmó indicadores coherentes, navegación, tabla diaria, 100 pedidos
paginados y ausencia de errores de consola o desbordamientos en 1440/390/320px.

### Seguimiento operativo y alternativa gratuita — 29/10/2026

- Especificación y contrato ampliados antes de implementar alertas, resumen y filtros.
- Se añadieron tres tipos de alerta con evidencia, exclusión de pedidos terminados y vínculos.
- El resumen funciona por reglas sin claves. Por preferencia de una entrega gratuita,
  Gemini queda opcional, desactivado y sin facturación configurada.
- El cliente externo se verifica mediante seis pruebas HTTP contra Postman local:
  éxito, caché/agrupación, cuota, error, timeout, referencia inválida y límite diario.
  No se realizó una llamada real a Google; no se afirma disponibilidad de su cuenta.
- Un puerto bloqueado por fetch (4190) impidió inicialmente la simulación; se corrigió
  a 4195. Un selector ambiguo del formulario se corrigió usando el campo dentro del diálogo.
- Compilación y 41 comprobaciones backend más una prueba Angular aprobadas.
- Recorrido E2E de creación, rechazo, cierre, CSV, estadísticas y resumen gratuito
  aprobado en Chrome. Sin desbordamiento horizontal a 1440, 390 y 320 píxeles.
- Revisión visual del panel con los 100 pedidos de Atlas: 129 alertas actuales
  (108 revisiones y 21 pedidos sin actividad); ningún cambio de datos por el análisis.
- Publicación aa9a172 confirmada live en Render (dep-dbhtfh4s728c73d5qm4g).
  Verificación pública GET alertas y POST análisis: reglas/sin_configurar; filtro exacto
  de cliente: 12 coincidencias válidas. Chrome sin errores y sin desbordamiento móvil.
