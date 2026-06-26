declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: number;
        rol: 'admin' | 'recepcionista' | 'medico';
        iat: number;
        exp: number;
      };
    }
  }
}

export {};
