import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ServicioPedidos } from '../pedidos/servicio-pedidos';
import type { AnalisisOperacion, ListadoAlertas } from './tipos';

/** Las acciones del panel consultan datos y nunca avanzan estados automáticamente. */
@Component({
  selector: 'app-panel-operacion',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './panel-operacion.html',
  styleUrl: './panel-operacion.scss',
})
export class PanelOperacion implements OnInit {
  private readonly servicio = inject(ServicioPedidos);
  private consulta = 0;
  readonly datos = signal<ListadoAlertas | null>(null);
  readonly resultado = signal<AnalisisOperacion | null>(null);
  readonly cargando = signal(false);
  readonly analizando = signal(false);
  readonly error = signal('');
  readonly errorAnalisis = signal('');
  readonly filtro = signal('todos');
  dias = 30;
  readonly filtros = [
    { valor: 'todos', texto: 'Todas' },
    { valor: 'revision_demorada', texto: 'Revisión' },
    { valor: 'pedido_inactivo', texto: 'Sin actividad' },
    { valor: 'rechazos_repetidos', texto: 'Rechazos repetidos' },
  ];
  ngOnInit() {
    void this.cargar();
  }
  async cargar() {
    const consulta = ++this.consulta;
    this.cargando.set(true);
    this.error.set('');
    try {
      const datos = await this.servicio.alertas(this.filtro());
      if (consulta === this.consulta) this.datos.set(datos);
    } catch {
      if (consulta === this.consulta)
        this.error.set('No pudimos consultar las alertas. Intenta actualizar.');
    } finally {
      if (consulta === this.consulta) this.cargando.set(false);
    }
  }
  filtrar(tipo: string) {
    this.filtro.set(tipo);
    void this.cargar();
  }
  actualizar() {
    this.resultado.set(null);
    void this.cargar();
  }
  async analizar() {
    if (this.analizando()) return;
    this.analizando.set(true);
    this.errorAnalisis.set('');
    try {
      this.resultado.set(await this.servicio.analizar(this.dias));
    } catch {
      this.errorAnalisis.set('No se pudo generar el resumen. Los pedidos siguen disponibles.');
    } finally {
      this.analizando.set(false);
    }
  }
  /** El aviso mantiene transparente una falta de cuota o la ausencia de IA configurada. */
  avisoProveedor() {
    const motivo = this.resultado()?.motivoProveedor;
    if (motivo === 'sin_configurar')
      return 'Este resumen se calculó con reglas de seguimiento. La IA generativa no está activada.';
    if (motivo === 'cuota_agotada' || motivo === 'limite_aplicativo')
      return 'Se alcanzó una cuota de uso. Se muestra el resumen por reglas, sin cambiar de plan o modelo.';
    return 'El proveedor no pudo completar el análisis. Se muestra el resumen por reglas.';
  }
}
