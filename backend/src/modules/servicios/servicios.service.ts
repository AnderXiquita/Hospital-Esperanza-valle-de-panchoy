import { Prisma } from '../../generated/prisma/client';
import prisma from '../../config/prisma';
import { ListaServiciosResponse, ServicioPublico, ServicioStats } from './servicios.types';
import { CrearServicioInput, ActualizarServicioInput } from './servicios.schema';

const publicSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  precio: true,
  duracion: true,
  activo: true,
  created_at: true,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapServicio(s: any): ServicioPublico {
  return {
    id: s.id,
    nombre: s.nombre,
    descripcion: s.descripcion,
    precio: s.precio != null ? s.precio.toString() : '0',
    duracion: s.duracion,
    activo: s.activo,
    created_at: s.created_at,
  };
}

export async function listarServicios(
  pagina: number = 1,
  limite: number = 20,
  busqueda?: string,
  soloActivos: boolean | undefined = true
): Promise<ListaServiciosResponse> {
  const skip = (pagina - 1) * limite;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (soloActivos !== undefined) where.activo = soloActivos;
  if (busqueda) {
    const pat = `%${busqueda.trim()}%`;
    const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT id FROM servicios
      WHERE unaccent(nombre) ILIKE unaccent(${pat})
    `);
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) return { servicios: [], total: 0, pagina, limite };
    where.id = { in: ids };
  }

  const [rows, total] = await Promise.all([
    prisma.servicios.findMany({
      where,
      skip,
      take: limite,
      orderBy: { created_at: 'desc' },
      select: publicSelect,
    }),
    prisma.servicios.count({ where }),
  ]);

  return { servicios: rows.map(mapServicio), total, pagina, limite };
}

export async function obtenerServicio(id: number): Promise<ServicioPublico | null> {
  const s = await prisma.servicios.findUnique({ where: { id }, select: publicSelect });
  return s ? mapServicio(s) : null;
}

export async function crearServicio(input: CrearServicioInput): Promise<ServicioPublico> {
  const s = await prisma.servicios.create({
    data: {
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      precio: input.precio,
      duracion: input.duracion,
    },
    select: publicSelect,
  });
  return mapServicio(s);
}

export async function actualizarServicio(
  id: number,
  input: ActualizarServicioInput
): Promise<ServicioPublico | null> {
  const existe = await prisma.servicios.findUnique({ where: { id } });
  if (!existe) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (input.nombre !== undefined) data.nombre = input.nombre;
  if (input.descripcion !== undefined) data.descripcion = input.descripcion;
  if (input.precio !== undefined) data.precio = input.precio;
  if (input.duracion !== undefined) data.duracion = input.duracion;

  const s = await prisma.servicios.update({ where: { id }, data, select: publicSelect });
  return mapServicio(s);
}

export async function toggleActivo(id: number): Promise<{ activo: boolean } | null> {
  const existe = await prisma.servicios.findUnique({ where: { id } });
  if (!existe) return null;

  if (existe.activo) {
    const citasActivas = await prisma.citas.count({
      where: { servicio_id: id, estado: { in: ['agendada', 'confirmada', 'reprogramada'] } },
    });
    if (citasActivas > 0) throw new Error('CITAS_ACTIVAS');
  }

  const updated = await prisma.servicios.update({
    where: { id },
    data: { activo: !existe.activo },
    select: { activo: true },
  });
  return { activo: updated.activo };
}

export async function estadisticas(): Promise<ServicioStats> {
  const [total, activos, agg] = await Promise.all([
    prisma.servicios.count(),
    prisma.servicios.count({ where: { activo: true } }),
    prisma.servicios.aggregate({
      where: { activo: true },
      _avg: { precio: true, duracion: true },
    }),
  ]);

  const precio_promedio = agg._avg.precio != null ? Number(agg._avg.precio) : 0;
  const duracion_promedio = agg._avg.duracion != null ? Math.round(Number(agg._avg.duracion)) : 0;

  return { total, activos, precio_promedio, duracion_promedio };
}
