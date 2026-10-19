import { Request, Response } from 'express';
import * as service from './inicio.service';

export async function obtener(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await service.obtenerInicio());
}
