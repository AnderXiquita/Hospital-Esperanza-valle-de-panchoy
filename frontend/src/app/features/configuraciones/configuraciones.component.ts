import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgComponentOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { DropdownComponent, DropdownOption } from '../../shared/dropdown/dropdown.component';
import {
  LucideUser, LucideShield, LucideBell, LucideGlobe,
  LucideBuilding2, LucideCalendarDays, LucideMapPin, LucideCamera,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { CambiarPasswordDrawerComponent } from './cambiar-password-drawer/cambiar-password-drawer.component';
import { EditarPerfilDrawerComponent } from './editar-perfil-drawer/editar-perfil-drawer.component';
import { BodyPortalDirective } from '../../shared/body-portal.directive';
import { environment } from '../../../environments/environment';

const SYS_KEY = 'hospital_system_config';

interface SystemConfig {
  hospitalNombre:   string;
  hospitalTelefono: string;
  hospitalDireccion: string;
  citaDuracion:     number;
  horarioApertura:  string;
  horarioCierre:    string;
  zonaHoraria:      string;
  moneda:           string;
}

const DEFAULT_SYS: SystemConfig = {
  hospitalNombre:    'Hospital Esperanza Valle de Panchoy',
  hospitalTelefono:  '',
  hospitalDireccion: 'Antigua Guatemala, Guatemala',
  citaDuracion:      30,
  horarioApertura:   '07:00',
  horarioCierre:     '20:00',
  zonaHoraria:       'America/Guatemala',
  moneda:            'GTQ',
};

function loadSys(): SystemConfig {
  try {
    const raw = localStorage.getItem(SYS_KEY);
    return raw ? { ...DEFAULT_SYS, ...JSON.parse(raw) } : { ...DEFAULT_SYS };
  } catch { return { ...DEFAULT_SYS }; }
}

@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [
    FormsModule, NgComponentOutlet, TranslatePipe,
    CambiarPasswordDrawerComponent, EditarPerfilDrawerComponent, DropdownComponent, BodyPortalDirective,
    LucideUser, LucideShield, LucideBell, LucideGlobe,
    LucideBuilding2, LucideCalendarDays, LucideMapPin, LucideCamera,
  ],
  templateUrl: './configuraciones.component.html',
  styleUrl:    './configuraciones.component.scss',
})
export class ConfiguracionesComponent implements OnInit {
  private auth      = inject(AuthService);
  private translate = inject(TranslateService);
  private http      = inject(HttpClient);
  private notifSvc  = inject(NotificacionesService);

  readonly iconSm = { size: 18, strokeWidth: 1.5 };

  readonly IconUser      = LucideUser;
  readonly IconCamera    = LucideCamera;
  readonly IconShield    = LucideShield;
  readonly IconBell      = LucideBell;
  readonly IconGlobe     = LucideGlobe;
  readonly IconBuilding  = LucideBuilding2;
  readonly IconCalendar  = LucideCalendarDays;
  readonly IconMap       = LucideMapPin;

  readonly user = this.auth.user;

  readonly isAdmin = computed(() => this.user()?.rol === 'admin');

  // ── Preferencias personales ──────────────────────────────────────────────
  lang          = signal<string>(localStorage.getItem('lang') ?? 'es');
  notifications = signal<boolean>(localStorage.getItem('notifications_enabled') !== 'false');

  // ── Config sistema ───────────────────────────────────────────────────────
  sys = signal<SystemConfig>(loadSys());
  sysModified = signal(false);

  // Copia editable para el formulario de sistema
  sysForm: SystemConfig = { ...loadSys() };

  readonly duracionOpciones: DropdownOption[] = [
    { value: 15,  label: '15 minutos' },
    { value: 30,  label: '30 minutos' },
    { value: 45,  label: '45 minutos' },
    { value: 60,  label: '1 hora' },
    { value: 90,  label: '1 hora 30 min' },
    { value: 120, label: '2 horas' },
  ];

  readonly timeOptions: DropdownOption[] = (() => {
    const opts: DropdownOption[] = [];
    for (let h = 5; h <= 23; h++) {
      for (const m of [0, 30]) {
        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        opts.push({ value: label, label });
      }
    }
    return opts;
  })();

  readonly zonaOpciones: DropdownOption[] = [
    { value: 'America/Guatemala',           label: 'America/Guatemala' },
    { value: 'America/Mexico_City',         label: 'America/Mexico_City' },
    { value: 'America/Bogota',              label: 'America/Bogota' },
    { value: 'America/Lima',                label: 'America/Lima' },
    { value: 'America/Santiago',            label: 'America/Santiago' },
    { value: 'America/Argentina/Buenos_Aires', label: 'America/Buenos_Aires' },
    { value: 'America/Caracas',             label: 'America/Caracas' },
    { value: 'America/Managua',             label: 'America/Managua' },
    { value: 'America/Costa_Rica',          label: 'America/Costa_Rica' },
    { value: 'America/El_Salvador',         label: 'America/El_Salvador' },
    { value: 'America/Tegucigalpa',         label: 'America/Tegucigalpa' },
  ];

  readonly monedaOpciones: DropdownOption[] = [
    { value: 'GTQ', label: 'Quetzal (GTQ)' },
    { value: 'USD', label: 'Dólar (USD)' },
    { value: 'MXN', label: 'Peso mexicano (MXN)' },
    { value: 'COP', label: 'Peso colombiano (COP)' },
  ];

  // ── Drawer contraseña ────────────────────────────────────────────────────
  drawerOpen       = signal(false);
  perfilDrawerOpen = signal(false);

  ngOnInit(): void {}

  // ── Idioma ───────────────────────────────────────────────────────────────
  setLang(l: string): void {
    this.lang.set(l);
    localStorage.setItem('lang', l);
    this.translate.use(l);
  }

  // ── Notificaciones ───────────────────────────────────────────────────────
  toggleNotifications(): void {
    const next = !this.notifications();
    this.notifications.set(next);
    localStorage.setItem('notifications_enabled', String(next));
    if (!next) this.notifSvc.clearToasts();
  }

  // ── Sistema ──────────────────────────────────────────────────────────────
  onSysChange(): void {
    this.sysModified.set(true);
  }

  guardarSistema(): void {
    const config = { ...this.sysForm };
    this.sys.set(config);
    localStorage.setItem(SYS_KEY, JSON.stringify(config));
    this.sysModified.set(false);
    this.http.post(`${environment.apiUrl}/api/notificaciones/config-changed`, {}).subscribe({ error: () => {} });
  }

  // ── Rol display ──────────────────────────────────────────────────────────
  rolLabel = computed(() => {
    const r = this.user()?.rol;
    if (r === 'admin')         return 'cfg.rol_admin';
    if (r === 'recepcionista') return 'cfg.rol_recepcionista';
    if (r === 'medico')        return 'cfg.rol_medico';
    return r ?? '';
  });

  userInitials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.nombre[0]}${u.apellido[0]}`.toUpperCase();
  });
}
