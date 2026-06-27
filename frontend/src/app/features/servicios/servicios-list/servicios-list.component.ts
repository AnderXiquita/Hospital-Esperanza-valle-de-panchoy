import {
  Component, inject, signal, computed, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideSearch, LucideX, LucideChevronLeft, LucideChevronRight,
  LucideLayoutGrid, LucideList, LucideLayers, LucideActivity, LucideBanknote, LucideClock,
  LucidePlus, LucideEdit2,
} from '@lucide/angular';
import { ServiciosService, Servicio, ServicioStats } from '../servicios.service';
import { ServicioFormDrawerComponent } from '../servicio-form-drawer/servicio-form-drawer.component';
import { ServicioDetailDrawerComponent } from '../servicio-detail-drawer/servicio-detail-drawer.component';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const ICON_MAP: Record<string, Icon> = {
  search:         LucideSearch,
  x:              LucideX,
  'chevron-left': LucideChevronLeft,
  'chevron-right':LucideChevronRight,
  grid:           LucideLayoutGrid,
  list:           LucideList,
  layers:         LucideLayers,
  activity:       LucideActivity,
  banknote:       LucideBanknote,
  clock:          LucideClock,
  plus:           LucidePlus,
  edit2:          LucideEdit2,
};

type Vista = 'tabla' | 'tarjetas';

@Component({
  selector: 'app-servicios-list',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule,
    ServicioFormDrawerComponent, ServicioDetailDrawerComponent,
    LucideSearch, LucideX, LucideChevronLeft, LucideChevronRight,
    LucideLayoutGrid, LucideList, LucideLayers, LucideActivity, LucideBanknote, LucideClock,
    LucidePlus, LucideEdit2,
  ],
  templateUrl: './servicios-list.component.html',
  styleUrl: './servicios-list.component.scss',
})
export class ServiciosListComponent implements OnInit {
  private svc = inject(ServiciosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  readonly iconInputs = { size: 16, strokeWidth: 1.5 };
  readonly iconInputsTable = { size: 15, strokeWidth: 1.5 };
  readonly iconMetric = { size: 18, strokeWidth: 1.5 };

  icon(name: string): Icon | null { return ICON_MAP[name] ?? null; }

  servicios = signal<Servicio[]>([]);
  total = signal(0);
  pagina = signal(1);
  readonly limite = 15;
  busqueda = signal('');
  filtroEstado = signal<'activos' | 'inactivos' | 'todos'>('activos');
  vista = signal<Vista>('tabla');
  cargando = signal(false);
  errorLista = signal('');

  stats = signal<ServicioStats | null>(null);

  // --- drawers ---
  formOpen = signal(false);
  formServicio = signal<Servicio | null>(null);
  detailOpen = signal(false);
  detailServicio = signal<Servicio | null>(null);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.limite) || 1);

  readonly avgPrice = computed(() => {
    this.locale.locale();
    return 'Q ' + this.money(this.stats()?.precio_promedio ?? 0);
  });

  readonly avgDuration = computed(() => {
    const min = this.stats()?.duracion_promedio ?? 0;
    return `${min} ${this.translate.instant('servicios.minutes_short')}`;
  });

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
      this.servicios.set(res.servicios);
      this.total.set(res.total);
    } catch {
      this.errorLista.set(this.translate.instant('servicios.load_error'));
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
  abrirDetalle(s: Servicio): void {
    this.detailServicio.set(s);
    this.detailOpen.set(true);
  }

  cerrarDetalle(): void {
    this.detailOpen.set(false);
    this.detailServicio.set(null);
  }

  onDetailEditar(s: Servicio): void {
    this.cerrarDetalle();
    this.formServicio.set(s);
    this.formOpen.set(true);
  }

  async onDetailChanged(): Promise<void> {
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- crear / editar ---
  abrirCrear(): void {
    this.formServicio.set(null);
    this.formOpen.set(true);
  }

  abrirEditar(s: Servicio): void {
    this.formServicio.set(s);
    this.formOpen.set(true);
  }

  cerrarForm(): void {
    this.formOpen.set(false);
    this.formServicio.set(null);
  }

  async onFormSaved(): Promise<void> {
    this.cerrarForm();
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- helpers ---
  money(value: string | number): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (isNaN(n)) return '0.00';
    return n.toLocaleString(this.locale.locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  duracionLabel(min: number): string {
    return `${min} ${this.translate.instant('servicios.minutes_short')}`;
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
