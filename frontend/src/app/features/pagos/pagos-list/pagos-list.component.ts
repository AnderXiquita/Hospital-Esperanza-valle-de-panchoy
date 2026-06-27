import {
  Component, inject, signal, computed, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideSearch, LucideX, LucideChevronLeft, LucideChevronRight,
  LucideLayoutGrid, LucideList, LucideWallet, LucideTrendingUp, LucideReceipt, LucideCreditCard,
  LucidePlus,
} from '@lucide/angular';
import { PagosService, Pago, PagoStats, EstadoPago } from '../pagos.service';
import { PagoFormDrawerComponent } from '../pago-form-drawer/pago-form-drawer.component';
import { PagoDetailDrawerComponent } from '../pago-detail-drawer/pago-detail-drawer.component';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
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
  wallet:         LucideWallet,
  trending:       LucideTrendingUp,
  receipt:        LucideReceipt,
  card:           LucideCreditCard,
  plus:           LucidePlus,
};

type Vista = 'tabla' | 'tarjetas';

@Component({
  selector: 'app-pagos-list',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent,
    PagoFormDrawerComponent, PagoDetailDrawerComponent, BodyPortalDirective,
    LucideSearch, LucideX, LucideChevronLeft, LucideChevronRight,
    LucideLayoutGrid, LucideList, LucideWallet, LucideTrendingUp, LucideReceipt, LucideCreditCard,
    LucidePlus,
  ],
  templateUrl: './pagos-list.component.html',
  styleUrl: './pagos-list.component.scss',
})
export class PagosListComponent implements OnInit {
  private svc = inject(PagosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  readonly iconInputs = { size: 16, strokeWidth: 1.5 };
  readonly iconInputsTable = { size: 15, strokeWidth: 1.5 };
  readonly iconMetric = { size: 18, strokeWidth: 1.5 };

  icon(name: string): Icon | null { return ICON_MAP[name] ?? null; }

  pagos = signal<Pago[]>([]);
  total = signal(0);
  pagina = signal(1);
  readonly limite = 15;
  busqueda = signal('');
  estadoFiltro = signal('');
  vista = signal<Vista>('tabla');
  cargando = signal(false);
  errorLista = signal('');

  stats = signal<PagoStats | null>(null);

  // drawers
  formOpen = signal(false);
  detailOpen = signal(false);
  detailPago = signal<Pago | null>(null);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.limite) || 1);

  readonly estadoOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    const t = this.translate;
    return [
      { value: '', label: t.instant('pagos.all_estados') },
      { value: 'pagado', label: t.instant('pagos.estado_pagado') },
      { value: 'pendiente', label: t.instant('pagos.estado_pendiente') },
      { value: 'anulado', label: t.instant('pagos.estado_anulado') },
    ];
  });

  readonly totalRecaudado = computed(() => 'Q ' + this.money(this.stats()?.total_recaudado ?? 0));
  readonly recaudadoMes = computed(() => 'Q ' + this.money(this.stats()?.recaudado_mes ?? 0));
  readonly ticketPromedio = computed(() => 'Q ' + this.money(this.stats()?.ticket_promedio ?? 0));

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
        estado: this.estadoFiltro() || undefined,
      });
      this.pagos.set(res.pagos);
      this.total.set(res.total);
    } catch {
      this.errorLista.set(this.translate.instant('pagos.load_error'));
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

  async cambiarEstado(v: string): Promise<void> {
    this.estadoFiltro.set(v);
    this.pagina.set(1);
    await this.cargar();
  }

  async cambiarPagina(n: number): Promise<void> {
    if (n < 1 || n > this.totalPaginas()) return;
    this.pagina.set(n);
    await this.cargar();
  }

  setVista(v: Vista): void {
    this.vista.set(v);
  }

  // --- drawers ---
  abrirRegistrar(): void {
    this.formOpen.set(true);
  }

  cerrarForm(): void {
    this.formOpen.set(false);
  }

  async onFormSaved(): Promise<void> {
    this.cerrarForm();
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  abrirDetalle(p: Pago): void {
    this.detailPago.set(p);
    this.detailOpen.set(true);
  }

  cerrarDetalle(): void {
    this.detailOpen.set(false);
    this.detailPago.set(null);
  }

  async onDetailChanged(): Promise<void> {
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- helpers ---
  money(value: string | number): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (isNaN(n)) return '0.00';
    return n.toLocaleString(this.locale.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  metodoLabel(metodo: string | null): string {
    if (!metodo) return this.translate.instant('pagos.no_method');
    return this.translate.instant('pagos.metodo_' + metodo);
  }

  estadoLabel(estado: EstadoPago): string {
    return this.translate.instant('pagos.estado_' + estado);
  }

  fechaLabel(iso: string): string {
    return this.locale.formatLong(iso);
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
