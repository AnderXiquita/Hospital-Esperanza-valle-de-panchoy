import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  duracion: number;
  activo: boolean;
  created_at: string;
}

export interface ListaServiciosResponse {
  servicios: Servicio[];
  total: number;
  pagina: number;
  limite: number;
}

export interface ServicioStats {
  total: number;
  activos: number;
  precio_promedio: number;
  duracion_promedio: number;
}

export interface CrearServicioPayload {
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion: number;
}

export interface ActualizarServicioPayload {
  nombre?: string;
  descripcion?: string | null;
  precio?: number;
  duracion?: number;
}

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/servicios`;

  listar(params: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    soloActivos?: boolean;
  }): Promise<ListaServiciosResponse> {
    let httpParams = new HttpParams();
    if (params.pagina) httpParams = httpParams.set('pagina', params.pagina);
    if (params.limite) httpParams = httpParams.set('limite', params.limite);
    if (params.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params.soloActivos !== undefined) {
      httpParams = httpParams.set('soloActivos', params.soloActivos);
    }
    return firstValueFrom(
      this.http.get<ListaServiciosResponse>(this.base, { params: httpParams })
    );
  }

  estadisticas(): Promise<ServicioStats> {
    return firstValueFrom(this.http.get<ServicioStats>(`${this.base}/stats`));
  }

  obtener(id: number): Promise<Servicio> {
    return firstValueFrom(this.http.get<Servicio>(`${this.base}/${id}`));
  }

  crear(payload: CrearServicioPayload): Promise<Servicio> {
    return firstValueFrom(this.http.post<Servicio>(this.base, payload));
  }

  actualizar(id: number, payload: ActualizarServicioPayload): Promise<Servicio> {
    return firstValueFrom(this.http.put<Servicio>(`${this.base}/${id}`, payload));
  }

  toggle(id: number): Promise<{ activo: boolean }> {
    return firstValueFrom(this.http.patch<{ activo: boolean }>(`${this.base}/${id}/toggle`, {}));
  }
}
