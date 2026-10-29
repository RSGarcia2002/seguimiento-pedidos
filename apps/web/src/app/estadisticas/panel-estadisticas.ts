import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicioPedidos } from '../pedidos/servicio-pedidos';
import { etiquetasEstado } from '../pedidos/tipos';
import type { Estadisticas } from './tipos';

/** Gráficos nativos SVG: accesibles, adaptables y sin depender de imágenes o servicios externos. */
@Component({
  selector: 'app-panel-estadisticas',
  imports: [CommonModule],
  templateUrl: './panel-estadisticas.html',
  styleUrl: './panel-estadisticas.scss',
})
export class PanelEstadisticas implements OnInit {
  private readonly servicio = inject(ServicioPedidos);
  private consulta = 0;
  readonly datos = signal<Estadisticas | null>(null);
  readonly dias = signal(30);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly etiquetas = etiquetasEstado;
  readonly escala = computed(() => {
    const maximo = Math.max(
      0,
      ...(this.datos()?.serieDiaria.flatMap((dia) => [
        dia.unidadesRecibidas,
        dia.unidadesTerminadas,
      ]) ?? []),
    );
    return Math.max(500, Math.ceil(maximo / 500) * 500);
  });
  readonly puntos = computed(() =>
    (this.datos()?.serieDiaria ?? []).map((dia, indice, dias) => ({
      ...dia,
      x: 50 + (indice * 690) / Math.max(1, dias.length - 1),
      yRecibidas: this.altura(dia.unidadesRecibidas),
      yTerminadas: this.altura(dia.unidadesTerminadas),
    })),
  );
  readonly lineaRecibidas = computed(() =>
    this.puntos()
      .map((dia) => `${dia.x},${dia.yRecibidas}`)
      .join(' '),
  );
  readonly lineaTerminadas = computed(() =>
    this.puntos()
      .map((dia) => `${dia.x},${dia.yTerminadas}`)
      .join(' '),
  );
  readonly areaTerminadas = computed(() => `50,200 ${this.lineaTerminadas()} 740,200`);
  readonly etiquetasFechas = computed(() => {
    const puntos = this.puntos();
    return [puntos[0], puntos[Math.floor(puntos.length / 2)], puntos[puntos.length - 1]].filter(
      (punto): punto is NonNullable<typeof punto> => !!punto,
    );
  });

  ngOnInit() {
    void this.cargar();
  }
  seleccionarPeriodo(dias: number) {
    this.dias.set(dias);
    void this.cargar();
  }
  /** Una respuesta antigua nunca reemplaza la selección de período más reciente. */
  async cargar() {
    const consulta = ++this.consulta;
    this.cargando.set(true);
    this.error.set('');
    try {
      const datos = await this.servicio.estadisticas(this.dias());
      if (consulta === this.consulta) this.datos.set(datos);
    } catch {
      if (consulta === this.consulta)
        this.error.set('No pudimos cargar las estadísticas. Intenta actualizar nuevamente.');
    } finally {
      if (consulta === this.consulta) this.cargando.set(false);
    }
  }
  porcentaje(parte: number, total: number) {
    return total ? (parte / total) * 100 : 0;
  }
  /** Las fechas de la serie son días civiles de Guatemala, no instantes UTC del navegador. */
  etiquetaFecha(fecha: string) {
    return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
  }
  private altura(unidades: number) {
    return 200 - (unidades / this.escala()) * 180;
  }
}
