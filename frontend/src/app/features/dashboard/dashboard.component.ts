import { Component, inject, signal, computed, OnInit, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideUsers, LucideStethoscope, LucideCalendarPlus,
  LucideArrowRight, LucideEye, LucideClock,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { CitasService, Cita, EstadoCita } from '../citas/citas.service';
import { MedicosService, Medico } from '../medicos/medicos.service';
import { PagosService, PagoStats } from '../pagos/pagos.service';
import { PacientesService, PacienteStats } from '../pacientes/pacientes.service';
import { LocaleService } from '../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

function pad(n: number): string { return String(n).padStart(2, '0'); }

function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

interface WeekDay { label: string; count: number; pct: number; today: boolean; }

const TERMINAL_ESTADOS = new Set<EstadoCita>(['cancelada', 'no_presentado', 'atendida']);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslateModule, NgComponentOutlet, RouterLink,
    LucideUsers, LucideStethoscope, LucideCalendarPlus, LucideArrowRight, LucideEye, LucideClock],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);
  private citasSvc = inject(CitasService);
  private medicosSvc = inject(MedicosService);
  private pagosSvc = inject(PagosService);
  private pacientesSvc = inject(PacientesService);
  private localeSvc = inject(LocaleService);

  readonly iconInputs      = { size: 20, strokeWidth: 1 };
  readonly iconInputsSm    = { size: 16, strokeWidth: 1.5 };
  readonly iconInputsXs    = { size: 14, strokeWidth: 1.5 };
  readonly iconInputsTable = { size: 15, strokeWidth: 1.5 };

  readonly icons: Record<string, Icon> = {
    users: LucideUsers, stethoscope: LucideStethoscope, calendarPlus: LucideCalendarPlus,
    arrowRight: LucideArrowRight, eye: LucideEye, clock: LucideClock,
  };

  readonly todayLabel = computed(() =>
    new Date().toLocaleDateString(this.localeSvc.locale(), {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  );

  get greetingKey(): string {
    const h = new Date().getHours();
    if (h < 12) return 'dashboard.buenos_dias';
    if (h < 19) return 'dashboard.buenas_tardes';
    return 'dashboard.buenas_noches';
  }

  // --- roles ---
  readonly esMedico = computed(() => this.auth.user()?.rol === 'medico');

  // --- estado común ---
  cargando      = signal(true);
  citasHoy      = signal<Cita[]>([]);
  citasSemana   = signal<Cita[]>([]);

  // --- estado admin/recep ---
  medicos       = signal<Medico[]>([]);
  pagoStats     = signal<PagoStats | null>(null);
  pacienteStats = signal<PacienteStats | null>(null);

  // --- estado médico ---
  medicoId           = signal<number | null>(null);
  medicoEspecialidad = signal<string>('');

  // ── Métricas comunes ──────────────────────────────────────────────────────────
  readonly totalHoy      = computed(() => this.citasHoy().length);
  readonly pendientesHoy = computed(() =>
    this.citasHoy().filter((c) => c.estado === 'agendada' || c.estado === 'reprogramada').length
  );
  readonly confirmadasHoy = computed(() =>
    this.citasHoy().filter((c) => c.estado === 'confirmada').length
  );
  readonly atendidasHoy = computed(() =>
    this.citasHoy().filter((c) => c.estado === 'atendida').length
  );

  // ── Métricas admin/recep ──────────────────────────────────────────────────────
  readonly ingresosMes = computed(() => {
    const s = this.pagoStats();
    if (!s) return '—';
    return `Q ${Number(s.recaudado_mes).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  });
  readonly pacientesNuevosMes = computed(() => this.pacienteStats()?.nuevos_mes ?? '—');

  readonly medicosHoy = computed(() => {
    const dow = new Date().getDay();
    return this.medicos().filter((m) => m.dias_atencion.includes(dow));
  });

  readonly medicosDisponibles = computed(() => {
    const citas = this.citasHoy();
    return this.medicosHoy()
      .map((m) => ({
        id: m.id,
        nombre: `${m.nombre} ${m.apellido}`,
        especialidad: m.especialidad,
        initials: `${m.nombre[0]}${m.apellido[0]}`.toUpperCase(),
        citasHoy: citas.filter((c) => c.medico_id === m.id).length,
      }))
      .slice(0, 4);
  });

  // ── Métricas médico ───────────────────────────────────────────────────────────
  readonly atendidasSemana = computed(() =>
    this.citasSemana().filter((c) => c.estado === 'atendida').length
  );

  readonly proximaCita = computed<Cita | null>(() => {
    const now = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
    return (
      this.citasHoy()
        .filter((c) => c.hora_inicio > now && !TERMINAL_ESTADOS.has(c.estado))
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0] ?? null
    );
  });

  // ── Compartidos ───────────────────────────────────────────────────────────────
  readonly proximasCitas = computed(() => {
    const now = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
    return this.citasHoy()
      .filter((c) => c.hora_inicio > now && !TERMINAL_ESTADOS.has(c.estado))
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      .slice(0, 4);
  });

  readonly citasTabla = computed(() =>
    [...this.citasHoy()].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  );

  readonly weekData = computed<WeekDay[]>(() => {
    const citas = this.citasSemana();
    const counts: Record<number, number> = {};
    citas.forEach((c) => {
      const dow = new Date(`${c.fecha}T12:00:00`).getDay();
      counts[dow] = (counts[dow] ?? 0) + 1;
    });
    const todayDow = new Date().getDay();
    const raw = [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
      label: this.localeSvc.weekdayInitial(dow),
      dow,
      count: counts[dow] ?? 0,
    }));
    const max = Math.max(...raw.map((d) => d.count), 1);
    return raw.map((d) => ({
      label: d.label,
      count: d.count,
      pct: Math.round((d.count / max) * 100),
      today: d.dow === todayDow,
    }));
  });

  readonly weekTotal = computed(() => this.weekData().reduce((s, d) => s + d.count, 0));

  async ngOnInit(): Promise<void> {
    const today     = localIsoDate();
    const mon       = mondayOf(new Date());
    const sun       = addDays(mon, 6);
    const weekStart = localIsoDate(mon);
    const weekEnd   = localIsoDate(sun);

    const rol            = this.auth.user()?.rol ?? '';
    const esMedico       = rol === 'medico';
    const esAdmin        = rol === 'admin';
    const esAdminOrRecep = rol === 'admin' || rol === 'recepcionista';

    if (esMedico) {
      try {
        const info = await this.medicosSvc.getMiPerfil();
        this.medicoId.set(info.id);
        this.medicoEspecialidad.set(info.especialidad);

        await Promise.allSettled([
          this.citasSvc.listar({ desde: today, hasta: today, medicoId: info.id })
            .then((r) => this.citasHoy.set(r.citas)).catch(() => {}),
          this.citasSvc.listar({ desde: weekStart, hasta: weekEnd, medicoId: info.id })
            .then((r) => this.citasSemana.set(r.citas)).catch(() => {}),
        ]);
      } catch { /* perfil de médico no encontrado */ }
    } else {
      await Promise.allSettled([
        this.citasSvc.listar({ desde: today, hasta: today })
          .then((r) => this.citasHoy.set(r.citas)).catch(() => {}),
        this.citasSvc.listar({ desde: weekStart, hasta: weekEnd })
          .then((r) => this.citasSemana.set(r.citas)).catch(() => {}),
        esAdminOrRecep
          ? this.medicosSvc.listar({ soloActivos: true, limite: 200 })
              .then((r) => this.medicos.set(r.medicos)).catch(() => {})
          : Promise.resolve(),
        esAdminOrRecep
          ? this.pagosSvc.estadisticas().then((s) => this.pagoStats.set(s)).catch(() => {})
          : Promise.resolve(),
        esAdminOrRecep
          ? this.pacientesSvc.estadisticas().then((s) => this.pacienteStats.set(s)).catch(() => {})
          : Promise.resolve(),
      ]);
    }

    this.cargando.set(false);
  }

  irANuevaCita(): void {
    void this.router.navigate(['/citas'], { queryParams: { nueva: '1' } });
  }

  verCitasHoy(): void {
    void this.router.navigate(['/citas']);
  }

  verCita(id: number): void {
    void this.router.navigate(['/citas'], { queryParams: { citaId: String(id) } });
  }
}
