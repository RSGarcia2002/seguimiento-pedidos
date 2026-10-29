import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServicioPedidos } from './servicio-pedidos';
import {
  etiquetasEstado,
  type ListadoPedidos,
  type NuevoPedido,
  type Paquete,
  type Pedido,
} from './tipos';

/** Coordina listado, detalle y diálogos; el servidor conserva la autoridad sobre las reglas. */
@Component({
  selector: 'app-panel-pedidos',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './panel-pedidos.html',
  styleUrl: './panel-pedidos.scss',
})
export class PanelPedidos implements OnInit {
  private readonly servicio = inject(ServicioPedidos);
  private readonly ruta = inject(ActivatedRoute);
  private readonly navegador = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private consultaListado = 0;
  private consultaDetalle = 0;
  @ViewChild('dialogoPedido') dialogoPedido!: ElementRef<HTMLDialogElement>;
  @ViewChild('dialogoRechazo') dialogoRechazo!: ElementRef<HTMLDialogElement>;
  readonly etiquetas = etiquetasEstado;
  readonly estados = ['pendiente', 'en_proceso', 'revision', 'listo'] as const;
  readonly listado = signal<ListadoPedidos | null>(null);
  readonly pedido = signal<Pedido | null>(null);
  readonly idDetalle = signal<string | null>(null);
  readonly cargando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly guardando = signal(false);
  readonly paqueteOcupado = signal<string | null>(null);
  readonly error = signal('');
  readonly errorFormulario = signal('');
  readonly errorRechazo = signal('');
  readonly aviso = signal('');
  readonly filtroEstado = signal('todos');
  readonly filtroPaquetes = signal('todos');
  readonly paquetesVisibles = computed(
    () =>
      this.pedido()?.paquetes.filter(
        (paquete) => this.filtroPaquetes() === 'todos' || paquete.estado === this.filtroPaquetes(),
      ) ?? [],
  );
  busqueda = '';
  pagina = 1;
  nuevoPedido: NuevoPedido = { numero: '', cliente: '', cantidad: null };
  paqueteRechazado: Paquete | null = null;
  motivoRechazo = '';

  ngOnInit() {
    void this.cargarListado();
    // Las URLs de detalle se pueden compartir y siguen funcionando al recargar la página.
    this.ruta.paramMap.pipe(takeUntilDestroyed(this.destruccion)).subscribe((parametros) => {
      const id = parametros.get('id');
      this.idDetalle.set(id);
      this.pedido.set(null);
      this.filtroPaquetes.set('todos');
      if (id) void this.cargarDetalle(id);
    });
  }

  /** Solo la respuesta de la búsqueda más reciente puede reemplazar el listado visible. */
  async cargarListado() {
    const consulta = ++this.consultaListado;
    this.cargando.set(true);
    this.error.set('');
    try {
      const listado = await this.servicio.listar(this.busqueda, this.filtroEstado(), this.pagina);
      if (consulta === this.consultaListado) this.listado.set(listado);
    } catch (error) {
      if (consulta === this.consultaListado) this.error.set(this.mensajeError(error));
    } finally {
      if (consulta === this.consultaListado) this.cargando.set(false);
    }
  }
  async cargarDetalle(id = this.idDetalle()) {
    if (!id) return;
    const consulta = ++this.consultaDetalle;
    this.cargandoDetalle.set(true);
    this.error.set('');
    try {
      const pedido = await this.servicio.consultar(id);
      if (consulta === this.consultaDetalle) this.pedido.set(pedido);
    } catch (error) {
      if (consulta === this.consultaDetalle) this.error.set(this.mensajeError(error));
    } finally {
      if (consulta === this.consultaDetalle) this.cargandoDetalle.set(false);
    }
  }
  buscar() {
    this.pagina = 1;
    void this.cargarListado();
  }
  filtrar(estado: string) {
    this.filtroEstado.set(estado);
    this.buscar();
  }
  cambiarPagina(pagina: number) {
    this.pagina = pagina;
    void this.cargarListado();
  }
  actualizar() {
    this.idDetalle() ? void this.cargarDetalle() : void this.cargarListado();
  }

  abrirFormulario(formulario: NgForm) {
    formulario.resetForm({ numero: '', cliente: '', cantidad: null });
    this.nuevoPedido = { numero: '', cliente: '', cantidad: null };
    this.errorFormulario.set('');
    this.dialogoPedido.nativeElement.showModal();
  }
  cerrarFormulario() {
    if (!this.guardando()) this.dialogoPedido.nativeElement.close();
  }

