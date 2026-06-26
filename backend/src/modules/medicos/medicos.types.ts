export type Genero = 'masculino' | 'femenino' | 'otro';

export interface HorarioMedico {
  id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface MedicoPublico {
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
  created_at: Date;
  dias_atencion: number[];
}

export interface MedicoStats {
  total: number;
  activos: number;
  con_horario: number;
  especialidades: string[];
}

export interface MedicoConHorarios extends MedicoPublico {
  horarios: HorarioMedico[];
}

export interface ListaMedicosResponse {
  medicos: MedicoPublico[];
  total: number;
  pagina: number;
  limite: number;
}
