import {
  Component, inject, signal, input, output, OnInit, computed, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucideUser, LucidePhone, LucideActivity, LucideShield,
} from '@lucide/angular';
import {
  PacientesService, Paciente, Genero, EstadoCivil, TipoSangre,
  CrearPacientePayload, ActualizarPacientePayload,
} from '../pacientes.service';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { DateFieldComponent } from '../../../shared/date-field/date-field.component';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const TIPOS_SANGRE: TipoSangre[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface FormState {
  nombre: string;
  apellido: string;
  dpi: string;
  fecha_nacimiento: string;
  genero: '' | Genero;
  estado_civil: '' | EstadoCivil;
  ocupacion: string;
  telefono: string;
  email: string;
  direccion: string;
  contacto_emergencia_nombre: string;
  telefono_emergencia: string;
  tipo_sangre: '' | TipoSangre;
  alergias: string;
  antecedentes: string;
  medicamentos: string;
  seguro: string;
  numero_afiliacion: string;
  observaciones: string;
}

@Component({
  selector: 'app-paciente-form-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent, DateFieldComponent,
    LucideX, LucideUser, LucidePhone, LucideActivity, LucideShield,
  ],
  templateUrl: './paciente-form-drawer.component.html',
  styleUrl: './paciente-form-drawer.component.scss',
})
export class PacienteFormDrawerComponent implements OnInit {
  private svc = inject(PacientesService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  paciente = input<Paciente | null>(null);
  closed = output<void>();
  saved = output<void>();

  readonly icons = {
    x: LucideX, user: LucideUser, phone: LucidePhone,
    clinical: LucideActivity, shield: LucideShield,
  };
  readonly iconSection = { size: 17, strokeWidth: 1.5 };

  readonly generoOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    const t = this.translate;
    return [
      { value: '', label: t.instant('pacientes.gender_unspecified') },
      { value: 'masculino', label: t.instant('pacientes.gender_masculino') },
      { value: 'femenino', label: t.instant('pacientes.gender_femenino') },
      { value: 'otro', label: t.instant('pacientes.gender_otro') },
    ];
  });

  readonly civilOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    const t = this.translate;
    return [
      { value: '', label: t.instant('pacientes.civil_unspecified') },
      { value: 'soltero', label: t.instant('pacientes.civil_soltero') },
      { value: 'casado', label: t.instant('pacientes.civil_casado') },
      { value: 'union_libre', label: t.instant('pacientes.civil_union_libre') },
      { value: 'divorciado', label: t.instant('pacientes.civil_divorciado') },
      { value: 'viudo', label: t.instant('pacientes.civil_viudo') },
    ];
  });

  readonly sangreOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    return [
      { value: '', label: this.translate.instant('pacientes.blood_unspecified') },
      ...TIPOS_SANGRE.map((t) => ({ value: t, label: t })),
    ];
  });

  form: FormState = this.emptyForm();

  guardando = signal(false);
  errorMsg = signal('');
  submitted = signal(false);
  cerrando = signal(false);

  get esEdicion(): boolean {
    return this.paciente() !== null;
  }

  get avatarIniciales(): string {
    const a = this.form.nombre.trim()[0] ?? '';
    const b = this.form.apellido.trim()[0] ?? '';
    return (a + b).toUpperCase() || '·';
  }

  ngOnInit(): void {
    const p = this.paciente();
    if (p) {
      this.form = {
        nombre: p.nombre,
        apellido: p.apellido,
        dpi: p.dpi,
        fecha_nacimiento: p.fecha_nacimiento ?? '',
        genero: p.genero ?? '',
        estado_civil: p.estado_civil ?? '',
        ocupacion: p.ocupacion ?? '',
        telefono: p.telefono ?? '',
        email: p.email ?? '',
        direccion: p.direccion ?? '',
        contacto_emergencia_nombre: p.contacto_emergencia_nombre ?? '',
        telefono_emergencia: p.telefono_emergencia ?? '',
        tipo_sangre: p.tipo_sangre ?? '',
        alergias: p.alergias ?? '',
        antecedentes: p.antecedentes ?? '',
        medicamentos: p.medicamentos ?? '',
        seguro: p.seguro ?? '',
        numero_afiliacion: p.numero_afiliacion ?? '',
        observaciones: p.observaciones ?? '',
      };
    }
  }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  dpiInvalido(): boolean {
    return !/^\d{13}$/.test(this.form.dpi.trim());
  }

  private formValido(): boolean {
    if (!this.form.nombre.trim()) return false;
    if (!this.form.apellido.trim()) return false;
    if (this.dpiInvalido()) return false;
    if (!this.form.fecha_nacimiento) return false;
    return true;
  }

  async guardar(): Promise<void> {
    this.submitted.set(true);
    if (!this.formValido()) {
      this.errorMsg.set(this.translate.instant('pacientes.form_error_validate'));
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set('');

    try {
      if (this.esEdicion) {
        const id = this.paciente()!.id;
        const payload: ActualizarPacientePayload = {
          nombre: this.form.nombre.trim(),
          apellido: this.form.apellido.trim(),
          dpi: this.form.dpi.trim(),
          fecha_nacimiento: this.form.fecha_nacimiento,
          genero: this.form.genero || null,
          estado_civil: this.form.estado_civil || null,
          ocupacion: this.s(this.form.ocupacion),
          telefono: this.s(this.form.telefono),
          email: this.s(this.form.email),
          direccion: this.s(this.form.direccion),
          contacto_emergencia_nombre: this.s(this.form.contacto_emergencia_nombre),
          telefono_emergencia: this.s(this.form.telefono_emergencia),
          tipo_sangre: this.form.tipo_sangre || null,
          alergias: this.s(this.form.alergias),
          antecedentes: this.s(this.form.antecedentes),
          medicamentos: this.s(this.form.medicamentos),
          seguro: this.s(this.form.seguro),
          numero_afiliacion: this.s(this.form.numero_afiliacion),
          observaciones: this.s(this.form.observaciones),
        };
        await this.svc.actualizar(id, payload);
      } else {
        const payload: CrearPacientePayload = {
          nombre: this.form.nombre.trim(),
          apellido: this.form.apellido.trim(),
          dpi: this.form.dpi.trim(),
          fecha_nacimiento: this.form.fecha_nacimiento,
          ...(this.form.genero ? { genero: this.form.genero } : {}),
          ...(this.form.estado_civil ? { estado_civil: this.form.estado_civil } : {}),
          ...this.opt('ocupacion', this.form.ocupacion),
          ...this.opt('telefono', this.form.telefono),
          ...this.opt('email', this.form.email),
          ...this.opt('direccion', this.form.direccion),
          ...this.opt('contacto_emergencia_nombre', this.form.contacto_emergencia_nombre),
          ...this.opt('telefono_emergencia', this.form.telefono_emergencia),
          ...(this.form.tipo_sangre ? { tipo_sangre: this.form.tipo_sangre } : {}),
          ...this.opt('alergias', this.form.alergias),
          ...this.opt('antecedentes', this.form.antecedentes),
          ...this.opt('medicamentos', this.form.medicamentos),
          ...this.opt('seguro', this.form.seguro),
          ...this.opt('numero_afiliacion', this.form.numero_afiliacion),
          ...this.opt('observaciones', this.form.observaciones),
        };
        await this.svc.crear(payload);
      }

      this.cerrando.set(true);
      setTimeout(() => this.saved.emit(), 240);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const key = status === 409 ? 'pacientes.error_dpi_taken' : 'pacientes.form_error_generic';
      this.errorMsg.set(this.translate.instant(key));
    } finally {
      this.guardando.set(false);
    }
  }

  private emptyForm(): FormState {
    return {
      nombre: '', apellido: '', dpi: '', fecha_nacimiento: '', genero: '', estado_civil: '',
      ocupacion: '', telefono: '', email: '', direccion: '', contacto_emergencia_nombre: '',
      telefono_emergencia: '', tipo_sangre: '', alergias: '', antecedentes: '', medicamentos: '',
      seguro: '', numero_afiliacion: '', observaciones: '',
    };
  }

  private s(v: string): string | null {
    const t = v.trim();
    return t.length ? t : null;
  }

  private opt(key: string, v: string): Record<string, string> {
    const t = v.trim();
    return t.length ? { [key]: t } : {};
  }
}
