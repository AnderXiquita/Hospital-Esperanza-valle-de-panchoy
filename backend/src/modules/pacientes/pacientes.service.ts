import { Prisma } from '../../generated/prisma/client';
import prisma from '../../config/prisma';
import { notificarPorRol, notificarPorRoles } from '../notificaciones/notificaciones.helper';
import { ListaPacientesResponse, PacientePublico, PacienteStats, Genero } from './pacientes.types';
import { CrearPacienteInput, ActualizarPacienteInput } from './pacientes.schema';

const publicSelect = {
  id: true,
  nombre: true,
  apellido: true,
  fecha_nacimiento: true,
  dpi: true,
  genero: true,
  estado_civil: true,
  ocupacion: true,
  telefono: true,
  telefono_emergencia: true,
  contacto_emergencia_nombre: true,
  email: true,
  direccion: true,
  tipo_sangre: true,
  alergias: true,
  antecedentes: true,
  medicamentos: true,
  seguro: true,
  numero_afiliacion: true,
  observaciones: true,
  activo: true,
  created_at: true,
} as const;

function dateToISO(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function parseFecha(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaciente(p: any): PacientePublico {
  return {
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    fecha_nacimiento: dateToISO(p.fecha_nacimiento),
    dpi: p.dpi,
    genero: p.genero as Genero | null,
    estado_civil: p.estado_civil,
    ocupacion: p.ocupacion,
    telefono: p.telefono,
    telefono_emergencia: p.telefono_emergencia,
    contacto_emergencia_nombre: p.contacto_emergencia_nombre,
    email: p.email,
    direccion: p.direccion,
    tipo_sangre: p.tipo_sangre,
    alergias: p.alergias,
    antecedentes: p.antecedentes,
    medicamentos: p.medicamentos,
    seguro: p.seguro,
    numero_afiliacion: p.numero_afiliacion,
    observaciones: p.observaciones,
    activo: p.activo,
    created_at: p.created_at,
  };
}

export async function listarPacientes(
  pagina: number = 1,
  limite: number = 20,
  busqueda?: string,
  soloActivos: boolean | undefined = true
): Promise<ListaPacientesResponse> {
  const skip = (pagina - 1) * limite;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (soloActivos !== undefined) where.activo = soloActivos;
  if (busqueda) {
    const pat = `%${busqueda.trim()}%`;
    const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT id FROM pacientes
      WHERE unaccent(nombre) ILIKE unaccent(${pat})
      OR unaccent(apellido) ILIKE unaccent(${pat})
      OR dpi ILIKE ${pat}
    `);
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) return { pacientes: [], total: 0, pagina, limite };
    where.id = { in: ids };
  }

  const [rows, total] = await Promise.all([
    prisma.pacientes.findMany({
      where,
      skip,
      take: limite,
      orderBy: { created_at: 'desc' },
      select: publicSelect,
    }),
    prisma.pacientes.count({ where }),
  ]);

  return { pacientes: rows.map(mapPaciente), total, pagina, limite };
}

export async function obtenerPaciente(id: number): Promise<PacientePublico | null> {
  const p = await prisma.pacientes.findUnique({ where: { id }, select: publicSelect });
  return p ? mapPaciente(p) : null;
}

export async function crearPaciente(input: CrearPacienteInput): Promise<PacientePublico> {
  const p = await prisma.pacientes.create({
    data: {
      nombre: input.nombre,
      apellido: input.apellido,
      dpi: input.dpi,
      fecha_nacimiento: parseFecha(input.fecha_nacimiento)!,
      genero: input.genero ?? null,
      estado_civil: input.estado_civil ?? null,
      ocupacion: input.ocupacion ?? null,
      telefono: input.telefono ?? null,
      telefono_emergencia: input.telefono_emergencia ?? null,
      contacto_emergencia_nombre: input.contacto_emergencia_nombre ?? null,
      email: input.email ?? null,
      direccion: input.direccion ?? null,
      tipo_sangre: input.tipo_sangre ?? null,
      alergias: input.alergias ?? null,
      antecedentes: input.antecedentes ?? null,
      medicamentos: input.medicamentos ?? null,
      seguro: input.seguro ?? null,
      numero_afiliacion: input.numero_afiliacion ?? null,
      observaciones: input.observaciones ?? null,
    },
    select: publicSelect,
  });
  void notificarPorRol(
    'admin', 'paciente_nuevo', 'Nuevo paciente',
    `${p.nombre} ${p.apellido} fue registrado en el sistema`,
    '/pacientes'
  );
  return mapPaciente(p);
}

export async function actualizarPaciente(
  id: number,
  input: ActualizarPacienteInput
): Promise<PacientePublico | null> {
  const existe = await prisma.pacientes.findUnique({ where: { id } });
  if (!existe) return null;

  const { fecha_nacimiento, ...rest } = input;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) data[key] = value;
  }
  if (fecha_nacimiento !== undefined) data.fecha_nacimiento = parseFecha(fecha_nacimiento);

  const p = await prisma.pacientes.update({ where: { id }, data, select: publicSelect });
  return mapPaciente(p);
}

export async function toggleActivo(id: number, requestingUserId?: number): Promise<{ activo: boolean } | null> {
  const existe = await prisma.pacientes.findUnique({ where: { id } });
  if (!existe) return null;
  const desactivando = existe.activo;

  if (desactivando) {
    const citasActivas = await prisma.citas.count({
      where: { paciente_id: id, estado: { in: ['agendada', 'confirmada', 'reprogramada'] } },
    });
    if (citasActivas > 0) throw new Error('CITAS_ACTIVAS');
  }

  const updated = await prisma.pacientes.update({
    where: { id },
    data: { activo: !existe.activo },
    select: { activo: true },
  });
  if (desactivando) {
    void notificarPorRoles(
      ['admin', 'recepcionista', 'medico'],
      'paciente_desactivado', 'Paciente dado de baja',
      `${existe.nombre} ${existe.apellido} fue dado de baja del sistema`,
      '/pacientes', requestingUserId
    );
  } else {
    void notificarPorRoles(
      ['admin', 'recepcionista', 'medico'],
      'paciente_reactivado', 'Paciente reactivado',
      `${existe.nombre} ${existe.apellido} fue reactivado en el sistema`,
      '/pacientes', requestingUserId
    );
  }
  return { activo: updated.activo };
}

export async function estadisticas(): Promise<PacienteStats> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [total, activos, nuevos_mes, con_correo] = await Promise.all([
    prisma.pacientes.count(),
    prisma.pacientes.count({ where: { activo: true } }),
    prisma.pacientes.count({ where: { created_at: { gte: inicioMes } } }),
    prisma.pacientes.count({ where: { NOT: [{ email: null }, { email: '' }] } }),
  ]);

  return { total, activos, nuevos_mes, con_correo };
}
