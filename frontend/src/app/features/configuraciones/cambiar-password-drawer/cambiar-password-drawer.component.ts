import { Component, input, output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgComponentOutlet } from '@angular/common';
import { LucideX, LucideEye, LucideEyeOff, LucideLock } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-cambiar-password-drawer',
  standalone: true,
  imports: [FormsModule, NgComponentOutlet, LucideX, LucideEye, LucideEyeOff, LucideLock],
  templateUrl: './cambiar-password-drawer.component.html',
  styleUrl:    './cambiar-password-drawer.component.scss',
})
export class CambiarPasswordDrawerComponent {
  private auth = inject(AuthService);

  open   = input.required<boolean>();
  closed = output<void>();

  readonly iconSm   = { size: 18, strokeWidth: 1.5 };
  readonly iconLock = { size: 20, strokeWidth: 1.5 };
  readonly IconX      = LucideX;
  readonly IconEye    = LucideEye;
  readonly IconEyeOff = LucideEyeOff;
  readonly IconLock   = LucideLock;

  current  = signal('');
  newPwd   = signal('');
  confirm  = signal('');
  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);

  loading = signal(false);
  error   = signal<string | null>(null);
  success = signal(false);

  // Getters/setters para ngModel ↔ signal
  get currentModel()  { return this.current(); }
  set currentModel(v) { this.current.set(v);  this.error.set(null); }
  get newModel()      { return this.newPwd(); }
  set newModel(v)     { this.newPwd.set(v);   this.error.set(null); }
  get confirmModel()  { return this.confirm(); }
  set confirmModel(v) { this.confirm.set(v);  this.error.set(null); }

  get canSubmit(): boolean {
    return (
      this.current().length > 0 &&
      this.newPwd().length >= 8 &&
      this.newPwd() === this.confirm() &&
      !this.loading()
    );
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) return;

    if (this.newPwd() !== this.confirm()) {
      this.error.set('Las contraseñas nuevas no coinciden');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.changePassword(this.current(), this.newPwd());
      this.success.set(true);
      setTimeout(() => this.cerrar(), 1800);
    } catch (err: unknown) {
      const body = (err as { error?: { code?: string } })?.error;
      if (body?.code === 'WRONG_PASSWORD') {
        this.error.set('La contraseña actual es incorrecta');
      } else if (body?.code === 'SAME_PASSWORD') {
        this.error.set('La nueva contraseña debe ser diferente a la actual');
      } else {
        this.error.set('Ocurrió un error. Intenta de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  cerrar(): void {
    this.current.set('');
    this.newPwd.set('');
    this.confirm.set('');
    this.error.set(null);
    this.success.set(false);
    this.loading.set(false);
    this.closed.emit();
  }
}
