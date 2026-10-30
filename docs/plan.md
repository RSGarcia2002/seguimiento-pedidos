# Plan SDD

## Estado final para entrega

CRUD, estadísticas, alertas, recorrido y manual terminados. Última verificación: 50 comprobaciones backend, una prueba Angular y tres recorridos E2E. La CI queda como plantilla y Gemini desactivado sin clave. El listado siguiente conserva el historial de hitos y sus verificaciones originales.


1. [x] Registrar requisitos y criterios antes de implementar.
2. [x] Crear Angular y API Express con TypeScript estricto.
3. [x] Configurar MongoDB persistente, entorno y scripts.
4. [x] Definir contrato OpenAPI de pedidos.
5. [x] Implementar creación, partición y transiciones con control de concurrencia.
6. [x] Construir panel, formulario y detalle conectados a la API.
7. [x] Añadir búsqueda, filtros, historial, motivos de rechazo y exportación CSV.
8. [x] Verificar reglas, persistencia con MongoDB real y flujo de navegador.
9. [x] Preparar plantilla GitHub Actions y README de instalación y uso de IA.
10. [x] Publicar repositorio público.
11. [ ] Mejora opcional: activar y comprobar GitHub Actions (requiere permiso workflow).
12. [x] Configurar Atlas, crear índice único, conservar pedidos y verificar escritura real.
13. [x] Crear servicio Render gratuito con conexión configurada como secreto.
14. [x] Verificar conectividad Render a Atlas y finalizar el despliegue.
15. [x] Verificar aplicación pública, actualizar enlaces y preparar texto de entrega.

Evidencia local: 24 verificaciones backend (incluido el contenedor de pruebas),
1 prueba del marco Angular y 1 flujo E2E de producción aprobados.
El E2E revisa 1440, 390 y 320px de ancho sin desbordamiento global.
No se confunde una compilación o una solicitud de despliegue con publicación verificada.

## Evidencia pública (29/10/2026)
- Render live: dep-dbhsvlra9ulc73a794s0; código 012dd5493288bda3ce6e162c54350ad2f1378938.
- GET /api/salud: HTTP 200, base conectada.
- Creación y transición reales desde navegador público; 250 unidades, rechazo con motivo,
  50 unidades listas = 20%, recarga persistente y duplicado HTTP 409.
- Se eliminó exclusivamente el pedido temporal de verificación; se conservan los DEMO.
- Listado y detalle revisados con estilos completos; anchos 1440, 390 y 320 sin desborde.
- Capturas de la aplicación pública en docs/capturas/.
- El borrador de correo no se ha enviado.

## Ampliación: datos y estadísticas
16. [x] Definir procedencia sintética, período temporal y contrato de estadísticas.
17. [x] Generar y validar 96 pedidos adicionales con ocho clientes y 90 días.
18. [x] Cargar el lote en Atlas sin sobrescribir pedidos; comprobar segunda carga sin duplicados.
19. [x] Implementar estadísticas con cohortes, producción, calidad, clientes y gráficos accesibles.
20. [x] Aprobar compilación, 32 verificaciones backend, prueba Angular y flujo E2E ampliado.
21. [x] Verificar el nuevo apartado desde la URL pública y actualizar capturas.

Verificación pública de la ampliación: Render live en commit 2f9deae207758918cb25a7b1386baa08d5bb7fe8.
Los períodos 7/30/90 concuerdan entre serie diaria, cartera, actividad y distribución.
Se comprobaron navegación, paginación de 100 pedidos, tabla diaria y anchos 1440/390/320.
Consola del navegador sin errores; capturas públicas actualizadas.
