import {
  Component, inject, signal, input, output, OnInit, computed, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideX, LucideUser, LucideKeyRound, LucideEye, LucideEyeOff } from '@lucide/angular';
import {
  UsuariosService, Usuario, RolAsignable,
  CrearUsuarioPayload, ActualizarUsuarioPayload,
} from '../usuarios.service';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

interface FormState {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: '' | RolAsignable;
}

@Component({
  selector: 'app-usuario-form-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent,
    LucideX, LucideUser, LucideKeyRound, LucideEye, LucideEyeOff,
  ],
  templateUrl: './usuario-form-drawer.component.html',
  styleUrl: './usuario-form-drawer.component.scss',
})
export class UsuarioFormDrawerComponent implements OnInit {
  private svc = inject(UsuariosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  // null => crear ; objeto => editar
  usuario = input<Usuario | null>(null);
  closed = output<void>();
  saved = output<void>();

  readonly icons = { x: LucideX, user: LucideUser, key: LucideKeyRound, eye: LucideEye, eyeOff: LucideEyeOff };
  showPassword = signal(false);
  readonly iconSection = { size: 17, strokeWidth: 1.5 };

  readonly rolOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    const t = this.translate;
    return [
      { value: 'admin', label: t.instant('usuarios.role_admin') },
      { value: 'recepcionista', label: t.instant('usuarios.role_recepcionista') },
    ];
  });

  form: FormState = { nombre: '', apellido: '', email: '', password: '', rol: '' };

  guardando = signal(false);
  errorMsg = signal('');
  submitted = signal(false);
  cerrando = signal(false);

  get esEdicion(): boolean {
    return this.usuario() !== null;
  }

  // Un médico no cambia de rol aquí (se gestiona en Médicos)
  get rolBloqueado(): boolean {
    return this.usuario()?.rol === 'medico';
  }

  get avatarIniciales(): string {
    const a = this.form.nombre.trim()[0] ?? '';
    const b = this.form.apellido.trim()[0] ?? '';
    return (a + b).toUpperCase() || '·';
  }

  ngOnInit(): void {
    const u = this.usuario();
    if (u) {
      this.form = {
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        password: '',
        rol: u.rol === 'medico' ? '' : u.rol,
      };
    }
  }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  passwordValida(): boolean {
    return this.form.password.length > 0;
  }

  private formValido(): boolean {
    if (!this.form.nombre.trim()) return false;
    if (!this.form.apellido.trim()) return false;
    if (!this.form.email.trim() || !this.form.email.includes('@')) return false;
    if (!this.esEdicion) {
      if (!this.form.rol) return false;
      if (!this.passwordValida()) return false;
    }
    return true;
  }

  async guardar(): Promise<void> {
    this.submitted.set(true);
    if (!this.formValido()) {
      this.errorMsg.set(this.translate.instant('usuarios.form_error_validate'));
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set('');

    try {
      if (this.esEdicion) {
        const id = this.usuario()!.id;
        const payload: ActualizarUsuarioPayload = {
          nombre: this.form.nombre.trim(),
          apellido: this.form.apellido.trim(),
          email: this.form.email.trim().toLowerCase(),
          ...(this.rolBloqueado || !this.form.rol ? {} : { rol: this.form.rol }),
        };
        await this.svc.actualizar(id, payload);
      } else {
        const payload: CrearUsuarioPayload = {
          nombre: this.form.nombre.trim(),
          apellido: this.form.apellido.trim(),
          email: this.form.email.trim().toLowerCase(),
          password: this.form.password,
          rol: this.form.rol as RolAsignable,
        };
        await this.svc.crear(payload);
      }

      this.cerrando.set(true);
      setTimeout(() => this.saved.emit(), 240);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const key = status === 409 ? 'usuarios.error_email_taken' : 'usuarios.form_error_generic';
      this.errorMsg.set(this.translate.instant(key));
    } finally {
      this.guardando.set(false);
    }
  }

  rolLabelActual(): string {
    const rol = this.usuario()?.rol;
    return rol ? this.translate.instant('usuarios.role_' + rol) : '';
  }
}
