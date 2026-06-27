import { Request, Response, NextFunction } from 'express';
import { getConfig, upsertConfig } from './config.service';
import { ConfigSistema } from './config.types';

export async function getConfigHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getConfig());
  } catch (err) { next(err); }
}

export async function updateConfigHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await upsertConfig(req.body as Partial<ConfigSistema>));
  } catch (err) { next(err); }
}
