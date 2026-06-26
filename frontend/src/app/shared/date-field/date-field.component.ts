import {
  Component, forwardRef, input, signal, computed, inject, ElementRef, HostListener, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { LocaleService } from '../locale.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

// Orden de la tira de días: lunes a domingo
const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0];

interface DayCell {
  day: number;
  iso: string;
  other: boolean;
  today: boolean;
  selected: boolean;
  unavailable: boolean;
  past: boolean;
  disabled: boolean;
}

@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [NgComponentOutlet],
  templateUrl: './date-field.component.html',
  styleUrl: './date-field.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true,
    },
  ],
})
export class DateFieldComponent implements ControlValueAccessor {
  private elementRef = inject(ElementRef<HTMLElement>);
  private locale = inject(LocaleService);

  placeholder = input('Seleccionar fecha');
  fromYear = input<number>(new Date().getFullYear() - 100);
  toYear = input<number>(new Date().getFullYear() + 1);
  unavailableDaysOfWeek = input<number[]>([]);
  minDate = input<string | null>(null);

  readonly calendarIcon: Icon = LucideCalendar;
  readonly prevIcon: Icon = LucideChevronLeft;
  readonly nextIcon: Icon = LucideChevronRight;
  readonly navInputs = { size: 16, strokeWidth: 1.5 };
  readonly calInputs = { size: 16, strokeWidth: 1.5 };

  readonly weekdays = computed(() => {
    this.locale.locale();
    return DIAS_ORDEN.map((d) => this.locale.weekdayInitial(d));
  });

  value = signal<string | null>(null);
  open = signal(false);
  view = signal<'days' | 'years'>('days');

  private todayDate = new Date();
  viewYear = signal(this.todayDate.getFullYear());
  viewMonth = signal(this.todayDate.getMonth()); // 0-11

  readonly display = computed(() => {
    this.locale.locale();
    const v = this.value();
    return v ? this.locale.formatLong(v) : null;
  });

  readonly monthLabel = computed(() => {
    this.locale.locale();
    return `${this.locale.monthLong(this.viewMonth())} ${this.viewYear()}`;
  });

  readonly cells = computed<DayCell[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // lunes primero
    const selected = this.value();
    const todayIso = this.iso(
      this.todayDate.getFullYear(), this.todayDate.getMonth(), this.todayDate.getDate()
    );
    const unavailDows = this.unavailableDaysOfWeek();
    const min = this.minDate();

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(year, month, i - offset + 1);
      const iso = this.iso(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
      const dow = cellDate.getDay();
      const isPast = !!min && iso < min;
      const isUnavailable = unavailDows.length > 0 && unavailDows.includes(dow);
      cells.push({
        day: cellDate.getDate(),
        iso,
        other: cellDate.getMonth() !== month,
        today: iso === todayIso,
        selected: iso === selected,
        unavailable: isUnavailable,
        past: isPast,
        disabled: isPast || isUnavailable,
      });
    }
    return cells;
  });

  readonly years = computed<number[]>(() => {
    const arr: number[] = [];
    for (let y = this.toYear(); y >= this.fromYear(); y--) arr.push(y);
    return arr;
  });

  // --- interacción ---
  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.syncViewToValue();
    this.view.set('days');
    this.open.set(true);
  }

  prevMonth(): void {
    const m = this.viewMonth();
    if (m === 0) { this.viewMonth.set(11); this.viewYear.update((y) => y - 1); }
    else this.viewMonth.set(m - 1);
  }

  nextMonth(): void {
    const m = this.viewMonth();
    if (m === 11) { this.viewMonth.set(0); this.viewYear.update((y) => y + 1); }
    else this.viewMonth.set(m + 1);
  }

  openYears(): void {
    this.view.set('years');
  }

  pickYear(y: number): void {
    this.viewYear.set(y);
    this.view.set('days');
  }

  pick(cell: DayCell): void {
    if (cell.disabled) return;
    this.value.set(cell.iso);
    this.onChange(cell.iso);
    this.onTouched();
    this.open.set(false);
  }

  hoy(): void {
    const iso = this.iso(
      this.todayDate.getFullYear(), this.todayDate.getMonth(), this.todayDate.getDate()
    );
    this.value.set(iso);
    this.onChange(iso);
    this.onTouched();
    this.open.set(false);
  }

  borrar(): void {
    this.value.set(null);
    this.onChange('');
    this.onTouched();
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  private iso(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private syncViewToValue(): void {
    const v = this.value();
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-').map(Number);
      this.viewYear.set(y);
      this.viewMonth.set(m - 1);
    } else {
      this.viewYear.set(this.todayDate.getFullYear());
      this.viewMonth.set(this.todayDate.getMonth());
    }
  }

  // --- ControlValueAccessor ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
