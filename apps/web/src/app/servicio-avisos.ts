import { Injectable } from '@angular/core';

/** Transporta un resultado una sola vez cuando una navegación reconstruye la pantalla. */
@Injectable({ providedIn: 'root' })
export class ServicioAvisos {
  private pendiente = '';
  publicar(mensaje: string) {
    this.pendiente = mensaje;
  }
  consumir() {
    const mensaje = this.pendiente;
    this.pendiente = '';
    return mensaje;
  }
}
