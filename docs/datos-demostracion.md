# Datos de demostración y estadísticas

## Procedencia
Lote sintético `operacion-sintetica-v1`: 96 pedidos, ocho nombres de clientes ficticios
y 90 días de actividad relativos al instante de la primera generación. No son registros
comerciales de TATA ni evidencias de una operación real. Los cuatro ejemplos anteriores
se conservaron y la muestra inicial de Atlas quedó en 100 pedidos.

Los números TAT-2026-1001 a TAT-2026-1096 son únicos. Las cantidades varían entre 180 y
2279 unidades según una fórmula determinista. Cada pedido se divide en paquetes de
máximo 100, con resto exacto; estado y versión coinciden con el historial.

Los eventos nunca preceden la creación ni superan la fecha de generación. Los rechazos
salen exclusivamente de Revisión y llevan motivos propios de una fabricación de accesorios.
Las duraciones representan horas de calendario, sin afirmar turnos, jornadas o compromisos de entrega.

## Reproducción
`npm run datos:operacion` usa MONGODB_URI de apps/api/.env. La conexión no se imprime.
El generador está en apps/api/src/datos/generador.ts y la carga en apps/api/scripts/poblar-operacion.ts.
El lote conserva su fecha de referencia; repetirlo no mueve las fechas ni sobrescribe datos.
No existe un endpoint público para ejecutar esta carga.

## Definiciones de las estadísticas
- **Período:** últimos 7, 30 o 90 días calendario de Guatemala, hasta el instante de consulta.
- **Cartera:** pedidos creados durante ese período y su estado actual. Avance ponderado por unidades listas.
- **Actividad:** unidades terminadas según eventos destino=Listo durante el período; incluye
  pedidos antiguos que se completaron recientemente. Puede diferir de las unidades listas de la cartera.
- **Estados y clientes:** corresponden exclusivamente a la cartera recibida en el período.
- **Revisiones resueltas:** eventos Revisión->Listo o Revisión->En proceso.
- **Tasa de rechazo:** devoluciones a En proceso / revisiones resueltas * 100.
- **Tiempo medio:** horas transcurridas desde el primer inicio hasta Listo para paquetes
  terminados en el período; incluye rechazos. Sin muestra se devuelve null, no cero.

Los clientes del gráfico se ordenan por volumen de unidades recibido. La línea diaria usa
la fecha civil de Guatemala; el gráfico incluye leyendas y una alternativa tabular accesible.
Las acciones posteriores del usuario actualizan los indicadores en la siguiente consulta.

## Verificación de carga
Primera ejecución en Atlas: 96 agregados; total 100. Segunda ejecución: 0 agregados,
96 del lote existentes; total 100. Las pruebas validan suma de unidades, cronología,
versiones y transiciones, separación de cohortes, límites temporales y métricas vacías.
