import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reportes.component').then(m => m.ReportesComponent),
  },
  {
    path: ':tipo',
    loadComponent: () =>
      import('./reporte-detalle/reporte-detalle.component').then(m => m.ReporteDetalleComponent),
  },
];
