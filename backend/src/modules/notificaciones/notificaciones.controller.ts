import { Request, Response, NextFunction } from 'express';
import * as service from './notificaciones.service';
import { notificarPorRoles } from './notificaciones.helper';

export const listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioId   = req.user!.sub;
    const soloNoLeidas = req.query['no_leidas'] === 'true';
    res.json(await service.listar(usuarioId, soloNoLeidas));
  } catch (e) { next(e); }
};

export const unreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await service.contarNoLeidas(req.user!.sub);
    res.json({ count });
  } catch (e) { next(e); }
};

export const marcarLeida = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params['id'] as string);
    const ok = await service.marcarLeida(id, req.user!.sub);
    if (!ok) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
};

export const marcarTodasLeidas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await service.marcarTodasLeidas(req.user!.sub);
    res.json({ updated });
  } catch (e) { next(e); }
};

export const eliminar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params['id'] as string);
    const ok = await service.eliminar(id, req.user!.sub);
    if (!ok) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
};

export const eliminarTodas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await service.eliminarTodas(req.user!.sub);
    res.json({ deleted });
  } catch (e) { next(e); }
};

export const configCambiada = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notificarPorRoles(
      ['admin', 'recepcionista', 'medico'],
      'config_cambiada',
      'Configuración actualizada',
      'El administrador actualizó los ajustes del sistema',
      '/configuraciones',
      req.user!.sub
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
};
