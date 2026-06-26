import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgComponentOutlet } from '@angular/common';
import { LucideX } from '@lucide/angular';
import { NotificacionesService } from '../../core/services/notificaciones.service';

@Component({
  selector: 'app-toast-notificaciones',
  standalone: true,
  imports: [NgComponentOutlet, LucideX],
  templateUrl: './toast-notificaciones.component.html',
  styleUrl: './toast-notificaciones.component.scss',
})
export class ToastNotificacionesComponent {
  private notifService = inject(NotificacionesService);
  private router       = inject(Router);

  readonly toasts     = this.notifService.toasts;
  readonly exitingIds = this.notifService.exitingIds;
  readonly IconX      = LucideX;
  readonly iconX      = { size: 14, strokeWidth: 2 };

  isExiting(id: number): boolean {
    return this.exitingIds().has(id);
  }

  dismiss(id: number): void {
    this.notifService.removeToast(id);
  }

  irANotificaciones(id: number): void {
    this.notifService.markAsRead(id);
    this.notifService.removeToast(id);
    void this.router.navigateByUrl('/notificaciones');
  }
}
