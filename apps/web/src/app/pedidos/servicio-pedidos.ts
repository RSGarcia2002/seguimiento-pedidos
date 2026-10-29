import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import type { AnalisisOperacion, ListadoAlertas } from '../operacion/tipos';
import type { Estadisticas } from '../estadisticas/tipos';
import type { ListadoPedidos, NuevoPedido, Paquete, Pedido } from './tipos';

/** Centraliza el acceso a la API y limita las esperas para permitir reintentar un fallo de red. */
@Injectable({ providedIn: 'root' })
export class ServicioPedidos {
  private readonly http = inject(HttpClient);

  estadisticas(dias: number) {
    return firstValueFrom(
      this.http.get<Estadisticas>('/api/estadisticas', { params: { dias } }).pipe(timeout(15000)),
    );
  }
  alertas(tipo: string) {
    return firstValueFrom(
      this.http
        .get<ListadoAlertas>('/api/operacion/alertas', { params: { tipo } })
        .pipe(timeout(15000)),
    );
  }
  analizar(dias: number) {
    return firstValueFrom(
      this.http.post<AnalisisOperacion>('/api/operacion/analisis', { dias }).pipe(timeout(25000)),
    );
  }
  listar(
    busqueda: string,
    estado: string,
    pagina: number,
    filtros: { cliente?: string; desde?: string; hasta?: string; orden?: string } = {},
  ) {
    let params = new HttpParams()
      .set('busqueda', busqueda.trim())
      .set('estado', estado)
      .set('pagina', pagina);
    for (const [clave, valor] of Object.entries(filtros))
      if (valor) params = params.set(clave, valor);
    return firstValueFrom(
      this.http.get<ListadoPedidos>('/api/pedidos', { params }).pipe(timeout(15000)),
    );
  }
  consultar(id: string) {
    return firstValueFrom(
      this.http.get<Pedido>(`/api/pedidos/${encodeURIComponent(id)}`).pipe(timeout(15000)),
    );
  }
  crear(datos: NuevoPedido) {
    return firstValueFrom(this.http.post<Pedido>('/api/pedidos', datos).pipe(timeout(15000)));
  }
  cambiarEstado(pedidoId: string, paquete: Paquete, accion: 'avanzar' | 'rechazar', motivo = '') {
    return firstValueFrom(
      this.http
        .post<Pedido>(`/api/pedidos/${pedidoId}/paquetes/${paquete.id}/transiciones`, {
          accion,
          estadoActual: paquete.estado,
          versionActual: paquete.version,
          motivo,
        })
        .pipe(timeout(15000)),
    );
  }
}
