export type Rol = 'admin' | 'recepcionista' | 'medico';

export interface UsuarioPublico {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  ultimo_login: Date | null;
  created_at: Date;
}

export interface ListaUsuariosResponse {
  usuarios: UsuarioPublico[];
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
