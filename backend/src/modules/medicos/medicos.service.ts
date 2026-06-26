import bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import prisma from '../../config/prisma';
import { notificarPorRoles } from '../notificaciones/notificaciones.helper';
import {
  CrearMedicoInput,
  ActualizarMedicoInput,
  ActualizarHorariosInput,
} from './medicos.schema';
import {
  MedicoConHorarios, MedicoPublico, ListaMedicosResponse, Genero, MedicoStats,
} from './medicos.types';

const SALT_ROUNDS = 12;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMedico = any;

function dateToISO(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function decimalToStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function mapPublico(m: AnyMedico): MedicoPublico {
  const dias = m.horarios
    ? [...new Set((m.horarios as AnyMedico[]).map((h) => h.dia_semana as number))].sort(
        (a, b) => a - b
      )
    : [];
  return {
    id: m.id,
    usuario_id: m.usuario_id,
    nombre: m.usuario.nombre,
    apellido: m.usuario.apellido,
    email: m.usuario.email,
    especialidad: m.especialidad,
    subespecialidad: m.subespecialidad,
    numero_colegiado: m.numero_colegiado,
    dpi: m.dpi,
    fecha_nacimiento: dateToISO(m.fecha_nacimiento),
    genero: m.genero as Genero | null,
    telefono: m.telefono,
    telefono_emergencia: m.telefono_emergencia,
    direccion: m.direccion,
    fecha_ingreso: dateToISO(m.fecha_ingreso),
    consultorio: m.consultorio,
    tarifa_consulta: decimalToStr(m.tarifa_consulta),
    biografia: m.biografia,
    foto_url: m.foto_url,
    activo: m.activo,
    created_at: m.created_at,
    dias_atencion: dias,
  };
}

function mapConHorarios(m: AnyMedico): MedicoConHorarios {
  return {
    ...mapPublico(m),
    horarios: (m.horarios ?? []).map((h: AnyMedico) => ({
      id: h.id,
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      activo: h.activo,
    })),
  };
}

function includeLista() {
  return {
    usuario: { select: { nombre: true, apellido: true, email: true } },
    horarios: {
      where: { activo: true as const },
      select: { dia_semana: true },
    },
  };
}

function includeAll() {
  return {
    usuario: { select: { nombre: true, apellido: true, email: true } },
    horarios: {
      where: { activo: true as const },
      orderBy: [
        { dia_semana: 'asc' as const },
        { hora_inicio: 'asc' as const },
      ],
    },
  };
}

// Convierte 'YYYY-MM-DD' a Date (medianoche UTC) para columnas @db.Date
function parseFecha(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function listarMedicos(
  pagina: number = 1,
  limite: number = 20,
  busqueda?: string,
  soloActivos: boolean | undefined = true,
  especialidad?: string
): Promise<ListaMedicosResponse> {
  const skip = (pagina - 1) * limite;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (soloActivos !== undefined) where.activo = soloActivos;

  if (especialidad) where.especialidad = especialidad;

  if (busqueda) {
    const pat = `%${busqueda.trim()}%`;
    const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT m.id FROM medicos m
      JOIN usuarios u ON u.id = m.usuario_id
      WHERE unaccent(u.nombre) ILIKE unaccent(${pat})
      OR unaccent(u.apellido) ILIKE unaccent(${pat})
      OR unaccent(COALESCE(m.subespecialidad, '')) ILIKE unaccent(${pat})
      OR unaccent(m.numero_colegiado) ILIKE unaccent(${pat})
    `);
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) return { medicos: [], total: 0, pagina, limite };
    where.id = { in: ids };
  }

  const [rows, total] = await Promise.all([
    prisma.medicos.findMany({
      where,
      skip,
      take: limite,
      orderBy: { created_at: 'desc' },
      include: includeLista(),
    }),
    prisma.medicos.count({ where }),
  ]);

  return {
    medicos: rows.map(mapPublico),
    total,
    pagina,
    limite,
  };
}

export async function estadisticas(): Promise<MedicoStats> {
  const [total, activos, con_horario, especialidadesRows] = await Promise.all([
    prisma.medicos.count(),
    prisma.medicos.count({ where: { activo: true } }),
    prisma.medicos.count({ where: { horarios: { some: { activo: true } } } }),
    prisma.medicos.findMany({
      distinct: ['especialidad'],
      select: { especialidad: true },
      orderBy: { especialidad: 'asc' },
    }),
  ]);

  return {
    total,
    activos,
    con_horario,
    especialidades: especialidadesRows.map((r) => r.especialidad),
  };
}

export async function obtenerMedico(id: number): Promise<MedicoConHorarios | null> {
  const row = await prisma.medicos.findUnique({
    where: { id },
    include: includeAll(),
  });

  if (!row) return null;
  return mapConHorarios(row);
}

export async function crearMedico(input: CrearMedicoInput): Promise<MedicoConHorarios> {
  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuarios.create({
      data: {
        nombre: input.nombre,
        apellido: input.apellido,
        email: input.email,
        password_hash,
        rol: 'medico',
      },
    });

    const medico = await tx.medicos.create({
      data: {
        usuario_id: usuario.id,
        especialidad: input.especialidad,
        numero_colegiado: input.numero_colegiado,
        subespecialidad: input.subespecialidad ?? null,
        dpi: input.dpi ?? null,
        fecha_nacimiento: parseFecha(input.fecha_nacimiento) ?? null,
        genero: input.genero ?? null,
        telefono: input.telefono ?? null,
        telefono_emergencia: input.telefono_emergencia ?? null,
        direccion: input.direccion ?? null,
        fecha_ingreso: parseFecha(input.fecha_ingreso) ?? null,
        consultorio: input.consultorio ?? null,
        tarifa_consulta: input.tarifa_consulta ?? null,
        biografia: input.biografia ?? null,
        foto_url: input.foto_url ?? null,
      },
    });

    if (input.horarios?.length) {
      await tx.horarios_medico.createMany({
        data: input.horarios.map((h) => ({
          medico_id: medico.id,
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
        })),
      });
    }

    const result = await tx.medicos.findUniqueOrThrow({
      where: { id: medico.id },
      include: includeAll(),
    });

    return mapConHorarios(result);
  });
}

export async function actualizarMedico(
  id: number,
  input: ActualizarMedicoInput
): Promise<MedicoConHorarios | null> {
  const medico = await prisma.medicos.findUnique({ where: { id } });
  if (!medico) return null;

  const { nombre, apellido, fecha_nacimiento, fecha_ingreso, ...rest } = input;

  await prisma.$transaction(async (tx) => {
    if (nombre !== undefined || apellido !== undefined) {
      await tx.usuarios.update({
        where: { id: medico.usuario_id },
        data: {
          ...(nombre !== undefined && { nombre }),
          ...(apellido !== undefined && { apellido }),
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const medicoData: any = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) medicoData[key] = value;
    }
    if (fecha_nacimiento !== undefined) medicoData.fecha_nacimiento = parseFecha(fecha_nacimiento);
    if (fecha_ingreso !== undefined) medicoData.fecha_ingreso = parseFecha(fecha_ingreso);

    if (Object.keys(medicoData).length > 0) {
      await tx.medicos.update({ where: { id }, data: medicoData });
    }
  });

  return obtenerMedico(id);
}

export async function toggleActivo(id: number, requestingUserId?: number): Promise<{ activo: boolean } | null> {
  const medico = await prisma.medicos.findUnique({
    where: { id },
    include: { usuario: { select: { nombre: true, apellido: true } } },
  });
  if (!medico) return null;

  const desactivando = medico.activo;

  if (desactivando) {
    const citasActivas = await prisma.citas.count({
      where: { medico_id: id, estado: { in: ['agendada', 'confirmada', 'reprogramada'] } },
    });
    if (citasActivas > 0) throw new Error('CITAS_ACTIVAS');
  }

  const updated = await prisma.medicos.update({
    where: { id },
    data: { activo: !medico.activo },
    select: { activo: true },
  });

  if (desactivando) {
    void notificarPorRoles(
      ['admin', 'recepcionista'],
      'medico_desactivado', 'Médico dado de baja',
      `Dr. ${medico.usuario.nombre} ${medico.usuario.apellido} fue dado de baja del sistema`,
      '/medicos', requestingUserId
    );
  } else {
    void notificarPorRoles(
      ['admin', 'recepcionista'],
      'medico_reactivado', 'Médico reactivado',
      `Dr. ${medico.usuario.nombre} ${medico.usuario.apellido} fue reactivado en el sistema`,
      '/medicos', requestingUserId
    );
  }

  return { activo: updated.activo };
}

export async function actualizarHorarios(
  id: number,
  input: ActualizarHorariosInput
): Promise<MedicoConHorarios> {
  const medico = await prisma.medicos.findUnique({ where: { id } });
  if (!medico) throw new Error('MEDICO_NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    await tx.horarios_medico.deleteMany({ where: { medico_id: id } });

    if (input.horarios.length > 0) {
      await tx.horarios_medico.createMany({
        data: input.horarios.map((h) => ({
          medico_id: id,
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
        })),
      });
    }
  });

  return (await obtenerMedico(id))!;
}

export async function obtenerMedicoPropio(
  usuarioId: number
): Promise<{ id: number; nombre: string; apellido: string; especialidad: string } | null> {
  const row = await prisma.medicos.findFirst({
    where: { usuario_id: usuarioId },
    select: {
      id: true,
      especialidad: true,
      usuario: { select: { nombre: true, apellido: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.usuario.nombre,
    apellido: row.usuario.apellido,
    especialidad: row.especialidad,
  };
}
