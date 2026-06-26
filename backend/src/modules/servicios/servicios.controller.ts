import { Request, Response } from 'express';
import * as service from './servicios.service';

function queryStr(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

export async function listar(req: Request, res: Response): Promise<void> {
  const pagina = Math.max(1, parseInt(queryStr(req.query['pagina'])) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(queryStr(req.query['limite'])) || 20));
  const busqueda = queryStr(req.query['busqueda']) || undefined;
  const rawEstado = queryStr(req.query['soloActivos']);
  const soloActivos: boolean | undefined = rawEstado === 'todos' ? undefined : rawEstado !== 'false';

  const result = await service.listarServicios(pagina, limite, busqueda, soloActivos);
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
  const servicio = await service.obtenerServicio(id);
  if (!servicio) {
    res.status(404).json({ message: 'Servicio no encontrado' });
    return;
  }
  res.status(200).json(servicio);
}

export async function crear(req: Request, res: Response): Promise<void> {
  const servicio = await service.crearServicio(req.body);
  res.status(201).json(servicio);
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const servicio = await service.actualizarServicio(id, req.body);
  if (!servicio) {
    res.status(404).json({ message: 'Servicio no encontrado' });
    return;
  }
  res.status(200).json(servicio);
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  try {
    const result = await service.toggleActivo(id);
    if (!result) {
      res.status(404).json({ message: 'Servicio no encontrado' });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'CITAS_ACTIVAS') {
      res.status(409).json({ code: 'CITAS_ACTIVAS', message: 'El servicio tiene citas vigentes y no puede ser dado de baja' });
      return;
    }
    throw err;
  }
}
