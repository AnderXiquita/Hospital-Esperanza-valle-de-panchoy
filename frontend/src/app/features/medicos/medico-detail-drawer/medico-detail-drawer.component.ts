import {
  Component, inject, signal, input, output, OnInit, computed, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucidePencil, LucidePhone, LucideMail, LucideMapPin,
  LucideBadgeCheck, LucideCalendar, LucideBanknote, LucideDoorOpen,
} from '@lucide/angular';
import { MedicosService, MedicoConHorarios, Genero } from '../medicos.service';
import { DIAS_ORDEN, iniciales, calcularEdad } from '../medicos.constants';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

interface DiaHorario {
  dia: number;
  label: string;
  bloques: { hora_inicio: string; hora_fin: string }[];
}

@Component({
  selector: 'app-medico-detail-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, TranslateModule,
    LucideX, LucidePencil, LucidePhone, LucideMail, LucideMapPin,
    LucideBadgeCheck, LucideCalendar, LucideBanknote, LucideDoorOpen,
  ],
  templateUrl: './medico-detail-drawer.component.html',
  styleUrl: './medico-detail-drawer.component.scss',
})
export class MedicoDetailDrawerComponent implements OnInit {
  private svc = inject(MedicosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  medicoId = input.required<number>();
  closed = output<void>();
  editar = output<MedicoConHorarios>();

  readonly icons = {
    x: LucideX, pencil: LucidePencil, phone: LucidePhone, mail: LucideMail,
    mapPin: LucideMapPin, badge: LucideBadgeCheck, calendar: LucideCalendar,
    money: LucideBanknote, door: LucideDoorOpen,
  };
  readonly iconField = { size: 15, strokeWidth: 1.5 };

  medico = signal<MedicoConHorarios | null>(null);
  cargando = signal(true);
  error = signal('');
  cerrando = signal(false);

  generoLabel(g: Genero | null): string {
    return g ? this.translate.instant('medicos.gender_' + g) : '—';
  }

  formatFecha(iso: string | null): string {
    return this.locale.formatLong(iso);
  }

  async ngOnInit(): Promise<void> {
    try {
      const m = await this.svc.obtener(this.medicoId());
      this.medico.set(m);
    } catch {
      this.error.set(this.translate.instant('medicos.detail_load_error'));
    } finally {
      this.cargando.set(false);
    }
  }

  get avatarIniciales(): string {
    const m = this.medico();
    return m ? iniciales(m.nombre, m.apellido) : '·';
  }

  get edad(): number | null {
    return calcularEdad(this.medico()?.fecha_nacimiento ?? null);
  }

  readonly horarioPorDia = computed<DiaHorario[]>(() => {
    this.locale.locale();
    const m = this.medico();
    if (!m) return [];
    return DIAS_ORDEN.map((dia) => ({
      dia,
      label: this.locale.weekdayLong(dia),
      bloques: m.horarios
        .filter((h) => h.dia_semana === dia)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        .map((h) => ({ hora_inicio: h.hora_inicio, hora_fin: h.hora_fin })),
    }));
  });

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  pedirEditar(): void {
    const m = this.medico();
    if (m) this.editar.emit(m);
  }
}
