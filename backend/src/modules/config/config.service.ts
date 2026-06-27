import prisma from '../../config/prisma';
import { ConfigSistema } from './config.types';

const DEFAULTS: ConfigSistema = {
  hospitalNombre:    'Hospital Esperanza Valle de Panchoy',
  hospitalTelefono:  '',
  hospitalDireccion: 'Antigua Guatemala, Guatemala',
  citaDuracion:      30,
  horarioApertura:   '07:00',
  horarioCierre:     '20:00',
  zonaHoraria:       'America/Guatemala',
  moneda:            'GTQ',
};

export async function getConfig(): Promise<ConfigSistema> {
  const row = await prisma.configuracion_sistema.findUnique({ where: { id: 1 } });
  if (!row) return { ...DEFAULTS };
  return { ...DEFAULTS, ...(row.datos as Partial<ConfigSistema>) };
}

export async function upsertConfig(data: Partial<ConfigSistema>): Promise<ConfigSistema> {
  const current = await getConfig();
  const updated  = { ...current, ...data };
  await prisma.configuracion_sistema.upsert({
    where:  { id: 1 },
    create: { id: 1, datos: updated as object },
    update: { datos: updated as object },
  });
  return updated;
}
