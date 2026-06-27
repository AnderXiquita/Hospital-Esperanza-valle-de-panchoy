import {
  Component, inject, signal, computed, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideSearch, LucideX, LucideChevronLeft, LucideChevronRight,
  LucideLayoutGrid, LucideList, LucideUsers, LucideUserCheck, LucideUserPlus, LucideMail,
  LucidePlus, LucideEdit2,
} from '@lucide/angular';
import { PacientesService, Paciente, PacienteStats } from '../pacientes.service';
import { PacienteFormDrawerComponent } from '../paciente-form-drawer/paciente-form-drawer.component';
import { PacienteDetailDrawerComponent } from '../paciente-detail-drawer/paciente-detail-drawer.component';
import { LocaleService } from '../../../shared/locale.service';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { calcularEdad } from '../../medicos/medicos.constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const ICON_MAP: Record<string, Icon> = {
  search:         LucideSearch,
  x:              LucideX,
  'chevron-left': LucideChevronLeft,
  'chevron-right':LucideChevronRight,
  grid:           LucideLayoutGrid,
  list:           LucideList,
  users:          LucideUsers,
  'user-check':   LucideUserCheck,
  'user-plus':    LucideUserPlus,
  mail:           LucideMail,
  plus:           LucidePlus,
  edit2:          LucideEdit2,
};

type Vista = 'tabla' | 'tarjetas';

@Component({
  selector: 'app-pacientes-list',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule,
    PacienteFormDrawerComponent, PacienteDetailDrawerComponent, BodyPortalDirective,
    LucideSearch, LucideX, LucideChevronLeft, LucideChevronRight,
    LucideLayoutGrid, LucideList, LucideUsers, LucideUserCheck, LucideUserPlus, LucideMail,
    LucidePlus, LucideEdit2,
  ],
  templateUrl: './pacientes-list.component.html',
  styleUrl: './pacientes-list.component.scss',
})
export class PacientesListComponent implements OnInit {
  private svc = inject(PacientesService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  readonly iconInputs = { size: 16, strokeWidth: 1.5 };
  readonly iconInputsTable = { size: 15, strokeWidth: 1.5 };
  readonly iconMetric = { size: 18, strokeWidth: 1.5 };

  icon(name: string): Icon | null { return ICON_MAP[name] ?? null; }

  pacientes = signal<Paciente[]>([]);
  total = signal(0);
  pagina = signal(1);
  readonly limite = 15;
  busqueda = signal('');
  filtroEstado = signal<'activos' | 'inactivos' | 'todos'>('activos');
  vista = signal<Vista>('tabla');
  cargando = signal(false);
  errorLista = signal('');

  stats = signal<PacienteStats | null>(null);

  // --- drawers ---
  formOpen = signal(false);
  formPaciente = signal<Paciente | null>(null);
  detailOpen = signal(false);
  detailPaciente = signal<Paciente | null>(null);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.limite) || 1);

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
      });
      this.pacientes.set(res.pacientes);
      this.total.set(res.total);
    } catch {
      this.errorLista.set(this.translate.instant('pacientes.load_error'));
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarStats(): Promise<void> {
    try {
      this.stats.set(await this.svc.estadisticas());
    } catch {
      // métricas no críticas
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

  setVista(v: Vista): void {
    this.vista.set(v);
  }

  // --- detalle ---
  abrirDetalle(p: Paciente): void {
    this.detailPaciente.set(p);
    this.detailOpen.set(true);
  }

  cerrarDetalle(): void {
    this.detailOpen.set(false);
    this.detailPaciente.set(null);
  }

  onDetailEditar(p: Paciente): void {
    this.cerrarDetalle();
    this.formPaciente.set(p);
    this.formOpen.set(true);
  }

  async onDetailChanged(): Promise<void> {
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- crear / editar ---
  abrirCrear(): void {
    this.formPaciente.set(null);
    this.formOpen.set(true);
  }

  abrirEditar(p: Paciente): void {
    this.formPaciente.set(p);
    this.formOpen.set(true);
  }

  cerrarForm(): void {
    this.formOpen.set(false);
    this.formPaciente.set(null);
  }

  async onFormSaved(): Promise<void> {
    this.cerrarForm();
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- helpers ---
  iniciales(p: Paciente): string {
    return ((p.nombre[0] ?? '') + (p.apellido[0] ?? '')).toUpperCase();
  }

  edadLabel(fecha: string | null): string {
    const edad = calcularEdad(fecha);
    return edad !== null ? `${edad} ${this.translate.instant('pacientes.years')}` : '—';
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
