import { createHash } from 'node:crypto';
import { calcularAlertas, type PedidoOperativo } from './alertas.js';
import { calcularEstadisticas, fechaGuatemala } from '../estadisticas/calculo.js';
import { consultarGemini, type ConfiguracionGemini } from './proveedor-gemini.js';

/** El resultado identifica explícitamente qué parte proviene de reglas y cuál de IA. */
export function crearAnalizador(configuracion: ConfiguracionGemini) {
  const cache = new Map<string, { hasta: number; valor: ResultadoAnalisis }>();
  const pendientes = new Map<string, Promise<ResultadoAnalisis>>();
  let diaConsumo = '';
  let consumoDiario = 0;
  async function analizar(
    pedidos: PedidoOperativo[],
    dias: number,
    ahora = new Date(),
  ): Promise<ResultadoAnalisis> {
    const alertas = calcularAlertas(pedidos, ahora);
    const estadisticas = calcularEstadisticas(pedidos, dias, ahora);
    const principales = alertas.alertas.slice(0, 12);
    const base = {
      modo: 'reglas' as 'reglas' | 'ia',
      proveedor: null as string | null,
      motivoProveedor: configuracion.clave ? 'disponible' : 'sin_configurar',
      fechaGeneracion: ahora,
      resumen: `La cartera recibida en ${dias} días reúne ${estadisticas.cartera.pedidos} pedidos, con ${estadisticas.cartera.avance}% de sus unidades listas. Se terminaron ${estadisticas.actividad.unidadesTerminadas} unidades durante el período. Hay ${alertas.resumen.total} alertas activas de seguimiento en la operación.`,
      prioridades: principales
        .slice(0, 3)
        .map((alerta) => ({ alerta, explicacion: alerta.accionSugerida })),
      metricas: {
        dias,
        pedidosPeriodo: estadisticas.cartera.pedidos,
        unidadesTerminadas: estadisticas.actividad.unidadesTerminadas,
        avanceCartera: estadisticas.cartera.avance,
        alertasActivas: alertas.resumen.total,
      },
    };
    if (!configuracion.clave) return base;
    // No se envían identificadores comerciales, nombres ni textos libres del usuario.
    const contexto = {
      metricas: base.metricas,
      calidad: estadisticas.actividad,
      alertas: principales.map((alerta) => ({
        id: alerta.id,
        tipo: alerta.tipo,
        prioridad: alerta.prioridad,
        horasSinMovimiento: alerta.horasSinMovimiento,
        rechazos: alerta.rechazos,
      })),
    };
    const firma = createHash('sha256').update(JSON.stringify(contexto)).digest('hex');
    for (const [clave, valor] of cache) if (valor.hasta <= ahora.getTime()) cache.delete(clave);
    const previo = cache.get(firma);
    if (previo) return previo.valor;
    const pendiente = pendientes.get(firma);
    if (pendiente) return pendiente;
    const dia = fechaGuatemala(ahora);
    if (dia !== diaConsumo) {
      diaConsumo = dia;
      consumoDiario = 0;
    }
    if (consumoDiario >= (configuracion.limiteDiario ?? 20))
      return { ...base, motivoProveedor: 'limite_aplicativo' };
    consumoDiario++;
    const operacion = (async () => {
      try {
        const texto = await consultarGemini(
          contexto,
          new Set(principales.map((alerta) => alerta.id)),
          configuracion,
        );
        const resultado: ResultadoAnalisis = {
          ...base,
          modo: 'ia',
          proveedor: 'Gemini',
          resumen: texto.resumen,
          prioridades: texto.prioridades.map((prioridad) => ({
            alerta: principales.find((alerta) => alerta.id === prioridad.alertaId)!,
            explicacion: prioridad.explicacion,
          })),
        };
        cache.set(firma, { hasta: ahora.getTime() + 300000, valor: resultado });
        return resultado;
      } catch (error) {
        const motivoProveedor =
          error instanceof Error && error.message === 'CUOTA_AGOTADA'
            ? 'cuota_agotada'
            : error instanceof Error && error.message === 'RESPUESTA_INVALIDA'
              ? 'respuesta_no_valida'
              : 'no_disponible';
        return { ...base, motivoProveedor };
      } finally {
        pendientes.delete(firma);
      }
    })();
    pendientes.set(firma, operacion);
    return operacion;
  }
  return analizar;
}

export interface ResultadoAnalisis {
  modo: 'reglas' | 'ia';
  proveedor: string | null;
  motivoProveedor: string;
  fechaGeneracion: Date;
  resumen: string;
  prioridades: {
    alerta: ReturnType<typeof calcularAlertas>['alertas'][number];
    explicacion: string;
  }[];
  metricas: {
    dias: number;
    pedidosPeriodo: number;
    unidadesTerminadas: number;
    avanceCartera: number;
    alertasActivas: number;
  };
}
