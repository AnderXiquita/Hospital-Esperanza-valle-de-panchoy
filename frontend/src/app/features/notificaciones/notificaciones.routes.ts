import { Routes } from '@angular/router';

export const NOTIFICACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./notificaciones.component').then(m => m.NotificacionesComponent),
  },
];
