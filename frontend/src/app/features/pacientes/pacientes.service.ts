import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Genero = 'masculino' | 'femenino' | 'otro';
export type EstadoCivil = 'soltero' | 'casado' | 'union_libre' | 'divorciado' | 'viudo';
export type TipoSangre = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Paciente {
  id: number;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  dpi: string;
  genero: Genero | null;
  estado_civil: EstadoCivil | null;
  ocupacion: string | null;
  telefono: string | null;
  telefono_emergencia: string | null;
  contacto_emergencia_nombre: string | null;
  email: string | null;
  direccion: string | null;
  tipo_sangre: TipoSangre | null;
  alergias: string | null;
  antecedentes: string | null;
  medicamentos: string | null;
  seguro: string | null;
  numero_afiliacion: string | null;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
}

export interface ListaPacientesResponse {
  pacientes: Paciente[];
  total: number;
  pagina: number;
  limite: number;
}

export interface PacienteStats {
  total: number;
  activos: number;
  nuevos_mes: number;
  con_correo: number;
}

export interface CrearPacientePayload {
  nombre: string;
  apellido: string;
  dpi: string;
  fecha_nacimiento: string;
  genero?: Genero;
  estado_civil?: EstadoCivil;
  ocupacion?: string;
  telefono?: string;
  telefono_emergencia?: string;
  contacto_emergencia_nombre?: string;
  email?: string;
  direccion?: string;
  tipo_sangre?: TipoSangre;
  alergias?: string;
  antecedentes?: string;
  medicamentos?: string;
  seguro?: string;
  numero_afiliacion?: string;
  observaciones?: string;
}

export type ActualizarPacientePayload = {
  [K in keyof CrearPacientePayload]?: CrearPacientePayload[K] | null;
};

@Injectable({ providedIn: 'root' })
export class PacientesService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/pacientes`;

  listar(params: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    soloActivos?: boolean;
  }): Promise<ListaPacientesResponse> {
    let httpParams = new HttpParams();
    if (params.pagina) httpParams = httpParams.set('pagina', params.pagina);
    if (params.limite) httpParams = httpParams.set('limite', params.limite);
    if (params.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params.soloActivos !== undefined) {
      httpParams = httpParams.set('soloActivos', params.soloActivos);
    }
    return firstValueFrom(
      this.http.get<ListaPacientesResponse>(this.base, { params: httpParams })
    );
  }

  estadisticas(): Promise<PacienteStats> {
    return firstValueFrom(this.http.get<PacienteStats>(`${this.base}/stats`));
  }

  obtener(id: number): Promise<Paciente> {
    return firstValueFrom(this.http.get<Paciente>(`${this.base}/${id}`));
  }

  crear(payload: CrearPacientePayload): Promise<Paciente> {
    return firstValueFrom(this.http.post<Paciente>(this.base, payload));
  }

  actualizar(id: number, payload: ActualizarPacientePayload): Promise<Paciente> {
    return firstValueFrom(this.http.put<Paciente>(`${this.base}/${id}`, payload));
  }

  toggle(id: number): Promise<{ activo: boolean }> {
    return firstValueFrom(this.http.patch<{ activo: boolean }>(`${this.base}/${id}/toggle`, {}));
  }
}
