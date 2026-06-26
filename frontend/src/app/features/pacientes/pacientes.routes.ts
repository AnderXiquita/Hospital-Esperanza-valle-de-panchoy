import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pacientes-list/pacientes-list.component').then(m => m.PacientesListComponent),
  },
];
