import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Genero = 'masculino' | 'femenino' | 'otro';

export interface HorarioMedico {
  id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface Medico {
  id: number;
  usuario_id: number;
  nombre: string;
  apellido: string;
  email: string;
  especialidad: string;
  subespecialidad: string | null;
  numero_colegiado: string;
  dpi: string | null;
  fecha_nacimiento: string | null;
  genero: Genero | null;
  telefono: string | null;
  telefono_emergencia: string | null;
  direccion: string | null;
  fecha_ingreso: string | null;
  consultorio: string | null;
  tarifa_consulta: string | null;
  biografia: string | null;
  foto_url: string | null;
  activo: boolean;
  created_at: string;
  dias_atencion: number[];
}

export interface MedicoPropio {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string;
}

export interface MedicoStats {
  total: number;
  activos: number;
  con_horario: number;
  especialidades: string[];
}

export interface MedicoConHorarios extends Medico {
  horarios: HorarioMedico[];
}

export interface ListaMedicosResponse {
  medicos: Medico[];
  total: number;
  pagina: number;
  limite: number;
}

export interface HorarioPayload {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface CrearMedicoPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  especialidad: string;
  numero_colegiado: string;
  subespecialidad?: string;
  dpi?: string;
  fecha_nacimiento?: string;
  genero?: Genero;
  telefono?: string;
  telefono_emergencia?: string;
  direccion?: string;
  fecha_ingreso?: string;
  consultorio?: string;
  tarifa_consulta?: number;
  biografia?: string;
  foto_url?: string;
  horarios?: HorarioPayload[];
}

export interface ActualizarMedicoPayload {
  nombre?: string;
  apellido?: string;
  especialidad?: string;
  numero_colegiado?: string;
  subespecialidad?: string | null;
  dpi?: string | null;
  fecha_nacimiento?: string | null;
  genero?: Genero | null;
  telefono?: string | null;
  telefono_emergencia?: string | null;
  direccion?: string | null;
  fecha_ingreso?: string | null;
  consultorio?: string | null;
  tarifa_consulta?: number | null;
  biografia?: string | null;
  foto_url?: string | null;
}

export interface ActualizarHorariosPayload {
  horarios: HorarioPayload[];
}

@Injectable({ providedIn: 'root' })
export class MedicosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/medicos`;

  listar(params: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    soloActivos?: boolean;
    especialidad?: string;
  }): Promise<ListaMedicosResponse> {
    let httpParams = new HttpParams();
    if (params.pagina) httpParams = httpParams.set('pagina', params.pagina);
    if (params.limite) httpParams = httpParams.set('limite', params.limite);
    if (params.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params.soloActivos !== undefined) {
      httpParams = httpParams.set('soloActivos', params.soloActivos);
    }
    if (params.especialidad) httpParams = httpParams.set('especialidad', params.especialidad);
    return firstValueFrom(
      this.http.get<ListaMedicosResponse>(this.base, { params: httpParams })
    );
  }

  estadisticas(): Promise<MedicoStats> {
    return firstValueFrom(this.http.get<MedicoStats>(`${this.base}/stats`));
  }

  getMiPerfil(): Promise<MedicoPropio> {
    return firstValueFrom(this.http.get<MedicoPropio>(`${this.base}/me`));
  }

  obtener(id: number): Promise<MedicoConHorarios> {
    return firstValueFrom(this.http.get<MedicoConHorarios>(`${this.base}/${id}`));
  }

  crear(payload: CrearMedicoPayload): Promise<MedicoConHorarios> {
    return firstValueFrom(this.http.post<MedicoConHorarios>(this.base, payload));
  }

  actualizar(id: number, payload: ActualizarMedicoPayload): Promise<MedicoConHorarios> {
    return firstValueFrom(this.http.put<MedicoConHorarios>(`${this.base}/${id}`, payload));
  }

  toggle(id: number): Promise<{ activo: boolean }> {
    return firstValueFrom(
      this.http.patch<{ activo: boolean }>(`${this.base}/${id}/toggle`, {})
    );
  }

  actualizarHorarios(id: number, payload: ActualizarHorariosPayload): Promise<MedicoConHorarios> {
    return firstValueFrom(
      this.http.put<MedicoConHorarios>(`${this.base}/${id}/horarios`, payload)
    );
  }
}
