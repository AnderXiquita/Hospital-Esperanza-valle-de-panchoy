import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Rol = 'admin' | 'recepcionista' | 'medico';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
}

export interface ListaUsuariosResponse {
  usuarios: Usuario[];
  total: number;
  pagina: number;
  limite: number;
}

export interface UsuarioStats {
  total: number;
  activos: number;
  admins: number;
  recepcionistas: number;
}

export type RolAsignable = 'admin' | 'recepcionista';

export interface CrearUsuarioPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: RolAsignable;
}

export interface ActualizarUsuarioPayload {
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: RolAsignable;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/usuarios`;

  listar(params: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    soloActivos?: boolean;
    rol?: string;
  }): Promise<ListaUsuariosResponse> {
    let httpParams = new HttpParams();
    if (params.pagina) httpParams = httpParams.set('pagina', params.pagina);
    if (params.limite) httpParams = httpParams.set('limite', params.limite);
    if (params.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params.soloActivos !== undefined) {
      httpParams = httpParams.set('soloActivos', params.soloActivos);
    }
    if (params.rol) httpParams = httpParams.set('rol', params.rol);
    return firstValueFrom(
      this.http.get<ListaUsuariosResponse>(this.base, { params: httpParams })
    );
  }

  estadisticas(): Promise<UsuarioStats> {
    return firstValueFrom(this.http.get<UsuarioStats>(`${this.base}/stats`));
  }

  crear(payload: CrearUsuarioPayload): Promise<Usuario> {
    return firstValueFrom(this.http.post<Usuario>(this.base, payload));
  }

  actualizar(id: number, payload: ActualizarUsuarioPayload): Promise<Usuario> {
    return firstValueFrom(this.http.put<Usuario>(`${this.base}/${id}`, payload));
  }

  obtener(id: number): Promise<Usuario> {
    return firstValueFrom(this.http.get<Usuario>(`${this.base}/${id}`));
  }

  toggle(id: number): Promise<{ activo: boolean }> {
    return firstValueFrom(this.http.patch<{ activo: boolean }>(`${this.base}/${id}/toggle`, {}));
  }

  resetPassword(id: number, password: string): Promise<{ ok: boolean }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean }>(`${this.base}/${id}/reset-password`, { password })
    );
  }
}
