import { Request, Response } from 'express';
import * as notasService from './notas.service';
import { CrearNotaSchema, ActualizarNotaSchema } from './notas.schema';

export async function porCita(req: Request, res: Response): Promise<void> {
  const citaId = Number(req.query['citaId']);
  if (!citaId) { res.status(400).json({ message: 'citaId requerido' }); return; }
  const nota = await notasService.obtenerPorCita(citaId);
  res.status(200).json(nota ?? null);
}

export async function porPaciente(req: Request, res: Response): Promise<void> {
  const pacienteId = Number(req.params['pacienteId']);
  const notas = await notasService.obtenerPorPaciente(pacienteId);
  res.status(200).json({ notas });
}

export async function misPacientes(req: Request, res: Response): Promise<void> {
  const pacientes = await notasService.misPacientes(req.user!.sub);
  res.status(200).json({ pacientes });
}

export async function porId(req: Request, res: Response): Promise<void> {
  const id = Number(req.params['id']);
  const nota = await notasService.obtenerPorId(id);
  if (!nota) { res.status(404).json({ message: 'Nota no encontrada' }); return; }
  res.status(200).json(nota);
}

export async function crear(req: Request, res: Response): Promise<void> {
  const parsed = CrearNotaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ errors: parsed.error.flatten() }); return; }

  try {
    const nota = await notasService.crear(parsed.data, req.user!.sub);
    res.status(201).json(nota);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'NOT_FOUND')         { res.status(404).json({ message: e.message }); return; }
    if (e.code === 'FORBIDDEN')         { res.status(403).json({ message: e.message }); return; }
    if (e.code === 'INVALID_STATE')     { res.status(409).json({ code: 'INVALID_STATE',   message: e.message }); return; }
    if (e.code === 'ALREADY_EXISTS')    { res.status(409).json({ code: 'ALREADY_EXISTS',  message: e.message }); return; }
    if (e.code === 'NO_MEDICO_PROFILE') { res.status(404).json({ message: e.message }); return; }
    throw err;
  }
}

export async function actualizar(req: Request, res: Response): Promise<void> {
  const id = Number(req.params['id']);
  const parsed = ActualizarNotaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ errors: parsed.error.flatten() }); return; }

  try {
    const nota = await notasService.actualizar(id, parsed.data, req.user!.sub);
    res.status(200).json(nota);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'NOT_FOUND')         { res.status(404).json({ message: e.message }); return; }
    if (e.code === 'FORBIDDEN')         { res.status(403).json({ message: e.message }); return; }
    if (e.code === 'NO_MEDICO_PROFILE') { res.status(404).json({ message: e.message }); return; }
    throw err;
  }
}
