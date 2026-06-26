import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CitaDetalle {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  paciente: string;
  medico: string;
  especialidad: string;
  servicio: string;
  duracion: number;
  estado: string;
}

export interface IngresoDetalle {
  referencia: string;
  fecha_pago: string;
  paciente: string;
  servicio: string;
  metodo: string;
  monto: number;
}

export interface MedicoDetalleReporte {
  nombre: string;
  apellido: string;
  especialidad: string;
  total_citas: number;
  citas_atendidas: number;
  porcentaje_asistencia: number;
  ingresos: number;
}

export interface PacienteDetalle {
  nombre: string;
  apellido: string;
  dpi: string;
  fecha_nacimiento: string;
  genero: string;
  tipo_sangre: string;
  telefono: string;
  fecha_registro: string;
}

export interface ReporteCitasResponse {
  datos: CitaDetalle[];
  periodo: { desde: string; hasta: string };
  total: number;
}

export interface ReporteIngresosResponse {
  datos: IngresoDetalle[];
  periodo: { desde: string; hasta: string };
  total_monto: number;
  total_registros: number;
}

export interface ReporteMedicosResponse {
  datos: MedicoDetalleReporte[];
  periodo: { desde: string; hasta: string };
  total: number;
}

export interface ReportePacientesResponse {
  datos: PacienteDetalle[];
  periodo: { desde: string; hasta: string };
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/reportes`;

  private params(desde: string, hasta: string): HttpParams {
    return new HttpParams().set('desde', desde).set('hasta', hasta);
  }

  citas(desde: string, hasta: string): Promise<ReporteCitasResponse> {
    return firstValueFrom(
      this.http.get<ReporteCitasResponse>(`${this.base}/citas`, { params: this.params(desde, hasta) })
    );
  }

  ingresos(desde: string, hasta: string): Promise<ReporteIngresosResponse> {
    return firstValueFrom(
      this.http.get<ReporteIngresosResponse>(`${this.base}/ingresos`, { params: this.params(desde, hasta) })
    );
  }

  medicos(desde: string, hasta: string): Promise<ReporteMedicosResponse> {
    return firstValueFrom(
      this.http.get<ReporteMedicosResponse>(`${this.base}/medicos`, { params: this.params(desde, hasta) })
    );
  }

  pacientes(desde: string, hasta: string): Promise<ReportePacientesResponse> {
    return firstValueFrom(
      this.http.get<ReportePacientesResponse>(`${this.base}/pacientes`, { params: this.params(desde, hasta) })
    );
  }
}
