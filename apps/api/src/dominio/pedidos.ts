/** Estados persistidos: el orden define las únicas transiciones de avance válidas. */
export const estadosPaquete = ['pendiente', 'en_proceso', 'revision', 'listo'] as const;
export type EstadoPaquete = (typeof estadosPaquete)[number];
export type AccionPaquete = 'avanzar' | 'rechazar';
export const cantidadMaxima = 100_000;

/** Error de negocio con un código HTTP y un mensaje seguro para el usuario. */
export class ErrorNegocio extends Error {
  constructor(
    public readonly estadoHttp: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Evita coerciones como convertir cadenas, booleanos o decimales en cantidades válidas. */
export function dividirEnPaquetes(cantidad: unknown): number[] {
  if (
    typeof cantidad !== 'number' ||
    !Number.isSafeInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > cantidadMaxima
  ) {
    throw new ErrorNegocio(
      400,
      'CANTIDAD_INVALIDA',
      'La cantidad debe ser un entero entre 1 y 100 000.',
    );
  }
  return Array.from({ length: Math.ceil(cantidad / 100) }, (_, indice) =>
    Math.min(100, cantidad - indice * 100),
  );
}

/** El rechazo es la única transición de retorno y solamente parte desde Revisión. */
export function siguienteEstado(estado: EstadoPaquete, accion: AccionPaquete): EstadoPaquete {
  if (accion === 'rechazar') {
    if (estado === 'revision') return 'en_proceso';
    throw new ErrorNegocio(
      409,
      'TRANSICION_INVALIDA',
      'Solo puedes rechazar un paquete en Revisión.',
    );
  }
  const siguiente = estadosPaquete[estadosPaquete.indexOf(estado) + 1];
  if (!siguiente) throw new ErrorNegocio(409, 'TRANSICION_INVALIDA', 'El paquete ya está listo.');
  return siguiente;
}

/** El avance se pondera por unidades; contar paquetes produciría porcentajes incorrectos. */
export function resumirPaquetes(
  paquetes: ReadonlyArray<{ unidades: number; estado: EstadoPaquete }>,
) {
  const conteos = { pendiente: 0, en_proceso: 0, revision: 0, listo: 0 };
  let unidadesListas = 0;
  let unidadesTotales = 0;
  for (const paquete of paquetes) {
    conteos[paquete.estado]++;
    unidadesTotales += paquete.unidades;
    if (paquete.estado === 'listo') unidadesListas += paquete.unidades;
  }
  const estado =
    conteos.listo === paquetes.length
      ? 'completado'
      : conteos.pendiente === paquetes.length
        ? 'pendiente'
        : 'en_curso';
  return {
    totalPaquetes: paquetes.length,
    unidadesListas,
    conteos,
    estado,
    avance: unidadesTotales ? Math.round((unidadesListas / unidadesTotales) * 1000) / 10 : 0,
  };
}

/** Solo se extraen propiedades permitidas; el cliente nunca controla paquetes ni estados iniciales. */
export function validarNuevoPedido(datos: unknown) {
  if (!datos || typeof datos !== 'object')
    throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'Los datos del pedido no son válidos.');
  const entrada = datos as Record<string, unknown>;
  const numero = textoObligatorio(entrada['numero'], 'número de pedido', 50).toUpperCase();
  const cliente = textoObligatorio(entrada['cliente'], 'cliente', 120);
  const unidades = dividirEnPaquetes(entrada['cantidad']);
  return { numero, cliente, cantidad: entrada['cantidad'] as number, unidades };
}

/** Normaliza espacios externos y aplica el mismo límite en servidor y formulario. */
export function textoObligatorio(valor: unknown, campo: string, longitudMaxima: number): string {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > longitudMaxima) {
    throw new ErrorNegocio(
      400,
      'DATOS_INVALIDOS',
      `El ${campo} es obligatorio y admite hasta ${longitudMaxima} caracteres.`,
    );
  }
  return valor.trim();
}

/** Valida la intención y la versión esperada antes de intentar una escritura atómica. */
export function validarTransicion(datos: unknown) {
  if (!datos || typeof datos !== 'object')
    throw new ErrorNegocio(400, 'DATOS_INVALIDOS', 'La transición no es válida.');
  const entrada = datos as Record<string, unknown>;
  if (entrada['accion'] !== 'avanzar' && entrada['accion'] !== 'rechazar')
    throw new ErrorNegocio(400, 'ACCION_INVALIDA', 'La acción debe ser avanzar o rechazar.');
  if (!estadosPaquete.includes(entrada['estadoActual'] as EstadoPaquete))
    throw new ErrorNegocio(400, 'ESTADO_INVALIDO', 'El estado actual no es válido.');
  if (
    typeof entrada['versionActual'] !== 'number' ||
    !Number.isSafeInteger(entrada['versionActual']) ||
    entrada['versionActual'] < 0
  )
    throw new ErrorNegocio(400, 'VERSION_INVALIDA', 'La versión del paquete no es válida.');
  if (
    entrada['motivo'] !== undefined &&
    (typeof entrada['motivo'] !== 'string' || entrada['motivo'].trim().length > 300)
  )
    throw new ErrorNegocio(400, 'MOTIVO_INVALIDO', 'El motivo admite hasta 300 caracteres.');
  const accion = entrada['accion'];
  const estadoActual = entrada['estadoActual'] as EstadoPaquete;
  return {
    accion,
    estadoActual,
    versionActual: entrada['versionActual'],
    motivo: typeof entrada['motivo'] === 'string' ? entrada['motivo'].trim() : '',
    destino: siguienteEstado(estadoActual, accion),
  };
}
