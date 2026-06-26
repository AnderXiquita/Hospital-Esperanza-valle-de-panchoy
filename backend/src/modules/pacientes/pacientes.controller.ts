import { Request, Response } from 'express';
import * as service from './pacientes.service';

function queryStr(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

function dpiDuplicado(err: Error): boolean {
  return err.message.includes('Unique constraint');
}

export async function listar(req: Request, res: Response): Promise<void> {
  const pagina = Math.max(1, parseInt(queryStr(req.query['pagina'])) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(queryStr(req.query['limite'])) || 20));
  const busqueda = queryStr(req.query['busqueda']) || undefined;
  const rawEstado = queryStr(req.query['soloActivos']);
  const soloActivos: boolean | undefined = rawEstado === 'todos' ? undefined : rawEstado !== 'false';

  const result = await service.listarPacientes(pagina, limite, busqueda, soloActivos);
  res.status(200).json(result);
}

export async function stats(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await service.estadisticas());
}

export async function obtener(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const paciente = await service.obtenerPaciente(id);
  if (!paciente) {
    res.status(404).json({ message: 'Paciente no encontrado' });
    return;
  }
  res.status(200).json(paciente);
}

export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const paciente = await service.crearPaciente(req.body);
    res.status(201).json(paciente);
  } catch (err) {
    if (err instanceof Error && dpiDuplicado(err)) {
      res.status(409).json({ message: 'El DPI ya esta registrado' });
      return;
    }
    throw err;
  }
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  try {
    const paciente = await service.actualizarPaciente(id, req.body);
    if (!paciente) {
      res.status(404).json({ message: 'Paciente no encontrado' });
      return;
    }
    res.status(200).json(paciente);
  } catch (err) {
    if (err instanceof Error && dpiDuplicado(err)) {
      res.status(409).json({ message: 'El DPI ya esta registrado' });
      return;
    }
    throw err;
  }
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  try {
    const result = await service.toggleActivo(id, req.user!.sub);
    if (!result) {
      res.status(404).json({ message: 'Paciente no encontrado' });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'CITAS_ACTIVAS') {
      res.status(409).json({ code: 'CITAS_ACTIVAS', message: 'El paciente tiene citas vigentes y no puede ser dado de baja' });
      return;
    }
    throw err;
  }
}
