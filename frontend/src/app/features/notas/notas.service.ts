import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  notas?: string;
}

export interface NotaClinica {
  id: number;
  cita_id: number;
  medico_id: number;
  paciente_id: number;

  sv_presion_sistolica: number | null;
  sv_presion_diastolica: number | null;
  sv_frecuencia_cardiaca: number | null;
  sv_frecuencia_resp: number | null;
  sv_temperatura: number | null;
  sv_saturacion_o2: number | null;
  sv_peso: number | null;
  sv_talla: number | null;

  motivo_consulta: string | null;
  anamnesis: string | null;
  examen_fisico: string | null;

  diagnostico_principal: string | null;
  diagnosticos_secundarios: string[];

  medicamentos: Medicamento[];
  indicaciones: string | null;
  proxima_consulta: string | null;
  notas_adicionales: string | null;

  created_at: string;
  updated_at: string;

  medico_nombre?: string;
  medico_apellido?: string;
  medico_especialidad?: string;
  paciente_nombre?: string;
  paciente_apellido?: string;
  cita_fecha?: string;
  cita_hora_inicio?: string;
  servicio_nombre?: string;
}

export interface PacienteDelHistorial {
  id: number;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  tipo_sangre: string | null;
  genero: string | null;
  activo: boolean;
  total_notas: number;
  ultima_consulta: string | null;
}

export type NotaFormData = Omit<NotaClinica,
  'id' | 'medico_id' | 'paciente_id' | 'created_at' | 'updated_at' |
  'medico_nombre' | 'medico_apellido' | 'medico_especialidad' |
  'paciente_nombre' | 'paciente_apellido' | 'cita_fecha' | 'cita_hora_inicio' | 'servicio_nombre'
>;

@Injectable({ providedIn: 'root' })
export class NotasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/notas`;

  obtenerPorCita(citaId: number): Promise<NotaClinica | null> {
    return firstValueFrom(this.http.get<NotaClinica | null>(`${this.base}?citaId=${citaId}`));
  }

  obtenerPorPaciente(pacienteId: number): Promise<{ notas: NotaClinica[] }> {
    return firstValueFrom(this.http.get<{ notas: NotaClinica[] }>(`${this.base}/paciente/${pacienteId}`));
  }

  misPacientes(): Promise<{ pacientes: PacienteDelHistorial[] }> {
    return firstValueFrom(this.http.get<{ pacientes: PacienteDelHistorial[] }>(`${this.base}/mis-pacientes`));
  }

  crear(data: NotaFormData): Promise<NotaClinica> {
    return firstValueFrom(this.http.post<NotaClinica>(this.base, data));
  }

  actualizar(id: number, data: Omit<NotaFormData, 'cita_id'>): Promise<NotaClinica> {
    return firstValueFrom(this.http.put<NotaClinica>(`${this.base}/${id}`, data));
  }
}
