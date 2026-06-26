import { Routes } from '@angular/router';

export const CITAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./citas-calendario/citas-calendario.component').then(m => m.CitasCalendarioComponent),
  },
];
