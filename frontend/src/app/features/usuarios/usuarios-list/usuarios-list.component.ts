import {
  Component, inject, signal, computed, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideSearch, LucidePlus, LucideX, LucideChevronLeft, LucideChevronRight,
  LucideLayoutGrid, LucideList, LucideUsers, LucideUserCheck, LucideShield, LucideUserCog,
  LucideStethoscope, LucideHeadset, LucideEdit2,
} from '@lucide/angular';
import { UsuariosService, Usuario, UsuarioStats, Rol } from '../usuarios.service';
import { UsuarioFormDrawerComponent } from '../usuario-form-drawer/usuario-form-drawer.component';
import { UsuarioDetailDrawerComponent } from '../usuario-detail-drawer/usuario-detail-drawer.component';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const ICON_MAP: Record<string, Icon> = {
  search:         LucideSearch,
  plus:           LucidePlus,
  x:              LucideX,
  'chevron-left': LucideChevronLeft,
  'chevron-right':LucideChevronRight,
  grid:           LucideLayoutGrid,
  list:           LucideList,
  users:          LucideUsers,
  'user-check':   LucideUserCheck,
  shield:         LucideShield,
  'user-cog':     LucideUserCog,
  stethoscope:    LucideStethoscope,
  headset:        LucideHeadset,
  edit2:          LucideEdit2,
};

const ROL_ICON: Record<Rol, string> = {
  admin: 'shield',
  recepcionista: 'headset',
  medico: 'stethoscope',
};

type Vista = 'tabla' | 'tarjetas';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent,
    UsuarioFormDrawerComponent, UsuarioDetailDrawerComponent,
    LucideSearch, LucidePlus, LucideX, LucideChevronLeft, LucideChevronRight,
    LucideLayoutGrid, LucideList, LucideUsers, LucideUserCheck, LucideShield, LucideUserCog,
    LucideStethoscope, LucideHeadset, LucideEdit2,
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit {
  private svc = inject(UsuariosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  readonly iconInputs = { size: 16, strokeWidth: 1.5 };
  readonly iconInputsTable = { size: 15, strokeWidth: 1.5 };
  readonly iconMetric = { size: 18, strokeWidth: 1.5 };
  readonly iconRol = { size: 13, strokeWidth: 1.5 };

  icon(name: string): Icon | null { return ICON_MAP[name] ?? null; }
  rolIcon(rol: Rol): Icon | null { return ICON_MAP[ROL_ICON[rol]] ?? null; }

  // --- list state ---
  usuarios = signal<Usuario[]>([]);
  total = signal(0);
  pagina = signal(1);
  readonly limite = 15;
  busqueda = signal('');
  filtroEstado = signal<'activos' | 'inactivos' | 'todos'>('activos');
  rol = signal('');
  vista = signal<Vista>('tabla');
  cargando = signal(false);
  errorLista = signal('');

  stats = signal<UsuarioStats | null>(null);

  // --- drawer crear/editar ---
  formOpen = signal(false);
  formUsuario = signal<Usuario | null>(null); // null => crear

  // --- drawer detalle ---
  detailOpen = signal(false);
  detailUsuario = signal<Usuario | null>(null);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.limite) || 1);

  readonly rolOptions = computed<DropdownOption[]>(() => {
    this.locale.locale();
    const t = this.translate;
    return [
      { value: '', label: t.instant('usuarios.all_roles') },
      { value: 'admin', label: t.instant('usuarios.role_admin') },
      { value: 'recepcionista', label: t.instant('usuarios.role_recepcionista') },
      { value: 'medico', label: t.instant('usuarios.role_medico') },
    ];
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
        rol: this.rol() || undefined,
      });
      this.usuarios.set(res.usuarios);
      this.total.set(res.total);
    } catch {
      this.errorLista.set(this.translate.instant('usuarios.load_error'));
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

  async cambiarRol(rol: string): Promise<void> {
    this.rol.set(rol);
    this.pagina.set(1);
    await this.cargar();
  }

  setVista(v: Vista): void {
    this.vista.set(v);
  }

  // --- detalle ---
  abrirDetalle(u: Usuario): void {
    this.detailUsuario.set(u);
    this.detailOpen.set(true);
  }

  cerrarDetalle(): void {
    this.detailOpen.set(false);
    this.detailUsuario.set(null);
  }

  onDetailEditar(u: Usuario): void {
    this.cerrarDetalle();
    this.formUsuario.set(u);
    this.formOpen.set(true);
  }

  async onDetailChanged(): Promise<void> {
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- crear / editar ---
  abrirCrear(): void {
    this.formUsuario.set(null);
    this.formOpen.set(true);
  }

  abrirEditar(u: Usuario): void {
    this.formUsuario.set(u);
    this.formOpen.set(true);
  }

  cerrarForm(): void {
    this.formOpen.set(false);
    this.formUsuario.set(null);
  }

  async onFormSaved(): Promise<void> {
    this.cerrarForm();
    await Promise.all([this.cargar(), this.cargarStats()]);
  }

  // --- helpers ---
  iniciales(u: Usuario): string {
    return ((u.nombre[0] ?? '') + (u.apellido[0] ?? '')).toUpperCase();
  }

  rolLabel(rol: Rol): string {
    return this.translate.instant('usuarios.role_' + rol);
  }

  ultimoAcceso(iso: string | null): string {
    return this.locale.formatDateTime(iso) ?? this.translate.instant('usuarios.never');
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