  /** La vista previa explica la partición; el servidor vuelve a calcularla al guardar. */
  get vistaPrevia() {
    const cantidad = this.nuevoPedido.cantidad;
    if (!cantidad || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100000) return '';
    const completos = Math.floor(cantidad / 100);
    const restante = cantidad % 100;
    return `${Math.ceil(cantidad / 100)} paquete(s): ${[completos ? `${completos} × 100 unidades` : '', restante ? `1 × ${restante} unidades` : ''].filter(Boolean).join(' + ')}`;
  }
  async guardarPedido(formulario: NgForm) {
    if (this.guardando()) return;
    if (
      formulario.invalid ||
      !this.nuevoPedido.numero.trim() ||
      !this.nuevoPedido.cliente.trim() ||
      !Number.isInteger(this.nuevoPedido.cantidad)
    ) {
      formulario.control.markAllAsTouched();
      this.errorFormulario.set(
        'Completa los campos y escribe una cantidad entera entre 1 y 100 000.',
      );
      return;
    }
    this.guardando.set(true);
    this.errorFormulario.set('');
    try {
      const pedido = await this.servicio.crear(this.nuevoPedido);
      this.dialogoPedido.nativeElement.close();
      this.aviso.set(`Pedido ${pedido.numero} creado con ${pedido.totalPaquetes} paquetes.`);
      await this.navegador.navigate(['/pedidos', pedido.id]);
    } catch (error) {
      this.errorFormulario.set(this.mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  abrirRechazo(paquete: Paquete) {
    this.paqueteRechazado = paquete;
    this.motivoRechazo = '';
    this.errorRechazo.set('');
    this.dialogoRechazo.nativeElement.showModal();
  }
  cerrarRechazo() {
    if (!this.paqueteOcupado()) this.dialogoRechazo.nativeElement.close();
  }

  /** Desactiva acciones durante una transición y refresca datos ante un conflicto de versión. */
  async cambiarEstado(paquete: Paquete, accion: 'avanzar' | 'rechazar', motivo = '') {
    const pedido = this.pedido();
    if (!pedido || this.paqueteOcupado()) return;
    this.paqueteOcupado.set(paquete.id);
    this.error.set('');
    this.errorRechazo.set('');
    try {
      const actualizado = await this.servicio.cambiarEstado(pedido.id, paquete, accion, motivo);
      this.pedido.set(actualizado);
      this.aviso.set(
        accion === 'rechazar'
          ? `Paquete ${paquete.numero} devuelto a En proceso.`
          : `Paquete ${paquete.numero} actualizado.`,
      );
      this.dialogoRechazo.nativeElement.close();
      void this.cargarListado();
    } catch (error) {
      if (accion === 'rechazar') this.errorRechazo.set(this.mensajeError(error));
      else this.error.set(this.mensajeError(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        const mensaje = this.mensajeError(error);
        await this.cargarDetalle();
        this.error.set(mensaje);
        this.dialogoRechazo.nativeElement.close();
      }
    } finally {
      this.paqueteOcupado.set(null);
    }
  }
  confirmarRechazo() {
    if (this.paqueteRechazado && this.motivoRechazo.length <= 300)
      void this.cambiarEstado(this.paqueteRechazado, 'rechazar', this.motivoRechazo);
  }
  textoAvance(paquete: Paquete) {
    return paquete.estado === 'pendiente'
      ? 'Iniciar'
      : paquete.estado === 'en_proceso'
        ? 'Enviar a revisión'
        : 'Marcar listo';
  }

  /** Exporta solo la página visible y neutraliza valores que una hoja podría ejecutar como fórmulas. */
  exportarCsv() {
    const pedidos = this.listado()?.pedidos ?? [];
    const celda = (valor: unknown) => {
      let texto = String(valor);
      if (/^[\s]*[=+@-]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replaceAll('"', '""') + '"';
    };
    const filas = [
      ['Pedido', 'Cliente', 'Unidades', 'Paquetes', 'Avance (%)', 'Estado'],
      ...pedidos.map((pedido) => [
        pedido.numero,
        pedido.cliente,
        pedido.cantidad,
        pedido.totalPaquetes,
        pedido.avance,
        this.etiquetas[pedido.estado],
      ]),
    ];
    const contenido = '\uFEFF' + filas.map((fila) => fila.map(celda).join(',')).join('\r\n');
    const direccion = URL.createObjectURL(
      new Blob([contenido], { type: 'text/csv;charset=utf-8;' }),
    );
    const enlace = document.createElement('a');
    enlace.href = direccion;
    enlace.download = 'pedidos.csv';
    enlace.click();
    URL.revokeObjectURL(direccion);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const mensaje: unknown = error.error?.error?.mensaje;
      if (typeof mensaje === 'string') return mensaje;
      if (error.status === 0)
        return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    return 'No se pudo completar la operación. Actualiza para comprobar el estado antes de reintentar.';
  }
}
