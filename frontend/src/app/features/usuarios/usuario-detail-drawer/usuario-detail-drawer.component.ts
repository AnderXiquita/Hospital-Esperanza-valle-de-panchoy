import {
  Component, inject, signal, input, output, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucidePencil, LucideKeyRound, LucidePower, LucidePowerOff,
  LucideMail, LucideShield, LucideHeadset, LucideStethoscope, LucideClock, LucideCalendar,
  LucideEye, LucideEyeOff,
} from '@lucide/angular';
import { UsuariosService, Usuario, Rol } from '../usuarios.service';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';
import { AuthService } from '../../../core/services/auth.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const ROL_ICON: Record<Rol, Icon> = {
  admin: LucideShield,
  recepcionista: LucideHeadset,
  medico: LucideStethoscope,
};

@Component({
  selector: 'app-usuario-detail-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule,
    LucideX, LucidePencil, LucideKeyRound, LucidePower, LucidePowerOff,
    LucideMail, LucideShield, LucideHeadset, LucideStethoscope, LucideClock, LucideCalendar,
    LucideEye, LucideEyeOff,
  ],
  templateUrl: './usuario-detail-drawer.component.html',
  styleUrl: './usuario-detail-drawer.component.scss',
})
export class UsuarioDetailDrawerComponent implements OnInit {
  private svc = inject(UsuariosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);
  private auth = inject(AuthService);

  usuario = input.required<Usuario>();
  closed = output<void>();
  editar = output<Usuario>();
  changed = output<void>();

  readonly icons = {
    x: LucideX, pencil: LucidePencil, key: LucideKeyRound,
    power: LucidePower, powerOff: LucidePowerOff,
    mail: LucideMail, clock: LucideClock, calendar: LucideCalendar,
    eye: LucideEye, eyeOff: LucideEyeOff,
  };
  showResetPwd = signal(false);
  readonly iconField = { size: 15, strokeWidth: 1.5 };
  readonly iconAction = { size: 15, strokeWidth: 1.5 };

  u = signal<Usuario | null>(null);
  cerrando = signal(false);

  // toggle
  confirmToggle = signal(false);
  toggleSaving = signal(false);
  toggleError = signal('');

  // reset password
  resetOpen = signal(false);
  resetPwd = signal('');
  resetSubmitted = signal(false);
  resetSaving = signal(false);
  resetError = signal('');
  resetDone = signal(false);

  ngOnInit(): void {
    this.u.set(this.usuario());
  }

  rolIcon(rol: Rol): Icon { return ROL_ICON[rol]; }
  rolLabel(rol: Rol): string { return this.translate.instant('usuarios.role_' + rol); }
  ultimoAcceso(iso: string | null): string {
    return this.locale.formatDateTime(iso) ?? this.translate.instant('usuarios.never');
  }
  formatFecha(iso: string | null): string { return this.locale.formatLong(iso); }

  get iniciales(): string {
    const u = this.u();
    if (!u) return '·';
    return ((u.nombre[0] ?? '') + (u.apellido[0] ?? '')).toUpperCase();
  }

  // No puedes desactivar tu propia cuenta
  get esPropia(): boolean {
    return this.u()?.id === this.auth.user()?.id;
  }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  pedirEditar(): void {
    const u = this.u();
    if (u) this.editar.emit(u);
  }

  // --- toggle ---
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
      const key =
        code === 'LAST_ADMIN' ? 'usuarios.error_last_admin'
        : code === 'SELF' ? 'usuarios.cannot_toggle_self'
        : code === 'CITAS_ACTIVAS' ? 'usuarios.error_citas_activas'
        : 'usuarios.toggle_error';
      this.toggleError.set(this.translate.instant(key));
    } finally {
      this.toggleSaving.set(false);
    }
  }

  // --- reset password ---
  abrirReset(): void {
    this.resetPwd.set('');
    this.resetSubmitted.set(false);
    this.resetError.set('');
    this.resetDone.set(false);
    this.showResetPwd.set(false);
    this.resetOpen.set(true);
  }

  cancelarReset(): void {
    this.resetOpen.set(false);
  }

  passwordValida(): boolean {
    return this.resetPwd().length > 0;
  }

  async confirmarReset(): Promise<void> {
    this.resetSubmitted.set(true);
    if (!this.passwordValida()) return;
    const u = this.u();
    if (!u) return;

    this.resetSaving.set(true);
    this.resetError.set('');
    try {
      await this.svc.resetPassword(u.id, this.resetPwd());
      this.resetDone.set(true);
      setTimeout(() => this.resetOpen.set(false), 1200);
    } catch {
      this.resetError.set(this.translate.instant('usuarios.reset_error'));
    } finally {
      this.resetSaving.set(false);
    }
  }
}
