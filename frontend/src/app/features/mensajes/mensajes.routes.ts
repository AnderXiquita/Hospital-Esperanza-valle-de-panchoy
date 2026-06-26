import { Routes } from '@angular/router';

export const MENSAJES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./mensajes.component').then(m => m.MensajesComponent),
  },
];
