import prisma from '../../config/prisma';
import { NotificacionPublica, ListaNotificacionesResponse } from './notificaciones.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(n: any): NotificacionPublica {
  return {
    id:         n.id,
    tipo:       n.tipo,
    titulo:     n.titulo,
    mensaje:    n.mensaje,
    leida:      n.leida,
    link:       n.link,
    created_at: n.created_at,
  };
}

export async function listar(
  usuarioId: number,
  soloNoLeidas: boolean = false
): Promise<ListaNotificacionesResponse> {
  const where = soloNoLeidas
    ? { usuario_id: usuarioId, leida: false }
    : { usuario_id: usuarioId };

  const [rows, total, no_leidas] = await Promise.all([
    prisma.notificaciones.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
    }),
    prisma.notificaciones.count({ where }),
    prisma.notificaciones.count({ where: { usuario_id: usuarioId, leida: false } }),
  ]);

  return { notificaciones: rows.map(map), total, no_leidas };
}

export async function contarNoLeidas(usuarioId: number): Promise<number> {
  return prisma.notificaciones.count({ where: { usuario_id: usuarioId, leida: false } });
}

export async function marcarLeida(id: number, usuarioId: number): Promise<boolean> {
  const notif = await prisma.notificaciones.findFirst({ where: { id, usuario_id: usuarioId } });
  if (!notif) return false;
  await prisma.notificaciones.update({ where: { id }, data: { leida: true } });
  return true;
}

export async function marcarTodasLeidas(usuarioId: number): Promise<number> {
  const result = await prisma.notificaciones.updateMany({
    where: { usuario_id: usuarioId, leida: false },
    data:  { leida: true },
  });
  return result.count;
}

export async function eliminar(id: number, usuarioId: number): Promise<boolean> {
  const notif = await prisma.notificaciones.findFirst({ where: { id, usuario_id: usuarioId } });
  if (!notif) return false;
  await prisma.notificaciones.delete({ where: { id } });
  return true;
}

export async function eliminarTodas(usuarioId: number): Promise<number> {
  const result = await prisma.notificaciones.deleteMany({ where: { usuario_id: usuarioId } });
  return result.count;
}
