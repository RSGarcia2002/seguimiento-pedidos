# Verificación final de entrega

Comprobación realizada: 29/10/2026 18:42 (CST). Los resultados describen este momento; volver a abrir los enlaces antes de enviar.

## Publicación

- Aplicación: https://seguimiento-pedidos-tata.onrender.com/
- Repositorio público: https://github.com/RSGarcia2002/seguimiento-pedidos
- Código funcional publicado: 28b733301b95b3b90cb4a478251246755ba58b44.
- Despliegue Render: dep-dbhu8mmq1p3s73fraq1g, estado live confirmado.
- /api/salud: correcto; MongoDB conectada.
- Muestra conservada: 100 pedidos. Las cifras de estadísticas son dinámicas.
- Listado, detalle, estadísticas y alertas abiertos con Chrome sin errores de ejecución.
- Revisados anchos de 1440, 390 y 320 píxeles sin desbordamiento horizontal.
- Resumen operativo: modalidad reglas; Gemini no activado sin clave.

## Pruebas de cierre

- npm test: 50 comprobaciones backend y una prueba Angular aprobadas.
- npm run build: compilación de producción aprobada, sin avisos de presupuesto.
- PLAYWRIGHT_CHANNEL=chrome npm run test:e2e: tres recorridos aprobados.
- CRUD público comprobado previamente con un pedido temporal creado para la prueba; eliminado y con GET posterior 404. No se modificaron los pedidos de muestra.
- Las seis pruebas HTTP simuladas de Gemini están registradas en la bitácora; no prueban disponibilidad real de Google.
- Manual PDF de 22 páginas y guion de 4 páginas renderizados y revisados visualmente.

## Alcance y envío

La evaluación solicita responder al correo con los enlaces antes de 24 horas desde la recepción. La hora exacta se verifica en ese correo. El borrador está listo, pero no se ha enviado ningún mensaje.

Límites declarados: demostración sin autenticación; datos sintéticos; CI preparada como plantilla y no activada; integración generativa opcional desactivada. No impiden operar las funcionalidades requeridas.
