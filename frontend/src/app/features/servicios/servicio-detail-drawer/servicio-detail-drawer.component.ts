import {
  Component, inject, signal, input, output, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucidePencil, LucidePower, LucidePowerOff,
  LucideBanknote, LucideClock, LucideCalendar,
} from '@lucide/angular';
import { ServiciosService, Servicio } from '../servicios.service';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

@Component({
  selector: 'app-servicio-detail-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, TranslateModule,
    LucideX, LucidePencil, LucidePower, LucidePowerOff,
    LucideBanknote, LucideClock, LucideCalendar,
  ],
  templateUrl: './servicio-detail-drawer.component.html',
  styleUrl: './servicio-detail-drawer.component.scss',
})
export class ServicioDetailDrawerComponent implements OnInit {
  private svc = inject(ServiciosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  servicio = input.required<Servicio>();
  closed = output<void>();
  editar = output<Servicio>();
  changed = output<void>();

  readonly icons = {
    x: LucideX, pencil: LucidePencil, power: LucidePower, powerOff: LucidePowerOff,
    banknote: LucideBanknote, clock: LucideClock, calendar: LucideCalendar,
  };
  readonly iconField = { size: 15, strokeWidth: 1.5 };
  readonly iconAction = { size: 15, strokeWidth: 1.5 };

  u = signal<Servicio | null>(null);
  cerrando = signal(false);

  confirmToggle = signal(false);
  toggleSaving = signal(false);
  toggleError = signal('');

  ngOnInit(): void {
    this.u.set(this.servicio());
  }

  money(value: string | number): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (isNaN(n)) return '0.00';
    return n.toLocaleString(this.locale.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  duracionLabel(min: number): string {
    return `${min} ${this.translate.instant('servicios.minutes_short')}`;
  }

  formatFecha(iso: string | null): string { return this.locale.formatLong(iso); }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  pedirEditar(): void {
    const u = this.u();
    if (u) this.editar.emit(u);
  }

  pedirToggle(): void {
    this.toggleError.set('');
    this.confirmToggle.set(true);
  }

  cancelarToggle(): void {
    this.confirmToggle.set(false);
  }

  async confirmarToggle(): Promise<void> {
    const u = this.u();
    if (!u) return;
    this.toggleSaving.set(true);
    this.toggleError.set('');
    try {
      const res = await this.svc.toggle(u.id);
      this.u.set({ ...u, activo: res.activo });
      this.changed.emit();
      this.confirmToggle.set(false);
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      const key = code === 'CITAS_ACTIVAS' ? 'servicios.error_citas_activas' : 'servicios.toggle_error';
      this.toggleError.set(this.translate.instant(key));
    } finally {
      this.toggleSaving.set(false);
    }
  }
}
