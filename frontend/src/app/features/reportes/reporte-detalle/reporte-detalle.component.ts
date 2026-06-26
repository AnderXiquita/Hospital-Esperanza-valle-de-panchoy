import { Component, OnInit, inject, signal, computed, Type } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgComponentOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  LucideCalendarDays, LucideCreditCard, LucideStethoscope,
  LucideUsers, LucideChevronLeft, LucideDownload,
} from '@lucide/angular';
import { DateFieldComponent } from '../../../shared/date-field/date-field.component';
import { ReportesPdfService } from '../reportes-pdf.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

interface ReporteConfig {
  tituloKey:   string;
  descripKey:  string;
  detalleKeys: string[];
  icono:       Icon;
  color:       'ink' | 'teal' | 'teal-dk' | 'teal-md';
}

const CONFIGS: Record<string, ReporteConfig> = {
  citas: {
    tituloKey:  'reportes.citas_title',
    descripKey: 'reportes.citas_full_desc',
    detalleKeys: [
      'reportes.citas_d1', 'reportes.citas_d2', 'reportes.citas_d3',
      'reportes.citas_d4', 'reportes.citas_d5', 'reportes.citas_d6',
    ],
    icono: LucideCalendarDays,
    color: 'ink',
  },
  ingresos: {
    tituloKey:  'reportes.ingresos_title',
    descripKey: 'reportes.ingresos_full_desc',
    detalleKeys: [
      'reportes.ingresos_d1', 'reportes.ingresos_d2', 'reportes.ingresos_d3',
      'reportes.ingresos_d4', 'reportes.ingresos_d5', 'reportes.ingresos_d6',
    ],
    icono: LucideCreditCard,
    color: 'teal',
  },
  medicos: {
    tituloKey:  'reportes.medicos_title',
    descripKey: 'reportes.medicos_full_desc',
    detalleKeys: [
      'reportes.medicos_d1', 'reportes.medicos_d2', 'reportes.medicos_d3',
      'reportes.medicos_d4', 'reportes.medicos_d5', 'reportes.medicos_d6',
    ],
    icono: LucideStethoscope,
    color: 'teal-dk',
  },
  pacientes: {
    tituloKey:  'reportes.pacientes_title',
    descripKey: 'reportes.pacientes_full_desc',
    detalleKeys: [
      'reportes.pacientes_d1', 'reportes.pacientes_d2', 'reportes.pacientes_d3',
      'reportes.pacientes_d4', 'reportes.pacientes_d5', 'reportes.pacientes_d6',
    ],
    icono: LucideUsers,
    color: 'teal-md',
  },
};

function pad(n: number): string { return String(n).padStart(2, '0'); }

function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

@Component({
  selector: 'app-reporte-detalle',
  standalone: true,
  imports: [
    RouterLink, FormsModule, NgComponentOutlet, DateFieldComponent, TranslatePipe,
    LucideCalendarDays, LucideCreditCard, LucideStethoscope,
    LucideUsers, LucideChevronLeft, LucideDownload,
  ],
  templateUrl: './reporte-detalle.component.html',
  styleUrl:    './reporte-detalle.component.scss',
})
export class ReporteDetalleComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private pdf    = inject(ReportesPdfService);

  readonly ChevronLeft = LucideChevronLeft;
  readonly Download    = LucideDownload;

  readonly iconHero = { size: 36, strokeWidth: 1   };
  readonly iconBack = { size: 15, strokeWidth: 2   };
  readonly iconBtn  = { size: 16, strokeWidth: 2   };

  config!: ReporteConfig;
  tipo!:   string;

  private _desde = signal(localIsoDate(addDays(new Date(), -29)));
  private _hasta = signal(localIsoDate());
  loading        = signal(false);

  // Puentes signal ↔ ngModel para DateFieldComponent
  get desdeModel(): string | null { return this._desde(); }
  set desdeModel(v: string | null) { if (v) this._desde.set(v); }

  get hastaModel(): string | null { return this._hasta(); }
  set hastaModel(v: string | null) { if (v) this._hasta.set(v); }

  desde   = this._desde.asReadonly();
  hasta   = this._hasta.asReadonly();

  ngOnInit(): void {
    this.tipo = this.route.snapshot.params['tipo'] as string;
    const cfg = CONFIGS[this.tipo];
    if (!cfg) {
      this.router.navigate(['/reportes']);
      return;
    }
    this.config = cfg;
  }

  canGenerar = computed(() => {
    const d = this._desde();
    const h = this._hasta();
    return !!d && !!h && d <= h && !this.loading();
  });

  async generar(): Promise<void> {
    if (!this.canGenerar()) return;
    this.loading.set(true);
    try {
      const d = this._desde();
      const h = this._hasta();
      if      (this.tipo === 'citas')    await this.pdf.generarCitas(d, h);
      else if (this.tipo === 'ingresos') await this.pdf.generarIngresos(d, h);
      else if (this.tipo === 'medicos')  await this.pdf.generarMedicos(d, h);
      else                               await this.pdf.generarPacientes(d, h);
    } catch {
      // error silencioso
    } finally {
      this.loading.set(false);
    }
  }
}
