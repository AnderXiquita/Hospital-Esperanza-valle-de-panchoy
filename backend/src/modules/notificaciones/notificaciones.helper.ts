import prisma from '../../config/prisma';

async function crear(
  usuarioId: number,
  tipo: string,
  titulo: string,
  mensaje: string,
  link?: string
): Promise<void> {
  await prisma.notificaciones.create({
    data: { usuario_id: usuarioId, tipo, titulo, mensaje, link: link ?? null },
  });
}

export async function notificarUsuario(
  usuarioId: number,
  tipo: string,
  titulo: string,
  mensaje: string,
  link?: string
): Promise<void> {
  try { await crear(usuarioId, tipo, titulo, mensaje, link); } catch { /* no romper flujo */ }
}

export async function notificarPorRol(
  rol: 'admin' | 'recepcionista' | 'medico',
  tipo: string,
  titulo: string,
  mensaje: string,
  link?: string,
  excludeUserId?: number
): Promise<void> {
  try {
    const users = await prisma.usuarios.findMany({
      where: {
        rol,
        activo: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (!users.length) return;
    await prisma.notificaciones.createMany({
      data: users.map(u => ({ usuario_id: u.id, tipo, titulo, mensaje, link: link ?? null })),
    });
  } catch { /* no romper flujo */ }
}

export async function notificarPorRoles(
  roles: Array<'admin' | 'recepcionista' | 'medico'>,
  tipo: string,
  titulo: string,
  mensaje: string,
  link?: string,
  excludeUserId?: number
): Promise<void> {
  try {
    const users = await prisma.usuarios.findMany({
      where: {
        rol: { in: roles },
        activo: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (!users.length) return;
    await prisma.notificaciones.createMany({
      data: users.map(u => ({ usuario_id: u.id, tipo, titulo, mensaje, link: link ?? null })),
    });
  } catch { /* no romper flujo */ }
}

export async function notificarMedico(
  medicoId: number,
  tipo: string,
  titulo: string,
  mensaje: string,
  link?: string,
  excludeUserId?: number
): Promise<void> {
  try {
    const medico = await prisma.medicos.findUnique({
      where:  { id: medicoId },
      select: { usuario_id: true },
    });
    if (!medico) return;
    if (excludeUserId && medico.usuario_id === excludeUserId) return;
    await crear(medico.usuario_id, tipo, titulo, mensaje, link);
  } catch { /* no romper flujo */ }
}
