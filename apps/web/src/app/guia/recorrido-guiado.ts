import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ServicioPedidos } from '../pedidos/servicio-pedidos';

interface PasoRecorrido {
  titulo: string;
  texto: string;
  ruta: string;
  selector: string;
}

const claveBienvenida = 'tata-recorrido-v1';

/** Presenta una visita de solo lectura: navegar nunca ejecuta las acciones explicadas. */
@Component({
  selector: 'app-recorrido-guiado',
  templateUrl: './recorrido-guiado.html',
  styleUrl: './recorrido-guiado.scss',
})
export class RecorridoGuiado implements AfterViewInit {
  private readonly navegador = inject(Router);
  private readonly servicio = inject(ServicioPedidos);
  private readonly destruccion = inject(DestroyRef);
  private secuencia = 0;
  private focoAnterior: HTMLElement | null = null;
  @ViewChild('dialogo') dialogo!: ElementRef<HTMLDialogElement>;
  @ViewChild('titulo') titulo!: ElementRef<HTMLHeadingElement>;
  readonly bienvenida = signal(true);
  readonly preparando = signal(false);
  readonly indice = signal(0);
  readonly pasos = signal<PasoRecorrido[]>([]);
  readonly destacado = signal<{
    izquierda: number;
    arriba: number;
    ancho: number;
    alto: number;
  } | null>(null);
  readonly tarjetaArriba = signal(false);
  readonly aviso = signal('');

  ngAfterViewInit() {
    // La bienvenida no reaparece tras omitir o terminar; no depende de cookies del servidor.
    const temporizador = setTimeout(() => {
      try {
        if (localStorage.getItem(claveBienvenida)) return;
      } catch {
        /* El almacenamiento bloqueado no impide usar la guía. */
      }
      this.abrir();
    }, 400);
    this.destruccion.onDestroy(() => {
      clearTimeout(temporizador);
      this.secuencia++;
    });
  }

  /** También se invoca desde el acceso permanente del encabezado. */
  abrir() {
    if (this.dialogo.nativeElement.open) return;
    this.focoAnterior =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.bienvenida.set(true);
    this.preparando.set(false);
    this.destacado.set(null);
    this.aviso.set('');
    this.dialogo.nativeElement.showModal();
    this.titulo.nativeElement.focus();
  }

  async comenzar() {
    if (this.preparando()) return;
    this.preparando.set(true);
    const secuencia = ++this.secuencia;
    let idPedido: string | undefined;
    try {
      // Solo se consulta el listado. No se crean pedidos de ejemplo ni se alteran datos.
      idPedido = (await this.servicio.listar('', 'en_curso', 1)).pedidos[0]?.id;
      if (!idPedido) idPedido = (await this.servicio.listar('', 'todos', 1)).pedidos[0]?.id;
    } catch {
      /* El resto de las secciones se puede explicar aunque falle esta consulta. */
    }
    if (secuencia !== this.secuencia) return;
    const pasos: PasoRecorrido[] = [
      {
        titulo: 'Tu centro de producción',
        texto:
          'Aquí ves todos los pedidos, cuántos siguen en curso y cuántas unidades están listas. Los indicadores superiores abarcan toda la operación.',
        ruta: '/',
        selector: '.indicadores',
      },
      {
        titulo: 'Registra un pedido',
        texto:
          'En «Nuevo pedido» ingresas un número único, el cliente y la cantidad de unidades. La aplicación lo divide en paquetes de hasta 100 unidades y muestra una vista previa antes de guardar.',
        ruta: '/',
        selector: '[data-guia="nuevo-pedido"]',
      },
      {
        titulo: 'Encuentra lo que necesitas',
        texto:
          'Busca por número o cliente y combina estado, cliente, fechas de creación y orden. Pulsa «Buscar» para aplicar los filtros o «Limpiar filtros» para volver al listado completo.',
        ruta: '/',
        selector: '.buscador',
      },
      {
        titulo: 'Consulta y exporta',
        texto:
          'Cada fila muestra unidades, paquetes y avance. «Ver detalle» abre el seguimiento del pedido. «Exportar página CSV» descarga las filas de la página que estás consultando.',
        ruta: '/',
        selector: '.tabla-contenedor',
      },
    ];
    if (idPedido)
      pasos.push(
        {
          titulo: 'El avance de un pedido',
          texto:
            'El avance se calcula por unidades listas. «Editar pedido» permite corregir número y cliente; la cantidad solo cambia antes de iniciar producción. «Eliminar pedido» borra también paquetes e historial y exige confirmar el número. La guía no ejecuta estas acciones.',
          ruta: `/pedidos/${idPedido}`,
          selector: '.resumen-detalle',
        },
        {
          titulo: 'Trabaja por paquetes',
          texto:
            'Cada paquete pasa por Pendiente → En proceso → Revisión → Listo. Sus botones permiten avanzar cuando corresponde. Desde Revisión puedes rechazarlo con un motivo para devolverlo a producción. La guía no pulsa estos botones.',
          ruta: `/pedidos/${idPedido}`,
          selector: '.tarjeta-paquete',
        },
        {
          titulo: 'Conserva la trazabilidad',
          texto:
            'Despliega «Historial de cambios» para consultar fechas, transiciones y motivos de rechazo. Así puedes entender cómo llegó cada paquete a su estado actual.',
          ruta: `/pedidos/${idPedido}`,
          selector: '.historial',
        },
      );
    pasos.push(
      {
        titulo: 'Mide la operación',
        texto:
          'En Estadísticas puedes elegir 7, 30 o 90 días. La cartera muestra pedidos recibidos en el período; la actividad cuenta lo terminado durante esas fechas, incluso si proviene de pedidos anteriores.',
        ruta: '/estadisticas',
        selector: '.barra-periodo',
      },
      {
        titulo: 'Compara resultados',
        texto:
          'El gráfico compara unidades recibidas y terminadas por día. También puedes consultar su tabla de datos, el volumen por cliente, los rechazos y los tiempos de producción.',
        ruta: '/estadisticas',
        selector: '.tendencia',
      },
      {
        titulo: 'Detecta dónde actuar',
        texto:
          'Alertas señala revisiones con 72 horas sin movimiento, pedidos abiertos sin cambios durante 120 horas y paquetes abiertos con dos o más rechazos. Son criterios de seguimiento, no fechas de entrega incumplidas.',
        ruta: '/operacion',
        selector: '.indicadores',
      },
      {
        titulo: 'Obtén una lectura clara',
        texto:
          'Elige un período y pulsa «Generar resumen» para ver métricas y prioridades con enlaces. Actualmente funciona gratis por reglas. La IA generativa es opcional y solo se identifica como IA cuando está configurada y responde correctamente.',
        ruta: '/operacion',
        selector: '.asistente',
      },
      {
        titulo: 'Da seguimiento con evidencia',
        texto:
          'Filtra las alertas y abre el pedido desde cada tarjeta. Revisa la evidencia antes de decidir el siguiente paso. Ya puedes explorar la aplicación; vuelve a «Guía paso a paso» cuando quieras repetir este recorrido.',
        ruta: '/operacion',
        selector: '.barra-alertas',
      },
    );
    this.pasos.set(pasos);
    this.bienvenida.set(false);
    this.preparando.set(false);
    await this.mostrar(0);
  }

