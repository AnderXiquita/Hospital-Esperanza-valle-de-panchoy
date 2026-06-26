export interface ServicioPublico {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  duracion: number;
  activo: boolean;
  created_at: Date;
}

export interface ListaServiciosResponse {
  servicios: ServicioPublico[];
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
