import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Marco compartido: identidad visual y navegación para las vistas de pedidos. */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './aplicacion.html',
  styleUrl: './aplicacion.scss',
})
export class Aplicacion {}
