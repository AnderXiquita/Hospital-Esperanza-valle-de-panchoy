import {
  Component, inject, signal, input, output, OnInit, computed, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucidePlus, LucideUser, LucideBriefcase, LucideClock, LucideKeyRound,
  LucideEye, LucideEyeOff,
} from '@lucide/angular';
import {
  MedicosService, MedicoConHorarios, Genero,
  CrearMedicoPayload, ActualizarMedicoPayload,
} from '../medicos.service';
import { generarHoras, DIAS_ORDEN, iniciales } from '../medicos.constants';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { DateFieldComponent } from '../../../shared/date-field/date-field.component';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

interface HorarioForm {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

interface FormState {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  dpi: string;
  fecha_nacimiento: string;
  genero: '' | Genero;
  direccion: string;
  especialidad: string;
  subespecialidad: string;
  numero_colegiado: string;
  consultorio: string;
  tarifa_consulta: string | number | null;
  fecha_ingreso: string;
  telefono: string;
  telefono_emergencia: string;
  biografia: string;
}

@Component({
  selector: 'app-medico-form-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent, DateFieldComponent,
    LucideX, LucidePlus, LucideUser, LucideBriefcase, LucideClock, LucideKeyRound,
    LucideEye, LucideEyeOff,
  ],
  templateUrl: './medico-form-drawer.component.html',
  styleUrl: './medico-form-drawer.component.scss',
})
export class MedicoFormDrawerComponent implements OnInit {
  private svc = inject(MedicosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);
  private configSvc = inject(ConfiguracionService);

  // null => modo crear ; objeto => modo editar
  medico = input<MedicoConHorarios | null>(null);
  closed = output<void>();
  saved = output<void>();

  readonly icons = {
    x: LucideX, plus: LucidePlus, user: LucideUser,
    briefcase: LucideBriefcase, clock: LucideClock, key: LucideKeyRound,
    eye: LucideEye, eyeOff: LucideEyeOff,
  };
  showPassword = signal(false);
  readonly iconSm = { size: 16, strokeWidth: 1.5 };
  readonly iconSection = { size: 17, strokeWidth: 1.5 };

