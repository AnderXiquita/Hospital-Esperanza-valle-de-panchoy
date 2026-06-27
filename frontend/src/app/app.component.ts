import { Component, inject, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ConfiguracionService } from './core/services/configuracion.service';

const isAuthUrl = (url: string) => url.startsWith('/auth/login') || url === '/';
const FADE_MS = 180;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit, OnDestroy {
  private translate = inject(TranslateService);
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private configSvc = inject(ConfiguracionService);

  private sub?: Subscription;
  private fadeTimer?: ReturnType<typeof setTimeout>;
  private navStartMs = 0;

  private get host(): HTMLElement { return this.elRef.nativeElement; }

  ngOnInit(): void {
    const saved = localStorage.getItem('lang') ?? 'es';
    this.translate.use(saved);
    this.configSvc.init();

    this.sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const isTopLevel = isAuthUrl(this.router.url) || isAuthUrl(event.url);
        if (!isTopLevel) return;
        clearTimeout(this.fadeTimer);
        this.navStartMs = Date.now();
        // Manipulación directa del DOM: bypasa change detection y actualiza inmediatamente
        this.host.style.opacity = '0';
      } else if (event instanceof NavigationEnd) {
        if (this.host.style.opacity !== '0') return;
        const wait = Math.max(0, FADE_MS - (Date.now() - this.navStartMs));
        this.fadeTimer = setTimeout(() => {
          requestAnimationFrame(() => requestAnimationFrame(() => {
            this.host.style.opacity = '';
          }));
        }, wait);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.fadeTimer);
  }
}
