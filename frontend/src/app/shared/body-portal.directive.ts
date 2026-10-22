import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

// Moves the element to <body> so drawers and modals escape their parents' stacking contexts.
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
