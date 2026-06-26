import { Routes } from '@angular/router';

export const MEDICOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./medicos-list/medicos-list.component').then(m => m.MedicosListComponent),
  },
];
