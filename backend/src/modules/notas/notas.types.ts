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

  // Datos de contexto (joins)
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
