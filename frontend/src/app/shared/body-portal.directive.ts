import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Mueve el elemento anfitrión directamente al <body> al inicializarse.
 * Sirve para que drawers/modales escapen de contextos de apilamiento
 * (z-index) creados por ancestros y se rendericen por encima de todo.
 */
@Directive({
  selector: '[appBodyPortal]',
  standalone: true,
})
export class BodyPortalDirective implements OnInit, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }
}
