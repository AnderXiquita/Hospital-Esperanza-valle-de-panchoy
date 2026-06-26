import {
  Component, inject, signal, input, output, OnInit, computed, ElementRef, HostListener, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideX, LucideSearch, LucideUser, LucideClock } from '@lucide/angular';
import { CitasService, CrearCitaPayload } from '../citas.service';
import { PacientesService, Paciente } from '../../pacientes/pacientes.service';
import { MedicosService } from '../../medicos/medicos.service';
import { ServiciosService } from '../../servicios/servicios.service';
import { AuthService } from '../../../core/services/auth.service';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { DateFieldComponent } from '../../../shared/date-field/date-field.component';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

export interface CitaPrefill {
  medicoId?: number;
  fecha?: string;
  horaInicio?: string;
}

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
  selector: 'app-cita-form-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent, DateFieldComponent,
    LucideX, LucideSearch, LucideUser, LucideClock,
  ],
  templateUrl: './cita-form-drawer.component.html',
  styleUrl: './cita-form-drawer.component.scss',
})
export class CitaFormDrawerComponent implements OnInit {
  private svc = inject(CitasService);
  private pacientesSvc = inject(PacientesService);
  private medicosSvc = inject(MedicosService);
  private serviciosSvc = inject(ServiciosService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private elementRef = inject(ElementRef<HTMLElement>);

  readonly esMedico = computed(() => this.auth.user()?.rol === 'medico');
  medicoFijo = signal(false); // true cuando el médico está pre-fijado y no debe cambiarse

  prefill = input<CitaPrefill | null>(null);
  closed = output<void>();
  saved = output<void>();

  readonly icons = { x: LucideX, search: LucideSearch, user: LucideUser, clock: LucideClock };
  readonly iconSm = { size: 16, strokeWidth: 1.5 };

  // catálogos
  medicoOptions = signal<DropdownOption[]>([]);
  servicioOptions = signal<DropdownOption[]>([]);
  private servicioDuracion = new Map<number, number>();
  private medicoDias = new Map<number, number[]>();

  // form
  medicoId = signal<number | ''>('');
  servicioId = signal<number | ''>('');
  fecha = signal('');
  horaInicio = signal<string>('');
  motivo = signal('');

  // slots disponibles
  availableHoraOptions = signal<DropdownOption[]>([]);
  loadingSlots = signal(false);
  readonly minDate = localIsoDate();

  // computed: médicos que trabajan el día seleccionado
  readonly filteredMedicoOptions = computed<DropdownOption[]>(() => {
    const fec = this.fecha();
    if (!fec) return this.medicoOptions();
    const dow = new Date(`${fec}T12:00:00`).getDay();
    return this.medicoOptions().filter((opt) => {
      const dias = this.medicoDias.get(Number(opt.value)) ?? [];
      return dias.includes(dow);
    });
  });

  // días que el médico seleccionado NO trabaja (para marcar en rojo en el calendario)
  readonly doctorUnavailableDays = computed<number[]>(() => {
    const mid = this.medicoId();
    if (!mid) return [];
    const dias = this.medicoDias.get(Number(mid)) ?? [];
    return [0, 1, 2, 3, 4, 5, 6].filter((d) => !dias.includes(d));
  });

  readonly noSlots = computed(() => {
    const mid = this.medicoId();
    const fec = this.fecha();
    const sid = this.servicioId();
    return !!(mid && fec && sid && !this.loadingSlots() && this.availableHoraOptions().length === 0);
  });

  // autocompletado paciente
  pacienteQuery = signal('');
  pacienteResults = signal<Paciente[]>([]);
  pacienteOpen = signal(false);
  pacienteSel = signal<Paciente | null>(null);
  buscandoPaciente = signal(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private debounce: any = null;

  guardando = signal(false);
  errorMsg = signal('');
  submitted = signal(false);
  cerrando = signal(false);

  readonly horaFinPreview = computed(() => {
    const sid = this.servicioId();
    const hi = this.horaInicio();
    if (!sid || !hi) return null;
    const dur = this.servicioDuracion.get(Number(sid));
    if (!dur) return null;
    const [h, m] = hi.split(':').map(Number);
    const total = h * 60 + m + dur;
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
  });

  async ngOnInit(): Promise<void> {
    if (this.esMedico()) {
      await Promise.all([this.cargarMedicoPropio(), this.cargarServicios()]);
    } else {
      await Promise.all([this.cargarMedicos(), this.cargarServicios()]);
    }
    const pre = this.prefill();
    if (pre) {
      if (pre.medicoId) this.medicoId.set(pre.medicoId);
      if (pre.fecha) this.fecha.set(pre.fecha);
      if (pre.horaInicio) this.horaInicio.set(pre.horaInicio);
      if (this.medicoId()) void this.recargarSlots();
    }
  }

  private async cargarMedicos(): Promise<void> {
    try {
      const res = await this.medicosSvc.listar({ soloActivos: true, limite: 100 });
      this.medicoDias.clear();
      res.medicos.forEach((m) => this.medicoDias.set(m.id, m.dias_atencion));
      this.medicoOptions.set(res.medicos.map((m) => ({ value: m.id, label: `${m.nombre} ${m.apellido}` })));
    } catch { /* vacío */ }
  }

  // Para médicos: obtiene su propio perfil sin necesitar acceso a /api/medicos
  private async cargarMedicoPropio(): Promise<void> {
    try {
      const perfil = await this.medicosSvc.getMiPerfil();
      // Registrar sus días como todos disponibles; el slot API valida la disponibilidad real
      this.medicoDias.set(perfil.id, [0, 1, 2, 3, 4, 5, 6]);
      this.medicoOptions.set([{ value: perfil.id, label: `${perfil.nombre} ${perfil.apellido}` }]);
      this.medicoId.set(perfil.id);
      this.medicoFijo.set(true);
    } catch { /* vacío */ }
  }

  private async cargarServicios(): Promise<void> {
    try {
      const res = await this.serviciosSvc.listar({ soloActivos: true, limite: 100 });
      const min = this.translate.instant('citas.minutes_short');
      this.servicioOptions.set(res.servicios.map((s) => {
        this.servicioDuracion.set(s.id, s.duracion);
        return { value: s.id, label: `${s.nombre} · ${s.duracion} ${min}` };
      }));
    } catch { /* vacío */ }
  }

  // --- event handlers para campos con efecto en cascada ---

  onFechaChange(val: string): void {
    this.fecha.set(val);
    // Si el médico actual no trabaja ese día, lo limpiamos
    const mid = this.medicoId();
    if (mid && val) {
      const dow = new Date(`${val}T12:00:00`).getDay();
      const dias = this.medicoDias.get(Number(mid)) ?? [];
      if (!dias.includes(dow)) {
        this.medicoId.set('');
      }
    }
    this.horaInicio.set('');
    this.recargarSlots();
  }

  onMedicoChange(val: number | ''): void {
    this.medicoId.set(val);
    this.horaInicio.set('');
    this.recargarSlots();
  }

  onServicioChange(val: number | ''): void {
    this.servicioId.set(val);
    this.horaInicio.set('');
    this.recargarSlots();
  }

  private async recargarSlots(): Promise<void> {
    const mid = this.medicoId();
    const fec = this.fecha();
    const sid = this.servicioId();
    if (!mid || !fec || !sid) {
      this.availableHoraOptions.set([]);
      return;
    }
    const dur = this.servicioDuracion.get(Number(sid));
    if (!dur) { this.availableHoraOptions.set([]); return; }

    this.loadingSlots.set(true);
    try {
      const { slots } = await this.svc.getSlots({ medicoId: Number(mid), fecha: fec, duracion: dur });
      // Filtrar horas pasadas si es hoy
      const filtered = fec === localIsoDate()
        ? slots.filter((s) => s > localTime())
        : slots;
      this.availableHoraOptions.set(filtered.map((s) => ({ value: s, label: s })));
      // Si la hora pre-seleccionada ya no está disponible, la limpiamos
      if (this.horaInicio() && !filtered.includes(this.horaInicio())) {
        this.horaInicio.set('');
      }
    } catch {
      this.availableHoraOptions.set([]);
    } finally {
      this.loadingSlots.set(false);
    }
  }

  // --- autocompletado paciente ---
  onPacienteInput(q: string): void {
    this.pacienteQuery.set(q);
    this.pacienteSel.set(null);
    if (this.debounce) clearTimeout(this.debounce);
    if (!q.trim()) {
      this.pacienteResults.set([]);
      this.pacienteOpen.set(false);
      return;
    }
    this.buscandoPaciente.set(true);
    this.debounce = setTimeout(async () => {
      try {
        const res = await this.pacientesSvc.listar({ busqueda: q, soloActivos: true, limite: 8 });
        this.pacienteResults.set(res.pacientes);
        this.pacienteOpen.set(true);
      } finally {
        this.buscandoPaciente.set(false);
      }
    }, 250);
  }

  seleccionarPaciente(p: Paciente): void {
    this.pacienteSel.set(p);
    this.pacienteQuery.set(`${p.nombre} ${p.apellido}`);
    this.pacienteResults.set([]);
    this.pacienteOpen.set(false);
  }

  limpiarPaciente(): void {
    this.pacienteSel.set(null);
    this.pacienteQuery.set('');
    this.pacienteResults.set([]);
    this.pacienteOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const box = this.elementRef.nativeElement.querySelector('.ac');
    if (box && !box.contains(e.target as Node)) this.pacienteOpen.set(false);
  }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  private valido(): boolean {
    return !!(this.pacienteSel() && this.medicoId() && this.servicioId() && this.fecha() && this.horaInicio());
  }

  async guardar(): Promise<void> {
    this.submitted.set(true);
    if (!this.valido()) {
      this.errorMsg.set(this.translate.instant('citas.form_error_validate'));
      return;
    }
    this.guardando.set(true);
    this.errorMsg.set('');
    try {
      const payload: CrearCitaPayload = {
        paciente_id: this.pacienteSel()!.id,
        medico_id: Number(this.medicoId()),
        servicio_id: Number(this.servicioId()),
        fecha: this.fecha(),
        hora_inicio: this.horaInicio(),
        ...(this.motivo().trim() ? { motivo_consulta: this.motivo().trim() } : {}),
      };
      await this.svc.crear(payload);
      this.cerrando.set(true);
      setTimeout(() => this.saved.emit(), 240);
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      const map: Record<string, string> = {
        OVERLAP: 'citas.error_overlap',
        OUT_OF_SCHEDULE: 'citas.error_out_of_schedule',
        SERVICIO: 'citas.error_not_found',
        MEDICO: 'citas.error_not_found',
        PACIENTE: 'citas.error_not_found',
      };
      this.errorMsg.set(this.translate.instant(code && map[code] ? map[code] : 'citas.error_generic'));
    } finally {
      this.guardando.set(false);
    }
  }
}
