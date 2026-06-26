import {
  Component, inject, signal, output, OnInit, computed, ElementRef, HostListener, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  LucideX, LucideSearch, LucideBanknote, LucideCreditCard, LucideArrowRightLeft, LucideShieldCheck,
} from '@lucide/angular';
import { PagosService, CitaPendiente, CrearPagoPayload, MetodoPago } from '../pagos.service';
import { LocaleService } from '../../../shared/locale.service';
import { BodyPortalDirective } from '../../../shared/body-portal.directive';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

interface MetodoOpt { value: MetodoPago; label: string; icon: Icon; }

@Component({
  selector: 'app-pago-form-drawer',
  standalone: true,
  hostDirectives: [BodyPortalDirective],
  imports: [
    NgComponentOutlet, FormsModule, TranslateModule,
    LucideX, LucideSearch, LucideBanknote, LucideCreditCard, LucideArrowRightLeft, LucideShieldCheck,
  ],
  templateUrl: './pago-form-drawer.component.html',
  styleUrl: './pago-form-drawer.component.scss',
})
export class PagoFormDrawerComponent implements OnInit {
  private svc = inject(PagosService);
  private translate = inject(TranslateService);
  private locale = inject(LocaleService);
  private elementRef = inject(ElementRef<HTMLElement>);

  closed = output<void>();
  saved = output<void>();

  readonly icons = { x: LucideX, search: LucideSearch, shield: LucideShieldCheck };
  readonly iconSm = { size: 16, strokeWidth: 1.5 };

  readonly metodos: MetodoOpt[] = [
    { value: 'efectivo', label: 'pagos.method_efectivo', icon: LucideBanknote },
    { value: 'tarjeta', label: 'pagos.method_tarjeta', icon: LucideCreditCard },
    { value: 'transferencia', label: 'pagos.method_transferencia', icon: LucideArrowRightLeft },
  ];

  // autocompletado de cita
  query = signal('');
  resultados = signal<CitaPendiente[]>([]);
  abierto = signal(false);
  buscando = signal(false);
  seleccion = signal<CitaPendiente | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private debounce: any = null;

  monto = signal<string>('');
  metodo = signal<MetodoPago | ''>('');

  submitted = signal(false);
  procesando = signal(false);
  errorMsg = signal('');
  cerrando = signal(false);

  readonly montoLabel = computed(() => {
    const n = Number(this.monto());
    return 'Q ' + (isNaN(n) ? '0.00' : n.toLocaleString(this.locale.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  });

  ngOnInit(): void {
    this.buscar('');
  }

  onInput(q: string): void {
    this.query.set(q);
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.buscar(q), 250);
    this.abierto.set(true);
  }

  private async buscar(q: string): Promise<void> {
    this.buscando.set(true);
    try {
      const res = await this.svc.citasPendientes(q.trim() || undefined);
      this.resultados.set(res.citas);
    } finally {
      this.buscando.set(false);
    }
  }

  seleccionar(c: CitaPendiente): void {
    this.seleccion.set(c);
    this.monto.set(c.servicio_precio);
    this.query.set('');
    this.abierto.set(false);
  }

  limpiarSeleccion(): void {
    this.seleccion.set(null);
    this.monto.set('');
    this.abierto.set(false);
  }

  abrirLista(): void {
    if (!this.seleccion()) this.abierto.set(true);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const box = this.elementRef.nativeElement.querySelector('.ac');
    if (box && !box.contains(e.target as Node)) this.abierto.set(false);
  }

  metodoLabel(m: string): string { return this.translate.instant(m); }
  fechaCorta(iso: string): string {
    return this.locale.formatDateTime(iso + 'T00:00:00') ?? iso;
  }

  cerrar(): void {
    if (this.cerrando() || this.procesando()) return;
    this.cerrando.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  private montoValido(): boolean {
    const n = Number(this.monto());
    return !isNaN(n) && n >= 0 && this.monto() !== '';
  }

  private valido(): boolean {
    return !!(this.seleccion() && this.montoValido() && this.metodo());
  }

  async cobrar(): Promise<void> {
    this.submitted.set(true);
    this.errorMsg.set('');
    if (!this.valido()) return;

    // Simulación de procesamiento de pago
    this.procesando.set(true);
    await new Promise((r) => setTimeout(r, 1400));

    try {
      const payload: CrearPagoPayload = {
        cita_id: this.seleccion()!.cita_id,
        monto: Number(this.monto()),
        metodo_pago: this.metodo() as MetodoPago,
      };
      await this.svc.crear(payload);
      this.cerrando.set(true);
      setTimeout(() => this.saved.emit(), 240);
    } catch (err: unknown) {
      const code = (err as { error?: { code?: string } })?.error?.code;
      this.errorMsg.set(
        this.translate.instant(code === 'ALREADY_PAID' ? 'pagos.error_already_paid' : 'pagos.error_generic')
      );
      this.procesando.set(false);
    }
  }
}
