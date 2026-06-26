import { Component, inject, signal, computed, Type, OnInit, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationStart, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { NgClass, NgComponentOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideHome, LucideStethoscope, LucideLayers, LucideUsers,
  LucideCalendarDays, LucideCreditCard, LucideUserCog, LucideBarChart3,
  LucidePanelLeft, LucideLogOut, LucideMenu, LucideBell, LucideSettings, LucideX,
  LucideClipboardList, LucideMessageSquare,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { ToastNotificacionesComponent } from '../../shared/toast-notificaciones/toast-notificaciones.component';

type Rol = 'admin' | 'recepcionista' | 'medico';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = Type<any>;

interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
  roles: Rol[];
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

interface BottomNavItem {
  icon: string;
  route: string;
}

const NAV: NavSection[] = [
  {
    titleKey: 'nav.section.main',
    items: [
      { labelKey: 'nav.dashboard',    icon: 'home',             route: '/dashboard', roles: ['admin', 'recepcionista', 'medico'] },
      { labelKey: 'nav.doctors',      icon: 'stethoscope',      route: '/medicos',   roles: ['admin'] },
      { labelKey: 'nav.services',     icon: 'layers',           route: '/servicios', roles: ['admin'] },
      { labelKey: 'nav.patients',     icon: 'users',            route: '/pacientes', roles: ['admin', 'recepcionista', 'medico'] },
      { labelKey: 'nav.appointments', icon: 'calendar-days',    route: '/citas',     roles: ['admin', 'recepcionista', 'medico'] },
      { labelKey: 'nav.historial',    icon: 'clipboard-list',   route: '/historial', roles: ['medico'] },
      { labelKey: 'nav.payments',     icon: 'credit-card',      route: '/pagos',     roles: ['admin', 'recepcionista'] },
      { labelKey: 'nav.messages',     icon: 'message-square',   route: '/mensajes',  roles: ['admin', 'recepcionista', 'medico'] },
    ],
  },
  {
    titleKey: 'nav.section.admin',
    items: [
      { labelKey: 'nav.users',          icon: 'user-cog',    route: '/usuarios',        roles: ['admin'] },
      { labelKey: 'nav.reports',        icon: 'bar-chart-3', route: '/reportes',        roles: ['admin'] },
      { labelKey: 'nav.settings',       icon: 'settings',    route: '/configuraciones', roles: ['admin', 'recepcionista', 'medico'] },
      { labelKey: 'nav.notifications',  icon: 'bell',        route: '/notificaciones',  roles: ['admin', 'recepcionista', 'medico'] },
    ],
  },
];

const ICON_MAP: Record<string, IconComponent> = {
  'home':              LucideHome,
  'stethoscope':       LucideStethoscope,
  'layers':            LucideLayers,
  'users':             LucideUsers,
  'calendar-days':     LucideCalendarDays,
  'credit-card':       LucideCreditCard,
  'user-cog':          LucideUserCog,
  'bar-chart-3':       LucideBarChart3,
  'settings':          LucideSettings,
  'panel-left':        LucidePanelLeft,
  'log-out':           LucideLogOut,
  'menu':              LucideMenu,
  'bell':              LucideBell,
  'x':                 LucideX,
  'clipboard-list':    LucideClipboardList,
  'message-square':    LucideMessageSquare,
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, NgClass, NgComponentOutlet, TranslateModule,
    ToastNotificacionesComponent,
    LucideHome, LucideStethoscope, LucideLayers, LucideUsers,
    LucideCalendarDays, LucideCreditCard, LucideUserCog, LucideBarChart3,
    LucidePanelLeft, LucideLogOut, LucideMenu, LucideBell, LucideSettings, LucideX,
    LucideClipboardList, LucideMessageSquare,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService     = inject(AuthService);
  private router          = inject(Router);
  private elRef           = inject(ElementRef);
  private notifService    = inject(NotificacionesService);

  readonly unreadCount = this.notifService.unreadCount;

  readonly user = this.authService.user;
  collapsed = signal(false);
  mobileOpen = signal(false);

  private routerSub?: Subscription;
  private holdTimer?: ReturnType<typeof setTimeout>;
  private cleanupTimer?: ReturnType<typeof setTimeout>;
  private navEndFired = false;
  private minHoldReached = false;
  private readonly HOLD_MS = 160;
  private readonly REVEAL_MS = 180;

  readonly navIconInputs = { size: 20, strokeWidth: 1 };
  readonly bottomNavIconInputs = { size: 22, strokeWidth: 1 };

  bottomNavHidden = signal(false);
  private bottomNavForceHidden = signal(false);
  readonly bottomNavShouldHide = computed(() => this.bottomNavHidden() || this.bottomNavForceHidden());

  private sidebarWantsHide = false;
  private drawerWantsHide  = false;
  private sidebarHideTimer?: ReturnType<typeof setTimeout>;
  private drawerHideTimer?:  ReturnType<typeof setTimeout>;
  private drawerObserver?:   MutationObserver;

  private updateForceHide(): void {
    this.bottomNavForceHidden.set(this.sidebarWantsHide || this.drawerWantsHide);
  }

  private scrollListenerEl: HTMLElement | null = null;
  private boundScrollHandler: (() => void) | null = null;
  private scrollRAF: number | null = null;
  private lastScrollY = 0;

  readonly bottomNavItems = computed((): BottomNavItem[] => {
    const rol = this.user()?.rol as Rol | undefined;
    if (!rol) return [];
    if (rol === 'admin') {
      return [
        { icon: 'home',         route: '/dashboard' },
        { icon: 'user-cog',     route: '/usuarios' },
        { icon: 'bell',         route: '/notificaciones' },
      ];
    }
    return [
      { icon: 'home',          route: '/dashboard' },
      { icon: 'calendar-days', route: '/citas' },
      { icon: 'bell',          route: '/notificaciones' },
    ];
  });

  readonly bottomNavRoutes = computed(() => this.bottomNavItems().map(i => i.route));

  isBottomNavRoute(route: string): boolean {
    return this.bottomNavRoutes().includes(route);
  }

  private getContentArea(): HTMLElement | null {
    return (this.elRef.nativeElement as HTMLElement).querySelector('.content-area');
  }

  ngOnInit(): void {
    this.notifService.startPolling();
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (event.url.startsWith('/auth/login')) return;

        clearTimeout(this.holdTimer);
        clearTimeout(this.cleanupTimer);
        this.navEndFired = false;
        this.minHoldReached = false;

        // Hide instantáneo: evita el flash del nuevo componente renderizándose
        // con opacity ~0.97 antes de que el fade-out del CSS llegue a 0
        const area = this.getContentArea();
        if (area) {
          area.style.transition = 'none';
          area.style.opacity = '0';
          area.style.transform = 'translateY(6px)';
        }

        // Esperar HOLD_MS antes de revelar, sin importar si NavigationEnd ya llegó.
        // Garantiza el mismo timing para módulos en caché y con lazy loading.
        this.holdTimer = setTimeout(() => {
          this.minHoldReached = true;
          if (this.navEndFired) this.revealContent();
        }, this.HOLD_MS);

      } else if (event instanceof NavigationEnd) {
        this.navEndFired = true;
        if (this.minHoldReached) this.revealContent();
      }
    });
  }

  private revealContent(): void {
    const area = this.getContentArea();
    if (!area) return;
    // Primer rAF: activa la transición para el reveal
    // Segundo rAF: elimina el override de opacity para que la transición la anime
    requestAnimationFrame(() => {
      area.style.transition = `opacity ${this.REVEAL_MS}ms ease, transform ${this.REVEAL_MS}ms ease`;
      requestAnimationFrame(() => {
        area.style.opacity = '';
        area.style.transform = '';
        this.cleanupTimer = setTimeout(() => {
          const a = this.getContentArea();
          if (a) a.style.transition = '';
        }, this.REVEAL_MS + 50);
      });
    });
  }

  ngAfterViewInit(): void {
    const shell = this.elRef.nativeElement as HTMLElement;

    // Scroll-hide para el bottom nav
    const contentArea = this.getContentArea();
    if (contentArea) {
      this.scrollListenerEl = contentArea;
      this.boundScrollHandler = () => {
        if (this.scrollRAF !== null) return;
        this.scrollRAF = requestAnimationFrame(() => {
          this.scrollRAF = null;
          const y = (this.scrollListenerEl as HTMLElement).scrollTop;
          const diff = y - this.lastScrollY;
          if (Math.abs(diff) < 4) return;
          this.bottomNavHidden.set(diff > 0);
          this.lastScrollY = y;
        });
      };
      contentArea.addEventListener('scroll', this.boundScrollHandler, { passive: true });
    }

    // Drag-to-open/close sidebar
    this.dragSidebarEl = shell.querySelector('.sidebar');
    this.dragOverlayEl = shell.querySelector('.drag-overlay');

    this.boundDragStart = (e: TouchEvent) => this.handleDragStart(e);
    this.boundDragMove  = (e: TouchEvent) => this.handleDragMove(e);
    this.boundDragEnd   = ()              => this.handleDragEnd();

    shell.addEventListener('touchstart', this.boundDragStart, { passive: true });
    shell.addEventListener('touchmove',  this.boundDragMove,  { passive: false });
    shell.addEventListener('touchend',   this.boundDragEnd,   { passive: true });
    shell.addEventListener('touchcancel',this.boundDragEnd,   { passive: true });

    // Ocultar bottom nav 500ms después de que se abra cualquier drawer
    this.drawerObserver = new MutationObserver(() => {
      const hasDrawer = !!document.body.querySelector('.backdrop');
      if (hasDrawer && !this.drawerWantsHide) {
        clearTimeout(this.drawerHideTimer);
        this.drawerHideTimer = setTimeout(() => { this.drawerWantsHide = true; this.updateForceHide(); }, 500);
      } else if (!hasDrawer && this.drawerWantsHide) {
        clearTimeout(this.drawerHideTimer);
        this.drawerWantsHide = false;
        this.updateForceHide();
      }
    });
    this.drawerObserver.observe(document.body, { childList: true });
  }

  ngOnDestroy(): void {
    this.notifService.stopPolling();
    this.routerSub?.unsubscribe();
    clearTimeout(this.holdTimer);
    clearTimeout(this.cleanupTimer);
    clearTimeout(this.dragSnapTimer);
    clearTimeout(this.sidebarHideTimer);
    clearTimeout(this.drawerHideTimer);
    this.drawerObserver?.disconnect();
    if (this.scrollListenerEl && this.boundScrollHandler) {
      this.scrollListenerEl.removeEventListener('scroll', this.boundScrollHandler);
    }
    if (this.scrollRAF !== null) cancelAnimationFrame(this.scrollRAF);
    if (this.boundDragStart) {
      const shell = this.elRef.nativeElement as HTMLElement;
      shell.removeEventListener('touchstart',  this.boundDragStart);
      shell.removeEventListener('touchmove',   this.boundDragMove);
      shell.removeEventListener('touchend',    this.boundDragEnd);
      shell.removeEventListener('touchcancel', this.boundDragEnd);
    }
  }

  icon(name: string): IconComponent | null {
    return ICON_MAP[name] ?? null;
  }

  readonly sections = computed(() => {
    const rol = this.user()?.rol as Rol | undefined;
    if (!rol) return [];
    return NAV.map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(rol)),
    })).filter(section => section.items.length > 0);
  });

  get userInitials(): string {
    const u = this.user();
    if (!u) return '?';
    return `${u.nombre[0]}${u.apellido[0]}`.toUpperCase();
  }

  get rolLabel(): string {
    const map: Record<string, string> = {
      admin: 'Administrador',
      recepcionista: 'Recepcionista',
      medico: 'Médico',
    };
    return map[this.user()?.rol ?? ''] ?? '';
  }

  toggleSidebar(): void {
    this.collapsed.update(v => !v);
  }

  toggleMobileMenu(): void {
    const opening = !this.mobileOpen();
    this.mobileOpen.update(v => !v);
    clearTimeout(this.sidebarHideTimer);
    if (opening) {
      this.sidebarHideTimer = setTimeout(() => { this.sidebarWantsHide = true;  this.updateForceHide(); }, 500);
    } else {
      this.sidebarWantsHide = false;
      this.updateForceHide();
    }
  }

  closeMobileMenu(): void {
    this.mobileOpen.set(false);
    clearTimeout(this.sidebarHideTimer);
    this.sidebarWantsHide = false;
    this.updateForceHide();
  }

  // ── Drag-to-open / drag-to-close sidebar ─────────────────────────────────────
  private dragSidebarEl: HTMLElement | null = null;
  private dragOverlayEl: HTMLElement | null = null;
  private dragMobileOverlayEl: HTMLElement | null = null;
  private dragIntent: 'open' | 'close' | null = null;
  private dragActive = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragCurrentX = 0;
  private dragStartTime = 0;
  private dragSidebarW = 0;
  private dragAxis: 'h' | 'v' | 'undecided' = 'undecided';
  private readonly DRAG_EDGE_W = 28;        // px desde el borde izquierdo para abrir
  private readonly DRAG_THRESHOLD = 0.38;   // fracción del ancho para confirmar
  private readonly DRAG_VELOCITY = 0.28;    // px/ms para confirmar por velocidad
  private boundDragStart!: (e: TouchEvent) => void;
  private boundDragMove!: (e: TouchEvent) => void;
  private boundDragEnd!: (e: TouchEvent) => void;
  private dragSnapTimer?: ReturnType<typeof setTimeout>;

  private handleDragStart(e: TouchEvent): void {
    if (window.innerWidth > 600) return;
    const t = e.touches[0];
    this.dragStartX = t.clientX;
    this.dragStartY = t.clientY;
    this.dragCurrentX = t.clientX;
    this.dragStartTime = Date.now();
    this.dragAxis = 'undecided';
    this.dragActive = false;
    this.dragIntent = null;
    this.dragMobileOverlayEl = null;
    this.dragSidebarW = Math.min(360, window.innerWidth * 0.85);

    if (!this.mobileOpen()) {
      this.dragIntent = 'open';
    } else {
      this.dragIntent = 'close';
      this.dragMobileOverlayEl = (this.elRef.nativeElement as HTMLElement).querySelector<HTMLElement>('.mobile-overlay');
    }
  }

  private handleDragMove(e: TouchEvent): void {
    if (!this.dragIntent) return;
    const t = e.touches[0];
    const dx = t.clientX - this.dragStartX;
    const dy = t.clientY - this.dragStartY;

    // Determinar eje tras el primer movimiento significativo
    if (this.dragAxis === 'undecided') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      this.dragAxis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (this.dragAxis === 'v') { this.dragIntent = null; return; }
      if (this.dragIntent === 'open'  && dx < 0) { this.dragIntent = null; return; }
      if (this.dragIntent === 'close' && dx > 0) { this.dragIntent = null; return; }
      this.dragActive = true;
      clearTimeout(this.dragSnapTimer);
      if (this.dragSidebarEl) this.dragSidebarEl.style.transition = 'none';
      if (this.dragMobileOverlayEl) this.dragMobileOverlayEl.style.transition = 'none';
    }

    if (!this.dragActive) return;
    e.preventDefault();

    this.dragCurrentX = t.clientX;
    const sw = this.dragSidebarW;
    const tx = this.dragIntent === 'open'
      ? Math.min(0, Math.max(-sw, -sw + dx))
      : Math.min(0, Math.max(-sw, dx));
    const progress = 1 - Math.abs(tx) / sw; // 0=cerrado, 1=abierto

    if (this.dragSidebarEl) this.dragSidebarEl.style.transform = `translateX(${tx}px)`;

    // Dimming proporcional al progreso
    if (this.dragIntent === 'open' && this.dragOverlayEl) {
      this.dragOverlayEl.style.opacity = String(progress * 0.42);
      this.dragOverlayEl.style.pointerEvents = progress > 0.05 ? 'auto' : 'none';
    } else if (this.dragIntent === 'close' && this.dragMobileOverlayEl) {
      this.dragMobileOverlayEl.style.opacity = String(progress);
    }
  }

  private handleDragEnd(): void {
    if (!this.dragActive || !this.dragIntent) {
      this.dragActive = false;
      this.dragIntent = null;
      return;
    }

    const dx = Math.abs(this.dragCurrentX - this.dragStartX);
    const dt = Math.max(1, Date.now() - this.dragStartTime);
    const velocity = dx / dt;
    const progress = dx / this.dragSidebarW;
    const shouldComplete = velocity > this.DRAG_VELOCITY || progress > this.DRAG_THRESHOLD;
    const willBeOpen = this.dragIntent === 'open' ? shouldComplete : !shouldComplete;
    const finalTx = willBeOpen ? 0 : -this.dragSidebarW;

    // Animar sidebar al destino con spring
    if (this.dragSidebarEl) {
      this.dragSidebarEl.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
      this.dragSidebarEl.style.transform = `translateX(${finalTx}px)`;
    }

    // Limpiar overlays
    if (this.dragOverlayEl) {
      this.dragOverlayEl.style.opacity = '0';
      this.dragOverlayEl.style.pointerEvents = 'none';
    }
    if (this.dragMobileOverlayEl) {
      this.dragMobileOverlayEl.style.transition = '';
      this.dragMobileOverlayEl.style.opacity = '';
      this.dragMobileOverlayEl = null;
    }

    // Actualizar estado Angular
    this.mobileOpen.set(willBeOpen);

    // Ocultar/mostrar bottom nav igual que al pulsar el botón hamburguesa
    clearTimeout(this.sidebarHideTimer);
    if (willBeOpen) {
      this.sidebarHideTimer = setTimeout(() => { this.sidebarWantsHide = true;  this.updateForceHide(); }, 500);
    } else {
      this.sidebarWantsHide = false;
      this.updateForceHide();
    }

    // Tras la animación, quitar estilos inline para ceder control al CSS
    this.dragSnapTimer = setTimeout(() => {
      if (this.dragSidebarEl) {
        this.dragSidebarEl.style.transition = '';
        this.dragSidebarEl.style.transform = '';
      }
    }, 280);

    this.dragActive = false;
    this.dragIntent = null;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
