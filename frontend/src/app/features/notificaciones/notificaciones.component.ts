import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgComponentOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideBell, LucideCheck, LucideInbox, LucideX, LucideTrash2 } from '@lucide/angular';
import {
  NotificacionesService,
  Notificacion,
  ListaNotificacionesResponse,
} from '../../core/services/notificaciones.service';

type Categoria    = 'todas' | 'citas' | 'pacientes' | 'pagos' | 'sistema';
type FiltroLectura = 'todas' | 'no_leidas';

interface GrupoNotificaciones {
  key:   string;
  label: string;
  items: Notificacion[];
}

const TIPO_CATEGORIA: Record<string, Categoria> = {
  cita_confirmada:    'citas',
  cita_cancelada:     'citas',
  cita_atendida:      'citas',
  cita_no_presentado: 'citas',
  cita_reprogramada:  'citas',
  paciente_nuevo:        'pacientes',
  paciente_desactivado:  'pacientes',
  paciente_reactivado:   'pacientes',
  pago_registrado: 'pagos',
  pago_anulado:    'pagos',
  config_cambiada:      'sistema',
  medico_desactivado:   'sistema',
  medico_reactivado:    'sistema',
  usuario_nuevo:        'sistema',
  usuario_desactivado:  'sistema',
  usuario_reactivado:   'sistema',
};

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [NgComponentOutlet, TranslatePipe, LucideBell, LucideCheck, LucideInbox, LucideX, LucideTrash2],
  templateUrl: './notificaciones.component.html',
  styleUrl: './notificaciones.component.scss',
})
export class NotificacionesComponent implements OnInit {
  private notifService = inject(NotificacionesService);
  private router       = inject(Router);
  private t            = inject(TranslateService);

  readonly IconBell   = LucideBell;
  readonly IconCheck  = LucideCheck;
  readonly IconInbox  = LucideInbox;
  readonly IconX      = LucideX;
  readonly IconTrash2 = LucideTrash2;
  readonly iconHeader = { size: 22, strokeWidth: 1.5 };
  readonly iconCheck  = { size: 15, strokeWidth: 2 };
  readonly iconEmpty  = { size: 40, strokeWidth: 1 };
  readonly iconX      = { size: 13, strokeWidth: 2 };
  readonly iconTrash  = { size: 14, strokeWidth: 1.8 };

  readonly CATEGORIAS: { key: Categoria; labelKey: string }[] = [
    { key: 'todas',     labelKey: 'notif.cat_todos'     },
    { key: 'citas',     labelKey: 'notif.cat_citas'     },
    { key: 'pacientes', labelKey: 'notif.cat_pacientes' },
    { key: 'pagos',     labelKey: 'notif.cat_pagos'     },
    { key: 'sistema',   labelKey: 'notif.cat_sistema'   },
  ];

  categoria      = signal<Categoria>('todas');
  filtroLectura  = signal<FiltroLectura>('todas');
  loading        = signal(true);
  markingAll     = signal(false);
  deletingAll    = signal(false);

  allData   = signal<ListaNotificacionesResponse | null>(null);
  readonly noLeidas = this.notifService.unreadCount;

  readonly lista = computed<Notificacion[]>(() => {
    const data = this.allData();
    if (!data) return [];
    let items = data.notificaciones;
    const cat = this.categoria();
    if (cat !== 'todas') {
      items = items.filter(n => (TIPO_CATEGORIA[n.tipo] ?? 'sistema') === cat);
    }
    if (this.filtroLectura() === 'no_leidas') {
      items = items.filter(n => !n.leida);
    }
    return items;
  });

  readonly grupos = computed<GrupoNotificaciones[]>(() => {
    const items  = this.lista();
    const now    = new Date();
    const hoy    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ayer   = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const semana = new Date(hoy); semana.setDate(hoy.getDate() - 6);
    const mes    = new Date(hoy); mes.setDate(hoy.getDate() - 29);

    const groups: Record<string, Notificacion[]> = { hoy: [], ayer: [], semana: [], mes: [], anterior: [] };
    for (const n of items) {
      const d = new Date(n.created_at);
      if      (d >= hoy)    groups['hoy'].push(n);
      else if (d >= ayer)   groups['ayer'].push(n);
      else if (d >= semana) groups['semana'].push(n);
      else if (d >= mes)    groups['mes'].push(n);
      else                  groups['anterior'].push(n);
    }

    const labelKeys: Record<string, string> = {
      hoy:      'notif.group_today',
      ayer:     'notif.group_yesterday',
      semana:   'notif.group_week',
      mes:      'notif.group_month',
      anterior: 'notif.group_earlier',
    };

    return Object.entries(groups)
      .filter(([, arr]) => arr.length > 0)
      .map(([key, arr]) => ({ key, label: labelKeys[key], items: arr }));
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.notifService.getAll();
      this.allData.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  setCategoria(cat: Categoria): void   { this.categoria.set(cat); }
  setFiltroLectura(f: FiltroLectura): void { this.filtroLectura.set(f); }

  async marcarTodas(): Promise<void> {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    try {
      await this.notifService.markAllAsRead();
      const prev = this.allData();
      if (prev) {
        this.allData.set({
          ...prev,
          no_leidas: 0,
          notificaciones: prev.notificaciones.map(n => ({ ...n, leida: true })),
        });
      }
    } finally {
      this.markingAll.set(false);
    }
  }

  async eliminarUna(e: Event, notif: Notificacion): Promise<void> {
    e.stopPropagation();
    await this.notifService.deleteOne(notif.id);
    const prev = this.allData();
    if (prev) {
      this.allData.set({
        ...prev,
        no_leidas: Math.max(0, prev.no_leidas - (notif.leida ? 0 : 1)),
        total:     prev.total - 1,
        notificaciones: prev.notificaciones.filter(n => n.id !== notif.id),
      });
    }
  }

  async eliminarTodas(): Promise<void> {
    if (this.deletingAll()) return;
    this.deletingAll.set(true);
    try {
      await this.notifService.deleteAll();
      this.allData.set({ notificaciones: [], total: 0, no_leidas: 0 });
    } finally {
      this.deletingAll.set(false);
    }
  }

  abrir(notif: Notificacion): void {
    if (!notif.leida) {
      this.notifService.markAsRead(notif.id);
      const prev = this.allData();
      if (prev) {
        this.allData.set({
          ...prev,
          no_leidas: Math.max(0, prev.no_leidas - 1),
          notificaciones: prev.notificaciones.map(n =>
            n.id === notif.id ? { ...n, leida: true } : n
          ),
        });
      }
    }
    if (notif.link) void this.router.navigateByUrl(notif.link);
  }

  timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)    return this.t.instant('notif.time_now');
    if (diff < 3600)  return this.t.instant('notif.time_min',   { n: Math.floor(diff / 60) });
    if (diff < 86400) return this.t.instant('notif.time_hours', { n: Math.floor(diff / 3600) });
    const d = new Date(dateStr);
    const lang = this.t.currentLang ?? 'es';
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-GT', { day: 'numeric', month: 'short' });
  }
}
