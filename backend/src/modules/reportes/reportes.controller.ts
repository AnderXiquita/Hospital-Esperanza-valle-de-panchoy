import { Request, Response, NextFunction } from 'express';
import {
  obtenerResumen,
  reporteCitas,
  reporteIngresos,
  reporteMedicos,
  reportePacientes,
} from './reportes.service';

function validarPeriodo(desde: unknown, hasta: unknown): string | null {
  if (!desde || !hasta) return 'Se requieren los parámetros desde y hasta (YYYY-MM-DD)';
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(String(desde)) || !iso.test(String(hasta))) return 'Formato de fecha inválido. Use YYYY-MM-DD';
  if (String(desde) > String(hasta)) return 'La fecha de inicio no puede ser mayor a la fecha final';
  return null;
}

export async function getResumen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { desde, hasta } = req.query;
    const err = validarPeriodo(desde, hasta);
    if (err) { res.status(400).json({ message: err }); return; }
    const resumen = await obtenerResumen(String(desde), String(hasta));
    res.json(resumen);
  } catch (err) { next(err); }
}

export async function getReporteCitas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { desde, hasta } = req.query;
    const err = validarPeriodo(desde, hasta);
    if (err) { res.status(400).json({ message: err }); return; }
    const datos = await reporteCitas(String(desde), String(hasta));
    res.json({ datos, periodo: { desde, hasta }, total: datos.length });
  } catch (err) { next(err); }
}

export async function getReporteIngresos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { desde, hasta } = req.query;
    const err = validarPeriodo(desde, hasta);
    if (err) { res.status(400).json({ message: err }); return; }
    const datos = await reporteIngresos(String(desde), String(hasta));
    const total = datos.reduce((s, p) => s + p.monto, 0);
    res.json({ datos, periodo: { desde, hasta }, total_monto: total, total_registros: datos.length });
  } catch (err) { next(err); }
}

export async function getReporteMedicos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { desde, hasta } = req.query;
    const err = validarPeriodo(desde, hasta);
    if (err) { res.status(400).json({ message: err }); return; }
    const datos = await reporteMedicos(String(desde), String(hasta));
    res.json({ datos, periodo: { desde, hasta }, total: datos.length });
  } catch (err) { next(err); }
}

export async function getReportePacientes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { desde, hasta } = req.query;
    const err = validarPeriodo(desde, hasta);
    if (err) { res.status(400).json({ message: err }); return; }
    const datos = await reportePacientes(String(desde), String(hasta));
    res.json({ datos, periodo: { desde, hasta }, total: datos.length });
  } catch (err) { next(err); }
}
