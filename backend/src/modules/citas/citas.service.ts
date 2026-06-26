import prisma from '../../config/prisma';
import { CitaPublica, EstadoCita } from './citas.types';
import { CrearCitaInput, ReprogramarCitaInput } from './citas.schema';
import { notificarMedico, notificarPorRol } from '../notificaciones/notificaciones.helper';

function pad(n: number): string { return String(n).padStart(2, '0'); }

function fmtFechaHora(fechaISO: string, hora: string): string {
  const [, m, d] = fechaISO.split('-').map(Number);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d} ${meses[m - 1]} · ${hora}`;
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function parseFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

const includeRelations = {
  paciente: { select: { nombre: true, apellido: true } },
  medico: { include: { usuario: { select: { nombre: true, apellido: true } } } },
  servicio: { select: { nombre: true, duracion: true } },
} as const;

function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCita(c: any): CitaPublica {
  return {
    id: c.id,
    fecha: dateToISO(c.fecha),
    hora_inicio: c.hora_inicio,
    hora_fin: c.hora_fin,
    estado: c.estado as EstadoCita,
    motivo_consulta: c.motivo_consulta,
    paciente_id: c.paciente_id,
    medico_id: c.medico_id,
    servicio_id: c.servicio_id,
    paciente_nombre: c.paciente.nombre,
    paciente_apellido: c.paciente.apellido,
    medico_nombre: c.medico.usuario.nombre,
    medico_apellido: c.medico.usuario.apellido,
    servicio_nombre: c.servicio.nombre,
    servicio_duracion: c.servicio.duracion,
  };
}

export async function listarPorRango(
  desde: string,
  hasta: string,
  medicoId?: number,
  estado?: EstadoCita
): Promise<CitaPublica[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    fecha: {
      gte: new Date(`${desde}T00:00:00.000Z`),
      lte: new Date(`${hasta}T00:00:00.000Z`),
    },
  };
  if (medicoId) where.medico_id = medicoId;
  if (estado) where.estado = estado;

  const rows = await prisma.citas.findMany({
    where,
    orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
    include: includeRelations,
  });

  return rows.map(mapCita);
}

// Valida servicio/médico/horario/cruces y devuelve la hora_fin calculada.
// excludeId: ignora esa cita en la verificación de cruces (al reprogramar).
async function calcularYValidar(
  medicoId: number,
  servicioId: number,
  fecha: string,
  horaInicio: string,
  excludeId?: number
): Promise<string> {
  const servicio = await prisma.servicios.findUnique({ where: { id: servicioId } });
  if (!servicio || !servicio.activo) throw new Error('SERVICIO');

  const medico = await prisma.medicos.findUnique({
    where: { id: medicoId },
    include: { horarios: { where: { activo: true } } },
  });
  if (!medico || !medico.activo) throw new Error('MEDICO');

  const hora_fin = addMinutes(horaInicio, servicio.duracion);

  // Dentro del horario del médico ese día de la semana (0=domingo..6=sábado)
  const diaSemana = parseFecha(fecha).getUTCDay();
  const bloques = medico.horarios.filter((h) => h.dia_semana === diaSemana);
  const dentroHorario = bloques.some((b) => b.hora_inicio <= horaInicio && b.hora_fin >= hora_fin);
  if (!dentroHorario) throw new Error('OUT_OF_SCHEDULE');

  // Sin cruce con otra cita del mismo médico ese día (ignorando canceladas y la propia)
  const delDia = await prisma.citas.findMany({
    where: {
      medico_id: medicoId,
      fecha: parseFecha(fecha),
      estado: { not: 'cancelada' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { hora_inicio: true, hora_fin: true },
  });
  const cruce = delDia.some((c) => c.hora_inicio < hora_fin && c.hora_fin > horaInicio);
  if (cruce) throw new Error('OVERLAP');

  return hora_fin;
}

export async function crearCita(input: CrearCitaInput): Promise<CitaPublica> {
  const paciente = await prisma.pacientes.findUnique({ where: { id: input.paciente_id } });
  if (!paciente || !paciente.activo) throw new Error('PACIENTE');

  const hora_fin = await calcularYValidar(
    input.medico_id, input.servicio_id, input.fecha, input.hora_inicio
  );

  const cita = await prisma.citas.create({
    data: {
      paciente_id: input.paciente_id,
      medico_id: input.medico_id,
      servicio_id: input.servicio_id,
      fecha: parseFecha(input.fecha),
      hora_inicio: input.hora_inicio,
      hora_fin,
      estado: 'agendada',
      motivo_consulta: input.motivo_consulta ?? null,
    },
    include: includeRelations,
  });

  const c = mapCita(cita);
  void notificarMedico(
    input.medico_id, 'cita_nueva', 'Nueva cita',
    `${c.paciente_nombre} ${c.paciente_apellido} · ${fmtFechaHora(c.fecha, c.hora_inicio)}`,
    '/citas'
  );
  return c;
}

export async function obtenerCita(id: number): Promise<CitaPublica | null> {
  const cita = await prisma.citas.findUnique({ where: { id }, include: includeRelations });
  return cita ? mapCita(cita) : null;
}

export async function cambiarEstado(id: number, estado: EstadoCita, requestingUserId?: number): Promise<CitaPublica | null> {
  const existe = await prisma.citas.findUnique({ where: { id } });
  if (!existe) return null;
  const cita = await prisma.citas.update({
    where: { id },
    data: { estado },
    include: includeRelations,
  });
  const c = mapCita(cita);
  const paciente = `${c.paciente_nombre} ${c.paciente_apellido}`;
  const doctor   = `Dr. ${c.medico_nombre} ${c.medico_apellido}`;
  const fechaHora = fmtFechaHora(c.fecha, c.hora_inicio);

  if (estado === 'confirmada') {
    void notificarMedico(existe.medico_id, 'cita_confirmada', 'Cita confirmada', `${paciente} · ${fechaHora}`, '/citas');
  } else if (estado === 'cancelada') {
    void notificarMedico(existe.medico_id, 'cita_cancelada', 'Cita cancelada', `${paciente} del ${fechaHora} fue cancelada`, '/citas');
  } else if (estado === 'atendida') {
    void notificarPorRol('recepcionista', 'cita_atendida', 'Listo para cobrar', `${paciente} con ${doctor} · pendiente de cobro`, '/pagos', requestingUserId);
    void notificarMedico(existe.medico_id, 'cita_atendida', 'Cita atendida', `${paciente} fue marcada como atendida`, '/citas', requestingUserId);
  } else if (estado === 'no_presentado') {
    void notificarPorRol('recepcionista', 'cita_no_presentado', 'No se presentó', `${paciente} no llegó a su cita con ${doctor}`, '/citas', requestingUserId);
    void notificarPorRol('admin', 'cita_no_presentado', 'No se presentó', `${paciente} no llegó a su cita con ${doctor}`, '/citas', requestingUserId);
    void notificarMedico(existe.medico_id, 'cita_no_presentado', 'Paciente no llegó', `${paciente} no se presentó a la cita`, '/citas', requestingUserId);
  }

  return c;
}

export async function getSlotsDisponibles(
  medicoId: number,
  fecha: string,
  duracion: number,
  excludeId?: number
): Promise<string[]> {
  const medico = await prisma.medicos.findUnique({
    where: { id: medicoId },
    include: { horarios: { where: { activo: true } } },
  });
  if (!medico || !medico.activo) return [];

  const diaSemana = parseFecha(fecha).getUTCDay();
  const bloques = medico.horarios.filter((h) => h.dia_semana === diaSemana);
  if (!bloques.length) return [];

  const citasDelDia = await prisma.citas.findMany({
    where: {
      medico_id: medicoId,
      fecha: parseFecha(fecha),
      estado: { not: 'cancelada' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { hora_inicio: true, hora_fin: true },
  });

  const slots: Set<string> = new Set();

  for (const bloque of bloques) {
    let cur = bloque.hora_inicio;
    while (cur < bloque.hora_fin) {
      const horaFin = addMinutes(cur, duracion);
      if (horaFin > bloque.hora_fin) break;
      const overlap = citasDelDia.some((c) => c.hora_inicio < horaFin && c.hora_fin > cur);
      if (!overlap) slots.add(cur);
      cur = addMinutes(cur, 15);
    }
  }

  return [...slots].sort();
}

export async function reprogramarCita(
  id: number,
  input: ReprogramarCitaInput
): Promise<CitaPublica | null> {
  const existe = await prisma.citas.findUnique({ where: { id } });
  if (!existe) return null;

  const medicoId = input.medico_id ?? existe.medico_id;
  const servicioId = input.servicio_id ?? existe.servicio_id;

  const hora_fin = await calcularYValidar(
    medicoId, servicioId, input.fecha, input.hora_inicio, id
  );

  const cita = await prisma.citas.update({
    where: { id },
    data: {
      medico_id: medicoId,
      servicio_id: servicioId,
      fecha: parseFecha(input.fecha),
      hora_inicio: input.hora_inicio,
      hora_fin,
      estado: 'reprogramada',
      ...(input.motivo_consulta !== undefined ? { motivo_consulta: input.motivo_consulta } : {}),
    },
    include: includeRelations,
  });

  const c = mapCita(cita);
  void notificarMedico(
    medicoId, 'cita_reprogramada', 'Cita reprogramada',
    `${c.paciente_nombre} ${c.paciente_apellido} · movida al ${fmtFechaHora(input.fecha, input.hora_inicio)}`,
    '/citas'
  );
  return c;
}
