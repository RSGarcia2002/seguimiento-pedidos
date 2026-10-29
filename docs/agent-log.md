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
