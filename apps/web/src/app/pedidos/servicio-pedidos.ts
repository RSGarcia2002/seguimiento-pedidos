import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
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
  listar(busqueda: string, estado: string, pagina: number) {
    const params = new HttpParams()
      .set('busqueda', busqueda.trim())
      .set('estado', estado)
      .set('pagina', pagina);
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
