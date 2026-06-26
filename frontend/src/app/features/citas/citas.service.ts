import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoCita =
  | 'agendada'
  | 'confirmada'
  | 'atendida'
  | 'reprogramada'
  | 'cancelada'
  | 'no_presentado';

export interface CrearCitaPayload {
  paciente_id: number;
  medico_id: number;
  servicio_id: number;
  fecha: string;
  hora_inicio: string;
  motivo_consulta?: string;
}

export interface Cita {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoCita;
  motivo_consulta: string | null;
  paciente_id: number;
  medico_id: number;
  servicio_id: number;
  paciente_nombre: string;
  paciente_apellido: string;
  medico_nombre: string;
  medico_apellido: string;
  servicio_nombre: string;
  servicio_duracion: number;
}

@Injectable({ providedIn: 'root' })
export class CitasService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/citas`;

  listar(params: {
    desde: string;
    hasta: string;
    medicoId?: number;
    estado?: string;
  }): Promise<{ citas: Cita[] }> {
    let httpParams = new HttpParams()
      .set('desde', params.desde)
      .set('hasta', params.hasta);
    if (params.medicoId) httpParams = httpParams.set('medicoId', params.medicoId);
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    return firstValueFrom(this.http.get<{ citas: Cita[] }>(this.base, { params: httpParams }));
  }

  crear(payload: CrearCitaPayload): Promise<Cita> {
    return firstValueFrom(this.http.post<Cita>(this.base, payload));
  }

  obtener(id: number): Promise<Cita> {
    return firstValueFrom(this.http.get<Cita>(`${this.base}/${id}`));
  }

  cambiarEstado(id: number, estado: EstadoCita): Promise<Cita> {
    return firstValueFrom(this.http.patch<Cita>(`${this.base}/${id}/estado`, { estado }));
  }

  reprogramar(id: number, payload: { fecha: string; hora_inicio: string }): Promise<Cita> {
    return firstValueFrom(this.http.put<Cita>(`${this.base}/${id}`, payload));
  }

  getSlots(params: {
    medicoId: number;
    fecha: string;
    duracion: number;
    excludeId?: number;
  }): Promise<{ slots: string[] }> {
    let httpParams = new HttpParams()
      .set('medicoId', params.medicoId)
      .set('fecha', params.fecha)
      .set('duracion', params.duracion);
    if (params.excludeId !== undefined) httpParams = httpParams.set('excludeId', params.excludeId);
    return firstValueFrom(
      this.http.get<{ slots: string[] }>(`${this.base}/slots`, { params: httpParams })
    );
  }
}

