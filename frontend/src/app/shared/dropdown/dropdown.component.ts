import {
  Component, HostListener, ElementRef, forwardRef, input, signal, computed, inject, Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideChevronDown, LucideCheck } from '@lucide/angular';

export interface DropdownOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [NgComponentOutlet, LucideChevronDown, LucideCheck],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true,
    },
  ],
})
export class DropdownComponent implements ControlValueAccessor {
  private elementRef = inject(ElementRef<HTMLElement>);

  options = input<DropdownOption[]>([]);
  placeholder = input('Seleccionar');
  isDisabled = input<boolean>(false);

  readonly chevron: Icon = LucideChevronDown;
  readonly check: Icon = LucideCheck;
  readonly chevronInputs = { size: 16, strokeWidth: 1.5 };
  readonly checkInputs = { size: 15, strokeWidth: 2 };

  open = signal(false);
  disabled = signal(false);
  value = signal<string | number | null>(null);

  readonly selectedLabel = computed(() => {
    const v = this.value();
    const opt = this.options().find((o) => o.value === v);
    return opt ? opt.label : null;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  toggle(): void {
    if (this.disabled() || this.isDisabled()) return;
    this.open.update((o) => !o);
  }

  select(opt: DropdownOption): void {
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.open.set(false);
    this.onTouched();
  }

  isSelected(opt: DropdownOption): boolean {
    return opt.value === this.value();
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

  // --- ControlValueAccessor ---
  writeValue(value: string | number | null): void {
    this.value.set(value);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
