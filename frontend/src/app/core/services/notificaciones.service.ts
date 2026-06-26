import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Notificacion {
  id:         number;
  tipo:       string;
  titulo:     string;
  mensaje:    string;
  leida:      boolean;
  link:       string | null;
  created_at: string;
}

export interface ListaNotificacionesResponse {
  notificaciones: Notificacion[];
  total:          number;
  no_leidas:      number;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService implements OnDestroy {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/notificaciones`;

  private pollTimer?:   ReturnType<typeof setInterval>;
  private shownIds    = new Set<number>();
  private initialized = false;

  readonly unreadCount = signal(0);
  readonly toasts      = signal<Notificacion[]>([]);
  readonly exitingIds  = signal<Set<number>>(new Set());

  startPolling(): void {
    // Resetear estado de sesión anterior para no mostrar toasts de notificaciones viejas
    this.initialized = false;
    this.shownIds    = new Set<number>();
    this.unreadCount.set(0);
    this.toasts.set([]);

    this.pollOnce();
    this.pollTimer = setInterval(() => this.pollOnce(), 30_000);
  }

  stopPolling(): void {
    clearInterval(this.pollTimer);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private pollOnce(): void {
    this.http.get<{ count: number }>(`${this.api}/unread-count`).subscribe({
      next: ({ count }) => {
        if (!this.initialized) {
          // Primera llamada al entrar: registrar IDs existentes sin mostrar toasts
          this.initialized = true;
          this.unreadCount.set(count);
          if (count > 0) this.registrarExistentes();
          return;
        }
        const prev = this.unreadCount();
        this.unreadCount.set(count);
        if (count > prev) this.fetchNuevas();
      },
      error: () => {},
    });
  }

  private registrarExistentes(): void {
    this.http.get<ListaNotificacionesResponse>(`${this.api}?no_leidas=true`).subscribe({
      next: ({ notificaciones }) => {
        notificaciones.forEach(n => this.shownIds.add(n.id));
      },
      error: () => {},
    });
  }

  private fetchNuevas(): void {
    this.http.get<ListaNotificacionesResponse>(`${this.api}?no_leidas=true`).subscribe({
      next: ({ notificaciones }) => {
        const nuevas = notificaciones.filter(n => !this.shownIds.has(n.id));
        nuevas.forEach(n => this.shownIds.add(n.id));
        if (nuevas.length) this.mostrarToasts(nuevas.slice(0, 3));
      },
      error: () => {},
    });
  }

  toastsEnabled(): boolean {
    return localStorage.getItem('notifications_enabled') !== 'false';
  }

  clearToasts(): void {
    this.toasts.set([]);
    this.exitingIds.set(new Set());
  }

  private mostrarToasts(items: Notificacion[]): void {
    if (!this.toastsEnabled()) return;
    this.toasts.update(curr => [...items, ...curr].slice(0, 4));
    items.forEach(item => {
      setTimeout(() => this.removeToast(item.id), 8_000);
    });
  }

  removeToast(id: number): void {
    // Inicia animación de salida, luego elimina del DOM tras 220ms
    this.exitingIds.update(s => new Set([...s, id]));
    setTimeout(() => {
      this.toasts.update(curr => curr.filter(t => t.id !== id));
      this.exitingIds.update(s => { const n = new Set(s); n.delete(id); return n; });
    }, 220);
  }

  getAll(noLeidas?: boolean): Promise<ListaNotificacionesResponse> {
    const url = noLeidas ? `${this.api}?no_leidas=true` : this.api;
    return new Promise((resolve, reject) => {
      this.http.get<ListaNotificacionesResponse>(url).subscribe({ next: resolve, error: reject });
    });
  }

  deleteOne(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.api}/${id}`).subscribe({ next: () => resolve(), error: reject });
    });
  }

  deleteAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.api}/todas`).subscribe({
        next: () => {
          this.unreadCount.set(0);
          this.clearToasts();
          resolve();
        },
        error: reject,
      });
    });
  }

  markAsRead(id: number): void {
    this.shownIds.add(id);
    this.http.patch(`${this.api}/${id}/leer`, {}).subscribe({
      next: () => {
        const curr = this.unreadCount();
        if (curr > 0) this.unreadCount.set(curr - 1);
      },
      error: () => {},
    });
  }

  markAllAsRead(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.patch(`${this.api}/leer-todas`, {}).subscribe({
        next: () => { this.unreadCount.set(0); resolve(); },
        error: reject,
      });
    });
  }
}
