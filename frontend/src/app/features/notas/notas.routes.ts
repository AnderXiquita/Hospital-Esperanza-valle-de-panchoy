import { Routes } from '@angular/router';

export const NOTAS_ROUTES: Routes = [
  {
    path: ':citaId',
    loadComponent: () =>
      import('./nota-form/nota-form.component').then(m => m.NotaFormComponent),
  },
];
