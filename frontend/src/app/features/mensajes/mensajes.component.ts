import { Component, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideMessageSquare } from '@lucide/angular';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = Type<any>;

@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [NgComponentOutlet, TranslateModule, LucideMessageSquare],
  templateUrl: './mensajes.component.html',
  styleUrl: './mensajes.component.scss',
})
export class MensajesComponent {
  readonly iconMsg: Icon = LucideMessageSquare;
  readonly iconInputs = { size: 36, strokeWidth: 1 };
}
