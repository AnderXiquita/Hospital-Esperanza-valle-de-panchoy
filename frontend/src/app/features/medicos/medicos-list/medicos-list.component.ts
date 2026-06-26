import {
  Component, inject, signal, computed, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideSearch, LucidePlus, LucideEdit2, LucidePower, LucidePowerOff, LucideX,
  LucideChevronLeft, LucideChevronRight, LucideStethoscope,
  LucideActivity, LucideLayers, LucideClock, LucideLayoutGrid, LucideList,
} from '@lucide/angular';
import { MedicosService, Medico, MedicoConHorarios, MedicoStats } from '../medicos.service';
import { MedicoFormDrawerComponent } from '../medico-form-drawer/medico-form-drawer.component';
import { MedicoDetailDrawerComponent } from '../medico-detail-drawer/medico-detail-drawer.component';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { LocaleService } from '../../../shared/locale.service';
import { DIAS_ORDEN } from '../medicos.constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const ICON_MAP: Record<string, Icon> = {
  search:         LucideSearch,
  plus:           LucidePlus,
  edit2:          LucideEdit2,
  power:          LucidePower,
  'power-off':    LucidePowerOff,
  x:              LucideX,
  'chevron-left': LucideChevronLeft,
  'chevron-right':LucideChevronRight,
  stethoscope:    LucideStethoscope,
  activity:       LucideActivity,
  layers:         LucideLayers,
  clock:          LucideClock,
  grid:           LucideLayoutGrid,
  list:           LucideList,
};

type Vista = 'tabla' | 'tarjetas';

