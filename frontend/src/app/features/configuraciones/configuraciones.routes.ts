import { Routes } from '@angular/router';

export const CONFIGURACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./configuraciones.component').then(m => m.ConfiguracionesComponent),
  },
];
