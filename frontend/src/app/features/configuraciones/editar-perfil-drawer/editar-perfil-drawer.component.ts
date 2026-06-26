import { Component, input, output, signal, inject, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgComponentOutlet } from '@angular/common';
import { LucideX, LucideUser } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-editar-perfil-drawer',
  standalone: true,
  imports: [FormsModule, NgComponentOutlet, LucideX, LucideUser],
  templateUrl: './editar-perfil-drawer.component.html',
  styleUrl:    './editar-perfil-drawer.component.scss',
})
export class EditarPerfilDrawerComponent implements OnChanges {
  private auth = inject(AuthService);

  open   = input.required<boolean>();
  closed = output<void>();

  readonly iconSm   = { size: 18, strokeWidth: 1.5 };
  readonly iconUser = { size: 20, strokeWidth: 1.5 };
  readonly IconX    = LucideX;
  readonly IconUser = LucideUser;

  nombre   = signal('');
  apellido = signal('');
  email    = signal('');

  loading = signal(false);
  error   = signal<string | null>(null);
  success = signal(false);

  // Getters/setters para ngModel ↔ signal
  get nombreModel()   { return this.nombre(); }
  set nombreModel(v)  { this.nombre.set(v);   this.error.set(null); }
  get apellidoModel() { return this.apellido(); }
  set apellidoModel(v){ this.apellido.set(v);  this.error.set(null); }
  get emailModel()    { return this.email(); }
  set emailModel(v)   { this.email.set(v);    this.error.set(null); }

  ngOnChanges(): void {
    if (this.open()) {
      const u = this.auth.user();
      this.nombre.set(u?.nombre ?? '');
      this.apellido.set(u?.apellido ?? '');
      this.email.set(u?.email ?? '');
      this.error.set(null);
      this.success.set(false);
    }
  }

  get canSubmit(): boolean {
    const u = this.auth.user();
    return (
      this.nombre().trim().length > 0 &&
      this.apellido().trim().length > 0 &&
      this.email().trim().length > 0 &&
      !this.loading() &&
      (
        this.nombre() !== u?.nombre ||
        this.apellido() !== u?.apellido ||
        this.email() !== u?.email
      )
    );
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.updateProfile(
        this.nombre().trim(),
        this.apellido().trim(),
        this.email().trim()
      );
      this.success.set(true);
      setTimeout(() => this.cerrar(), 1600);
    } catch (err: unknown) {
      const body = (err as { error?: { code?: string } })?.error;
      if (body?.code === 'EMAIL_TAKEN') {
        this.error.set('Este correo ya está registrado por otro usuario');
      } else {
        this.error.set('Ocurrió un error. Intenta de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  cerrar(): void {
    this.error.set(null);
    this.success.set(false);
    this.loading.set(false);
    this.closed.emit();
  }
}
