import { Request, Response } from 'express';
import * as service from './citas.service';
import { EstadoCita } from './citas.types';

function queryStr(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

const ESTADOS: EstadoCita[] = [
  'agendada', 'confirmada', 'atendida', 'reprogramada', 'cancelada', 'no_presentado',
];

const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function listar(req: Request, res: Response): Promise<void> {
  const desde = queryStr(req.query['desde']);
  const hasta = queryStr(req.query['hasta']);
  if (!fechaRegex.test(desde) || !fechaRegex.test(hasta)) {
    res.status(400).json({ message: 'Rango de fechas invalido (desde, hasta en formato YYYY-MM-DD)' });
    return;
  }

  const medicoIdRaw = parseInt(queryStr(req.query['medicoId']));
  const medicoId = isNaN(medicoIdRaw) ? undefined : medicoIdRaw;

  const estadoRaw = queryStr(req.query['estado']) as EstadoCita;
  const estado = ESTADOS.includes(estadoRaw) ? estadoRaw : undefined;

  const citas = await service.listarPorRango(desde, hasta, medicoId, estado);
  res.status(200).json({ citas });
}

const ERROR_MAP: Record<string, { status: number; code: string }> = {
  SERVICIO: { status: 404, code: 'SERVICIO' },
  MEDICO: { status: 404, code: 'MEDICO' },
  PACIENTE: { status: 404, code: 'PACIENTE' },
  OUT_OF_SCHEDULE: { status: 409, code: 'OUT_OF_SCHEDULE' },
  OVERLAP: { status: 409, code: 'OVERLAP' },
};

function manejarError(err: unknown, res: Response): void {
  if (err instanceof Error && ERROR_MAP[err.message]) {
    const hit = ERROR_MAP[err.message];
    res.status(hit.status).json({ code: hit.code });
    return;
  }
  throw err;
}

export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const cita = await service.crearCita(req.body);
    res.status(201).json(cita);
  } catch (err) {
    manejarError(err, res);
  }
}

export async function obtener(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const cita = await service.obtenerCita(id);
  if (!cita) {
    res.status(404).json({ message: 'Cita no encontrada' });
    return;
  }
  res.status(200).json(cita);
}

export async function cambiarEstado(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const cita = await service.cambiarEstado(id, req.body.estado, req.user!.sub);
  if (!cita) {
    res.status(404).json({ message: 'Cita no encontrada' });
    return;
  }
  res.status(200).json(cita);
}

export async function getSlots(req: Request, res: Response): Promise<void> {
  const medicoId = parseInt(queryStr(req.query['medicoId']));
  const fecha = queryStr(req.query['fecha']);
  const duracion = parseInt(queryStr(req.query['duracion']));

  if (isNaN(medicoId) || !fechaRegex.test(fecha) || isNaN(duracion) || duracion <= 0) {
    res.status(400).json({ message: 'medicoId, fecha y duracion son requeridos y válidos' });
    return;
  }

  const excludeIdRaw = parseInt(queryStr(req.query['excludeId']));
  const excludeId = isNaN(excludeIdRaw) ? undefined : excludeIdRaw;

  const slots = await service.getSlotsDisponibles(medicoId, fecha, duracion, excludeId);
  res.status(200).json({ slots });
}

export async function reprogramar(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  try {
    const cita = await service.reprogramarCita(id, req.body);
    if (!cita) {
      res.status(404).json({ message: 'Cita no encontrada' });
      return;
    }
    res.status(200).json(cita);
  } catch (err) {
    manejarError(err, res);
  }
}
