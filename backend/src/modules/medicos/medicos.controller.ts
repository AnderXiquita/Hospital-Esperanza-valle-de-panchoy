import { Request, Response } from 'express';
import * as medicosService from './medicos.service';

function parseId(raw: unknown): number {
  return parseInt(String(raw));
}

function queryStr(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

// Mensaje específico para violación de constraint único de Prisma (P2002)
function mensajeDuplicado(err: Error): string | null {
  if (!err.message.includes('Unique constraint')) return null;
  const m = err.message.toLowerCase();
  if (m.includes('email')) return 'El correo electrónico ya está registrado';
  if (m.includes('colegiado')) return 'El número de colegiado ya está registrado';
  if (m.includes('dpi')) return 'El DPI ya está registrado';
  return 'Ya existe un registro con esos datos';
}

export async function listar(req: Request, res: Response): Promise<void> {
  const pagina = Math.max(1, parseInt(queryStr(req.query['pagina'])) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(queryStr(req.query['limite'])) || 20));
  const busqueda = queryStr(req.query['busqueda']) || undefined;
  const rawEstado = queryStr(req.query['soloActivos']);
  const soloActivos: boolean | undefined = rawEstado === 'todos' ? undefined : rawEstado !== 'false';
  const especialidad = queryStr(req.query['especialidad']) || undefined;

  const result = await medicosService.listarMedicos(
    pagina, limite, busqueda, soloActivos, especialidad
  );
  res.status(200).json(result);
}

export async function stats(_req: Request, res: Response): Promise<void> {
  const result = await medicosService.estadisticas();
  res.status(200).json(result);
}

export async function obtener(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params['id']);
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }

  const medico = await medicosService.obtenerMedico(id);
  if (!medico) {
    res.status(404).json({ message: 'Medico no encontrado' });
    return;
  }

  res.status(200).json(medico);
}

export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const medico = await medicosService.crearMedico(req.body);
    res.status(201).json(medico);
  } catch (err) {
    const dup = err instanceof Error ? mensajeDuplicado(err) : null;
    if (dup) {
      res.status(409).json({ message: dup });
      return;
    }
    throw err;
  }
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params['id']);
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }

  try {
    const medico = await medicosService.actualizarMedico(id, req.body);
    if (!medico) {
      res.status(404).json({ message: 'Medico no encontrado' });
      return;
    }
    res.status(200).json(medico);
  } catch (err) {
    const dup = err instanceof Error ? mensajeDuplicado(err) : null;
    if (dup) {
      res.status(409).json({ message: dup });
      return;
    }
    throw err;
  }
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params['id']);
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }

  try {
    const result = await medicosService.toggleActivo(id, req.user!.sub);
    if (!result) {
      res.status(404).json({ message: 'Medico no encontrado' });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'CITAS_ACTIVAS') {
      res.status(409).json({ code: 'CITAS_ACTIVAS', message: 'El medico tiene citas vigentes y no puede ser dado de baja' });
      return;
    }
    throw err;
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const result = await medicosService.obtenerMedicoPropio(req.user!.sub);
  if (!result) {
    res.status(404).json({ message: 'Perfil de medico no encontrado' });
    return;
  }
  res.status(200).json(result);
}

export async function actualizarHorarios(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params['id']);
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }

  try {
    const medico = await medicosService.actualizarHorarios(id, req.body);
    res.status(200).json(medico);
  } catch (err) {
    if (err instanceof Error && err.message === 'MEDICO_NOT_FOUND') {
      res.status(404).json({ message: 'Medico no encontrado' });
      return;
    }
    throw err;
  }
}
