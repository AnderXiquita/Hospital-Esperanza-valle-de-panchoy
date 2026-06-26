import { Component, Type } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgComponentOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  LucideCalendarDays, LucideCreditCard, LucideStethoscope,
  LucideUsers, LucideChevronRight,
} from '@lucide/angular';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

interface ReporteCard {
  id:           string;
  tituloKey:    string;
  descripKey:   string;
  icono:        Icon;
  color:        'ink' | 'teal' | 'teal-dk' | 'teal-md';
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    RouterLink, NgComponentOutlet, TranslatePipe,
    LucideCalendarDays, LucideCreditCard, LucideStethoscope,
    LucideUsers, LucideChevronRight,
  ],
  templateUrl: './reportes.component.html',
  styleUrl:    './reportes.component.scss',
})
export class ReportesComponent {
  readonly iconLg    = { size: 26, strokeWidth: 1   };
  readonly iconArrow = { size: 18, strokeWidth: 1.75 };

  readonly ChevronRight = LucideChevronRight;

  readonly reportes: ReporteCard[] = [
    { id: 'citas',     tituloKey: 'reportes.citas_title',    descripKey: 'reportes.citas_desc',     icono: LucideCalendarDays, color: 'ink'     },
    { id: 'ingresos',  tituloKey: 'reportes.ingresos_title', descripKey: 'reportes.ingresos_desc',  icono: LucideCreditCard,   color: 'teal'    },
    { id: 'medicos',   tituloKey: 'reportes.medicos_title',  descripKey: 'reportes.medicos_desc',   icono: LucideStethoscope,  color: 'teal-dk' },
    { id: 'pacientes', tituloKey: 'reportes.pacientes_title',descripKey: 'reportes.pacientes_desc', icono: LucideUsers,        color: 'teal-md' },
  ];
}
