import { Routes } from '@angular/router';

export const HISTORIAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./historial.component').then(m => m.HistorialComponent),
  },
  {
    path: ':pacienteId',
    loadComponent: () =>
      import('./historial-detalle/historial-detalle.component').then(m => m.HistorialDetalleComponent),
  },
];
