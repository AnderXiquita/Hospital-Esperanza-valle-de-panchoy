export interface InicioMedico {
  id: number;
  nombre: string;
  apellido: string;
  genero: 'masculino' | 'femenino' | 'otro' | null;
  especialidad: string;
  subespecialidad: string | null;
  biografia: string | null;
  foto_url: string | null;
  dias_atencion: number[];
}

export interface InicioServicio {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface InicioStats {
  medicos: number;
  especialidades: number;
  servicios: number;
}

export interface InicioResponse {
  medicos: InicioMedico[];
  servicios: InicioServicio[];
  stats: InicioStats;
}
