import {
  Component, inject, signal, input, output, OnInit, computed, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucideUser, LucideStethoscope, LucideLayers, LucideCalendar, LucideClock,
  LucideCheck, LucideCircleCheck, LucideUserX, LucideBan, LucideCalendarClock,
  LucideClipboardList,
} from '@lucide/angular';
import { CitasService, Cita, EstadoCita } from '../citas.service';
import { MedicosService } from '../../medicos/medicos.service';
import { AuthService } from '../../../core/services/auth.service';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { DateFieldComponent } from '../../../shared/date-field/date-field.component';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

function pad(n: number): string { return String(n).padStart(2, '0'); }

function localIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-cita-detail-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent, DateFieldComponent,
    LucideX, LucideUser, LucideStethoscope, LucideLayers, LucideCalendar, LucideClock,
    LucideCheck, LucideCircleCheck, LucideUserX, LucideBan, LucideCalendarClock,
    LucideClipboardList,
  ],
  templateUrl: './cita-detail-drawer.component.html',
  styleUrl: './cita-detail-drawer.component.scss',
})
export class CitaDetailDrawerComponent implements OnInit {
  private svc = inject(CitasService);
  private medicosSvc = inject(MedicosService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  cita = input.required<Cita>();
  closed = output<void>();
  changed = output<void>();

  readonly icons = {
    x: LucideX, user: LucideUser, medico: LucideStethoscope, servicio: LucideLayers,
    calendar: LucideCalendar, clock: LucideClock,
    confirm: LucideCircleCheck, attend: LucideCheck, noshow: LucideUserX,
    cancel: LucideBan, reschedule: LucideCalendarClock, nota: LucideClipboardList,
  };

  readonly esMedico = computed(() => this.auth.user()?.rol === 'medico');
  readonly iconField = { size: 15, strokeWidth: 1.5 };
  readonly iconAction = { size: 15, strokeWidth: 1.5 };

  readonly minDate = localIsoDate();

  u = signal<Cita | null>(null);
  cerrando = signal(false);
  saving = signal(false);
  errorMsg = signal('');

  // reprogramar
  reprogOpen = signal(false);
  reprogFecha = signal('');
  reprogHora = signal('');
  reprogError = signal('');
  reprogAvailableHoras = signal<DropdownOption[]>([]);
  reprogLoadingSlots = signal(false);
  reprogUnavailableDays = signal<number[]>([]);

  readonly reprogNoSlots = computed(() =>
    !!(this.reprogFecha() && !this.reprogLoadingSlots() && this.reprogAvailableHoras().length === 0)
  );

  // cancelar confirm
  confirmCancel = signal(false);

  ngOnInit(): void {
    this.u.set(this.cita());
  }

  estadoLabel(e: EstadoCita): string { return this.translate.instant('citas.estado_' + e); }
  formatFecha(iso: string): string { return this.locale.formatLong(iso); }

  // disponibilidad de acciones según estado
  get esTerminal(): boolean {
    const e = this.u()?.estado;
    return e === 'atendida' || e === 'cancelada';
  }
  get puedeConfirmar(): boolean {
    const e = this.u()?.estado;
    return e === 'agendada' || e === 'reprogramada';
  }
  get puedeAtender(): boolean {
    const e = this.u()?.estado;
    return e === 'agendada' || e === 'confirmada' || e === 'reprogramada';
  }
  get puedeNoShow(): boolean {
    const e = this.u()?.estado;
    return e === 'agendada' || e === 'confirmada' || e === 'reprogramada';
  }
  get puedeReprogramar(): boolean { return !this.esTerminal; }
  get puedeCancelar(): boolean { return !this.esTerminal; }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  private async aplicarEstado(estado: EstadoCita): Promise<void> {
    const c = this.u();
    if (!c) return;
    this.saving.set(true);
    this.errorMsg.set('');
    try {
      const actualizada = await this.svc.cambiarEstado(c.id, estado);
      this.u.set(actualizada);
      this.changed.emit();
    } catch {
      this.errorMsg.set(this.translate.instant('citas.estado_error'));
    } finally {
      this.saving.set(false);
    }
  }

  get puedeNota(): boolean {
    const e = this.u()?.estado;
    return this.esMedico() && (e === 'confirmada' || e === 'atendida');
  }

  irANota(): void {
    const c = this.u();
    if (!c) return;
    void this.router.navigate(['/notas', c.id]);
  }

  confirmar(): void { this.aplicarEstado('confirmada'); }
  atender(): void { this.aplicarEstado('atendida'); }
  noShow(): void { this.aplicarEstado('no_presentado'); }

  pedirCancelar(): void { this.confirmCancel.set(true); }
  cancelarConfirm(): void { this.confirmCancel.set(false); }
  async cancelarCita(): Promise<void> {
    await this.aplicarEstado('cancelada');
    this.confirmCancel.set(false);
  }

  // --- reprogramar ---
  abrirReprog(): void {
    const c = this.u();
    if (!c) return;
    this.reprogFecha.set(c.fecha);
    this.reprogHora.set(c.hora_inicio);
    this.reprogError.set('');
    this.reprogOpen.set(true);
    this.cargarInfoMedico();
    this.cargarSlotsReprog();
  }

  cerrarReprog(): void { this.reprogOpen.set(false); }

  private async cargarInfoMedico(): Promise<void> {
    const c = this.u();
    if (!c) return;
    try {
      const medico = await this.medicosSvc.obtener(c.medico_id);
      const unavail = [0, 1, 2, 3, 4, 5, 6].filter((d) => !medico.dias_atencion.includes(d));
      this.reprogUnavailableDays.set(unavail);
    } catch { /* vacío */ }
  }

  onReprogFechaChange(val: string): void {
    this.reprogFecha.set(val);
    this.reprogHora.set('');
    this.cargarSlotsReprog();
  }

  private async cargarSlotsReprog(): Promise<void> {
    const c = this.u();
    const fec = this.reprogFecha();
    if (!c || !fec) { this.reprogAvailableHoras.set([]); return; }

    this.reprogLoadingSlots.set(true);
    try {
      const { slots } = await this.svc.getSlots({
        medicoId: c.medico_id,
        fecha: fec,
        duracion: c.servicio_duracion,
        excludeId: c.id,
      });
      // Filtrar horas pasadas si es hoy
      const filtered = fec === localIsoDate()
        ? slots.filter((s) => s > localTime())
        : slots;
      this.reprogAvailableHoras.set(filtered.map((s) => ({ value: s, label: s })));
    } catch {
      this.reprogAvailableHoras.set([]);
    } finally {
      this.reprogLoadingSlots.set(false);
    }
  }

  get reprogValido(): boolean {
    return !!(this.reprogFecha() && this.reprogHora());
  }

  async guardarReprog(): Promise<void> {
    const c = this.u();
    if (!c || !this.reprogValido) return;
    this.saving.set(true);
    this.reprogError.set('');
    try {
      const actualizada = await this.svc.reprogramar(c.id, {
        fecha: this.reprogFecha(),
        hora_inicio: this.reprogHora(),
      });
      this.u.set(actualizada);
      this.changed.emit();
      this.reprogOpen.set(false);
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      const map: Record<string, string> = {
        OVERLAP: 'citas.error_overlap',
        OUT_OF_SCHEDULE: 'citas.error_out_of_schedule',
      };
      this.reprogError.set(this.translate.instant(code && map[code] ? map[code] : 'citas.error_generic'));
    } finally {
      this.saving.set(false);
    }
  }
}