  // Opciones para los dropdowns personalizados (reaccionan al idioma)
  readonly generoOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    const t = this.translate;
    return [
      { value: '', label: t.instant('medicos.gender_unspecified') },
      { value: 'masculino', label: t.instant('medicos.gender_masculino') },
      { value: 'femenino', label: t.instant('medicos.gender_femenino') },
      { value: 'otro', label: t.instant('medicos.gender_otro') },
    ];
  });
  readonly diaOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    return DIAS_ORDEN.map((d) => ({ value: d, label: this.locale.weekdayLong(d) }));
  });
  readonly horaOptions = computed<DropdownOption[]>(() => {
    const cfg = this.configSvc.config();
    return generarHoras(cfg.horarioApertura, cfg.horarioCierre).map((h) => ({ value: h, label: h }));
  });

  form: FormState = this.emptyForm();
  horarios: HorarioForm[] = [];

  guardando = signal(false);
  errorMsg = signal('');
  submitted = signal(false);
  cerrando = signal(false);

  get esEdicion(): boolean {
    return this.medico() !== null;
  }

  get avatarIniciales(): string {
    return iniciales(this.form.nombre, this.form.apellido);
  }

  ngOnInit(): void {
    const m = this.medico();
    if (m) {
      this.form = {
        nombre: m.nombre,
        apellido: m.apellido,
        email: m.email,
        password: '',
        dpi: m.dpi ?? '',
        fecha_nacimiento: m.fecha_nacimiento ?? '',
        genero: m.genero ?? '',
        direccion: m.direccion ?? '',
        especialidad: m.especialidad,
        subespecialidad: m.subespecialidad ?? '',
        numero_colegiado: m.numero_colegiado,
        consultorio: m.consultorio ?? '',
        tarifa_consulta: m.tarifa_consulta ?? '',
        fecha_ingreso: m.fecha_ingreso ?? '',
        telefono: m.telefono ?? '',
        telefono_emergencia: m.telefono_emergencia ?? '',
        biografia: m.biografia ?? '',
      };
      this.horarios = m.horarios.map((h) => ({
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
      }));
    }
  }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  agregarHorario(): void {
    this.horarios.push({ dia_semana: 1, hora_inicio: '08:00', hora_fin: '17:00' });
  }

  quitarHorario(i: number): void {
    this.horarios.splice(i, 1);
  }

  // --- validación ---
  passwordValida(): boolean {
    return this.form.password.length > 0;
  }

  dpiInvalido(): boolean {
    const v = this.form.dpi.trim();
    return v.length > 0 && !/^\d{13}$/.test(v);
  }

  private formValido(): boolean {
    if (!this.form.nombre.trim()) return false;
    if (!this.form.apellido.trim()) return false;
    if (!this.form.especialidad.trim()) return false;
    if (!this.form.numero_colegiado.trim()) return false;
    if (this.dpiInvalido()) return false;
    if (!this.esEdicion) {
      if (!this.form.email.trim() || !this.form.email.includes('@')) return false;
      if (!this.passwordValida()) return false;
    }
    return true;
  }

  async guardar(): Promise<void> {
    this.submitted.set(true);
    if (!this.formValido()) {
      this.errorMsg.set(this.translate.instant('medicos.form_error_validate'));
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set('');

    const horariosPayload = this.horarios.map((h) => ({
      dia_semana: Number(h.dia_semana),
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
    }));

    try {
      if (this.esEdicion) {
        const id = this.medico()!.id;
        const payload: ActualizarMedicoPayload = {
          nombre: this.form.nombre.trim(),
          apellido: this.form.apellido.trim(),
          especialidad: this.form.especialidad.trim(),
          numero_colegiado: this.form.numero_colegiado.trim(),
          subespecialidad: this.s(this.form.subespecialidad),
          dpi: this.s(this.form.dpi),
          fecha_nacimiento: this.s(this.form.fecha_nacimiento),
          genero: this.form.genero || null,
          direccion: this.s(this.form.direccion),
          consultorio: this.s(this.form.consultorio),
          tarifa_consulta: this.toNum(this.form.tarifa_consulta),
          fecha_ingreso: this.s(this.form.fecha_ingreso),
          telefono: this.s(this.form.telefono),
          telefono_emergencia: this.s(this.form.telefono_emergencia),
          biografia: this.s(this.form.biografia),
        };
        await this.svc.actualizar(id, payload);
        await this.svc.actualizarHorarios(id, { horarios: horariosPayload });
      } else {
        const payload: CrearMedicoPayload = {
          nombre: this.form.nombre.trim(),
          apellido: this.form.apellido.trim(),
          email: this.form.email.trim().toLowerCase(),
          password: this.form.password,
          especialidad: this.form.especialidad.trim(),
          numero_colegiado: this.form.numero_colegiado.trim(),
          ...this.opt('subespecialidad', this.form.subespecialidad),
          ...this.opt('dpi', this.form.dpi),
          ...this.opt('fecha_nacimiento', this.form.fecha_nacimiento),
          ...(this.form.genero ? { genero: this.form.genero } : {}),
          ...this.opt('direccion', this.form.direccion),
          ...this.opt('consultorio', this.form.consultorio),
          ...(this.toNum(this.form.tarifa_consulta) !== null
            ? { tarifa_consulta: this.toNum(this.form.tarifa_consulta)! }
            : {}),
          ...this.opt('fecha_ingreso', this.form.fecha_ingreso),
          ...this.opt('telefono', this.form.telefono),
          ...this.opt('telefono_emergencia', this.form.telefono_emergencia),
          ...this.opt('biografia', this.form.biografia),
          horarios: horariosPayload.length ? horariosPayload : undefined,
        };
        await this.svc.crear(payload);
      }

      this.cerrando.set(true);
      setTimeout(() => this.saved.emit(), 240);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const key = status === 409 ? 'medicos.error_duplicate' : 'medicos.form_error_generic';
      this.errorMsg.set(this.translate.instant(key));
    } finally {
      this.guardando.set(false);
    }
  }

  // --- helpers ---
  private emptyForm(): FormState {
    return {
      nombre: '', apellido: '', email: '', password: '',
      dpi: '', fecha_nacimiento: '', genero: '', direccion: '',
      especialidad: '', subespecialidad: '', numero_colegiado: '',
      consultorio: '', tarifa_consulta: '', fecha_ingreso: '',
      telefono: '', telefono_emergencia: '', biografia: '',
    };
  }

  // string a string|null (trim, vacío => null)
  private s(v: string): string | null {
    const t = v.trim();
    return t.length ? t : null;
  }

  // tarifa a number|null (el input type=number puede dar number, string o null)
  private toNum(v: string | number | null): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    return isNaN(n) ? null : n;
  }

  // construye { key: value } solo si value no está vacío (para create)
  private opt(key: string, v: string): Record<string, string> {
    const t = v.trim();
    return t.length ? { [key]: t } : {};
  }
}
