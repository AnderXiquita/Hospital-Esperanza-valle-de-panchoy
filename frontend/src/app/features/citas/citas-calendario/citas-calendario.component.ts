import {
  Component, inject, signal, computed, OnInit, OnDestroy, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { LucideChevronLeft, LucideChevronRight, LucideCalendarDays, LucidePlus } from '@lucide/angular';
import { CitasService, Cita, EstadoCita } from '../citas.service';
import { MedicosService } from '../../medicos/medicos.service';
import { AuthService } from '../../../core/services/auth.service';
import { DropdownComponent, DropdownOption } from '../../../shared/dropdown/dropdown.component';
import { CitaFormDrawerComponent, CitaPrefill } from '../cita-form-drawer/cita-form-drawer.component';
import { CitaDetailDrawerComponent } from '../cita-detail-drawer/cita-detail-drawer.component';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

const HOUR_PX = 72;
const SYS_KEY = 'hospital_system_config';

function loadHorario(): { start: number; end: number } {
  try {
    const raw = localStorage.getItem(SYS_KEY);
    if (!raw) return { start: 7, end: 20 };
    const cfg = JSON.parse(raw) as { horarioApertura?: string; horarioCierre?: string };
    const [sh] = (cfg.horarioApertura ?? '07:00').split(':').map(Number);
    const [eh, em] = (cfg.horarioCierre ?? '20:00').split(':').map(Number);
    const start = isNaN(sh) ? 7 : sh;
    const end = isNaN(eh) ? 20 : (em > 0 ? eh + 1 : eh);
    return { start, end };
  } catch { return { start: 7, end: 20 }; }
}
const ESTADOS: EstadoCita[] = [
  'agendada', 'confirmada', 'atendida', 'reprogramada', 'cancelada', 'no_presentado',
];

interface DiaCol {
  iso: string;
  date: Date;
  nombre: string;
  num: number;
  isToday: boolean;
}

interface DiaMes {
  iso: string;
  date: Date;
  num: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface CitaLayout {
  cita: Cita;
  top: number;
  height: number;
  left: number;
  width: number;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }
function isoLocal(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

@Component({
  selector: 'app-citas-calendario',
  standalone: true,
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule, DropdownComponent,
    CitaFormDrawerComponent, CitaDetailDrawerComponent,
    LucideChevronLeft, LucideChevronRight, LucideCalendarDays, LucidePlus,
  ],
  templateUrl: './citas-calendario.component.html',
  styleUrl: './citas-calendario.component.scss',
})
export class CitasCalendarioComponent implements OnInit, OnDestroy {
  private svc = inject(CitasService);
  private medicosSvc = inject(MedicosService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);
  private route = inject(ActivatedRoute);

  readonly esMedico = computed(() => this.auth.user()?.rol === 'medico');

  readonly icons = {
    prev: LucideChevronLeft, next: LucideChevronRight, cal: LucideCalendarDays, plus: LucidePlus,
  };
  readonly iconInputs = { size: 18, strokeWidth: 1.5 };
  readonly iconSm = { size: 16, strokeWidth: 1.5 };

  readonly hourPx = HOUR_PX;
  readonly estadosList = ESTADOS;

  formOpen = signal(false);
  formPrefill = signal<CitaPrefill | null>(null);
  detailOpen = signal(false);
  detailCita = signal<Cita | null>(null);

  currentTimeTop = signal<number | null>(null);
  currentTimeLabel = signal('');
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  hoveredCita = signal<{ cita: Cita; x: number; y: number } | null>(null);
  tooltipClosing = signal(false);
  private tooltipTimer: ReturnType<typeof setTimeout> | null = null;
  private closingTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly _horario = loadHorario();
  readonly startHour = this._horario.start;
  private readonly endH = this._horario.end;
  readonly gridHeight = (this._horario.end - this._horario.start) * HOUR_PX;
  readonly horas = Array.from(
    { length: this._horario.end - this._horario.start },
    (_, i) => this._horario.start + i
  );

  // ── Desktop week state ────────────────────────────────────────────────────────
  weekStart = signal(this.mondayOf(new Date()));

  // ── Mobile month state ────────────────────────────────────────────────────────
  isMobile = signal(typeof window !== 'undefined' && window.innerWidth <= 960);
  mobileMes = signal(this.primerDiaMes(new Date()));
  mobileDiaSeleccionado = signal<string | null>(isoLocal(new Date()));
  mobileViewMode = signal<'month' | 'day'>('month');

  private resizeTimer?: ReturnType<typeof setTimeout>;
  private readonly resizeHandler = (): void => {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      const nowMobile = window.innerWidth <= 960;
      if (nowMobile !== this.isMobile()) {
        this.isMobile.set(nowMobile);
        void this.cargar();
      }
    }, 150);
  };

  // ── Shared data ───────────────────────────────────────────────────────────────
  citas = signal<Cita[]>([]);
  cargando = signal(false);
  error = signal('');
  medicoFiltro = signal('');
  estadoFiltro = signal('');
  medicoOptions = signal<DropdownOption[]>([{ value: '', label: '' }]);

  // ── Desktop computed ──────────────────────────────────────────────────────────
  readonly dias = computed<DiaCol[]>(() => {
    this.locale.locale();
    const start = this.weekStart();
    const hoyIso = isoLocal(new Date());
    const loc = this.locale.locale();
    return Array.from({ length: 7 }, (_, i) => {
      const date = this.addDays(start, i);
      const nombre = new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(date);
      return {
        iso: isoLocal(date),
        date,
        nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1).replace('.', ''),
        num: date.getDate(),
        isToday: isoLocal(date) === hoyIso,
      };
    });
  });

  readonly rangoLabel = computed(() => {
    const d = this.dias();
    if (!d.length) return '';
    const loc = this.locale.locale();
    const a = d[0].date;
    const b = d[6].date;
    const bStr = b.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${a.getDate()} – ${bStr}`;
  });

  readonly columnas = computed<CitaLayout[][]>(() => {
    return this.dias().map((dia) => {
      const citasDia = this.citas().filter((c) => c.fecha === dia.iso);
      return this.layoutDia(citasDia);
    });
  });

  // ── Mobile computed ───────────────────────────────────────────────────────────
  readonly diasMesGrid = computed<DiaMes[]>(() => {
    const mes = this.mobileMes();
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const dow = (primerDia.getDay() + 6) % 7; // Monday = 0
    const gridStart = this.addDays(primerDia, -dow);
    const hoyIso = isoLocal(new Date());
    const mesActual = mes.getMonth();
    const daysInMonth = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((dow + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const date = this.addDays(gridStart, i);
      const iso = isoLocal(date);
      return {
        iso, date, num: date.getDate(),
        isToday: iso === hoyIso,
        isCurrentMonth: date.getMonth() === mesActual,
      };
    });
  });

  readonly mesLabel = computed(() => {
    this.locale.locale();
    return new Intl.DateTimeFormat(this.locale.locale(), { month: 'long', year: 'numeric' })
      .format(this.mobileMes());
  });

  readonly citasPorDia = computed(() => {
    const map = new Map<string, Cita[]>();
    for (const c of this.citas()) {
      if (!map.has(c.fecha)) map.set(c.fecha, []);
      map.get(c.fecha)!.push(c);
    }
    return map;
  });

  readonly citasDiaSeleccionado = computed(() => {
    const iso = this.mobileDiaSeleccionado();
    if (!iso) return [];
    return this.citasPorDia().get(iso) ?? [];
  });

  readonly diaSeleccionadoLabel = computed(() => {
    this.locale.locale();
    const iso = this.mobileDiaSeleccionado();
    if (!iso) return '';
    const date = new Date(iso + 'T00:00:00');
    return date.toLocaleDateString(this.locale.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  });

  readonly weekdayLabels = computed(() => {
    return [1, 2, 3, 4, 5, 6, 0].map((dow) => this.locale.weekdayInitial(dow));
  });

  readonly citasLayoutDiaSeleccionado = computed<CitaLayout[]>(() => {
    const iso = this.mobileDiaSeleccionado();
    if (!iso) return [];
    const citasDia = this.citas().filter((c) => c.fecha === iso);
    return this.layoutDia(citasDia);
  });

  readonly selectedDayIsToday = computed(() => {
    return this.mobileDiaSeleccionado() === isoLocal(new Date());
  });

  async ngOnInit(): Promise<void> {
    this.updateCurrentTime();
    this.timeInterval = setInterval(() => this.updateCurrentTime(), 60_000);
    window.addEventListener('resize', this.resizeHandler);

    if (this.esMedico()) {
      try {
        const info = await this.medicosSvc.getMiPerfil();
        this.medicoFiltro.set(String(info.id));
      } catch { /* perfil no encontrado, carga sin filtro */ }
      await this.cargar();
    } else {
      await Promise.all([this.cargarMedicos(), this.cargar()]);
    }

    if (this.route.snapshot.queryParams['nueva']) {
      this.abrirCrear();
    }

    const citaIdStr = this.route.snapshot.queryParams['citaId'];
    if (citaIdStr) {
      const cita = this.citas().find((c) => c.id === Number(citaIdStr));
      if (cita) {
        if (this.isMobile()) this.mobileDiaSeleccionado.set(cita.fecha);
        this.abrirDetalle(cita);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.timeInterval !== null) clearInterval(this.timeInterval);
    if (this.tooltipTimer !== null) clearTimeout(this.tooltipTimer);
    if (this.closingTimer !== null) clearTimeout(this.closingTimer);
    clearTimeout(this.resizeTimer);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private startClose(delay: number): void {
    this.tooltipTimer = setTimeout(() => {
      this.tooltipTimer = null;
      this.tooltipClosing.set(true);
      this.closingTimer = setTimeout(() => {
        this.closingTimer = null;
        this.hoveredCita.set(null);
        this.tooltipClosing.set(false);
      }, 120);
    }, delay);
  }

  private cancelClose(): void {
    if (this.tooltipTimer) { clearTimeout(this.tooltipTimer); this.tooltipTimer = null; }
    if (this.closingTimer) { clearTimeout(this.closingTimer); this.closingTimer = null; }
    if (this.tooltipClosing()) this.tooltipClosing.set(false);
  }

  onCardEnter(cita: Cita, ev: MouseEvent): void {
    this.cancelClose();
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const tipW = 248;
    const tipH = 180;
    const x = rect.right + 10 + tipW < window.innerWidth
      ? rect.right + 10
      : rect.left - tipW - 10;
    const y = Math.min(rect.top, window.innerHeight - tipH);
    this.hoveredCita.set({ cita, x, y });
  }

  onCardLeave(): void {
    this.startClose(140);
  }

  onTooltipEnter(): void {
    this.cancelClose();
  }

  onTooltipLeave(): void {
    this.startClose(0);
  }

  private updateCurrentTime(): void {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMin = h * 60 + m;
    const startMin = this.startHour * 60;
    const endMin = this.endH * 60;
    if (totalMin < startMin || totalMin > endMin) {
      this.currentTimeTop.set(null);
      return;
    }
    this.currentTimeTop.set(Math.round((totalMin - startMin) * HOUR_PX / 60));
    this.currentTimeLabel.set(`${pad(h)}:${pad(m)}`);
  }

  async cargarMedicos(): Promise<void> {
    try {
      const res = await this.medicosSvc.listar({ soloActivos: true, limite: 100 });
      this.medicoOptions.set([
        { value: '', label: this.translate.instant('citas.all_doctors') },
        ...res.medicos.map((m) => ({ value: m.id, label: `${m.nombre} ${m.apellido}` })),
      ]);
    } catch {
      this.medicoOptions.set([{ value: '', label: this.translate.instant('citas.all_doctors') }]);
    }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      let desde: string;
      let hasta: string;
      if (this.isMobile()) {
        const grid = this.diasMesGrid();
        desde = grid[0].iso;
        hasta = grid[grid.length - 1].iso;
      } else {
        const d = this.dias();
        desde = d[0].iso;
        hasta = d[6].iso;
      }
      const res = await this.svc.listar({
        desde,
        hasta,
        medicoId: this.medicoFiltro() ? Number(this.medicoFiltro()) : undefined,
        estado: this.estadoFiltro() || undefined,
      });
      this.citas.set(res.citas);
    } catch {
      this.error.set(this.translate.instant('citas.load_error'));
    } finally {
      this.cargando.set(false);
    }
  }

  // ── Desktop navigation ────────────────────────────────────────────────────────
  async semanaAnterior(): Promise<void> {
    this.weekStart.set(this.addDays(this.weekStart(), -7));
    await this.cargar();
  }

  async semanaSiguiente(): Promise<void> {
    this.weekStart.set(this.addDays(this.weekStart(), 7));
    await this.cargar();
  }

  async hoy(): Promise<void> {
    const now = new Date();
    this.weekStart.set(this.mondayOf(now));
    this.mobileMes.set(this.primerDiaMes(now));
    this.mobileDiaSeleccionado.set(isoLocal(now));
    this.mobileViewMode.set('month');
    await this.cargar();
  }

  // ── Mobile navigation ─────────────────────────────────────────────────────────
  async mesAnterior(): Promise<void> {
    const mes = this.mobileMes();
    this.mobileMes.set(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));
    await this.cargar();
  }

  async mesSiguiente(): Promise<void> {
    const mes = this.mobileMes();
    this.mobileMes.set(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));
    await this.cargar();
  }

  seleccionarDia(iso: string): void {
    this.mobileDiaSeleccionado.set(iso);
    this.mobileViewMode.set('day');
  }

  volverAlMes(): void {
    this.mobileViewMode.set('month');
  }

  onMobileDayColClick(ev: MouseEvent): void {
    const iso = this.mobileDiaSeleccionado();
    if (!iso) return;
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    const minOffset = Math.round(y / HOUR_PX * 60 / 15) * 15;
    let min = this.startHour * 60 + minOffset;
    min = Math.max(min, this.startHour * 60);
    min = Math.min(min, this.endH * 60 - 15);
    const hora = `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
    this.abrirCrear({ fecha: iso, horaInicio: hora, medicoId: this.medicoFiltro() ? Number(this.medicoFiltro()) : undefined });
  }

  async cambiarMedico(v: string): Promise<void> {
    this.medicoFiltro.set(v);
    await this.cargar();
  }

  async cambiarEstado(v: string): Promise<void> {
    this.estadoFiltro.set(v);
    await this.cargar();
  }

  selEstado(e: string): void {
    const next = this.estadoFiltro() === e ? '' : e;
    this.cambiarEstado(next);
  }

  get totalCitas(): number {
    return this.citas().length;
  }

  get verTodosMedicos(): boolean {
    return !this.medicoFiltro();
  }

  abrirCrear(prefill: CitaPrefill | null = null): void {
    this.formPrefill.set(prefill);
    this.formOpen.set(true);
  }

  cerrarForm(): void {
    this.formOpen.set(false);
    this.formPrefill.set(null);
  }

  async onFormSaved(): Promise<void> {
    this.cerrarForm();
    await this.cargar();
  }

  abrirDetalle(cita: Cita): void {
    this.detailCita.set(cita);
    this.detailOpen.set(true);
  }

  cerrarDetalle(): void {
    this.detailOpen.set(false);
    this.detailCita.set(null);
  }

  async onDetailChanged(): Promise<void> {
    await this.cargar();
  }

  onColClick(dia: DiaCol, ev: MouseEvent): void {
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    const minOffset = Math.round(y / HOUR_PX * 60 / 15) * 15;
    let min = this.startHour * 60 + minOffset;
    const minLimit = this.startHour * 60;
    const maxLimit = this.endH * 60 - 15;
    if (min < minLimit) min = minLimit;
    if (min > maxLimit) min = maxLimit;
    const hora = `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
    this.abrirCrear({
      medicoId: this.medicoFiltro() ? Number(this.medicoFiltro()) : undefined,
      fecha: dia.iso,
      horaInicio: hora,
    });
  }

  private mondayOf(d: Date): Date {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private primerDiaMes(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  private layoutDia(citasDia: Cita[]): CitaLayout[] {
    const sorted = [...citasDia].sort((a, b) => parseMin(a.hora_inicio) - parseMin(b.hora_inicio));
    const result: CitaLayout[] = [];
    let cluster: Cita[] = [];
    let clusterEnd = -1;

    const flush = (): void => {
      const lanesEnd: number[] = [];
      const laneOf = new Map<Cita, number>();
      for (const c of cluster) {
        const s = parseMin(c.hora_inicio);
        let lane = lanesEnd.findIndex((end) => end <= s);
        if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0); }
        lanesEnd[lane] = parseMin(c.hora_fin);
        laneOf.set(c, lane);
      }
      const total = lanesEnd.length || 1;
      for (const c of cluster) {
        const s = parseMin(c.hora_inicio);
        const e = parseMin(c.hora_fin);
        const lane = laneOf.get(c) ?? 0;
        result.push({
          cita: c,
          top: Math.round((s - this.startHour * 60) * HOUR_PX / 60),
          height: Math.max(Math.round((e - s) * HOUR_PX / 60), 42),
          left: (lane / total) * 100,
          width: (1 / total) * 100,
        });
      }
      cluster = [];
      clusterEnd = -1;
    };

    for (const c of sorted) {
      const s = parseMin(c.hora_inicio);
      if (cluster.length && s >= clusterEnd) flush();
      cluster.push(c);
      clusterEnd = Math.max(clusterEnd, parseMin(c.hora_fin));
    }
    if (cluster.length) flush();
    return result;
  }

  horaLabel(h: number): string {
    return `${pad(h)}:00`;
  }
}
