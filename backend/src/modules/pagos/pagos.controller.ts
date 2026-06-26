import { Request, Response } from 'express';
import * as service from './pagos.service';
import { EstadoPago } from './pagos.types';

function queryStr(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

const ESTADOS: EstadoPago[] = ['pendiente', 'pagado', 'anulado'];

export async function listar(req: Request, res: Response): Promise<void> {
  const pagina = Math.max(1, parseInt(queryStr(req.query['pagina'])) || 1);
  const limite = Math.min(100, Math.max(1, parseInt(queryStr(req.query['limite'])) || 20));
  const busqueda = queryStr(req.query['busqueda']) || undefined;
  const estadoRaw = queryStr(req.query['estado']) as EstadoPago;
  const estado = ESTADOS.includes(estadoRaw) ? estadoRaw : undefined;

  const result = await service.listarPagos(pagina, limite, busqueda, estado);
  res.status(200).json(result);
}

export async function stats(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await service.estadisticas());
}

export async function citasPendientes(req: Request, res: Response): Promise<void> {
  const busqueda = queryStr(req.query['busqueda']) || undefined;
  res.status(200).json({ citas: await service.citasPendientes(busqueda) });
}

export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const pago = await service.crearPago(req.body, req.user!.sub);
    res.status(201).json(pago);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'CITA_NOT_FOUND') {
        res.status(404).json({ code: 'CITA_NOT_FOUND' });
        return;
      }
      if (err.message === 'ALREADY_PAID') {
        res.status(409).json({ code: 'ALREADY_PAID' });
        return;
      }
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
  const pago = await service.obtenerPago(id);
  if (!pago) {
    res.status(404).json({ message: 'Pago no encontrado' });
    return;
  }
  res.status(200).json(pago);
}

export async function anular(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params['id']));
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID invalido' });
    return;
  }
  const pago = await service.anularPago(id, req.user!.sub);
  if (!pago) {
    res.status(404).json({ message: 'Pago no encontrado' });
    return;
  }
  res.status(200).json(pago);
}
