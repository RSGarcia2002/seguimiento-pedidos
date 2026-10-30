# Guion de presentación y defensa

Fecha prevista: viernes 30 de octubre de 2026. Duración sugerida: 6 a 8 minutos.
Presentar la aplicación real; el manual y sus capturas sirven como respaldo.

## 1. Preparación antes de la reunión

- Abrir la aplicación 10 minutos antes para permitir que Render se reactive.
- Tener abiertas las pestañas Pedidos, Estadísticas, Alertas y el README de GitHub.
- Abrir el manual PDF y este guion como respaldo local.
- Revisar que /api/salud responda con baseDatos conectada.
- Omitir la bienvenida si se va a realizar una demostración manual.
- Usar un pedido nuevo y claramente identificable, por ejemplo PRESENTACION-3010-01.
- No editar ni eliminar los pedidos de muestra para demostrar el CRUD.

## 2. Apertura: 30 segundos

«Desarrollé una aplicación para registrar pedidos y dar seguimiento a su producción por paquetes. Utilicé Angular y TypeScript en la interfaz, Node.js con Express en el servidor y MongoDB Atlas para persistir los datos. Seguí SDD: primero definí las reglas y el contrato, después implementé y verifiqué con apoyo de Codex».

## 3. Demostración: 5 a 6 minutos

### Paso 1. Panel y creación: 45 segundos

Mostrar indicadores y pulsar Nuevo pedido. Registrar un número nuevo, un cliente de demostración y 250 unidades.

«El servidor valida que la cantidad sea entera positiva y que el número sea único. Divide 250 unidades en paquetes de 100, 100 y 50. La vista previa explica el resultado, pero la autoridad de la regla está en el backend».

Guardar y mostrar los tres paquetes pendientes.

### Paso 2. Edición: 30 segundos

Pulsar Editar pedido. Corregir el cliente, mantener las 250 unidades y guardar.

«El CRUD permite corregir número y cliente. La cantidad solo puede cambiar antes del primer movimiento; después se bloquea para conservar paquetes e historial. Cada edición utiliza la versión actual del pedido».

### Paso 3. Producción, rechazo y avance: 90 segundos

En el paquete de 50 unidades: Iniciar, Enviar a revisión, Rechazar. Escribir «Revisar acabado» y confirmar. Consultar el historial; enviar nuevamente a Revisión y marcar Listo.

«Los estados solo avanzan en orden. La única devolución permitida es de Revisión a En proceso. Estado, versión e historial se guardan en la misma escritura atómica».

«El avance es 20 %, porque hay 50 unidades listas de 250. No se calcula por número de paquetes».

Recargar y comprobar que el estado y el historial permanecen.

### Paso 4. Consultas y estadísticas: 45 segundos

Volver al listado, buscar el pedido y señalar filtros y CSV. Abrir Estadísticas y cambiar el período.

«La cartera corresponde a pedidos creados durante el período. La actividad cuenta lo terminado dentro de esas fechas, incluso si el pedido se recibió antes. Los indicadores se calculan con MongoDB y la muestra ampliada es sintética».

### Paso 5. Alertas y resumen: 40 segundos

Abrir Alertas y generar un resumen.

«Las alertas detectan revisiones detenidas, pedidos sin cambios y rechazos repetidos. El resumen actual funciona por reglas, sin una clave externa. Gemini quedó como integración opcional, probada por simulación, pero no activada ni verificada con Google. El análisis no modifica pedidos».

### Paso 6. Eliminación: 30 segundos

Abrir únicamente el pedido creado para la demostración. Pulsar Eliminar pedido, mostrar el aviso, escribir su número exacto y confirmar si se desea limpiar el ejemplo.

«Eliminar borra definitivamente el pedido, sus paquetes e historial. Por eso exige una confirmación explícita y comprueba la versión antes de borrar. Las estadísticas se recalculan en la siguiente consulta».

### Paso 7. Evidencia técnica y cierre: 40 segundos

Mostrar README, docs/spec.md, docs/openapi.json y los directorios de pruebas.

«La entrega incluye 50 comprobaciones backend, una prueba Angular y tres recorridos E2E aprobados. Las pruebas de datos usan bases aisladas. También preparé un manual técnico y de usuario, y una guía interactiva de 12 pasos».

«La aplicación está publicada y el código es público. El alcance actual no incluye autenticación y utiliza datos sintéticos. La plantilla de CI está disponible, pero no activada».

## 4. Preguntas frecuentes de defensa

### ¿Por qué Angular, Node.js y MongoDB?

Angular organiza la interfaz en componentes, formularios y rutas. Node.js permite utilizar TypeScript también en el servidor. MongoDB permite guardar pedido, paquetes e historial como un documento, con escrituras atómicas sobre esa unidad.

### ¿Qué significa SDD en este proyecto?

Definí requisitos, reglas y criterios en docs/spec.md, y el contrato HTTP en docs/openapi.json antes de implementar los comportamientos. Después comprobé esas reglas con pruebas y registré incidencias en docs/agent-log.md.

### ¿Cómo evitas pedidos duplicados?

Normalizo el número a mayúsculas y elimino espacios externos. Un índice único de MongoDB resuelve incluso dos creaciones simultáneas. Un duplicado devuelve HTTP 409.

### ¿Qué pasa si dos personas cambian un pedido?

Las transiciones comparan estado y versión del paquete. La edición y eliminación comparan versionPedido. La escritura es atómica: una solicitud obsoleta se rechaza para que se consulten los datos actuales.

### ¿Por qué se bloquea la cantidad después de iniciar?

Cambiarla obligaría a redefinir paquetes con movimientos existentes. La regla protege la coherencia del avance y del historial. Número y cliente siguen siendo corregibles.

### ¿Dónde están los datos y qué pasa si se reinicia Render?

Los datos están en MongoDB Atlas, separados del sistema de archivos del servicio. Reiniciar la aplicación no elimina los pedidos. El servidor comprueba su conexión antes de aceptar tráfico.

### ¿Qué hizo Codex y qué error hubo?

Ayudó con especificación, implementación, documentación y pruebas. Un error de inferencia en timestamps de Mongoose rompió la compilación al usar nombres de fechas en español. Se corrigió con literales as const, manteniendo el tipado estricto y verificando con pruebas reales.

### ¿La aplicación usa IA generativa ahora?

El desarrollo se hizo con apoyo de un agente de IA, como pide la prueba. El resumen en ejecución funciona por reglas. El cliente Gemini es opcional; sus respuestas y fallos se probaron con simulación HTTP, sin afirmar una llamada real al proveedor.

### ¿Qué mejorarías para un uso empresarial?

Autenticación y permisos, identificación del operador en auditoría, estrategia de respaldo y recuperación, límites de uso compartidos, monitoreo y CI activa. La versión presentada es una demostración funcional, no una plataforma multiempresa.

## 5. Si algo falla durante la presentación

- Si Render está reactivándose, abrir el repositorio y explicar la arquitectura mientras carga.
- Si el número ya existe, usar otro número; no eliminar un pedido ajeno para continuar.
- Si aparece un conflicto, actualizar y explicar el control de concurrencia.
- Si no hay Internet, usar el PDF para explicar las pantallas y mostrar el código local. Las capturas son evidencia de la aplicación, no una demostración en vivo.
- No activar una clave, facturación, CI o funciones nuevas durante la presentación.

## 6. Mensaje de cierre

«La solución cumple el flujo solicitado, conserva los datos y agrega herramientas de consulta y seguimiento. Las reglas están especificadas, las operaciones se verifican en el servidor y la entrega incluye pruebas y documentación para reproducirla».
