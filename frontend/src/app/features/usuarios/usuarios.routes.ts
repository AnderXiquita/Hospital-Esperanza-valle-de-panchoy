import { Routes } from '@angular/router';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./usuarios-list/usuarios-list.component').then(m => m.UsuariosListComponent),
  },
];
