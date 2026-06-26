import bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import prisma from '../../config/prisma';
import { notificarPorRol, notificarPorRoles } from '../notificaciones/notificaciones.helper';
import { ListaUsuariosResponse, UsuarioPublico, UsuarioStats, Rol } from './usuarios.types';
import { CrearUsuarioInput, ActualizarUsuarioInput } from './usuarios.schema';

const SALT_ROUNDS = 12;

// Campos públicos: nunca exponer password_hash
const publicSelect = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  rol: true,
  activo: true,
  ultimo_login: true,
  created_at: true,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUsuario(u: any): UsuarioPublico {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    rol: u.rol as Rol,
    activo: u.activo,
    ultimo_login: u.ultimo_login,
    created_at: u.created_at,
  };
}

export async function listarUsuarios(
  pagina: number = 1,
  limite: number = 20,
  busqueda?: string,
  soloActivos: boolean | undefined = true,
  rol?: Rol
): Promise<ListaUsuariosResponse> {
  const skip = (pagina - 1) * limite;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (soloActivos !== undefined) where.activo = soloActivos;
  if (rol) where.rol = rol;

  if (busqueda) {
    const pat = `%${busqueda.trim()}%`;
    const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT id FROM usuarios
      WHERE unaccent(nombre) ILIKE unaccent(${pat})
      OR unaccent(apellido) ILIKE unaccent(${pat})
      OR email ILIKE ${pat}
    `);
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) return { usuarios: [], total: 0, pagina, limite };
    where.id = { in: ids };
  }

  const [rows, total] = await Promise.all([
    prisma.usuarios.findMany({
      where,
      skip,
      take: limite,
      orderBy: { created_at: 'desc' },
      select: publicSelect,
    }),
    prisma.usuarios.count({ where }),
  ]);

  return { usuarios: rows.map(mapUsuario), total, pagina, limite };
}

export async function crearUsuario(input: CrearUsuarioInput, requestingUserId?: number): Promise<UsuarioPublico> {
  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const u = await prisma.usuarios.create({
    data: {
      nombre: input.nombre,
      apellido: input.apellido,
      email: input.email,
      password_hash,
      rol: input.rol,
    },
    select: publicSelect,
  });
  const rolLabel: Record<string, string> = { admin: 'Administrador', recepcionista: 'Recepcionista', medico: 'Médico' };
  void notificarPorRol(
    'admin', 'usuario_nuevo', 'Nuevo usuario',
    `${u.nombre} ${u.apellido} fue registrado como ${rolLabel[input.rol] ?? input.rol}`,
    '/usuarios', requestingUserId
  );
  return mapUsuario(u);
}

export async function actualizarUsuario(
  id: number,
  input: ActualizarUsuarioInput,
  currentUserId: number
): Promise<UsuarioPublico | null> {
  const user = await prisma.usuarios.findUnique({ where: { id } });
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (input.nombre !== undefined) data.nombre = input.nombre;
  if (input.apellido !== undefined) data.apellido = input.apellido;
  if (input.email !== undefined) data.email = input.email;

  // El rol solo cambia si: viene en el input, el usuario NO es médico
  // (su rol se gestiona en Médicos) y no es uno mismo (evita auto-degradarse).
  if (input.rol !== undefined && user.rol !== 'medico' && id !== currentUserId) {
    data.rol = input.rol;
  }

  if (Object.keys(data).length === 0) {
    return mapUsuario(
      await prisma.usuarios.findUniqueOrThrow({ where: { id }, select: publicSelect })
    );
  }

  const u = await prisma.usuarios.update({ where: { id }, data, select: publicSelect });
  return mapUsuario(u);
}

export async function obtenerUsuario(id: number): Promise<UsuarioPublico | null> {
  const u = await prisma.usuarios.findUnique({ where: { id }, select: publicSelect });
  return u ? mapUsuario(u) : null;
}

export async function toggleActivo(
  id: number,
  currentUserId: number
): Promise<{ activo: boolean }> {
  const user = await prisma.usuarios.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  const desactivando = user.activo;

  // No puedes desactivar tu propia cuenta
  if (desactivando && id === currentUserId) throw new Error('SELF');

  // No puedes desactivar al último administrador activo
  if (desactivando && user.rol === 'admin') {
    const adminsActivos = await prisma.usuarios.count({
      where: { rol: 'admin', activo: true },
    });
    if (adminsActivos <= 1) throw new Error('LAST_ADMIN');
  }

  // Si es médico, no se puede desactivar si tiene citas vigentes
  if (desactivando && user.rol === 'medico') {
    const medico = await prisma.medicos.findFirst({ where: { usuario_id: id } });
    if (medico) {
      const citasActivas = await prisma.citas.count({
        where: { medico_id: medico.id, estado: { in: ['agendada', 'confirmada', 'reprogramada'] } },
      });
      if (citasActivas > 0) throw new Error('CITAS_ACTIVAS');
    }
  }

  const updated = await prisma.usuarios.update({
    where: { id },
    data: { activo: !user.activo },
    select: { activo: true },
  });

  if (desactivando) {
    void notificarPorRoles(
      ['admin', 'recepcionista'],
      'usuario_desactivado', 'Usuario dado de baja',
      `${user.nombre} ${user.apellido} fue dado de baja del sistema`,
      '/usuarios', currentUserId
    );
  } else {
    void notificarPorRoles(
      ['admin', 'recepcionista'],
      'usuario_reactivado', 'Usuario reactivado',
      `${user.nombre} ${user.apellido} fue reactivado en el sistema`,
      '/usuarios', currentUserId
    );
  }

  return { activo: updated.activo };
}

export async function resetPassword(id: number, newPassword: string): Promise<boolean> {
  const user = await prisma.usuarios.findUnique({ where: { id } });
  if (!user) return false;

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Cambia la contraseña e invalida las sesiones activas del usuario
  await prisma.$transaction([
    prisma.usuarios.update({ where: { id }, data: { password_hash } }),
    prisma.refresh_tokens.deleteMany({ where: { usuario_id: id } }),
  ]);
  return true;
}

export async function estadisticas(): Promise<UsuarioStats> {
  const [total, activos, admins, recepcionistas] = await Promise.all([
    prisma.usuarios.count(),
    prisma.usuarios.count({ where: { activo: true } }),
    prisma.usuarios.count({ where: { rol: 'admin' } }),
    prisma.usuarios.count({ where: { rol: 'recepcionista' } }),
  ]);
  return { total, activos, admins, recepcionistas };
}
