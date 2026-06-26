import {
  Component, inject, signal, input, output, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucidePencil, LucidePower, LucidePowerOff,
  LucidePhone, LucideMail, LucideMapPin, LucideUserRound,
} from '@lucide/angular';
import { PacientesService, Paciente, Genero, EstadoCivil } from '../pacientes.service';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';
import { calcularEdad } from '../../medicos/medicos.constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

@Component({
  selector: 'app-paciente-detail-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, TranslateModule,
    LucideX, LucidePencil, LucidePower, LucidePowerOff,
    LucidePhone, LucideMail, LucideMapPin, LucideUserRound,
  ],
  templateUrl: './paciente-detail-drawer.component.html',
  styleUrl: './paciente-detail-drawer.component.scss',
})
export class PacienteDetailDrawerComponent implements OnInit {
  private svc = inject(PacientesService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  paciente = input.required<Paciente>();
  closed = output<void>();
  editar = output<Paciente>();
  changed = output<void>();

  readonly icons = {
    x: LucideX, pencil: LucidePencil, power: LucidePower, powerOff: LucidePowerOff,
    phone: LucidePhone, mail: LucideMail, mapPin: LucideMapPin, userRound: LucideUserRound,
  };
  readonly iconField = { size: 15, strokeWidth: 1.5 };
  readonly iconAction = { size: 15, strokeWidth: 1.5 };

  u = signal<Paciente | null>(null);
  cerrando = signal(false);

  confirmToggle = signal(false);
  toggleSaving = signal(false);
  toggleError = signal('');

  ngOnInit(): void {
    this.u.set(this.paciente());
  }

  get iniciales(): string {
    const p = this.u();
    if (!p) return '·';
    return ((p.nombre[0] ?? '') + (p.apellido[0] ?? '')).toUpperCase();
  }

  get edad(): string {
    const e = calcularEdad(this.u()?.fecha_nacimiento ?? null);
    return e !== null ? `${e} ${this.translate.instant('pacientes.years')}` : '—';
  }

  generoLabel(g: Genero | null): string {
    return g ? this.translate.instant('pacientes.gender_' + g) : '—';
  }

  civilLabel(c: EstadoCivil | null): string {
    return c ? this.translate.instant('pacientes.civil_' + c) : '—';
  }

  formatFecha(iso: string | null): string { return this.locale.formatLong(iso); }

  get tieneSeguro(): boolean {
    const p = this.u();
    return !!(p?.seguro || p?.numero_afiliacion);
  }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  pedirEditar(): void {
    const p = this.u();
    if (p) this.editar.emit(p);
  }

  pedirToggle(): void {
    this.toggleError.set('');
    this.confirmToggle.set(true);
  }

  cancelarToggle(): void {
    this.confirmToggle.set(false);
  }

  async confirmarToggle(): Promise<void> {
    const p = this.u();
    if (!p) return;
    this.toggleSaving.set(true);
    this.toggleError.set('');
    try {
      const res = await this.svc.toggle(p.id);
      this.u.set({ ...p, activo: res.activo });
      this.changed.emit();
      this.confirmToggle.set(false);
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      const key = code === 'CITAS_ACTIVAS' ? 'pacientes.error_citas_activas' : 'pacientes.toggle_error';
      this.toggleError.set(this.translate.instant(key));
    } finally {
      this.toggleSaving.set(false);
    }
  }
}
