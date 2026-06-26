export interface JWTPayload {
  sub: number;
  rol: 'admin' | 'recepcionista' | 'medico';
  iat: number;
  exp: number;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
  };
}
