import {
  Component, inject, signal, input, output, OnInit, computed, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideX, LucideLayers } from '@lucide/angular';
import {
  ServiciosService, Servicio, CrearServicioPayload, ActualizarServicioPayload,
} from '../servicios.service';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const DURACIONES = [15, 30, 45, 60, 90, 120];

interface FormState {
  nombre: string;
  descripcion: string;
  precio: string | number | null;
  duracion: number | '';
}

@Component({
  selector: 'app-servicio-form-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent,
    LucideX, LucideLayers,
  ],
  templateUrl: './servicio-form-drawer.component.html',
  styleUrl: './servicio-form-drawer.component.scss',
})
export class ServicioFormDrawerComponent implements OnInit {
  private svc = inject(ServiciosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  servicio = input<Servicio | null>(null);
  closed = output<void>();
  saved = output<void>();

  readonly icons = { x: LucideX, layers: LucideLayers };
  readonly iconSection = { size: 17, strokeWidth: 1.5 };

  readonly duracionOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    const min = this.translate.instant('servicios.minutes_short');
    return DURACIONES.map((d) => ({ value: d, label: `${d} ${min}` }));
  });

  form: FormState = { nombre: '', descripcion: '', precio: '', duracion: '' };

  guardando = signal(false);
  errorMsg = signal('');
  submitted = signal(false);
  cerrando = signal(false);

  get esEdicion(): boolean {
    return this.servicio() !== null;
  }

  ngOnInit(): void {
    const s = this.servicio();
    if (s) {
      this.form = {
        nombre: s.nombre,
        descripcion: s.descripcion ?? '',
        precio: s.precio ?? '',
        duracion: s.duracion,
      };
    }
  }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  precioValido(): boolean {
    const n = this.toNum(this.form.precio);
    return n !== null && n >= 0;
  }

  private formValido(): boolean {
    if (!this.form.nombre.trim()) return false;
    if (!this.precioValido()) return false;
    if (!this.form.duracion) return false;
    return true;
  }

  async guardar(): Promise<void> {
    this.submitted.set(true);
    if (!this.formValido()) {
      this.errorMsg.set(this.translate.instant('servicios.form_error_validate'));
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set('');

    try {
      if (this.esEdicion) {
        const id = this.servicio()!.id;
        const payload: ActualizarServicioPayload = {
          nombre: this.form.nombre.trim(),
          descripcion: this.form.descripcion.trim() || null,
          precio: this.toNum(this.form.precio)!,
          duracion: Number(this.form.duracion),
        };
        await this.svc.actualizar(id, payload);
      } else {
        const payload: CrearServicioPayload = {
          nombre: this.form.nombre.trim(),
          precio: this.toNum(this.form.precio)!,
          duracion: Number(this.form.duracion),
          ...(this.form.descripcion.trim() ? { descripcion: this.form.descripcion.trim() } : {}),
        };
        await this.svc.crear(payload);
      }

      this.cerrando.set(true);
      setTimeout(() => this.saved.emit(), 240);
    } catch {
      this.errorMsg.set(this.translate.instant('servicios.form_error_generic'));
    } finally {
      this.guardando.set(false);
    }
  }

  private toNum(v: string | number | null): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    return isNaN(n) ? null : n;
  }
}
