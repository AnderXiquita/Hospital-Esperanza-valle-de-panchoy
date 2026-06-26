import { Request, Response } from 'express';
import * as authService from './auth.service';
import { JWTPayload } from './auth.types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const { response, refreshToken } = await authService.login(req.body, ip);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
    res.status(200).json(response);
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ message: 'Correo o contrasena incorrectos' });
      return;
    }
    throw err;
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.refresh_token as string | undefined;

  if (!rawToken) {
    res.status(401).json({ message: 'No autorizado' });
    return;
  }

  try {
    const { accessToken, refreshToken } = await authService.refresh(rawToken);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
    res.status(200).json({ accessToken });
  } catch {
    res.clearCookie('refresh_token');
    res.status(401).json({ message: 'Sesion expirada' });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = (req.user as JWTPayload).sub;
  try {
    const updated = await authService.updateProfile(userId, req.body);
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
      res.status(409).json({ code: 'EMAIL_TAKEN', message: 'Este correo ya está en uso' });
      return;
    }
    throw err;
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = (req.user as JWTPayload).sub;
  try {
    await authService.changePassword(userId, req.body);
    res.status(200).json({ message: 'Contrasena actualizada correctamente' });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'WRONG_PASSWORD') {
        res.status(401).json({ code: 'WRONG_PASSWORD', message: 'La contrasena actual es incorrecta' });
        return;
      }
      if (err.message === 'SAME_PASSWORD') {
        res.status(400).json({ code: 'SAME_PASSWORD', message: 'La nueva contrasena debe ser diferente a la actual' });
        return;
      }
    }
    throw err;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.refresh_token as string | undefined;
  if (rawToken) {
    await authService.logout(rawToken);
  }
  res.clearCookie('refresh_token');
  res.status(200).json({ message: 'Sesion cerrada' });
}
