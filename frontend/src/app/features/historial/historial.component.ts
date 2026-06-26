import { Component, inject, signal, computed, OnInit, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideUsers, LucideSearch, LucideFileText,
  LucideCalendar, LucideList, LucideLayoutGrid,
  LucideChevronRight, LucideClipboardList,
} from '@lucide/angular';
import { NotasService, PacienteDelHistorial } from '../notas/notas.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule,
    LucideUsers, LucideSearch, LucideFileText,
    LucideCalendar, LucideList, LucideLayoutGrid,
    LucideChevronRight, LucideClipboardList,
  ],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.scss',
})
export class HistorialComponent implements OnInit {
  private notasSvc = inject(NotasService);
  private router   = inject(Router);

  readonly icons: Record<string, Icon> = {
    users: LucideUsers, search: LucideSearch, file: LucideFileText,
    calendar: LucideCalendar, list: LucideList, grid: LucideLayoutGrid,
    chevron: LucideChevronRight, board: LucideClipboardList,
  };
  readonly iconMd     = { size: 18, strokeWidth: 1.5 };
  readonly iconSm     = { size: 15, strokeWidth: 1.5 };
  readonly iconXs     = { size: 13, strokeWidth: 1.5 };
  readonly iconMetric = { size: 20, strokeWidth: 1.25 };

  cargando      = signal(true);
  pacientes     = signal<PacienteDelHistorial[]>([]);
  busqueda      = signal('');
  vista         = signal<'tabla' | 'tarjetas'>('tarjetas');
  filtroEstado  = signal<'activos' | 'inactivos' | 'todos'>('activos');

  readonly filtrados = computed(() => {
    const q     = this.busqueda().toLowerCase().trim();
    const estado = this.filtroEstado();
    return this.pacientes().filter((p) => {
      if (estado === 'activos'   && !p.activo) return false;
      if (estado === 'inactivos' &&  p.activo) return false;
      if (!q) return true;
      return `${p.nombre} ${p.apellido}`.toLowerCase().includes(q);
    });
  });

  readonly totalConsultas = computed(() =>
    this.pacientes().reduce((sum, p) => sum + p.total_notas, 0)
  );

  async ngOnInit(): Promise<void> {
    try {
      const { pacientes } = await this.notasSvc.misPacientes();
      this.pacientes.set(pacientes);
    } finally {
      this.cargando.set(false);
    }
  }

  irDetalle(id: number): void {
    void this.router.navigate(['/historial', id]);
  }

  calcEdad(fechaNac: string | null): number | null {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let age = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) age--;
    return age;
  }

  initiales(p: PacienteDelHistorial): string {
    return `${p.nombre[0]}${p.apellido[0]}`.toUpperCase();
  }

  formatFecha(iso: string): string {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('es-GT', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  setVista(v: 'tabla' | 'tarjetas'): void { this.vista.set(v); }
  setFiltro(f: 'activos' | 'inactivos' | 'todos'): void { this.filtroEstado.set(f); }
}
