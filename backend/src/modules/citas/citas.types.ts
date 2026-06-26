export type EstadoCita =
  | 'agendada'
  | 'confirmada'
  | 'atendida'
  | 'reprogramada'
  | 'cancelada'
  | 'no_presentado';

export interface CitaPublica {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM
  hora_fin: string; // HH:MM
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

export interface ListaCitasResponse {
  citas: CitaPublica[];
}
