export type Genero = 'masculino' | 'femenino' | 'otro';

export interface PacientePublico {
  id: number;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  dpi: string;
  genero: Genero | null;
  estado_civil: string | null;
  ocupacion: string | null;
  telefono: string | null;
  telefono_emergencia: string | null;
  contacto_emergencia_nombre: string | null;
  email: string | null;
  direccion: string | null;
  tipo_sangre: string | null;
  alergias: string | null;
  antecedentes: string | null;
  medicamentos: string | null;
  seguro: string | null;
  numero_afiliacion: string | null;
  observaciones: string | null;
  activo: boolean;
  created_at: Date;
}

export interface ListaPacientesResponse {
  pacientes: PacientePublico[];
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
