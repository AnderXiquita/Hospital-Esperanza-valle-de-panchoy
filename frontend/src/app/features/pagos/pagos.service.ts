import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoPago = 'pendiente' | 'pagado' | 'anulado';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Pago {
  id: number;
  cita_id: number;
  monto: string;
  estado: EstadoPago;
  metodo_pago: string | null;
  referencia: string | null;
  created_at: string;
  paciente_nombre: string;
  paciente_apellido: string;
  servicio_nombre: string;
  fecha: string;
}

export interface ListaPagosResponse {
  pagos: Pago[];
  total: number;
  pagina: number;
  limite: number;
}

export interface PagoStats {
  total_recaudado: number;
  recaudado_mes: number;
  num_pagados: number;
  ticket_promedio: number;
}

export interface CitaPendiente {
  cita_id: number;
  fecha: string;
  hora_inicio: string;
  paciente_nombre: string;
  paciente_apellido: string;
  servicio_nombre: string;
  servicio_precio: string;
  medico_nombre: string;
  medico_apellido: string;
}

export interface CrearPagoPayload {
  cita_id: number;
  monto: number;
  metodo_pago: MetodoPago;
}

@Injectable({ providedIn: 'root' })
export class PagosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/pagos`;

  listar(params: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    estado?: string;
  }): Promise<ListaPagosResponse> {
    let httpParams = new HttpParams();
    if (params.pagina) httpParams = httpParams.set('pagina', params.pagina);
    if (params.limite) httpParams = httpParams.set('limite', params.limite);
    if (params.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    return firstValueFrom(this.http.get<ListaPagosResponse>(this.base, { params: httpParams }));
  }

  estadisticas(): Promise<PagoStats> {
    return firstValueFrom(this.http.get<PagoStats>(`${this.base}/stats`));
  }

  citasPendientes(busqueda?: string): Promise<{ citas: CitaPendiente[] }> {
    let httpParams = new HttpParams();
    if (busqueda) httpParams = httpParams.set('busqueda', busqueda);
    return firstValueFrom(
      this.http.get<{ citas: CitaPendiente[] }>(`${this.base}/citas-pendientes`, { params: httpParams })
    );
  }

  crear(payload: CrearPagoPayload): Promise<Pago> {
    return firstValueFrom(this.http.post<Pago>(this.base, payload));
  }

  obtener(id: number): Promise<Pago> {
    return firstValueFrom(this.http.get<Pago>(`${this.base}/${id}`));
  }

  anular(id: number): Promise<Pago> {
    return firstValueFrom(this.http.patch<Pago>(`${this.base}/${id}/anular`, {}));
  }
}
