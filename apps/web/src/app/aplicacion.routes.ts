import { Routes } from '@angular/router';

// Carga diferida del panel; la misma vista admite listado y detalle con URL propia.
export const rutas: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pedidos/panel-pedidos').then((modulo) => modulo.PanelPedidos),
    title: 'Pedidos | TATA',
  },
  {
    path: 'pedidos/:id',
    loadComponent: () => import('./pedidos/panel-pedidos').then((modulo) => modulo.PanelPedidos),
    title: 'Detalle del pedido | TATA',
  },
  { path: '**', redirectTo: '' },
];
