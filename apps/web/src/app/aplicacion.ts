import { RecorridoGuiado } from './guia/recorrido-guiado';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Marco compartido: identidad visual y navegación para las vistas de pedidos. */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, RecorridoGuiado],
  templateUrl: './aplicacion.html',
  styleUrl: './aplicacion.scss',
})
export class Aplicacion {}