@Component({
  selector: 'app-medicos-list',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule,
    MedicoFormDrawerComponent, MedicoDetailDrawerComponent, DropdownComponent,
    LucideSearch, LucidePlus, LucideEdit2, LucidePower, LucidePowerOff, LucideX,
    LucideChevronLeft, LucideChevronRight, LucideStethoscope,
    LucideActivity, LucideLayers, LucideClock, LucideLayoutGrid, LucideList,
  ],
  templateUrl: './medicos-list.component.html',
  styleUrl: './medicos-list.component.scss',
})
export class MedicosListComponent implements OnInit {
  private svc = inject(MedicosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  readonly iconInputs = { size: 16, strokeWidth: 1.5 };
  readonly iconInputsMd = { size: 20, strokeWidth: 1.5 };
  readonly iconInputsTable = { size: 15, strokeWidth: 1.5 };
  readonly iconMetric = { size: 18, strokeWidth: 1.5 };

  icon(name: string): Icon | null { return ICON_MAP[name] ?? null; }

  weekStrip(dias: number[]): { label: string; active: boolean }[] {
    const set = new Set(dias);
    return DIAS_ORDEN.map((d) => ({ label: this.locale.weekdayInitial(d), active: set.has(d) }));
  }

  // --- list state ---
  medicos = signal<Medico[]>([]);
  total = signal(0);
  pagina = signal(1);
  readonly limite = 15;
  busqueda = signal('');
  filtroEstado = signal<'activos' | 'inactivos' | 'todos'>('activos');
  especialidad = signal('');
  vista = signal<Vista>('tabla');
  cargando = signal(false);
  errorLista = signal('');

  stats = signal<MedicoStats | null>(null);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.limite) || 1);

  readonly espOptions = computed<DropdownOption[]>(() => {
    this.locale.locale(); // re-evaluar al cambiar de idioma
    const esp = this.stats()?.especialidades ?? [];
    return [
      { value: '', label: this.translate.instant('medicos.all_specialties') },
      ...esp.map((e) => ({ value: e, label: e })),
    ];
  });

  // --- drawers ---
  formOpen = signal(false);
  formMedico = signal<MedicoConHorarios | null>(null);
  detailOpen = signal(false);
  detailId = signal<number | null>(null);
  abriendoEdicion = signal<number | null>(null);

  // --- toggle confirm ---
  confirmToggleId = signal<number | null>(null);
  toggleError = signal('');

  async ngOnInit(): Promise<void> {
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorLista.set('');
    try {
      const res = await this.svc.listar({
        pagina: this.pagina(),
        limite: this.limite,
        busqueda: this.busqueda() || undefined,
        soloActivos: this.filtroEstado() === 'todos' ? undefined : this.filtroEstado() === 'activos',
        especialidad: this.especialidad() || undefined,
      });
      this.medicos.set(res.medicos);
      this.total.set(res.total);
    } catch {
      this.errorLista.set(this.translate.instant('medicos.load_error'));
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarStats(): Promise<void> {
    try {
      this.stats.set(await this.svc.estadisticas());
    } catch {
      // métricas no críticas; si fallan, no bloquea la lista
    }
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onBusquedaChange(val: string): void {
    this.busqueda.set(val);
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.searchTimer = null; this.buscar(); }, 250);
  }

  buscarInmediato(): void {
    if (this.searchTimer !== null) { clearTimeout(this.searchTimer); this.searchTimer = null; }
    this.buscar();
  }

  async buscar(): Promise<void> {
    this.pagina.set(1);
    await this.cargar();
  }

  async cambiarPagina(n: number): Promise<void> {
    if (n < 1 || n > this.totalPaginas()) return;
    this.pagina.set(n);
    await this.cargar();
  }

  async cambiarFiltro(estado: 'activos' | 'inactivos' | 'todos'): Promise<void> {
    this.filtroEstado.set(estado);
    this.pagina.set(1);
    await this.cargar();
  }

  async cambiarEspecialidad(esp: string): Promise<void> {
    this.especialidad.set(esp);
    this.pagina.set(1);
    await this.cargar();
  }

  setVista(v: Vista): void {
    this.vista.set(v);
  }

  // --- detalle ---
  abrirDetalle(m: Medico): void {
    this.detailId.set(m.id);
    this.detailOpen.set(true);
  }

  cerrarDetalle(): void {
    this.detailOpen.set(false);
    this.detailId.set(null);
  }

  // --- crear / editar ---
  abrirCrear(): void {
    this.formMedico.set(null);
    this.formOpen.set(true);
  }

  async abrirEditar(m: Medico): Promise<void> {
    this.abriendoEdicion.set(m.id);
    try {
      const full = await this.svc.obtener(m.id);
      this.formMedico.set(full);
      this.formOpen.set(true);
    } catch {
      this.errorLista.set(this.translate.instant('medicos.open_edit_error'));
    } finally {
      this.abriendoEdicion.set(null);
    }
  }

  onDetailEditar(m: MedicoConHorarios): void {
    this.cerrarDetalle();
    this.formMedico.set(m);
    this.formOpen.set(true);
  }

  cerrarForm(): void {
    this.formOpen.set(false);
    this.formMedico.set(null);
  }

  async onFormSaved(): Promise<void> {
    this.cerrarForm();
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- toggle activo ---
  pedirConfirmToggle(id: number): void {
    this.confirmToggleId.set(id);
  }

  cancelarToggle(): void {
    this.toggleError.set('');
    this.confirmToggleId.set(null);
  }

  async confirmarToggle(): Promise<void> {
    const id = this.confirmToggleId();
    if (!id) return;
    this.toggleError.set('');
    try {
      const res = await this.svc.toggle(id);
      this.medicos.update((list) =>
        list.map((m) => (m.id === id ? { ...m, activo: res.activo } : m))
      );
      await this.cargarStats();
      this.confirmToggleId.set(null);
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      this.toggleError.set(
        this.translate.instant(code === 'CITAS_ACTIVAS' ? 'medicos.error_citas_activas' : 'medicos.toggle_error')
      );
    }
  }

  // --- helpers ---
  iniciales(m: Medico): string {
    return ((m.nombre[0] ?? '') + (m.apellido[0] ?? '')).toUpperCase();
  }

  get toggleEsDesactivar(): boolean {
    const id = this.confirmToggleId();
    if (!id) return false;
    return this.medicos().find((x) => x.id === id)?.activo ?? false;
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const pages: number[] = [];
    const start = Math.max(1, actual - 2);
    const end = Math.min(total, actual + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
