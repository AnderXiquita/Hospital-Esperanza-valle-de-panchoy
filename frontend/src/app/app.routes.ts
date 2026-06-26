import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'medicos',
        loadChildren: () =>
          import('./features/medicos/medicos.routes').then(m => m.MEDICOS_ROUTES),
      },
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./features/usuarios/usuarios.routes').then(m => m.USUARIOS_ROUTES),
      },
      {
        path: 'servicios',
        loadChildren: () =>
          import('./features/servicios/servicios.routes').then(m => m.SERVICIOS_ROUTES),
      },
      {
        path: 'pacientes',
        loadChildren: () =>
          import('./features/pacientes/pacientes.routes').then(m => m.PACIENTES_ROUTES),
      },
      {
        path: 'citas',
        loadChildren: () =>
          import('./features/citas/citas.routes').then(m => m.CITAS_ROUTES),
      },
      {
        path: 'pagos',
        loadChildren: () =>
          import('./features/pagos/pagos.routes').then(m => m.PAGOS_ROUTES),
      },
      {
        path: 'reportes',
        loadChildren: () =>
          import('./features/reportes/reportes.routes').then(m => m.REPORTES_ROUTES),
      },
      {
        path: 'configuraciones',
        loadChildren: () =>
          import('./features/configuraciones/configuraciones.routes').then(m => m.CONFIGURACIONES_ROUTES),
      },
      {
        path: 'notificaciones',
        loadChildren: () =>
          import('./features/notificaciones/notificaciones.routes').then(m => m.NOTIFICACIONES_ROUTES),
      },
      {
        path: 'notas',
        loadChildren: () =>
          import('./features/notas/notas.routes').then(m => m.NOTAS_ROUTES),
      },
      {
        path: 'historial',
        loadChildren: () =>
          import('./features/historial/historial.routes').then(m => m.HISTORIAL_ROUTES),
      },
      {
        path: 'mensajes',
        loadChildren: () =>
          import('./features/mensajes/mensajes.routes').then(m => m.MENSAJES_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '/auth/login' },
];
