import { Routes } from '@angular/router';

export const INICIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./inicio.component').then(m => m.InicioComponent),
  },
];
