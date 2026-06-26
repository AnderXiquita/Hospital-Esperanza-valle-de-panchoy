import { Request, Response } from 'express';
import * as service from './usuarios.service';
import { Rol } from './usuarios.types';

function queryStr(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

const ROLES: Rol[] = ['admin', 'recepcionista', 'medico'];

export async function listar(req: Request, res: Response): Promise<void> {
  const pagina = Math.max(1, parseInt(queryStr(req.query['pagina'])) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(queryStr(req.query['limite'])) || 20));
  const busqueda = queryStr(req.query['busqueda']) || undefined;
  const rawEstado = queryStr(req.query['soloActivos']);
  const soloActivos: boolean | undefined = rawEstado === 'todos' ? undefined : rawEstado !== 'false';
  const rolRaw = queryStr(req.query['rol']) as Rol;
  const rol = ROLES.includes(rolRaw) ? rolRaw : undefined;

  const result = await service.listarUsuarios(pagina, limite, busqueda, soloActivos, rol);
  res.status(200).json(result);
}

export async function stats(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await service.estadisticas());
}

export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const usuario = await service.crearUsuario(req.body, req.user!.sub);
    res.status(201).json(usuario);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      res.status(409).json({ message: 'El correo ya esta registrado' });
      return;
    }
    throw err;
  }
}

export async function obtener(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const usuario = await service.obtenerUsuario(id);
  if (!usuario) {
    res.status(404).json({ message: 'Usuario no encontrado' });
    return;
  }
  res.status(200).json(usuario);
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const currentUserId = req.user?.sub ?? 0;

  try {
    const result = await service.toggleActivo(id, currentUserId);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }
      if (err.message === 'SELF') {
        res.status(409).json({ code: 'SELF', message: 'No puedes desactivar tu propia cuenta' });
        return;
      }
      if (err.message === 'LAST_ADMIN') {
        res.status(409).json({ code: 'LAST_ADMIN', message: 'No puedes desactivar al ultimo administrador' });
        return;
      }
      if (err.message === 'CITAS_ACTIVAS') {
        res.status(409).json({ code: 'CITAS_ACTIVAS', message: 'El medico tiene citas vigentes y no puede ser dado de baja' });
        return;
      }
    }
    throw err;
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const ok = await service.resetPassword(id, req.body.password);
  if (!ok) {
    res.status(404).json({ message: 'Usuario no encontrado' });
    return;
  }
  res.status(200).json({ ok: true });
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }

  const currentUserId = req.user?.sub ?? 0;

  try {
    const usuario = await service.actualizarUsuario(id, req.body, currentUserId);
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    res.status(200).json(usuario);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      res.status(409).json({ message: 'El correo ya esta registrado' });
      return;
    }
    throw err;
  }
}
