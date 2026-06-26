import {
  Component, inject, signal, input, output, OnInit, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucideUser, LucideLayers, LucideCreditCard, LucideHash, LucideCalendar, LucideBan,
} from '@lucide/angular';
import { PagosService, Pago, EstadoPago } from '../pagos.service';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';
import { LocaleService } from '../../../shared/locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

@Component({
  selector: 'app-pago-detail-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, TranslateModule,
    LucideX, LucideUser, LucideLayers, LucideCreditCard, LucideHash, LucideCalendar, LucideBan,
  ],
  templateUrl: './pago-detail-drawer.component.html',
  styleUrl: './pago-detail-drawer.component.scss',
})
export class PagoDetailDrawerComponent implements OnInit {
  private svc = inject(PagosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);

  pago = input.required<Pago>();
  closed = output<void>();
  changed = output<void>();

  readonly icons = {
    x: LucideX, user: LucideUser, servicio: LucideLayers, card: LucideCreditCard,
    hash: LucideHash, calendar: LucideCalendar, ban: LucideBan,
  };
  readonly iconField = { size: 15, strokeWidth: 1.5 };

  u = signal<Pago | null>(null);
  cerrando = signal(false);
  confirmVoid = signal(false);
  saving = signal(false);
  errorMsg = signal('');

  ngOnInit(): void {
    this.u.set(this.pago());
  }

  money(value: string): string {
    const n = Number(value);
    if (isNaN(n)) return '0.00';
    return n.toLocaleString(this.locale.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  estadoLabel(e: EstadoPago): string { return this.translate.instant('pagos.estado_' + e); }
  metodoLabel(m: string | null): string {
    return m ? this.translate.instant('pagos.metodo_' + m) : '—';
  }
  formatFecha(iso: string): string { return this.locale.formatLong(iso); }

  get puedeAnular(): boolean { return this.u()?.estado === 'pagado'; }

  cerrar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  pedirAnular(): void { this.errorMsg.set(''); this.confirmVoid.set(true); }
  cancelarAnular(): void { this.confirmVoid.set(false); }

  async anular(): Promise<void> {
    const p = this.u();
    if (!p) return;
    this.saving.set(true);
    this.errorMsg.set('');
    try {
      const actualizado = await this.svc.anular(p.id);
      this.u.set(actualizado);
      this.changed.emit();
      this.confirmVoid.set(false);
    } catch {
      this.errorMsg.set(this.translate.instant('pagos.void_error'));
    } finally {
      this.saving.set(false);
    }
  }
}