  /** Espera el contenido diferido y descarta respuestas si se cierra o cambia el paso. */
  async mostrar(indice: number) {
    const secuencia = ++this.secuencia;
    this.indice.set(indice);
    this.destacado.set(null);
    this.aviso.set('');
    this.preparando.set(true);
    const paso = this.pasos()[indice];
    if (!paso) return;
    try {
      if (this.navegador.url !== paso.ruta) await this.navegador.navigateByUrl(paso.ruta);
      for (let intento = 0; intento < 80; intento++) {
        if (secuencia !== this.secuencia) return;
        const elemento = document.querySelector<HTMLElement>(paso.selector);
        if (elemento && elemento.getBoundingClientRect().height > 0) {
          elemento.scrollIntoView({
            block: innerWidth <= 600 ? 'start' : 'center',
            behavior: 'instant',
          });
          this.ajustarDestacado();
          return;
        }
        await new Promise<void>((resolver) => setTimeout(resolver, 100));
      }
      if (secuencia === this.secuencia)
        this.aviso.set(
          'Esta sección aún no está disponible. Puedes continuar con el siguiente paso.',
        );
    } finally {
      if (secuencia === this.secuencia) {
        this.preparando.set(false);
        this.titulo.nativeElement.focus({ preventScroll: true });
      }
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  ajustarDestacado() {
    if (!this.dialogo?.nativeElement.open || this.bienvenida()) return;
    const elemento = document.querySelector<HTMLElement>(
      this.pasos()[this.indice()]?.selector ?? '',
    );
    if (!elemento) return;
    const rectangulo = elemento.getBoundingClientRect();
    const arriba = Math.max(8, rectangulo.top - 6);
    this.destacado.set({
      izquierda: Math.max(8, rectangulo.left - 6),
      arriba,
      ancho: Math.min(innerWidth - 16, rectangulo.width + 12),
      alto: Math.max(0, Math.min(innerHeight - arriba - 8, rectangulo.bottom - arriba + 6)),
    });
    this.tarjetaArriba.set(innerWidth > 600 && rectangulo.top > innerHeight / 2);
  }

  cerrar() {
    this.secuencia++;
    this.dialogo.nativeElement.close();
    this.destacado.set(null);
    try {
      localStorage.setItem(claveBienvenida, 'vista');
    } catch {
      /* Preferencia opcional. */
    }
    this.focoAnterior?.focus({ preventScroll: true });
  }
}
