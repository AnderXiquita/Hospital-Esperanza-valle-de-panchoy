import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Provee nombres de meses/días y formato de fecha localizados según el idioma
 * activo de @ngx-translate. Usa la API Intl, así que no requiere claves de
 * traducción para cada mes/día. Reacciona al cambio de idioma de forma reactiva.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private translate = inject(TranslateService);

  readonly locale = signal(this.resolve(this.translate.currentLang));

  constructor() {
    this.translate.onLangChange.subscribe((e) => this.locale.set(this.resolve(e.lang)));
  }

  private resolve(lang?: string): string {
    return lang === 'en' ? 'en-US' : 'es-GT';
  }

  private cap(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Fecha cuyo getDay() es `day` (0=domingo .. 6=sábado). 2023-01-01 fue domingo.
  private dateForDay(day: number): Date {
    return new Date(2023, 0, 1 + day);
  }

  monthLong(month: number): string {
    const d = new Date(2021, month, 1);
    return this.cap(new Intl.DateTimeFormat(this.locale(), { month: 'long' }).format(d));
  }

  weekdayLong(day: number): string {
    return this.cap(
      new Intl.DateTimeFormat(this.locale(), { weekday: 'long' }).format(this.dateForDay(day))
    );
  }

  weekdayNarrow(day: number): string {
    return new Intl.DateTimeFormat(this.locale(), { weekday: 'narrow' })
      .format(this.dateForDay(day))
      .toUpperCase();
  }

  // Inicial de día para la tira semanal. En español usa X para miércoles
  // (evita la ambigüedad M de martes/miércoles); en otros idiomas usa Intl.
  private readonly esInitials = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  weekdayInitial(day: number): string {
    return this.locale().startsWith('es') ? this.esInitials[day] : this.weekdayNarrow(day);
  }

  // 'YYYY-MM-DD' -> "12 de junio de 2003" / "June 12, 2003"
  formatLong(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(this.locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ISO con hora -> "12 jun 2026, 14:30" / "Jun 12, 2026, 2:30 PM"
  formatDateTime(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString(this.locale(), {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
